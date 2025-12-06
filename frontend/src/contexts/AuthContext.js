import { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'sonner';
import * as api from '../lib/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Verifica se existe token no localStorage
  const getToken = () => {
    return localStorage.getItem('auth_token');
  };

  // Salva token no localStorage
  const setToken = (token) => {
    localStorage.setItem('auth_token', token);
  };

  // Remove token do localStorage
  const removeToken = () => {
    localStorage.removeItem('auth_token');
  };

  // Valida token e carrega dados do usuário
  const validateToken = async () => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const userData = await api.getCurrentUser();
      setUser(userData);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Token inválido ou expirado:', error);
      removeToken();
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  // Login
  const login = async (email, password) => {
    try {
      setLoading(true);
      const response = await api.login(email, password);
      
      if (response.access_token) {
        setToken(response.access_token);
        // Carrega dados do usuário
        const userData = await api.getCurrentUser();
        setUser(userData);
        setIsAuthenticated(true);
        toast.success('Login realizado com sucesso!');
        return { success: true, user: userData };
      }
      
      throw new Error('Token não recebido');
    } catch (error) {
      console.error('Erro no login:', error);
      const status = error.response?.status;
      let errorMessage = error.response?.data?.detail || error.message || 'Erro ao fazer login';
      if (status === 401) errorMessage = 'Email ou senha inválidos.';
      if (status === 404) errorMessage = 'Servidor indisponível. Tente novamente em instantes.';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Registro
  const register = async (userData) => {
    try {
      setLoading(true);
      const response = await api.register(userData);
      
      if (response.id) {
        toast.success('Conta criada com sucesso! Faça login para continuar.');
        return { success: true, user: response };
      }
      
      throw new Error('Erro ao criar conta');
    } catch (error) {
      console.error('Erro no registro:', error);
      const status = error.response?.status;
      let errorMessage = error.response?.data?.detail || error.message || 'Erro ao criar conta';
      if (status === 400) errorMessage = error.response?.data?.detail || 'Dados inválidos ou já usados.';
      if (status === 404) errorMessage = 'Servidor indisponível. Tente novamente em instantes.';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Logout
  const logout = () => {
    removeToken();
    setUser(null);
    setIsAuthenticated(false);
    toast.info('Logout realizado com sucesso!');
  };

  // Atualiza dados do usuário
  const updateUser = (userData) => {
    setUser(userData);
  };

  // Valida token ao carregar a aplicação
  useEffect(() => {
    validateToken();
    
    // Listener para eventos de não autorizado (401)
    const handleUnauthorized = () => {
      removeToken();
      setUser(null);
      setIsAuthenticated(false);
    };
    
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, []);

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    register,
    logout,
    updateUser,
    getToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

