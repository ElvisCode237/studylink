import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
export default function AdminGuard({children}){ const {user,loading}=useAuth(); if(loading) return <div className="admin-loading">Chargement...</div>; if(!user) return <Navigate to="/login" replace/>; if(user.role!=='admin') return <Navigate to="/" replace/>; return children; }
