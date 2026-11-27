import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useRestrictions } from '../context/RestrictionsContext';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Clock } from 'feather-icons-react';
import LanguageSwitcher from './LanguageSwitcher';

const Navbar = () => {
  const { currentUser, userXP, userStreak, logout, accountType, restoreParent } = useAuth();
  const { getRemainingTime } = useRestrictions();
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const returnToParent = async () => {
    setShowUserMenu(false);
    const result = await restoreParent();
    if (result.success) navigate('/parent-dashboard');
  };
  
  const remainingMinutes = getRemainingTime();

  const level = Math.floor((userXP || 0) / 200) + 1;
  const currentXP = (userXP || 0) % 200;
  const xpPercent = Math.min(100, (currentXP / 200) * 100);

  const isActive = (path) => location.pathname === path;
  const isChild = accountType !== "parent" && accountType !== "teacher";
  const displayName = isChild
    ? (currentUser?.username?.split("_")[0] || t('nav.defaultCoder'))
    : (currentUser?.firstName || (accountType === "teacher" ? t('nav.defaultTeacher') : t('nav.defaultParent')));

  // Every role gets a scrollable strip of links on small screens.
  const mobileLinks = accountType === 'parent'
    ? [{ to: '/parent-dashboard', label: t('nav.dashboard'), icon: '👨‍👩‍👧' }]
    : accountType === 'teacher'
    ? [{ to: '/teacher-dashboard', label: t('nav.dashboard'), icon: '👨‍🏫' }]
    : [
        { to: '/', label: t('nav.home'), icon: '🏠' },
        { to: '/curriculum', label: t('nav.learn'), icon: '📚' },
        { to: '/coach', label: t('nav.coach'), icon: '🤖' },
        { to: '/journey', label: t('nav.journey'), icon: '🗺️' },
        { to: '/playground', label: t('nav.playShort'), icon: '💻' },
        { to: '/profile', label: t('nav.meShort'), icon: '👤' }
      ];

  return (
    <nav className="navbar sticky top-0 z-40 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link to={accountType === 'parent' ? '/parent-dashboard' : accountType === 'teacher' ? '/teacher-dashboard' : '/'} className="flex items-center gap-2 cursor-pointer shrink-0">
          <img 
            src="/kidscode_logo.png" 
            alt="KIDSCODE" 
            className="h-12 w-auto md:h-14"
            onError={(e) => {
              // Fallback if logo image not found
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
          <div className="hidden items-center gap-2">
            <span className="text-2xl">🚀</span>
            <span className="font-display text-xl text-indigo-600">KIDSCODE</span>
          </div>
        </Link>

        <div className="hidden lg:flex items-center gap-1">
          {accountType === 'parent' ? (
            // Parent navigation
            <Link 
              to="/parent-dashboard" 
              className={`nav-item ${isActive('/parent-dashboard') ? 'active' : ''}`}
            >
              👨‍👩‍👧 {t('nav.dashboard')}
            </Link>
          ) : accountType === 'teacher' ? (
            // Teacher navigation
            <Link 
              to="/teacher-dashboard" 
              className={`nav-item ${isActive('/teacher-dashboard') ? 'active' : ''}`}
            >
              👨‍🏫 {t('nav.dashboard')}
            </Link>
          ) : (
            // Child navigation
            <>
              <Link 
                to="/" 
                className={`nav-item ${isActive('/') ? 'active' : ''}`}
              >
                🏠 {t('nav.home')}
              </Link>
              <Link 
                to="/curriculum" 
                className={`nav-item ${isActive('/curriculum') ? 'active' : ''}`}
              >
                📚 {t('nav.learn')}
              </Link>
              <Link 
                to="/coach" 
                className={`nav-item ${isActive('/coach') ? 'active' : ''}`}
              >
                🤖 {t('nav.coach')}
              </Link>
              <Link 
                to="/journey"
                className={`nav-item ${isActive('/journey') ? 'active' : ''}`}
              >
                🗺️ {t('nav.journey')}
              </Link>
              <Link 
                to="/playground" 
                className={`nav-item ${isActive('/playground') ? 'active' : ''}`}
              >
                💻 {t('nav.playground')}
              </Link>
              <Link 
                to="/profile" 
                className={`nav-item ${isActive('/profile') ? 'active' : ''}`}
              >
                👤 {t('nav.profile')}
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Time Remaining Indicator - Only for children with time limits */}
          {isChild && remainingMinutes !== null && (
            <div className={`hidden lg:flex items-center gap-1 px-3 py-1 rounded-lg ${
              remainingMinutes <= 10 ? 'bg-red-100 text-red-700' : 
              remainingMinutes <= 30 ? 'bg-yellow-100 text-yellow-700' : 
              'bg-green-100 text-green-700'
            }`}>
              <Clock size={14} />
              <span className="text-xs font-bold">{t('nav.timeLeft', { n: remainingMinutes })}</span>
            </div>
          )}

          {/* XP Display - Only for children */}
          {isChild && (
            <div className="hidden xl:flex items-center gap-2">
              <div className="level-badge">{level}</div>
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-yellow-600 text-xs font-bold">⭐ {userXP || 0} XP</span>
                </div>
                <div className="xp-bar w-20">
                  <div className="xp-fill" style={{ width: `${xpPercent}%` }}></div>
                </div>
              </div>
            </div>
          )}

          {/* Streak - Only for children */}
          {isChild && (
            <div className="text-orange-600 font-bold text-sm hidden xl:flex items-center gap-1">
              🔥 {userStreak}
            </div>
          )}

          {/* Language Switcher */}
          <LanguageSwitcher />

          {/* User Menu */}
          <div className="relative">
            <button 
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 btn-secondary text-sm py-2 px-3"
            >
              <span>👋</span>
              <span className="font-bold">
                {displayName}
              </span>
              <ChevronDown size={14} />
            </button>
            
            {showUserMenu && (
              <div className="absolute right-0 top-full mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl py-2 min-w-40 z-50">
                <div className="px-4 py-2 text-slate-600 text-xs font-bold border-b border-slate-200 mb-1">
                  {isChild ? currentUser?.username : currentUser?.email}
                </div>
                {isChild && (
                  <Link 
                    to="/profile" 
                    className="block px-4 py-2 hover:bg-slate-100 text-sm font-semibold"
                    onClick={() => setShowUserMenu(false)}
                  >
                    👤 {t('nav.myProfile')}
                  </Link>
                )}
                {accountType === 'parent' && (
                  <Link 
                    to="/parent-dashboard" 
                    className="block px-4 py-2 hover:bg-slate-100 text-sm font-semibold"
                    onClick={() => setShowUserMenu(false)}
                  >
                    👨‍👩‍👧 {t('nav.parentDashboard')}
                  </Link>
                )}
                {accountType === 'teacher' && (
                  <Link
                    to="/teacher-dashboard"
                    className="block px-4 py-2 hover:bg-slate-100 text-sm font-semibold"
                    onClick={() => setShowUserMenu(false)}
                  >
                    👨‍🏫 {t('nav.teacherDashboard')}
                  </Link>
                )}
                {currentUser?.switchedByParent && (
                  <button
                    type="button"
                    onClick={returnToParent}
                    className="w-full text-left px-4 py-2 hover:bg-indigo-50 text-sm font-semibold text-indigo-700"
                  >
                    ↩️ {t('nav.returnToParent')}
                  </button>
                )}
                <button 
                  onClick={logout}
                  className="w-full text-left px-4 py-2 hover:bg-slate-100 text-sm font-semibold text-red-400"
                >
                  🚪 {t('nav.signOut')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile nav for every role, not just children */}
      <div className="lg:hidden flex gap-2 mt-2 overflow-x-auto pb-1" aria-label={t('nav.sectionLinks')}>
        {mobileLinks.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className={`nav-item whitespace-nowrap ${isActive(link.to) ? 'active' : ''}`}
          >
            {link.icon} {link.label}
          </Link>
        ))}
      </div>
    </nav>
  );
};

export default Navbar;
