import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getAdultUser, clearAdultAuth } from '../utils/authStorage';
import LanguageSwitcher from './LanguageSwitcher';

/** Top navigation for adult learners (hidden when printing the certificate). */
const AdultNavbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const user = getAdultUser();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => { setOpen(false); }, [location.pathname]);
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
    { to: '/adult/progress', label: t('ad.progress'), icon: '📈' },
    { to: '/adult/playground', label: t('ad.playground'), icon: '💻' },
    { to: '/adult/certificate', label: t('ad.certificate'), icon: '🎓' },
  ];
  const active = (l) => (l.match || [l.to]).some((p) => location.pathname.startsWith(p));
  const initials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase() || 'A';

  return (
    <nav className="bg-slate-900 border-b border-slate-800 print:hidden" aria-label={t('ad.mainNav')}>
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16 gap-3">
          <Link to="/adult/dashboard" className="flex items-center gap-3 shrink-0">
            <span className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-lg" aria-hidden="true">{'</>'}</span>
            <span className="leading-tight">
              <span className="block font-bold text-white">KidsCode</span>
              <span className="block text-[11px] text-indigo-300 font-semibold">{t('ad.professionalDevelopment')}</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {links.map((l) => (
              <Link key={l.to} to={l.to} aria-current={active(l) ? 'page' : undefined}
                className={`px-3 py-2 rounded-lg text-sm font-semibold transition ${active(l) ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:text-white hover:bg-slate-800'}`}>
                <span className="mr-1.5" aria-hidden="true">{l.icon}</span>{l.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:block"><LanguageSwitcher /></div>
            <div className="relative" ref={menuRef}>
              <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="menu"
                className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-slate-800">
                <span className="w-9 h-9 rounded-full bg-indigo-500 text-white font-bold flex items-center justify-center">{initials}</span>
                <span className="hidden lg:block text-left">
                  <span className="block text-sm font-semibold text-white">{user?.firstName} {user?.lastName}</span>
                  <span className="block text-[11px] text-slate-400">{t('ad.adultLearner')}</span>
                </span>
                <span className="text-slate-400 text-xs" aria-hidden="true">▾</span>
              </button>
              {open && (
                <div role="menu" className="absolute right-0 mt-2 w-60 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <div className="text-sm font-semibold text-slate-900">{user?.firstName} {user?.lastName}</div>
                    <div className="text-xs text-slate-500 truncate">{user?.email}</div>
                  </div>
                  <Link role="menuitem" to="/adult/profile" className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">👤 {t('ad.profileSettings')}</Link>
                  <Link role="menuitem" to="/adult/progress" className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">📈 {t('ad.myProgress')}</Link>
                  <Link role="menuitem" to="/adult/certificate" className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">🎓 {t('ad.certificate')}</Link>
                  <div className="sm:hidden px-4 py-2"><LanguageSwitcher /></div>
                  <div className="border-t border-slate-100 my-1" />
                  <button role="menuitem" type="button" onClick={logout} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">🚪 {t('ad.signOut')}</button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Phones: links in one scrollable row */}
        <div className="md:hidden flex gap-1 overflow-x-auto pb-3 -mx-1 px-1">
          {links.map((l) => (
            <Link key={l.to} to={l.to} aria-current={active(l) ? 'page' : undefined}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-sm font-semibold ${active(l) ? 'bg-indigo-600 text-white' : 'text-slate-300 bg-slate-800'}`}>
              {l.icon} {l.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default AdultNavbar;
