import React, { createContext, useState, useContext, useEffect } from 'react';
import { authAPI, progressAPI, parentAPI } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProgress, setUserProgress] = useState({});
  const [userXP, setUserXP] = useState(0);
  const [userStreak, setUserStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [accountType, setAccountType] = useState('child'); // 'parent' or 'child'

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearLegacyTokens = () => {
    // One-time migration: older builds kept JWTs in client-readable storage.
    ['codequest_token', 'codequest_parent_session', 'adult_token'].forEach((key) => localStorage.removeItem(key));
  };

  const checkAuth = async () => {
    clearLegacyTokens();
    try {
      const res = await authAPI.me();
      const user = res.data.user;
      if (user.accountType === 'adult_learner') {
        setLoading(false);
        return;
      }
      setCurrentUser(user);
      setAccountType(user.accountType || 'child');
      if (user.accountType === 'child' || !user.accountType) await loadProgress();
    } catch {
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  };

  const loadProgress = async () => {
    try {
      const res = await progressAPI.getProgress();
      const progressMap = {};
      res.data.progress.forEach(p => {
        progressMap[p.lesson_id] = p;
      });
      setUserProgress(progressMap);
      setUserXP(res.data.xp || 0);
      setUserStreak(res.data.streak || 0);
    } catch (err) {
      console.error('Failed to load progress:', err);
      if (err.response?.status === 401 || err.response?.status === 403 || err.response?.status === 431) {
        // Token might be corrupted or too large, logout and force re-login
        logout();
      }
    }
  };

  const login = async (email, password) => {
    try {
      const res = await authAPI.login(email, password);
      setCurrentUser(res.data.user);
      setAccountType(res.data.user.accountType || 'child');

      // Only load progress for child accounts
      if (res.data.user.accountType === 'child' || !res.data.user.accountType) {
        await loadProgress();
      }
      
      return { success: true };
    } catch (err) {
      return { 
        success: false, 
        error: err.response?.data?.error || 'Login failed' 
      };
    }
  };

  const parentLogin = async (email, password) => {
    try {
      const res = await authAPI.parentLogin(email, password);
      setCurrentUser(res.data.user);
      setAccountType('parent');
      return { success: true };
    } catch (err) {
      return { 
        success: false, 
        error: err.response?.data?.error || 'Parent login failed' 
      };
    }
  };

  const register = async (userData) => {
    try {
      const res = await authAPI.register(userData);
      setCurrentUser(res.data.user);
      setAccountType(res.data.user.accountType || 'child');
      return { success: true };
    } catch (err) {
      return { 
        success: false, 
        error: err.response?.data?.error || 'Registration failed' 
      };
    }
  };

  const parentRegister = async (parentData) => {
    try {
      const res = await authAPI.parentRegister(parentData);
      setCurrentUser(res.data.user);
      setAccountType('parent');
      return { success: true };
    } catch (err) {
      return { 
        success: false, 
        error: err.response?.data?.error || 'Parent registration failed' 
      };
    }
  };

  const teacherLogin = async (email, password) => {
    try {
      const res = await authAPI.teacherLogin(email, password);
      setCurrentUser(res.data.user);
      setAccountType('teacher');
      return { success: true };
    } catch (err) {
      return { 
        success: false, 
        error: err.response?.data?.error || 'Teacher login failed' 
      };
    }
  };

  const teacherRegister = async (teacherData) => {
    try {
      const res = await authAPI.teacherRegister(teacherData);
      setCurrentUser(res.data.user);
      setAccountType('teacher');
      return { success: true };
    } catch (err) {
      return { 
        success: false, 
        error: err.response?.data?.error || 'Teacher registration failed' 
      };
    }
  };

  const switchToChild = async (childId) => {
    try {
      // The server swaps the HttpOnly cookies and keeps the parent JWT server-side.
      await parentAPI.switchToChild(childId);
      const me = await authAPI.me();
      setCurrentUser(me.data.user);
      setAccountType('child');
      await loadProgress();
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.error || 'Failed to switch to child account'
      };
    }
  };

  const restoreParent = async () => {
    try {
      const res = await parentAPI.restore();
      setCurrentUser(res.data.user);
      setAccountType('parent');
      setUserProgress({});
      setUserXP(0);
      setUserStreak(0);
      return { success: true };
    } catch {
      return { success: false, error: 'Could not restore parent session' };
    }
  };

  const logout = async () => {
    try { await authAPI.logout(); } catch { /* clear local state either way */ }
    setCurrentUser(null);
    setUserProgress({});
    setUserXP(0);
    setUserStreak(0);
    setAccountType('child');
    clearLegacyTokens();
    localStorage.removeItem('codequest_user');
  };

  const updateProgress = async (moduleId, lessonId, completed, lastCode, score, learningMetrics = null) => {
    try {
      const progressData = {
        module_id: moduleId,
        lesson_id: lessonId,
        completed,
        last_code: lastCode,
        score
      };
      
      // Add learning metrics if provided (only when completing lesson)
      if (learningMetrics && completed) {
        progressData.learningMetrics = learningMetrics;
      }
      
      await progressAPI.saveProgress(progressData);
      await loadProgress();
    } catch (err) {
      console.error('Failed to save progress:', err);
    }
  };

  const value = {
    currentUser,
    userProgress,
    userXP,
    userStreak,
    loading,
    accountType,
    login,
    parentLogin,
    teacherLogin,
    register,
    parentRegister,
    teacherRegister,
    logout,
    updateProgress,
    loadProgress,
    switchToChild,
    restoreParent
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
