import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getAdultUser, clearAdultAuth } from '../utils/authStorage';
import { adultSocialAPI } from '../services/api';
import LanguageSwitcher from './LanguageSwitcher';

/** Top navigation for adult learners (hidden when printing the certificate). */
const AdultNavbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const user = getAdultUser();
  const [open, setOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [attention, setAttention] = useState(0);
  const menuRef = useRef(null);

  useEffect(() => { setOpen(false); setNavOpen(false); }, [location.pathname]);

  // Small badge for pending friend requests, unread messages and cheers.
  useEffect(() => {
    let live = true;
    const check = () => adultSocialAPI.summary()
      .then((r) => { if (live) setAttention(r.data.attention || 0); })
      .catch(() => { if (live) setAttention(0); });
    check();
    const timer = setInterval(check, 30000);
    return () => { live = false; clearInterval(timer); };
  }, []);
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const logout = () => {
    clearAdultAuth();
    navigate('/adult/auth', { replace: true });
  };

  const links = [
    { to: '/adult/dashboard', label: t('ad.course'), icon: '📚', match: ['/adult/dashboard', '/adult/module', '/adult/lesson'] },
    { to: '/adult/coach', label: t('adc.navLabel'), icon: '🤖' },
    { to: '/adult/progress', label: t('ad.progress'), icon: '📈' },
    { to: '/adult/friends', label: t('adf.tab.friends'), icon: '🤝', badge: attention },
    { to: '/adult/playground', label: t('ad.playground'), icon: '💻' },
    { to: '/adult/certificate', label: t('ad.certificate'), icon: '🎓' },
  ];
  const active = (l) => (l.match || [l.to]).some((p) => location.pathname.startsWith(p));
  const initials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase() || 'JK';

  return (
    <nav className="glass-bar print:hidden" aria-label={t('ad.mainNav')}>
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-14 gap-3">
          {/* Brand */}
          <Link to="/adult/dashboard" className="flex items-center gap-2 shrink-0">
            <span className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-lg font-bold text-white shadow-lg shadow-indigo-600/30" aria-hidden="true">{'</>'}</span>
            <span className="leading-tight">
              <span className="block font-bold text-slate-900 text-sm">KidsCode</span>
              <span className="hidden lg:block text-[9px] lg:text-[10px] text-indigo-500 font-semibold uppercase tracking-wider">{t('ad.professionalDevelopment')}</span>
            </span>
          </Link>

          {/* Centre nav links (tablet + desktop) */}
          <div className="hidden md:flex items-center gap-0.5 xl:gap-1">
            {links.map((l) => {
              const isActive = active(l);
              return (
                <Link
                  key={l.to}
                  to={l.to}
                  title={l.label}
                  aria-label={l.label}
                  aria-current={isActive ? 'page' : undefined}
                  className={`group relative flex items-center gap-1.5 xl:gap-2 rounded-full px-2 xl:px-3.5 py-1.5 text-[11px] xl:text-sm transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-indigo-50 font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-200'
                      : 'font-medium text-slate-500 border border-transparent hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <span
                    className={`w-5 h-5 xl:w-6 xl:h-6 rounded-full flex items-center justify-center text-[10px] xl:text-[11px] transition-colors ${
                      isActive ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/40' : 'bg-slate-100 text-slate-500 group-hover:bg-white'
                    }`}
                    aria-hidden="true"
                  >
                    {l.icon}
                  </span>
                  <span className="hidden xl:inline">{l.label}</span>
                  {l.badge > 0 && <span className="rounded-full bg-rose-500 text-white text-[10px] px-1.5 py-0.5" aria-label={`${l.badge} new`}>{l.badge}</span>}
                  {isActive && <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-indigo-600" aria-hidden="true" />}
                </Link>
              );
            })}
          </div>

          {/* Right: language switcher + profile + mobile menu button */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:block"><LanguageSwitcher /></div>

            {/* Mobile menu button (only visible < md) */}
            <button
              type="button"
              onClick={() => setNavOpen((o) => !o)}
              aria-expanded={navOpen}
              aria-controls="adult-mobile-nav"
              aria-label={navOpen ? 'Close menu' : 'Open menu'}
              className="md:hidden w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
            >
              {navOpen ? '✕' : '☰'}
            </button>

            <div className="relative" ref={menuRef}>
              <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="menu"
                className="flex items-center gap-2 px-2 sm:px-3 py-2 rounded-xl bg-white border border-slate-200 hover:border-indigo-300 hover:bg-slate-50 transition-colors shadow-sm">
                <span className="w-8 h-8 rounded-lg bg-indigo-500 text-white font-bold flex items-center justify-center text-sm shadow-md shadow-indigo-500/30">{initials}</span>
                <span className="hidden lg:block text-left">
                  <span className="block text-sm font-semibold text-slate-900 leading-tight">{user?.firstName} {user?.lastName}</span>
                  <span className="block text-[10px] text-slate-400">{t('ad.adultLearner')}</span>
                </span>
                <span className="text-slate-400 text-xs" aria-hidden="true">▾</span>
              </button>
              {open && (
                <div role="menu" className="absolute right-0 mt-2 w-64 sm:w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 py-3 z-50 animate-pop">
                  <div className="px-4 py-3 border-b border-slate-100">
                    <div className="text-sm font-semibold text-slate-900 truncate">{user?.firstName} {user?.lastName}</div>
                    <div className="text-xs text-slate-500 truncate">{user?.email}</div>
                  </div>
                  <Link role="menuitem" to="/adult/profile" className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors">
                    <span className="w-5 text-center">👤</span> {t('ad.profileSettings')}
                  </Link>
                  <Link role="menuitem" to="/adult/progress" className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors">
                    <span className="w-5 text-center">📈</span> {t('ad.myProgress')}
                  </Link>
                  <Link role="menuitem" to="/adult/friends" className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors">
                    <span className="w-5 text-center">🤝</span> {t('adf.tab.friends')}
                  </Link>
                  <Link role="menuitem" to="/adult/certificate" className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors">
                    <span className="w-5 text-center">🎓</span> {t('ad.certificate')}
                  </Link>
                  <div className="border-t border-slate-100 my-1" />
                  <button role="menuitem" type="button" onClick={logout} className="w-full text-left flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 font-semibold hover:bg-red-50 hover:text-red-700 transition-colors">
                    <span className="w-5 text-center">🚪</span> {t('ad.signOut')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile menu panel */}
        {navOpen && (
          <div id="adult-mobile-nav" className="md:hidden pb-3 animate-fade-in">
            <div className="grid grid-cols-1 gap-1">
              {links.map((l) => {
                const isActive = active(l);
                return (
                  <Link
                    key={l.to}
                    to={l.to}
                    aria-current={isActive ? 'page' : undefined}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                      isActive
                        ? 'bg-indigo-50 font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-200'
                        : 'font-medium text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${isActive ? 'bg-indigo-600 text-white' : 'bg-slate-100'}`} aria-hidden="true">{l.icon}</span>
                    <span className="flex-1">{l.label}</span>
                    {l.badge > 0 && <span className="rounded-full bg-rose-500 text-white text-[10px] px-2 py-0.5">{l.badge}</span>}
                  </Link>
                );
              })}
            </div>
            <div className="sm:hidden mt-3 px-1"><LanguageSwitcher /></div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default AdultNavbar;