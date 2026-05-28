import { useState, useEffect } from 'react';
import { authService } from '../services/api';
import { AuthContext } from './authCtx';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token') || null);

  // Verificar si hay una sesión activa
  useEffect(() => {
    const validateToken = async () => {
      try {
        if (token) {
          const response = await authService.getProfile();
          setUser(response.data);
        } else {
          setUser(null);
        }
      } catch (error) {
        // Si el token es inválido/expirado, limpiar
        if (error.response?.status === 401 || error.response?.status === 403) {
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    };

    validateToken();
  }, [token]);

  const login = async (email, password) => {
    const response = await authService.login(email, password);
    const { token, user } = response.data;
    localStorage.setItem('token', token);
    setToken(token);
    setUser(user);
    return response.data;
  };

  const register = async (userData) => {
    const response = await authService.register(userData);
    return response.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const refreshProfile = async () => {
    if (!token) return null;
    const response = await authService.getProfile();
    setUser(response.data);
    return response.data;
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
