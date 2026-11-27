import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { childAPI } from '../services/api';

const RestrictionsContext = createContext();

export const useRestrictions = () => {
  const context = useContext(RestrictionsContext);
  if (!context) {
    throw new Error('useRestrictions must be used within RestrictionsProvider');
  }
  return context;
};

export const RestrictionsProvider = ({ children }) => {
  const { currentUser, accountType } = useAuth();
  const [restrictions, setRestrictions] = useState(null);
  const [timeSpentToday, setTimeSpentToday] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [loading, setLoading] = useState(true);

  // Load restrictions for child accounts
  const loadRestrictions = useCallback(async () => {
    if (accountType !== 'child' || !currentUser?.id) {
      setLoading(false);
      return;
    }

    try {
      // Children read their own restrictions directly; the server is the
      // authoritative gate, this context only powers the friendly UI banner.
      const res = await childAPI.restrictions();
      const active = res.data.restrictions;
      setRestrictions(active);

      checkAllowedDay(active);

      // Load today's time spent from localStorage
      const today = new Date().toDateString();
      const storedData = localStorage.getItem(`session_time_${currentUser.id}`);
      if (storedData) {
        const { date, minutes } = JSON.parse(storedData);
        if (date === today) {
          setTimeSpentToday(minutes);
          checkTimeLimit(minutes, active);
        } else {
          setTimeSpentToday(0);
          localStorage.setItem(`session_time_${currentUser.id}`, JSON.stringify({ date: today, minutes: 0 }));
        }
      } else {
        localStorage.setItem(`session_time_${currentUser.id}`, JSON.stringify({ date: today, minutes: 0 }));
      }
    } catch (err) {
      console.error('Failed to load restrictions:', err);
      // If we can't load restrictions, don't block the child
    } finally {
      setLoading(false);
    }
  }, [currentUser, accountType]);

  useEffect(() => {
    loadRestrictions();
  }, [loadRestrictions]);

  // Start session timer
  useEffect(() => {
    if (accountType === 'child' && currentUser && !isBlocked && restrictions) {
      // Update time spent every minute
      const interval = setInterval(() => {
        setTimeSpentToday(prevTime => {
          const newTimeSpent = prevTime + 1; // Increment by 1 minute
          
          // Save to localStorage
          const today = new Date().toDateString();
          localStorage.setItem(`session_time_${currentUser.id}`, JSON.stringify({ 
            date: today, 
            minutes: newTimeSpent 
          }));
          
          // Check time limit
          if (restrictions?.maxDailyMinutes && newTimeSpent >= restrictions.maxDailyMinutes) {
            setIsBlocked(true);
            setBlockReason(`You've reached your daily time limit of ${restrictions.maxDailyMinutes} minutes. Come back tomorrow!`);
          }
          
          return newTimeSpent;
        });
      }, 60000); // Check every minute

      return () => clearInterval(interval);
    }
  }, [accountType, currentUser, isBlocked, restrictions]);

  // Check if current day is allowed
  const checkAllowedDay = (restr) => {
    if (!restr || !restr.allowedDays || restr.allowedDays.length === 0) {
      return; // No restriction
    }

    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const isAllowed = restr.allowedDays.includes(today);
    
    if (!isAllowed) {
      setIsBlocked(true);
      setBlockReason(`You can only use KIDSCODE on: ${restr.allowedDays.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(', ')}`);
    }
  };

  // Check if time limit is exceeded
  const checkTimeLimit = (minutes, restr) => {
    if (!restr || !restr.maxDailyMinutes) {
      return; // No time limit
    }

    if (minutes >= restr.maxDailyMinutes) {
      setIsBlocked(true);
      setBlockReason(`You've reached your daily time limit of ${restr.maxDailyMinutes} minutes. Come back tomorrow!`);
    }
  };

  // Get remaining time
  const getRemainingTime = () => {
    if (!restrictions || !restrictions.maxDailyMinutes) {
      return null;
    }
    return Math.max(0, restrictions.maxDailyMinutes - timeSpentToday);
  };

  // Check if lesson requires approval
  // Stable identity so pages can safely list it in effect dependencies
  const requiresApproval = useCallback(
    () => restrictions?.requireParentApproval === true,
    [restrictions]
  );

  const value = {
    restrictions,
    isBlocked,
    blockReason,
    timeSpentToday,
    getRemainingTime,
    requiresApproval,
    loading,
    reloadRestrictions: loadRestrictions
  };

  return (
    <RestrictionsContext.Provider value={value}>
      {children}
    </RestrictionsContext.Provider>
  );
};
