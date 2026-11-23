import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { adultAPI } from '../services/api';
import { getAdultUser } from '../utils/authStorage';
import { Page, Card, Loading, ErrorBox, studyTime, Ring, COURSES } from '../components/AdultUi';

/**
 * Adult learner dashboard: grid of 4 clickable course cards,
 * each with progress, hours, and status. Clicking a card opens the course view.
 */
const AdultDashboard = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const user = getAdultUser();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setError('');
    adultAPI.curriculum().then((r) => setData(r.data)).catch((e) => setError(e.response?.data?.error || t('ad.loadFailed')));
  }, [t]);
  useEffect(() => { load(); }, [load]);

  if (error) return <Page><ErrorBox message={error} onRetry={load} /></Page>;
  if (!data) return <Page><Loading /></Page>;

  const { stats, curriculum } = data;
  const started = stats.completedLessons > 0;

  return (
    <Page wide>
      {/* ===== Header ===== */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">
          {t('ad.hello', { name: user?.firstName || 'Learner' })} 👋
        </h1>
        <p className="text-slate-600">{t('ad.coursesAvailable', { count: COURSES.length })}</p>
      </div>

      {/* ===== Quick Stats ===== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-8">
        {[
          { icon: '📚', tint: 'bg-indigo-100 text-indigo-700', label: t('ad.lessons'), value: `${stats.completedLessons}/${stats.totalLessons}`, sub: t('ad.completed') },
          { icon: '⏱️', tint: 'bg-emerald-100 text-emerald-700', label: t('ad.studyTime'), value: studyTime(stats.minutesLogged, stats.hoursLogged), sub: t('ad.logged') },
          { icon: '🎯', tint: 'bg-violet-100 text-violet-700', label: t('ad.averageScore'), value: started ? `${stats.averageScore}%` : '—', sub: t('ad.inProgress') },
          { icon: '🏆', tint: 'bg-amber-100 text-amber-700', label: t('ad.courses'), value: COURSES.length, sub: t('ad.available') },
        ].map((s) => (
          <Card key={s.label} className="p-4 md:p-5 flex items-center gap-3 md:gap-4">
            <span className={`w-11 h-11 md:w-12 md:h-12 shrink-0 rounded-xl flex items-center justify-center text-xl ${s.tint}`} aria-hidden="true">{s.icon}</span>
            <span className="min-w-0">
              <span className="block text-xs font-medium text-slate-500 truncate">{s.label}</span>
              <span className="block text-xl md:text-2xl font-bold text-slate-900 leading-tight">{s.value}</span>
              <span className="block text-[11px] text-slate-500 truncate">{s.sub}</span>
            </span>
          </Card>
        ))}
      </div>

      {/* ===== Course Grid ===== */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">{t('ad.learningPath')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {COURSES.map((course) => {
            const courseModules = curriculum.filter((m) => course.modules.includes(m.id));
            const courseLessons = courseModules.flatMap((m) => m.lessons);
            const done = courseLessons.filter((l) => l.completed).length;
            const total = courseLessons.length;
            const complete = total > 0 && done === total;
            const pct = total ? Math.round((100 * done) / total) : 0;

            return (
              <button
                key={course.id}
                onClick={() => navigate(`/adult/course/${course.id}/view`)}
                className="group flex flex-col h-full text-left rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-lg hover:border-indigo-300 transition transform hover:-translate-y-1"
              >
                {/* Course Header */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl flex-shrink-0" style={{ background: `${course.color}20` }}>
                    {course.icon}
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                      {t('ad.courseN', { n: course.id })}
                    </span>
                    {complete && (
                      <span className="inline-block px-2 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        ✓ {t('ad.done')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Title & Description */}
                <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-indigo-600 transition line-clamp-2">
                  {course.title}
                </h3>
                <p className="text-sm text-slate-600 mb-4 flex-1 line-clamp-2">
                  {`Learn ${course.title.toLowerCase()} with ${courseModules.length} module${courseModules.length !== 1 ? 's' : ''} and ${total} lesson${total !== 1 ? 's' : ''}.`}
                </p>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 mb-4 py-4 border-t border-b border-slate-100">
                  <div>
                    <span className="text-xs text-slate-500 block">{t('ad.lessons')}</span>
                    <span className="text-sm font-bold text-slate-900">{done}/{total}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">{t('ad.hours')}</span>
                    <span className="text-sm font-bold text-slate-900">{courseModules.reduce((sum, m) => sum + (m.estimated_hours || 0), 0)}h</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">{t('ad.modules')}</span>
                    <span className="text-sm font-bold text-slate-900">{courseModules.length}</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs font-semibold text-slate-700">{t('ad.progress')}</span>
                    <span className="text-xs font-bold text-indigo-600">{pct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${complete ? 'bg-emerald-500' : 'bg-indigo-600'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* Action Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(`/adult/course/${course.id}/view`);
                  }}
                  className="w-full px-4 py-2 rounded-xl bg-indigo-50 text-indigo-600 font-semibold hover:bg-indigo-100 transition group-hover:bg-indigo-600 group-hover:text-white"
                >
                  {complete ? t('ad.review') : done > 0 ? t('ad.continue') : t('ad.start')} →
                </button>
              </button>
            );
          })}
        </div>
        </div>
      {/* ===== Bottom Action ===== */}
      <div className="mt-12 text-center">
        <Card className="p-8 bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
          <div className="flex flex-col items-center gap-3 md:flex-row md:justify-center md:gap-4">
            <div className="text-left md:text-center">
              <h2 className="text-lg font-bold text-slate-900 mb-1">{t('ad.needHelp')}</h2>
              <p className="text-sm text-slate-600">{t('ad.haveQuestions')}</p>
            </div>
            <div className="flex gap-2 w-full md:w-auto md:flex-col">
              <Link to="/adult/coach" className="flex-1 md:flex-none px-4 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition">
                🤖 {t('adc.title')}
              </Link>
              <Link to="/adult/progress" className="flex-1 md:flex-none px-4 py-2 rounded-lg bg-white border border-indigo-300 text-indigo-600 font-semibold hover:bg-indigo-50 transition">
                📈 {t('ad.myProgress')}
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </Page>
  );
};

export default AdultDashboard;
