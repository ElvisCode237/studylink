import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../../api.js';
import { useAuth } from '../../context/AuthContext.jsx';

const Ctx=createContext(null);
const emptyData=()=>({tasks:[],events:[],notes:[],goals:[],focus_sessions:[],distractions:[],bookings:[],learning:[],materials:[]});
const key=(uid)=>`studylink_study_space_real_v2_${uid||'guest'}`;

export function StudySpaceProvider({children}){
  const {token,user}=useAuth();
  const [data,setData]=useState(emptyData());
  const [loading,setLoading]=useState(true);
  const [offline,setOffline]=useState(false);
  const [error,setError]=useState('');

  const saveSnapshot=(next)=>{
    const safe={...emptyData(),...(next||{})};
    setData(safe);
    try{localStorage.setItem(key(user?.id),JSON.stringify(safe));}catch{}
  };
  const cachedSnapshot=()=>{
    try{const raw=localStorage.getItem(key(user?.id));return raw?{...emptyData(),...JSON.parse(raw)}:emptyData();}
    catch{return emptyData();}
  };

  async function refresh(){
    setLoading(true);setError('');
    if(!token){setData(emptyData());setOffline(false);setLoading(false);return;}
    try{
      const r=await api.getStudySpaceDashboard(token);
      saveSnapshot(r);
      setOffline(false);
    }catch(e){
      console.error('Study Space API',e);
      setData(cachedSnapshot());
      setOffline(true);
      setError(e?.message||'Impossible de charger vos données personnelles.');
    }finally{setLoading(false);}
  }
  useEffect(()=>{refresh();},[token,user?.id]);

  const optimistic=async(localUpdater,remoteCall)=>{
    const before=data;
    const next=localUpdater({...emptyData(),...data});
    saveSnapshot(next);
    if(!token) return null;
    try{const r=await remoteCall();await refresh();return r;}
    catch(e){saveSnapshot(before);setError(e?.message||'La modification n’a pas pu être enregistrée.');throw e;}
  };

  const actions=useMemo(()=>({
    addTask:(p)=>optimistic(d=>({...d,tasks:[...d.tasks,{...p,id:`local-${Date.now()}`,completed_at:null}]}),()=>api.createStudyTask(p,token)),
    toggleTask:(t)=>optimistic(d=>({...d,tasks:d.tasks.map(x=>x.id===t.id?{...x,completed_at:x.completed_at?null:new Date().toISOString()}:x)}),()=>api.updateStudyTask(t.id,{completed:!t.completed_at},token)),
    deleteTask:(id)=>optimistic(d=>({...d,tasks:d.tasks.filter(x=>x.id!==id)}),()=>api.deleteStudyTask(id,token)),
    addEvent:(p)=>optimistic(d=>({...d,events:[...d.events,{...p,id:`local-${Date.now()}`}]}),()=>api.createStudyEvent(p,token)),
    deleteEvent:(id)=>optimistic(d=>({...d,events:d.events.filter(x=>x.id!==id)}),()=>api.deleteStudyEvent(id,token)),
    addNote:(p)=>optimistic(d=>({...d,notes:[{...p,id:`local-${Date.now()}`,updated_at:new Date().toISOString()},...d.notes]}),()=>api.createStudyNote(p,token)),
    updateNote:(id,p)=>optimistic(d=>({...d,notes:d.notes.map(x=>x.id===id?{...x,...p,updated_at:new Date().toISOString()}:x)}),()=>api.updateStudyNote(id,p,token)),
    deleteNote:(id)=>optimistic(d=>({...d,notes:d.notes.filter(x=>x.id!==id)}),()=>api.deleteStudyNote(id,token)),
    addGoal:(p)=>optimistic(d=>({...d,goals:[...d.goals,{...p,id:`local-${Date.now()}`,progress_percent:0,milestones:(p.milestones||[]).map((m,i)=>({id:`lm-${Date.now()}-${i}`,title:m,completed_at:null}))}]}),()=>api.createStudyGoal(p,token)),
    updateGoal:(id,p)=>optimistic(d=>({...d,goals:d.goals.map(x=>x.id===id?{...x,...p}:x)}),()=>api.updateStudyGoal(id,p,token)),
    toggleMilestone:(goalId,m)=>optimistic(d=>({...d,goals:d.goals.map(g=>g.id===goalId?{...g,milestones:g.milestones.map(x=>x.id===m.id?{...x,completed_at:x.completed_at?null:new Date().toISOString()}:x)}:g)}),()=>api.toggleStudyMilestone(m.id,token)),
    addFocus:(p)=>optimistic(d=>({...d,focus_sessions:[{...p,id:`local-${Date.now()}`,elapsed_seconds:0,status:'active',started_at:new Date().toISOString()},...d.focus_sessions]}),()=>api.startFocusSession(p,token)),
    updateFocus:(id,p)=>optimistic(d=>({...d,focus_sessions:d.focus_sessions.map(x=>x.id===id?{...x,...p}:x)}),()=>api.updateFocusSession(id,p,token)),
  }),[data,token]);

  return <Ctx.Provider value={{data,loading,offline,error,refresh,...actions}}>{children}</Ctx.Provider>;
}
export const useStudySpace=()=>useContext(Ctx);
