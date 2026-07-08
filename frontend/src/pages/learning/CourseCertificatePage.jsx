import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { AppShell, PageHeader } from '../../components/AppShell.jsx';

export default function CourseCertificatePage(){
  const {id}=useParams();
  const {token,user}=useAuth();
  const [data,setData]=useState(null);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);

  async function load(){
    if(!token)return;
    try{
      const current=await api.getCourseCertificate(id,token);
      if(current.certificate){setData(current);return;}
      setBusy(true);
      const created=await api.createCourseCertificate(id,token);
      setData({...created, certificate:{...created.certificate, learner_name:user?.full_name}});
    }catch(e){setError(e.message)}finally{setBusy(false)}
  }
  useEffect(()=>{load()},[id,token]);

  return <AppShell><div className="page certificate-page">
    <PageHeader title="Certificat de réussite" back/>
    {error&&<div className="admin-error">{error}</div>}
    {!data&&!error&&<div className="course-skeleton">{busy?'Création du certificat...':'Chargement...'}</div>}
    {data?.certificate&&<>
      <section className="certificate-sheet" id="study-certificate">
        <div className="certificate-brand">StudyLink</div>
        <div className="certificate-kicker">CERTIFICAT DE RÉUSSITE</div>
        <h1>Félicitations</h1>
        <p>Ce certificat atteste que</p>
        <h2>{data.certificate.learner_name || user?.full_name || 'Apprenant StudyLink'}</h2>
        <p>a terminé avec succès la formation</p>
        <h3>{data.course?.title}</h3>
        <div className="certificate-rule"/>
        <div className="certificate-meta">
          <div><small>Délivré le</small><b>{new Date(data.certificate.issued_at).toLocaleDateString('fr-FR')}</b></div>
          <div><small>Code de vérification</small><b>{data.certificate.certificate_code}</b></div>
          <div><small>Plateforme</small><b>StudyLink</b></div>
        </div>
        <div className="certificate-signature">StudyLink · Apprendre, progresser, transmettre</div>
      </section>
      <div className="certificate-actions">
        <button className="primary-btn" onClick={()=>window.print()}>Imprimer / Enregistrer en PDF</button>
        <Link className="outline-btn" to={`/courses/${id}`}>Retour au cours</Link>
        <Link className="outline-btn" to="/catalogue">Découvrir une autre formation</Link>
      </div>
    </>}
  </div></AppShell>
}
