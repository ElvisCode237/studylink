import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

async function getCall(callId, userId) {
  const result = await query(
    `SELECT c.*, 
      caller.full_name AS caller_name, caller.avatar_url AS caller_avatar,
      callee.full_name AS callee_name, callee.avatar_url AS callee_avatar
     FROM call_sessions c
     JOIN users caller ON caller.id=c.caller_id
     JOIN users callee ON callee.id=c.callee_id
     WHERE c.id=$1 AND (c.caller_id=$2 OR c.callee_id=$2)`,
    [callId, userId]
  );
  return result.rows[0] || null;
}



router.get('/ice-config', async (req, res) => {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (accountSid && authToken) {
      const ttl = Math.max(300, Math.min(Number(process.env.TWILIO_TURN_TTL || 3600), 86400));
      const body = new URLSearchParams({ Ttl: String(ttl) });
      const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Tokens.json`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body,
        }
      );

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        console.error('Twilio TURN token error', response.status, data);
        return res.status(502).json({
          error: 'Impossible de récupérer la configuration TURN.',
          provider: 'twilio',
        });
      }

      return res.json({
        provider: 'twilio',
        ttl: Number(data.ttl || ttl),
        iceServers: data.ice_servers || [],
      });
    }

    // Fallback: TURN statique configuré côté serveur.
    const turnUrl = process.env.TURN_URL;
    const turnUsername = process.env.TURN_USERNAME;
    const turnCredential = process.env.TURN_CREDENTIAL;
    if (turnUrl && turnUsername && turnCredential) {
      const urls = turnUrl.split(',').map(v => v.trim()).filter(Boolean);
      return res.json({
        provider: 'static',
        iceServers: [
          { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
          { urls, username: turnUsername, credential: turnCredential },
        ],
      });
    }

    return res.json({
      provider: 'stun-only',
      warning: 'Aucun serveur TURN configuré.',
      iceServers: [
        { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
      ],
    });
  } catch (err) {
    console.error('ICE config error', err);
    res.status(500).json({ error: 'Impossible de charger la configuration réseau de l’appel.' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { calleeId, bookingId = null, callType = 'video' } = req.body || {};
    if (!calleeId) return res.status(400).json({ error: 'Destinataire requis.' });
    if (calleeId === req.user.id) return res.status(400).json({ error: 'Impossible de vous appeler vous-même.' });
    const exists = await query('SELECT 1 FROM users WHERE id=$1', [calleeId]);
    if (!exists.rows.length) return res.status(404).json({ error: 'Utilisateur introuvable.' });

    await query(
      `UPDATE call_sessions SET status='missed', ended_at=now()
       WHERE status='ringing' AND created_at < now() - interval '90 seconds'`
    );

    const active = await query(
      `SELECT id FROM call_sessions
       WHERE status IN ('ringing','accepted')
       AND ((caller_id=$1 AND callee_id=$2) OR (caller_id=$2 AND callee_id=$1))
       ORDER BY created_at DESC LIMIT 1`,
      [req.user.id, calleeId]
    );
    if (active.rows.length) return res.status(409).json({ error: 'Un appel est déjà en cours avec cet utilisateur.', callId: active.rows[0].id });

    const created = await query(
      `INSERT INTO call_sessions(caller_id,callee_id,booking_id,call_type)
       VALUES($1,$2,$3,$4) RETURNING *`,
      [req.user.id, calleeId, bookingId || null, callType === 'audio' ? 'audio' : 'video']
    );
    const call = await getCall(created.rows[0].id, req.user.id);
    res.status(201).json({ call });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Impossible de démarrer l'appel." });
  }
});

router.get('/incoming', async (req, res) => {
  try {
    await query(
      `UPDATE call_sessions SET status='missed', ended_at=now()
       WHERE status='ringing' AND created_at < now() - interval '90 seconds'`
    );
    const result = await query(
      `SELECT c.*, u.full_name AS caller_name, u.avatar_url AS caller_avatar
       FROM call_sessions c JOIN users u ON u.id=c.caller_id
       WHERE c.callee_id=$1 AND c.status='ringing'
       ORDER BY c.created_at DESC LIMIT 1`,
      [req.user.id]
    );
    res.json({ call: result.rows[0] || null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de la vérification des appels.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const call = await getCall(req.params.id, req.user.id);
    if (!call) return res.status(404).json({ error: 'Appel introuvable.' });
    res.json({ call });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors du chargement de l'appel." });
  }
});

router.post('/:id/accept', async (req, res) => {
  try {
    const call = await getCall(req.params.id, req.user.id);
    if (!call) return res.status(404).json({ error: 'Appel introuvable.' });
    if (call.callee_id !== req.user.id) return res.status(403).json({ error: 'Seul le destinataire peut accepter.' });
    const result = await query(
      `UPDATE call_sessions SET status='accepted', answered_at=now()
       WHERE id=$1 AND status='ringing' RETURNING *`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(409).json({ error: "L'appel n'est plus disponible." });
    res.json({ call: await getCall(req.params.id, req.user.id) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Impossible d'accepter l'appel." });
  }
});

router.post('/:id/reject', async (req, res) => {
  try {
    const call = await getCall(req.params.id, req.user.id);
    if (!call) return res.status(404).json({ error: 'Appel introuvable.' });
    if (call.callee_id !== req.user.id) return res.status(403).json({ error: 'Seul le destinataire peut refuser.' });
    await query(`UPDATE call_sessions SET status='rejected', ended_at=now() WHERE id=$1`, [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Impossible de refuser l'appel." });
  }
});

router.post('/:id/end', async (req, res) => {
  try {
    const call = await getCall(req.params.id, req.user.id);
    if (!call) return res.status(404).json({ error: 'Appel introuvable.' });
    await query(`UPDATE call_sessions SET status='ended', ended_at=now() WHERE id=$1 AND status <> 'ended'`, [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Impossible de terminer l'appel." });
  }
});

router.post('/:id/signals', async (req, res) => {
  try {
    const call = await getCall(req.params.id, req.user.id);
    if (!call) return res.status(404).json({ error: 'Appel introuvable.' });
    const { type, payload } = req.body || {};
    if (!['offer','answer','ice'].includes(type) || !payload) return res.status(400).json({ error: 'Signal invalide.' });
    const result = await query(
      `INSERT INTO call_signals(call_id,sender_id,signal_type,payload)
       VALUES($1,$2,$3,$4::jsonb) RETURNING id`,
      [req.params.id, req.user.id, type, JSON.stringify(payload)]
    );
    res.status(201).json({ id: result.rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur d'envoi du signal WebRTC." });
  }
});

router.get('/:id/signals', async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    const call = await getCall(req.params.id, req.user.id);
    if (!call) return res.status(404).json({ error: 'Appel introuvable.' });
    const after = Number(req.query.after || 0);
    const result = await query(
      `SELECT id, sender_id, signal_type, payload, created_at
       FROM call_signals
       WHERE call_id=$1 AND id>$2 AND sender_id<>$3
       ORDER BY id ASC LIMIT 200`,
      [req.params.id, after, req.user.id]
    );
    res.json({ signals: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur de lecture des signaux WebRTC.' });
  }
});

export default router;
