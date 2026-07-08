import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { AppShell, Logo } from '../components/AppShell.jsx';

export default function Register(){
  const {login}=useAuth(); const navigate=useNavigate();
  const [form,setForm]=useState({fullName:'',email:'',password:'',role:'student'}); const [error,setError]=useState(''); const [loading,setLoading]=useState(false);
  async function submit(e){e.preventDefault();setLoading(true);setError('');try{const r=await api.register(form);login(r.token,r.user);navigate('/')}catch(err){setError(err.message)}finally{setLoading(false)}}
  return <AppShell><div className="auth-page"><Logo/><h1>Créer un compte</h1><p>Rejoignez StudyLink pour apprendre, partager et progresser.</p><form onSubmit={submit}><div className="social-row"><button type="button" className={form.role==='student'?'primary-btn':''} onClick={()=>setForm({...form,role:'student'})}>Je suis apprenant</button><button type="button" className={form.role==='tutor'?'primary-btn':''} onClick={()=>setForm({...form,role:'tutor'})}>Je suis tuteur</button></div><label>Nom complet<input required value={form.fullName} onChange={e=>setForm({...form,fullName:e.target.value})} placeholder="David Martin"/></label><label>Email<input type="email" required value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="vous@exemple.com"/></label><label>Mot de passe<input type="password" minLength="6" required value={form.password} onChange={e=>setForm({...form,password:e.target.value})} placeholder="6 caractères minimum"/></label>{error&&<p className="error">{error}</p>}<button className="primary-btn full" disabled={loading}>{loading?'Création...':'Créer mon compte'}</button></form><p>Déjà un compte ? <Link to="/login">Se connecter</Link></p></div></AppShell>
}
