import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { uploadBuffer } from '../storage.js';

const router = Router();
const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!['image/jpeg','image/png','image/webp'].includes(file.mimetype)) {
      return cb(new Error('Format non accepté. Utilisez JPG, PNG ou WebP.'));
    }
    cb(null, true);
  },
});

const PUBLIC_USER_FIELDS = `id,email,full_name,role,avatar_url,bio,phone,city,country,
  preferred_language,timezone,website_url,occupation,interests,profile_visibility,
  email_notifications,push_notifications,created_at,updated_at`;

function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

router.post('/register', async (req, res) => {
  try {
    const { email, password, fullName, role } = req.body;
    if (!email || !password || !fullName || !role) return res.status(400).json({ error: 'Tous les champs sont requis.' });
    if (!['student', 'tutor'].includes(role)) return res.status(400).json({ error: "Le rôle doit être 'student' ou 'tutor'." });
    if (password.length < 6) return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères.' });
    const existing = await query('SELECT id FROM users WHERE lower(email)=lower($1)', [email]);
    if (existing.rows.length) return res.status(409).json({ error: 'Un compte existe déjà avec cet email.' });
    const passwordHash = await bcrypt.hash(password, 10);
    const result = await query(
      `INSERT INTO users (email,password_hash,full_name,role) VALUES(lower($1),$2,$3,$4)
       RETURNING ${PUBLIC_USER_FIELDS}`,
      [email,passwordHash,fullName.trim(),role]
    );
    const user = result.rows[0];
    if (role === 'tutor') {
      await query(`INSERT INTO tutor_profiles (user_id,headline,hourly_rate,mastery_level,years_experience)
        VALUES($1,$2,$3,$4,$5)`, [user.id,'Nouveau tuteur',25,'Débutant',0]);
    }
    res.status(201).json({ token: signToken(user), user });
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Erreur serveur lors de l’inscription.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email et mot de passe requis.' });
    const result = await query('SELECT * FROM users WHERE lower(email)=lower($1)', [email]);
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password,user.password_hash))) return res.status(401).json({ error: 'Identifiants incorrects.' });
    const token = signToken(user); delete user.password_hash;
    res.json({ token, user });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erreur serveur lors de la connexion.' }); }
});

router.get('/me', requireAuth, async (req,res) => {
  try {
    const result = await query(`SELECT ${PUBLIC_USER_FIELDS} FROM users WHERE id=$1`,[req.user.id]);
    if (!result.rows[0]) return res.status(404).json({error:'Utilisateur introuvable.'});
    let tutorProfile = null;
    if (result.rows[0].role === 'tutor') {
      tutorProfile = (await query(`SELECT id,headline,bio,mastery_level,hourly_rate,years_experience,is_active FROM tutor_profiles WHERE user_id=$1`,[req.user.id])).rows[0] || null;
    }
    res.json({user:result.rows[0],tutorProfile});
  } catch(err){ console.error(err); res.status(500).json({error:'Impossible de charger le profil.'}); }
});

router.patch('/profile', requireAuth, async (req,res) => {
  try {
    const b=req.body || {};
    const interests = Array.isArray(b.interests) ? b.interests.map(x=>String(x).trim()).filter(Boolean).slice(0,20) : [];
    const visibility = ['public','members','private'].includes(b.profile_visibility) ? b.profile_visibility : 'public';
    const r=await query(`UPDATE users SET
      full_name=$1,bio=$2,phone=$3,city=$4,country=$5,preferred_language=$6,timezone=$7,
      website_url=$8,occupation=$9,interests=$10,profile_visibility=$11,email_notifications=$12,push_notifications=$13
      WHERE id=$14 RETURNING ${PUBLIC_USER_FIELDS}`,
      [String(b.full_name||'').trim(),b.bio||null,b.phone||null,b.city||null,b.country||null,b.preferred_language||'fr',b.timezone||'Europe/Paris',b.website_url||null,b.occupation||null,interests,visibility,b.email_notifications!==false,b.push_notifications!==false,req.user.id]);
    if(!r.rows[0]) return res.status(404).json({error:'Utilisateur introuvable.'});
    res.json({user:r.rows[0]});
  } catch(err){ console.error(err); res.status(500).json({error:'Impossible de mettre à jour le profil. Exécutez la migration 008_user_profiles.sql si nécessaire.'}); }
});

router.patch('/email', requireAuth, async (req,res) => {
  try {
    const {email,currentPassword}=req.body || {};
    if(!email || !currentPassword) return res.status(400).json({error:'Nouvel email et mot de passe actuel requis.'});
    const current=(await query('SELECT password_hash FROM users WHERE id=$1',[req.user.id])).rows[0];
    if(!current || !(await bcrypt.compare(currentPassword,current.password_hash))) return res.status(401).json({error:'Mot de passe actuel incorrect.'});
    const exists=await query('SELECT id FROM users WHERE lower(email)=lower($1) AND id<>$2',[email,req.user.id]);
    if(exists.rows.length) return res.status(409).json({error:'Cette adresse email est déjà utilisée.'});
    const user=(await query(`UPDATE users SET email=lower($1) WHERE id=$2 RETURNING ${PUBLIC_USER_FIELDS}`,[email.trim(),req.user.id])).rows[0];
    res.json({user,token:signToken(user)});
  } catch(err){ console.error(err); res.status(500).json({error:'Impossible de modifier l’adresse email.'}); }
});

router.patch('/password', requireAuth, async (req,res) => {
  try {
    const {currentPassword,newPassword}=req.body || {};
    if(!currentPassword || !newPassword) return res.status(400).json({error:'Les deux mots de passe sont requis.'});
    if(newPassword.length<8) return res.status(400).json({error:'Le nouveau mot de passe doit contenir au moins 8 caractères.'});
    const current=(await query('SELECT password_hash FROM users WHERE id=$1',[req.user.id])).rows[0];
    if(!current || !(await bcrypt.compare(currentPassword,current.password_hash))) return res.status(401).json({error:'Mot de passe actuel incorrect.'});
    const hash=await bcrypt.hash(newPassword,12);
    await query('UPDATE users SET password_hash=$1 WHERE id=$2',[hash,req.user.id]);
    res.json({message:'Mot de passe modifié avec succès.'});
  } catch(err){ console.error(err); res.status(500).json({error:'Impossible de modifier le mot de passe.'}); }
});

router.post('/avatar', requireAuth, avatarUpload.single('avatar'), async (req,res) => {
  try {
    if(!req.file) return res.status(400).json({error:'Choisissez une image.'});
    const stored=await uploadBuffer({buffer:req.file.buffer,originalName:req.file.originalname,mimeType:req.file.mimetype,folder:`users/${req.user.id}/avatar`});
    const user=(await query(`UPDATE users SET avatar_url=$1 WHERE id=$2 RETURNING ${PUBLIC_USER_FIELDS}`,[stored.publicUrl,req.user.id])).rows[0];
    res.json({user});
  } catch(err){ console.error(err); res.status(err.status||500).json({error:err.message||'Impossible d’envoyer la photo.'}); }
});

router.delete('/avatar', requireAuth, async (req,res) => {
  try {
    const user=(await query(`UPDATE users SET avatar_url=NULL WHERE id=$1 RETURNING ${PUBLIC_USER_FIELDS}`,[req.user.id])).rows[0];
    res.json({user});
  } catch(err){ console.error(err); res.status(500).json({error:'Impossible de supprimer la photo.'}); }
});

export default router;
