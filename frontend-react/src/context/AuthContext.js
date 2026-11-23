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
  const [currentToken, setCurrentToken] = useState(null);
  const [userProgress, setUserProgress] = useState({});
  const [userXP, setUserXP] = useState(0);
  const [userStreak, setUserStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [accountType, setAccountType] = useState('child'); // 'parent' or 'child'

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('codequest_token');
    const user = localStorage.getItem('codequest_user');

    // Validate token isn't corrupted (basic check)
    if (token && token.length > 8000) {
      console.warn('Token too large, clearing...');
      localStorage.removeItem('codequest_token');
      localStorage.removeItem('codequest_user');
      setLoading(false);
      return;
    }

    if (token && user) {
      try {
        const parsedUser = JSON.parse(user);

        // Safety net: adult_learner accounts must NEVER hydrate the kids AuthContext.
        // This prevents cross-contamination if a legacy key was written incorrectly.
        if (parsedUser.accountType === 'adult_learner') {
          console.warn('[AuthContext] Rejected adult_learner user from kids context. Clearing.');
          localStorage.removeItem('codequest_token');
          localStorage.removeItem('codequest_user');
          setLoading(false);
          return;
        }

        setCurrentToken(token);
        setCurrentUser(parsedUser);
        setAccountType(parsedUser.accountType || 'child');

        // Only load progress for child accounts
        if (parsedUser.accountType === 'child' || !parsedUser.accountType) {
          await loadProgress();
        }
      } catch (err) {
        console.error('Failed to restore session:', err);
        localStorage.removeItem('codequest_token');
        localStorage.removeItem('codequest_user');
      }
    }
    setLoading(false);
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
      // Clear any existing corrupted tokens first
      localStorage.removeItem('codequest_token');
      localStorage.removeItem('codequest_user');
      
      const res = await authAPI.login(email, password);
      setCurrentToken(res.data.token);
      setCurrentUser(res.data.user);
      setAccountType(res.data.user.accountType || 'child');
      localStorage.setItem('codequest_token', res.data.token);
      localStorage.setItem('codequest_user', JSON.stringify(res.data.user));
      
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
      localStorage.removeItem('codequest_token');
      localStorage.removeItem('codequest_user');
      
      const res = await authAPI.parentLogin(email, password);
      setCurrentToken(res.data.token);
      setCurrentUser(res.data.user);
      setAccountType('parent');
      localStorage.setItem('codequest_token', res.data.token);
      localStorage.setItem('codequest_user', JSON.stringify(res.data.user));
      
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
      setCurrentToken(res.data.token);
      setCurrentUser(res.data.user);
      setAccountType(res.data.user.accountType || 'child');
      localStorage.setItem('codequest_token', res.data.token);
      localStorage.setItem('codequest_user', JSON.stringify(res.data.user));
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
      setCurrentToken(res.data.token);
      setCurrentUser(res.data.user);
      setAccountType('parent');
      localStorage.setItem('codequest_token', res.data.token);
      localStorage.setItem('codequest_user', JSON.stringify(res.data.user));
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
      localStorage.removeItem('codequest_token');
      localStorage.removeItem('codequest_user');
      
      const res = await authAPI.teacherLogin(email, password);
      setCurrentToken(res.data.token);
      setCurrentUser(res.data.user);
      setAccountType('teacher');
      localStorage.setItem('codequest_token', res.data.token);
      localStorage.setItem('codequest_user', JSON.stringify(res.data.user));
      
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
      setCurrentToken(res.data.token);
      setCurrentUser(res.data.user);
      setAccountType('teacher');
      localStorage.setItem('codequest_token', res.data.token);
      localStorage.setItem('codequest_user', JSON.stringify(res.data.user));
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
      const res = await parentAPI.switchToChild(childId);
      setCurrentToken(res.data.token);
      setCurrentUser(res.data.child);
      setAccountType('child');
      localStorage.setItem('codequest_token', res.data.token);
      localStorage.setItem('codequest_user', JSON.stringify(res.data.child));
      await loadProgress();
      return { success: true };
    } catch (err) {
      return { 
        success: false, 
        error: err.response?.data?.error || 'Failed to switch to child account' 
      };
    }
  };

  const logout = () => {
    setCurrentUser(null);
    setCurrentToken(null);
    setUserProgress({});
    setUserXP(0);
    setUserStreak(0);
    setAccountType('child');
    // Only clear kids keys — adult session remains untouched
    localStorage.removeItem('codequest_token');
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
    currentToken,
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
    switchToChild
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
