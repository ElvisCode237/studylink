import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const AppDataContext = createContext(null);
const KEY = 'studylink_app_state_v2';

const initialState = {
  bookings: [],
  selectedSlot: '15:00 – 16:00',
  favorites: { tutors: [], courses: [] },
  messages: {
    '1': [
      { id: 1, from: 'Marc T.', mine: false, text: 'Bonjour David ! 👋\nVoici le document avec des exercices avancés en Python comme demandé.', time: '10:24' },
      { id: 2, from: 'Marc T.', mine: false, file: 'Exercices_avances.pdf', size: '1,4 Mo', time: '10:25' },
      { id: 3, mine: true, text: 'Merci beaucoup 🙏\nJe vais regarder ça et je reviens vers toi si besoin !', time: '10:27' },
    ],
  },
  forumTopics: [
    { id: 1, title: 'Comment optimiser un algo ?', category: 'Python', replies: 18, unread: 3 },
    { id: 2, title: 'Intégrales doubles', category: 'Maths', replies: 12, unread: 2 },
    { id: 3, title: 'Aide projet IA', category: 'IA & ML', replies: 7, unread: 0 },
    { id: 4, title: 'Entretien Tech – questions', category: 'Emploi', replies: 23, unread: 5 },
    { id: 5, title: 'Ressources pour progresser en SQL', category: 'Autres', replies: 9, unread: 1 },
  ],
  courseProgress: { python: 65, machine: 30, algorithms: 80 },
  lessonCompleted: {},
  programStarted: false,
  book: { progress: 42, bookmarked: false, night: false, fontSize: 18, notes: [] },
  projectTasks: [
    { id: 1, title: 'Étude de marché', done: true },
    { id: 2, title: 'Création du logo', done: true },
    { id: 3, title: 'Rédaction du business plan', done: false },
    { id: 4, title: 'Recherche des premiers clients', done: false },
  ],
  downloads: [],
  notificationsRead: [],
};

export function AppDataProvider({ children }) {
  const [state, setState] = useState(() => {
    try { return { ...initialState, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; }
    catch { return initialState; }
  });
  const [toast, setToast] = useState('');

  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(state)); }, [state]);
  useEffect(() => { if (!toast) return; const t=setTimeout(()=>setToast(''), 2600); return ()=>clearTimeout(t); }, [toast]);

  const actions = useMemo(() => ({
    setSelectedSlot: (slot) => setState(s => ({ ...s, selectedSlot: slot })),
    addBooking: (booking) => {
      setState(s => ({ ...s, bookings: [{ id: Date.now(), status: 'Confirmée', ...booking }, ...s.bookings] }));
      setToast('Réservation confirmée');
    },
    cancelBooking: (id) => { setState(s => ({ ...s, bookings: s.bookings.map(b => b.id===id ? {...b,status:'Annulée'} : b) })); setToast('Réservation annulée'); },
    toggleFavorite: (type, id) => setState(s => { const list=s.favorites[type]||[]; return {...s,favorites:{...s.favorites,[type]:list.includes(id)?list.filter(x=>x!==id):[...list,id]}}; }),
    sendMessage: (threadId, text) => { const msg={id:Date.now(),mine:true,text,time:new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}; setState(s=>({...s,messages:{...s.messages,[threadId]:[...(s.messages[threadId]||[]),msg]}})); setToast('Message envoyé'); },
    addForumTopic: (title, category='Autres') => { setState(s=>({...s,forumTopics:[{id:Date.now(),title,category,replies:0,unread:0},...s.forumTopics]})); setToast('Discussion publiée'); },
    setCourseProgress: (key, value) => setState(s=>({...s,courseProgress:{...s.courseProgress,[key]:Math.max(0,Math.min(100,value))}})),
    completeLesson: (id) => { setState(s=>({...s,lessonCompleted:{...s.lessonCompleted,[id]:true},courseProgress:{...s.courseProgress,python:Math.min(100,(s.courseProgress.python||0)+5)}})); setToast('Leçon terminée'); },
    startProgram: () => { setState(s=>({...s,programStarted:true})); setToast('Programme démarré'); },
    updateBook: (patch) => setState(s=>({...s,book:{...s.book,...patch}})),
    toggleProjectTask: (id) => setState(s=>({...s,projectTasks:s.projectTasks.map(t=>t.id===id?{...t,done:!t.done}:t)})),
    addDownload: (name) => { setState(s=>({...s,downloads:[name,...s.downloads.filter(x=>x!==name)]})); setToast(`${name} téléchargé`); },
    markNotificationRead: (id) => setState(s=>({...s,notificationsRead:[...new Set([...s.notificationsRead,id])]})),
    notify: setToast,
  }), []);

  return <AppDataContext.Provider value={{ state, ...actions }}>
    {children}
    {toast && <div className="app-toast">✓ {toast}</div>}
  </AppDataContext.Provider>;
}

export function useAppData(){ const ctx=useContext(AppDataContext); if(!ctx) throw new Error('useAppData doit être utilisé dans AppDataProvider'); return ctx; }
