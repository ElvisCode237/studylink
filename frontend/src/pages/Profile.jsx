import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { AppShell, PageHeader, Card, Avatar } from '../components/AppShell.jsx';

const LANGS=[['fr','Français'],['en','English'],['de','Deutsch'],['es','Español']];
const TIMEZONES=['Europe/Paris','Europe/Berlin','Africa/Douala','Africa/Abidjan','UTC'];

function Field({label,children,hint}){return <label className="profile-field"><span>{label}</span>{children}{hint&&<small>{hint}</small>}</label>}

export default function Profile(){
  const {user,tutorProfile,token,logout,replaceUser,replaceToken,refreshUser}=useAuth();
  const fileRef=useRef(null);
  const [tab,setTab]=useState('personal');
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState(null);
  const [profile,setProfile]=useState({});
  const [emailForm,setEmailForm]=useState({email:'',currentPassword:''});
  const [passwordForm,setPasswordForm]=useState({currentPassword:'',newPassword:'',confirmPassword:''});
  const [pro,setPro]=useState({headline:'',bio:'',hourlyRate:'',masteryLevel:'',yearsExperience:''});
  const [slot,setSlot]=useState({startTime:'',endTime:''});
  const [tutorId,setTutorId]=useState(tutorProfile?.id||null);

  useEffect(()=>{
    if(!user)return;
    setProfile({
      full_name:user.full_name||'',bio:user.bio||'',phone:user.phone||'',city:user.city||'',country:user.country||'',
      preferred_language:user.preferred_language||'fr',timezone:user.timezone||'Europe/Paris',website_url:user.website_url||'',
      occupation:user.occupation||'',interests:(user.interests||[]).join(', '),profile_visibility:user.profile_visibility||'public',
      email_notifications:user.email_notifications!==false,push_notifications:user.push_notifications!==false,
    });
    setEmailForm(v=>({...v,email:user.email||''}));
  },[user]);

  useEffect(()=>{
    if(tutorProfile){
      setTutorId(tutorProfile.id);
      setPro({headline:tutorProfile.headline||'',bio:tutorProfile.bio||'',hourlyRate:tutorProfile.hourly_rate||'',masteryLevel:tutorProfile.mastery_level||'',yearsExperience:tutorProfile.years_experience||''});
    }
  },[tutorProfile]);

  const completion=useMemo(()=>{
    if(!user)return 0;
    const vals=[user.avatar_url,profile.full_name,profile.bio,profile.phone,profile.city,profile.country,profile.occupation,profile.preferred_language];
    return Math.round(vals.filter(Boolean).length/vals.length*100);
  },[user,profile]);

  function show(type,text){setNotice({type,text});setTimeout(()=>setNotice(null),5000)}
  if(!user)return <AppShell><div className="page"><PageHeader title="Profil"/><Card><p>Connectez-vous pour accéder à votre profil.</p><Link className="primary-btn" to="/login">Se connecter</Link></Card></div></AppShell>;

  async function saveProfile(e){
    e.preventDefault();setBusy(true);
    try{
      const payload={...profile,interests:profile.interests.split(',').map(x=>x.trim()).filter(Boolean)};
      const {user:newUser}=await api.updateProfile(payload,token);replaceUser(newUser);show('success','Profil mis à jour avec succès.');
    }catch(err){show('error',err.message)}finally{setBusy(false)}
  }
  async function uploadAvatar(file){
    if(!file)return;setBusy(true);
    try{const {user:newUser}=await api.uploadAvatar(file,token);replaceUser(newUser);show('success','Photo de profil mise à jour.');}
    catch(err){show('error',err.message)}finally{setBusy(false);if(fileRef.current)fileRef.current.value=''}
  }
  async function removeAvatar(){
    setBusy(true);try{const {user:newUser}=await api.deleteAvatar(token);replaceUser(newUser);show('success','Photo supprimée.');}catch(err){show('error',err.message)}finally{setBusy(false)}
  }
  async function changeEmail(e){
    e.preventDefault();setBusy(true);
    try{const data=await api.changeEmail(emailForm,token);replaceUser(data.user);replaceToken(data.token);setEmailForm(v=>({...v,currentPassword:''}));show('success','Adresse email modifiée.');}
    catch(err){show('error',err.message)}finally{setBusy(false)}
  }
  async function changePassword(e){
    e.preventDefault();if(passwordForm.newPassword!==passwordForm.confirmPassword)return show('error','Les nouveaux mots de passe ne correspondent pas.');
    setBusy(true);try{const data=await api.changePassword({currentPassword:passwordForm.currentPassword,newPassword:passwordForm.newPassword},token);setPasswordForm({currentPassword:'',newPassword:'',confirmPassword:''});show('success',data.message);}
    catch(err){show('error',err.message)}finally{setBusy(false)}
  }
  async function saveProfessional(e){
    e.preventDefault();if(!tutorId)return show('error','Profil tuteur introuvable.');setBusy(true);
    try{await api.updateTutor(tutorId,pro,token);await refreshUser();show('success','Informations professionnelles enregistrées.');}catch(err){show('error',err.message)}finally{setBusy(false)}
  }
  async function addSlot(e){
    e.preventDefault();if(!tutorId)return;setBusy(true);
    try{await api.addAvailability(tutorId,slot,token);setSlot({startTime:'',endTime:''});show('success','Créneau ajouté.');}catch(err){show('error',err.message)}finally{setBusy(false)}
  }

  return <AppShell wide><div className="page profile-page-v2">
    <PageHeader title="Mon profil" subtitle="Gérez votre identité, votre sécurité et vos préférences"/>
    {notice&&<div className={`profile-notice ${notice.type}`}>{notice.text}</div>}

    <section className="profile-cover-card">
      <div className="profile-avatar-zone">
        <Avatar name={user.full_name} src={user.avatar_url} size="xl"/>
        <button className="camera-button" onClick={()=>fileRef.current?.click()} title="Changer la photo">📷</button>
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={e=>uploadAvatar(e.target.files?.[0])}/>
      </div>
      <div className="profile-identity"><h1>{user.full_name}</h1><p>{user.occupation|| (user.role==='tutor'?'Tuteur StudyLink':'Apprenant StudyLink')}</p><span className="role-pill">{user.role==='admin'?'Administrateur':user.role==='tutor'?'Tuteur':'Apprenant'}</span></div>
      <div className="profile-completion"><b>{completion}%</b><span>Profil complété</span><div><i style={{width:`${completion}%`}}/></div></div>
    </section>

    <div className="profile-quick-grid">
      <Link to="/bookings"><b>◉</b><span>Mes sessions</span></Link>
      <Link to="/catalogue"><b>▤</b><span>Mes apprentissages</span></Link>
      <Link to="/materials"><b>▱</b><span>Mes documents</span></Link>
      <Link to="/messages"><b>□</b><span>Mes messages</span></Link>
    </div>

    <div className="profile-tabs">
      <button className={tab==='personal'?'active':''} onClick={()=>setTab('personal')}>Informations</button>
      <button className={tab==='security'?'active':''} onClick={()=>setTab('security')}>Sécurité</button>
      <button className={tab==='preferences'?'active':''} onClick={()=>setTab('preferences')}>Préférences</button>
      {user.role==='tutor'&&<button className={tab==='professional'?'active':''} onClick={()=>setTab('professional')}>Profil tuteur</button>}
    </div>

    {tab==='personal'&&<form onSubmit={saveProfile} className="profile-form-grid">
      <Card className="profile-section-card"><h2>👤 Informations personnelles</h2><div className="two-col">
        <Field label="Nom complet"><input required value={profile.full_name||''} onChange={e=>setProfile({...profile,full_name:e.target.value})}/></Field>
        <Field label="Profession ou statut"><input value={profile.occupation||''} onChange={e=>setProfile({...profile,occupation:e.target.value})} placeholder="Étudiant, développeur, chercheur…"/></Field>
        <Field label="Téléphone"><input value={profile.phone||''} onChange={e=>setProfile({...profile,phone:e.target.value})} placeholder="+49…"/></Field>
        <Field label="Site web"><input type="url" value={profile.website_url||''} onChange={e=>setProfile({...profile,website_url:e.target.value})} placeholder="https://…"/></Field>
        <Field label="Ville"><input value={profile.city||''} onChange={e=>setProfile({...profile,city:e.target.value})}/></Field>
        <Field label="Pays"><input value={profile.country||''} onChange={e=>setProfile({...profile,country:e.target.value})}/></Field>
      </div>
      <Field label="À propos de moi"><textarea rows="5" maxLength="1000" value={profile.bio||''} onChange={e=>setProfile({...profile,bio:e.target.value})} placeholder="Présentez-vous, vos objectifs et ce que vous recherchez sur StudyLink…"/><small>{(profile.bio||'').length}/1000</small></Field>
      <Field label="Centres d’intérêt" hint="Séparez les sujets par des virgules"><input value={profile.interests||''} onChange={e=>setProfile({...profile,interests:e.target.value})} placeholder="Python, IA, entrepreneuriat, yoga…"/></Field>
      <button disabled={busy} className="primary-btn">{busy?'Enregistrement…':'Enregistrer les modifications'}</button></Card>

      <Card className="profile-photo-card"><h2>📷 Photo de profil</h2><Avatar name={user.full_name} src={user.avatar_url} size="xl"/><p>JPG, PNG ou WebP. 8 Mo maximum.</p><button type="button" className="outline-btn" onClick={()=>fileRef.current?.click()}>Choisir une nouvelle photo</button>{user.avatar_url&&<button type="button" className="danger-text-btn" onClick={removeAvatar}>Supprimer la photo</button>}</Card>
    </form>}

    {tab==='security'&&<div className="profile-form-grid">
      <Card className="profile-section-card"><h2>✉ Adresse email</h2><form onSubmit={changeEmail} className="stack"><Field label="Nouvelle adresse email"><input type="email" required value={emailForm.email} onChange={e=>setEmailForm({...emailForm,email:e.target.value})}/></Field><Field label="Mot de passe actuel" hint="Nécessaire pour confirmer votre identité"><input type="password" required value={emailForm.currentPassword} onChange={e=>setEmailForm({...emailForm,currentPassword:e.target.value})}/></Field><button disabled={busy} className="primary-btn">Modifier l’email</button></form></Card>
      <Card className="profile-section-card"><h2>🔒 Mot de passe</h2><form onSubmit={changePassword} className="stack"><Field label="Mot de passe actuel"><input type="password" required value={passwordForm.currentPassword} onChange={e=>setPasswordForm({...passwordForm,currentPassword:e.target.value})}/></Field><Field label="Nouveau mot de passe" hint="8 caractères minimum"><input type="password" required minLength="8" value={passwordForm.newPassword} onChange={e=>setPasswordForm({...passwordForm,newPassword:e.target.value})}/></Field><Field label="Confirmer le nouveau mot de passe"><input type="password" required value={passwordForm.confirmPassword} onChange={e=>setPasswordForm({...passwordForm,confirmPassword:e.target.value})}/></Field><button disabled={busy} className="primary-btn">Changer le mot de passe</button></form></Card>
    </div>}

    {tab==='preferences'&&<form onSubmit={saveProfile}><Card className="profile-section-card"><h2>⚙ Préférences du compte</h2><div className="two-col"><Field label="Langue de l’application"><select value={profile.preferred_language||'fr'} onChange={e=>setProfile({...profile,preferred_language:e.target.value})}>{LANGS.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></Field><Field label="Fuseau horaire"><select value={profile.timezone||'Europe/Paris'} onChange={e=>setProfile({...profile,timezone:e.target.value})}>{TIMEZONES.map(z=><option key={z}>{z}</option>)}</select></Field><Field label="Visibilité du profil"><select value={profile.profile_visibility||'public'} onChange={e=>setProfile({...profile,profile_visibility:e.target.value})}><option value="public">Public</option><option value="members">Membres StudyLink</option><option value="private">Privé</option></select></Field></div><div className="preference-switches"><label><input type="checkbox" checked={!!profile.email_notifications} onChange={e=>setProfile({...profile,email_notifications:e.target.checked})}/><span><b>Notifications par email</b><small>Recevoir les rappels et informations importantes.</small></span></label><label><input type="checkbox" checked={!!profile.push_notifications} onChange={e=>setProfile({...profile,push_notifications:e.target.checked})}/><span><b>Notifications dans l’application</b><small>Messages, forum, sessions et nouveaux contenus.</small></span></label></div><button disabled={busy} className="primary-btn">Enregistrer les préférences</button></Card></form>}

    {tab==='professional'&&user.role==='tutor'&&<div className="profile-form-grid">
      <Card className="profile-section-card"><h2>🎓 Profil professionnel</h2><form onSubmit={saveProfessional} className="stack"><Field label="Titre professionnel"><input value={pro.headline} onChange={e=>setPro({...pro,headline:e.target.value})} placeholder="Expert Python et Intelligence artificielle"/></Field><Field label="Présentation professionnelle"><textarea rows="6" value={pro.bio} onChange={e=>setPro({...pro,bio:e.target.value})}/></Field><div className="two-col"><Field label="Tarif horaire (€)"><input type="number" min="0" step="0.5" value={pro.hourlyRate} onChange={e=>setPro({...pro,hourlyRate:e.target.value})}/></Field><Field label="Années d’expérience"><input type="number" min="0" value={pro.yearsExperience} onChange={e=>setPro({...pro,yearsExperience:e.target.value})}/></Field><Field label="Niveau d’expertise"><input value={pro.masteryLevel} onChange={e=>setPro({...pro,masteryLevel:e.target.value})} placeholder="Expert, Master, Native speaker…"/></Field></div><button disabled={busy} className="primary-btn">Enregistrer le profil tuteur</button></form></Card>
      <Card className="profile-section-card"><h2>📅 Ajouter une disponibilité</h2><form onSubmit={addSlot} className="stack"><Field label="Début"><input type="datetime-local" required value={slot.startTime} onChange={e=>setSlot({...slot,startTime:e.target.value})}/></Field><Field label="Fin"><input type="datetime-local" required value={slot.endTime} onChange={e=>setSlot({...slot,endTime:e.target.value})}/></Field><button disabled={busy} className="outline-btn">Ajouter le créneau</button></form></Card>
    </div>}

    <Card className="profile-danger-zone"><div><h2>Session du compte</h2><p>Déconnectez-vous de cet appareil lorsque vous avez terminé.</p></div><button className="outline-btn" onClick={logout}>Déconnexion</button></Card>
  </div></AppShell>
}
