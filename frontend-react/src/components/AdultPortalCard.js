import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { adultAPI } from '../services/api';

/**
 * The "Professional Development" card on the children's sign-in page. The numbers come
 * from the course itself (GET /api/adult/overview), so they stay true as lessons are added;
 * the fallback below is only shown if that request fails.
 */
const FALLBACK = { modules: 23, lessons: 101, requiredHours: 123, courses: [] };

/** The six courses in display order (ids match the backend's COURSES). */
const COURSES = [
  { id: 1, icon: '🌐' },
  { id: 2, icon: '☕' },
  { id: 3, icon: '🐍' },
  { id: 4, icon: '🗄️' },
  { id: 5, icon: '🧮' },
  { id: 6, icon: '🔢' },
];

const AdultPortalCard = () => {
  const { t } = useTranslation();
  const [info, setInfo] = useState(FALLBACK);

  useEffect(() => {
    let alive = true;
    adultAPI.overview().then((r) => { if (alive && r.data && r.data.modules) setInfo(r.data); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  const lessonsIn = (id) => (info.courses.find((c) => c.id === id) || {}).lessons;

  return (
    <div className="mt-8 w-full max-w-md">
      <div className="relative" aria-hidden="true">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-300" /></div>
        <div className="relative flex justify-center text-sm">
          <span className="px-4 bg-sky-50/50 text-slate-500 font-medium">{t('adp.divider')}</span>
        </div>
      </div>

      <Link to="/adult/auth" className="mt-6 block group rounded-2xl focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-300">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border-2 border-slate-700 group-hover:border-indigo-500 transition-all duration-300 shadow-lg group-hover:shadow-xl">
          <div className="flex items-start gap-4">
            <div className="text-4xl group-hover:scale-110 transition-transform" aria-hidden="true">💼</div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-white text-lg mb-1 group-hover:text-indigo-300 transition-colors">{t('adp.title')}</h3>
              <p className="text-slate-300 text-sm mb-3">{t('adp.description')}</p>
            </div>
          </div>

          {/* The courses on offer */}
          <ul className="grid grid-cols-2 gap-2 mt-1">
            {COURSES.map((c) => (
              <li key={c.id} className="flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-3 py-2 min-w-0">
                <span aria-hidden="true">{c.icon}</span>
                <span className="min-w-0">
                  <span className="block text-white text-xs font-semibold leading-tight">{t(`ad.stage.${c.id}`)}</span>
                  {lessonsIn(c.id) ? <span className="block text-slate-400 text-[11px]">{t('adp.lessons', { count: lessonsIn(c.id) })}</span> : null}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-4 pt-4 border-t border-slate-700 grid grid-cols-4 gap-2 text-center">
            {[
              [info.modules, t('adp.modules')],
              [info.lessons, t('adp.lessonsLabel')],
              [info.requiredHours, t('adp.hours')],
              ['📜', t('adp.certificate')],
            ].map(([value, label]) => (
              <div key={label}>
                <div className="text-indigo-400 font-bold text-lg">{value}</div>
                <div className="text-slate-400 text-xs">{label}</div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center gap-2 text-indigo-400 text-sm font-medium group-hover:gap-3 transition-all">
            <span>{t('adp.cta')}</span>
            <span className="group-hover:translate-x-1 transition-transform" aria-hidden="true">→</span>
          </div>
        </div>
      </Link>
    </div>
  );
};

export default AdultPortalCard;
