import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { AppShell } from '../../components/AppShell.jsx';

function buildIceServers() {
  const servers = [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
  ];
  if (import.meta.env.VITE_TURN_URL) {
    servers.push({
      urls: import.meta.env.VITE_TURN_URL,
      username: import.meta.env.VITE_TURN_USERNAME || '',
      credential: import.meta.env.VITE_TURN_CREDENTIAL || '',
    });
  }
  return servers;
}

const baseRtcConfig = {
  iceCandidatePoolSize: 10,
  bundlePolicy: 'max-bundle',
};

function safePayload(payload) {
  if (typeof payload !== 'string') return payload;
  try { return JSON.parse(payload); } catch { return payload; }
}

export default function CallPage() {
  const { id } = useParams();
  const { token, user } = useAuth();
  const nav = useNavigate();

  const localVideo = useRef(null);
  const remoteVideo = useRef(null);
  const remoteAudio = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(new MediaStream());
  const screenStreamRef = useRef(null);
  const pollRef = useRef(null);
  const statusPollRef = useRef(null);
  const lastSignalRef = useRef(0);
  const pendingIceRef = useRef([]);
  const processingSignalsRef = useRef(false);
  const mountedRef = useRef(true);
  const offerSentRef = useRef(false);

  const [call, setCall] = useState(null);
  const [status, setStatus] = useState('Préparation de l’appel…');
  const [error, setError] = useState('');
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [needsMediaPlay, setNeedsMediaPlay] = useState(false);
  const [debugState, setDebugState] = useState('Initialisation');

  useEffect(() => {
    if (!token || !user?.id) return undefined;
    mountedRef.current = true;
    let timer;

    async function init() {
      try {
        setError('');
        const data = await api.getCall(id, token);
        if (!mountedRef.current) return;
        const callData = data.call;
        setCall(callData);
        const isCaller = callData.caller_id === user.id;
        await startRtc(callData, isCaller);
      } catch (e) {
        if (!mountedRef.current) return;
        setError(e.message || 'Impossible de démarrer l’appel.');
        setStatus('Erreur');
      }
    }

    init();
    timer = setInterval(() => setSeconds(s => s + 1), 1000);

    return () => {
      mountedRef.current = false;
      clearInterval(timer);
      clearInterval(pollRef.current);
      clearInterval(statusPollRef.current);
      pcRef.current?.close();
      localStreamRef.current?.getTracks().forEach(track => track.stop());
      screenStreamRef.current?.getTracks().forEach(track => track.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, token, user?.id]);

  async function attachRemoteMedia(callType) {
    const remoteStream = remoteStreamRef.current;
    try {
      if (callType === 'audio') {
        if (remoteAudio.current) {
          remoteAudio.current.srcObject = remoteStream;
          await remoteAudio.current.play();
        }
      } else if (remoteVideo.current) {
        remoteVideo.current.srcObject = remoteStream;
        await remoteVideo.current.play();
      }
      setNeedsMediaPlay(false);
    } catch {
      setNeedsMediaPlay(true);
    }
  }

  async function flushPendingIce(pc) {
    if (!pc.remoteDescription) return;
    const queued = pendingIceRef.current.splice(0);
    for (const candidate of queued) {
      try { await pc.addIceCandidate(candidate); } catch (e) { console.warn('ICE candidate rejeté', e); }
    }
  }

  async function processSignal(signal, pc, callType) {
    const payload = safePayload(signal.payload);

    if (signal.signal_type === 'offer') {
      if (pc.signalingState !== 'stable' || pc.remoteDescription) return;
      setDebugState('Offre reçue');
      await pc.setRemoteDescription(payload);
      await flushPendingIce(pc);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await api.sendCallSignal(id, 'answer', pc.localDescription.toJSON(), token);
      setDebugState('Réponse envoyée');
      return;
    }

    if (signal.signal_type === 'answer') {
      if (pc.signalingState !== 'have-local-offer' || pc.remoteDescription) return;
      setDebugState('Réponse reçue');
      await pc.setRemoteDescription(payload);
      await flushPendingIce(pc);
      return;
    }

    if (signal.signal_type === 'ice') {
      const candidate = new RTCIceCandidate(payload);
      if (pc.remoteDescription) {
        try { await pc.addIceCandidate(candidate); } catch (e) { console.warn('ICE candidate rejeté', e); }
      } else {
        pendingIceRef.current.push(candidate);
      }
    }

    await attachRemoteMedia(callType);
  }

  async function pollSignals(pc, callType) {
    if (processingSignalsRef.current || !mountedRef.current) return;
    processingSignalsRef.current = true;
    try {
      const data = await api.getCallSignals(id, lastSignalRef.current, token);
      for (const signal of data.signals || []) {
        lastSignalRef.current = Math.max(lastSignalRef.current, Number(signal.id));
        try {
          await processSignal(signal, pc, callType);
        } catch (e) {
          console.error('Erreur signal WebRTC', signal.signal_type, e);
          setDebugState(`Erreur ${signal.signal_type}`);
        }
      }
    } catch (e) {
      console.warn('Polling signalisation', e);
    } finally {
      processingSignalsRef.current = false;
    }
  }

  async function startRtc(callData, isCaller) {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Ce navigateur ne prend pas en charge la caméra et le microphone.');
    }

    setStatus(isCaller && callData.status === 'ringing' ? 'Sonnerie…' : 'Connexion…');
    setDebugState('Accès caméra/micro');

    const constraints = {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: callData.call_type === 'video' ? {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: 'user',
      } : false,
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    if (!mountedRef.current) {
      stream.getTracks().forEach(track => track.stop());
      return;
    }

    localStreamRef.current = stream;
    if (localVideo.current && callData.call_type === 'video') {
      localVideo.current.srcObject = stream;
      localVideo.current.play().catch(() => {});
    }

    let iceServers = buildIceServers();
    try {
      const iceData = await api.getCallIceConfig(token);
      if (Array.isArray(iceData?.iceServers) && iceData.iceServers.length) {
        iceServers = iceData.iceServers;
        setDebugState(iceData.provider === 'twilio' ? 'TURN sécurisé chargé' : `Réseau: ${iceData.provider || 'configuré'}`);
      }
    } catch (e) {
      console.warn('Configuration TURN indisponible, fallback STUN', e);
    }

    const pc = new RTCPeerConnection({ ...baseRtcConfig, iceServers });
    pcRef.current = pc;
    remoteStreamRef.current = new MediaStream();

    for (const track of stream.getTracks()) {
      pc.addTrack(track, stream);
    }

    pc.ontrack = event => {
      const remoteStream = remoteStreamRef.current;
      const tracks = event.streams?.[0]?.getTracks?.() || [event.track];
      for (const track of tracks) {
        if (!remoteStream.getTracks().some(t => t.id === track.id)) remoteStream.addTrack(track);
      }
      setStatus('Connecté');
      setDebugState(`Flux distant reçu (${event.track.kind})`);
      attachRemoteMedia(callData.call_type);
    };

    pc.onicecandidate = event => {
      if (!event.candidate) {
        setDebugState('Candidats ICE envoyés');
        return;
      }
      api.sendCallSignal(id, 'ice', event.candidate.toJSON(), token).catch(e => {
        console.warn('Envoi ICE impossible', e);
      });
    };

    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      setDebugState(`ICE: ${state}`);
      if (['connected', 'completed'].includes(state)) setStatus('Connecté');
      if (state === 'checking') setStatus('Connexion des médias…');
      if (state === 'failed') {
        setStatus('Connexion média impossible');
        const hasTurn = iceServers.some(server => {
          const urls = Array.isArray(server.urls) ? server.urls : [server.urls];
          return urls.some(url => String(url || '').startsWith('turn:') || String(url || '').startsWith('turns:'));
        });
        setError(hasTurn
          ? 'La connexion TURN a échoué. Vérifie les identifiants TURN et les journaux Render.'
          : 'La connexion directe a échoué. Aucun serveur TURN n’est configuré sur le backend.');
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === 'connected') {
        setStatus('Connecté');
        setError('');
      }
      if (state === 'connecting') setStatus('Connexion…');
      if (state === 'failed') setStatus('Connexion échouée');
      if (state === 'disconnected') setStatus('Connexion interrompue');
      if (state === 'closed') setStatus('Appel terminé');
    };

    // Polling de signalisation plus rapide et séquentiel.
    await pollSignals(pc, callData.call_type);
    pollRef.current = setInterval(() => pollSignals(pc, callData.call_type), 350);

    statusPollRef.current = setInterval(async () => {
      try {
        const current = await api.getCall(id, token);
        if (!mountedRef.current) return;
        setCall(current.call);

        if (isCaller && current.call.status === 'accepted' && !offerSentRef.current) {
          offerSentRef.current = true;
          setDebugState('Création de l’offre');
          const offer = await pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: callData.call_type === 'video',
          });
          await pc.setLocalDescription(offer);
          await api.sendCallSignal(id, 'offer', pc.localDescription.toJSON(), token);
          setStatus('Connexion…');
          setDebugState('Offre envoyée');
        }

        if (['rejected', 'ended', 'missed'].includes(current.call.status)) {
          setStatus(current.call.status === 'rejected' ? 'Appel refusé' : 'Appel terminé');
          clearInterval(statusPollRef.current);
          clearInterval(pollRef.current);
          setTimeout(() => nav('/messages'), 1200);
        }
      } catch (e) {
        console.warn('Polling état appel', e);
      }
    }, 700);
  }

  async function enableRemoteMedia() {
    if (!call) return;
    await attachRemoteMedia(call.call_type);
  }

  function toggleMute() {
    const tracks = localStreamRef.current?.getAudioTracks() || [];
    tracks.forEach(track => { track.enabled = muted; });
    setMuted(!muted);
  }

  function toggleCamera() {
    const tracks = localStreamRef.current?.getVideoTracks() || [];
    tracks.forEach(track => { track.enabled = cameraOff; });
    setCameraOff(!cameraOff);
  }

  async function shareScreen() {
    if (sharing) {
      const cameraTrack = localStreamRef.current?.getVideoTracks()[0];
      const sender = pcRef.current?.getSenders().find(s => s.track?.kind === 'video');
      if (sender && cameraTrack) await sender.replaceTrack(cameraTrack);
      screenStreamRef.current?.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
      setSharing(false);
      return;
    }

    try {
      const screen = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      screenStreamRef.current = screen;
      const screenTrack = screen.getVideoTracks()[0];
      const sender = pcRef.current?.getSenders().find(s => s.track?.kind === 'video');
      if (!sender) throw new Error('Aucune piste vidéo à remplacer.');
      await sender.replaceTrack(screenTrack);
      screenTrack.onended = async () => {
        const cameraTrack = localStreamRef.current?.getVideoTracks()[0];
        if (cameraTrack) await sender.replaceTrack(cameraTrack);
        setSharing(false);
      };
      setSharing(true);
    } catch (e) {
      if (e?.name !== 'NotAllowedError') setError(e.message || "Impossible de partager l'écran.");
    }
  }

  async function endCall() {
    try { await api.endCall(id, token); } catch {}
    clearInterval(pollRef.current);
    clearInterval(statusPollRef.current);
    pcRef.current?.close();
    localStreamRef.current?.getTracks().forEach(track => track.stop());
    screenStreamRef.current?.getTracks().forEach(track => track.stop());
    nav('/messages');
  }

  const otherName = call ? (call.caller_id === user?.id ? call.callee_name : call.caller_name) : 'Utilisateur';
  const isAudioCall = call?.call_type === 'audio';
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  return <AppShell><div className="page real-call-page">
    <div className="real-call-header">
      <button onClick={() => nav(-1)}>←</button>
      <div>
        <h1>{isAudioCall ? 'Appel audio' : 'Visioconférence'}</h1>
        <p>{status} · {otherName}</p>
      </div>
    </div>

    {error && <div className="admin-error">{error}</div>}
    {needsMediaPlay && <button className="media-unlock-btn" onClick={enableRemoteMedia}>🔊 Activer le son et la vidéo</button>}

    <div className={`real-call-stage ${isAudioCall ? 'audio-call-stage' : ''}`}>
      <audio ref={remoteAudio} autoPlay playsInline />
      {!isAudioCall && <video ref={remoteVideo} autoPlay playsInline className="remote-video" />}
      <div className="call-placeholder">
        <div className="pulse-avatar">{otherName?.charAt(0) || '?'}</div>
        <h2>{otherName}</h2>
        <p>{status}</p>
      </div>
      {!isAudioCall && <video ref={localVideo} autoPlay muted playsInline className="local-video" />}
      <span className="call-timer">{mm}:{ss}</span>
      <small className="call-debug-state">{debugState}</small>
    </div>

    <div className="real-call-controls">
      <button onClick={toggleMute} className={muted ? 'active-off' : ''}><span>{muted ? '🔇' : '🎙️'}</span>{muted ? 'Réactiver' : 'Micro'}</button>
      <button onClick={toggleCamera} disabled={isAudioCall} className={cameraOff ? 'active-off' : ''}><span>{cameraOff ? '🚫' : '📹'}</span>{isAudioCall ? 'Audio' : (cameraOff ? 'Activer' : 'Caméra')}</button>
      <button onClick={shareScreen} disabled={isAudioCall} className={sharing ? 'active-share' : ''}><span>🖥️</span>{sharing ? 'Arrêter' : 'Partager'}</button>
      <button onClick={() => setChatOpen(!chatOpen)}><span>💬</span>Chat</button>
      <button className="hangup" onClick={endCall}><span>☎</span>Quitter</button>
    </div>

    {chatOpen && <div className="call-chat-panel">
      <h3>Chat de l’appel</h3>
      <p>La conversation privée reste liée aux deux utilisateurs.</p>
      <button onClick={() => nav(`/messages/${call?.caller_id === user?.id ? call?.callee_id : call?.caller_id}?name=${encodeURIComponent(otherName)}`)}>Ouvrir la conversation</button>
    </div>}
  </div></AppShell>;
}
