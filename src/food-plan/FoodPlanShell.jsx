import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useSearchParams, useNavigate } from 'react-router-dom';
import { Provider, useDispatch } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '@food/store/authSlice';
import nutritionReducer from '@food/store/nutritionSlice';
import FoodApp from '@food/App';
import api from '../services/api';
import './food-tailwind.css';

const foodStore = configureStore({
  reducer: {
    auth: authReducer,
    nutrition: nutritionReducer,
  },
});

function bootstrapAuthFromStorage(dispatch) {
  const accessToken = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  const subscription = localStorage.getItem('subscription');
  if (accessToken && user) {
    dispatch({
      type: 'auth/login/fulfilled',
      payload: {
        accessToken,
        refreshToken: localStorage.getItem('refreshToken'),
        user: JSON.parse(user),
        subscription: subscription ? JSON.parse(subscription) : null,
      },
    });
  }
}

function FoodShellSsoGate() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [error, setError] = useState('');

  useEffect(() => {
    const token = params.get('token');
    if (!token) {
      setError('Token SSO no recibido');
      return;
    }
    (async () => {
      try {
        const shellToken = localStorage.getItem('token');
        if (shellToken) localStorage.setItem('d28d_token', shellToken);
        localStorage.setItem('d28d_shell', 'true');
        localStorage.setItem('d28d_shell_label', import.meta.env.VITE_BRAND_NAME || 'D28D Gimnasio Virtual');

        const { data } = await api.post('/food-module/exchange', { token });
        const payload = data?.data || data;
        localStorage.setItem('token', payload.accessToken);
        localStorage.setItem('refreshToken', payload.refreshToken || '');
        localStorage.setItem('user', JSON.stringify(payload.user));
        localStorage.setItem('subscription', JSON.stringify(payload.subscription || null));
        if (payload.branding) {
          localStorage.setItem('shellBranding', JSON.stringify(payload.branding));
        }
        dispatch({
          type: 'auth/login/fulfilled',
          payload: {
            accessToken: payload.accessToken,
            refreshToken: payload.refreshToken,
            user: payload.user,
            subscription: payload.subscription,
          },
        });
        navigate('/dashboard', { replace: true });
      } catch (err) {
        setError(err.response?.data?.error || err.message || 'Error conectando con Food Plan');
      }
    })();
  }, [params, navigate, dispatch]);

  return (
    <div className="min-h-screen grid place-items-center p-6 bg-gray-50">
      <div className="text-center max-w-md">
        <h1 className="text-xl font-semibold text-primary-700 mb-2">Food Plan</h1>
        {error ? (
          <>
            <p className="text-red-600 mb-4">{error}</p>
            <a href="/" className="text-primary-600 underline">Volver a D28D</a>
          </>
        ) : (
          <p className="text-slate-600">Conectando tu sesión…</p>
        )}
      </div>
    </div>
  );
}

function FoodPlanRoutes() {
  const dispatch = useDispatch();
  useEffect(() => {
    bootstrapAuthFromStorage(dispatch);
  }, [dispatch]);

  return (
    <div className="food-plan-root min-h-screen">
      <Routes>
        <Route path="/shell-sso" element={<FoodShellSsoGate />} />
        <Route path="/*" element={<FoodApp />} />
      </Routes>
    </div>
  );
}

export default function FoodPlanShell() {
  useEffect(() => {
    localStorage.setItem('d28d_shell', 'true');
    if (!localStorage.getItem('d28d_shell_label')) {
      localStorage.setItem('d28d_shell_label', import.meta.env.VITE_BRAND_NAME || 'D28D Gimnasio Virtual');
    }
  }, []);

  return (
    <Provider store={foodStore}>
      <BrowserRouter basename="/food-plan">
        <FoodPlanRoutes />
        <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
      </BrowserRouter>
    </Provider>
  );
}
