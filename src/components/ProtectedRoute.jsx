import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Unauthorized from './Unauthorized';
import Forbidden from './Forbidden';

const ProtectedRoute = ({ children, allowedRoles, redirectIfNoPlan = false }) => {
  const { user, loading } = useAuth();
  const [checkingPlan, setCheckingPlan] = useState(false);
  const [hasPlan, setHasPlan] = useState(true);
  
  if (loading) return <div className="loading">Cargando...</div>;
  
  if (!user) return <Unauthorized />;

  if (allowedRoles && !allowedRoles.includes(user.rol)) return <Forbidden />;

  // Verificar plan activo si aplica
  useEffect(() => {
    let mounted = true;
    const checkPlan = async () => {
      if (!redirectIfNoPlan) return;
      try {
        setCheckingPlan(true);
        const { data } = await api.get('/accounts/me');
        const has = typeof data?.hasAccount === 'boolean' ? data.hasAccount : !!data;
        if (mounted) setHasPlan(has);
      } catch (e) {
        if (mounted) setHasPlan(false);
      } finally {
        if (mounted) setCheckingPlan(false);
      }
    };
    checkPlan();
    return () => { mounted = false; };
  }, [redirectIfNoPlan]);

  if (redirectIfNoPlan) {
    if (checkingPlan) return <div className="loading">Verificando tu suscripción...</div>;
    if (!hasPlan) return <Navigate to="/planes" replace />;
  }

  return children;
};

export default ProtectedRoute;
