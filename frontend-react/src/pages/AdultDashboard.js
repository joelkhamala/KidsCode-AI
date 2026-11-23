import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { adultAPI } from '../services/api';
import { getAdultUser } from '../utils/authStorage';
import { Page, Card, Bar, Loading, ErrorBox, studyTime, Ring, STAGES, PASS_MARK as PASS } from '../components/AdultUi';

/**
 * Adult learner home: one hero (greeting, next lesson, overall progress), key numbers,
 * the learning path through the 8 modules (grouped HTML -> CSS -> JavaScript) and a side
 * column with the road to the certificate and shortcuts.
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

  const { stats, curriculum, nextLesson } = data;
  const started = stats.completedLessons > 0;
  const returning = started || (stats.minutesLogged || 0) >= 5;
  const hoursPct = Math.min(100, (100 * stats.hoursLogged) / stats.requiredHours);

  // Where the next lesson sits in its module.
  const nextModuleIndex = nextLesson ? curriculum.findIndex((m) => m.id === nextLesson.moduleId) : -1;
  const nextModule = nextModuleIndex >= 0 ? curriculum[nextModuleIndex] : null;
  const nextLessonInfo = nextModule ? nextModule.lessons.find((l) => l.id === nextLesson.id) : null;
  const nextPos = nextModule ? nextModule.lessons.findIndex((l) => l.id === nextLesson.id) + 1 : 0;

  const scoreOk = started && stats.averageScore >= PASS;
  const requirements = [
    { key: 'lessons', icon: '📚', label: t('ad.reqAllLessons'), value: `${stats.completedLessons}/${stats.totalLessons}`, pct: (100 * stats.completedLessons) / (stats.totalLessons || 1), met: stats.completedLessons >= stats.totalLessons && stats.totalLessons > 0 },
    { key: 'score', icon: '📝', label: t('ad.reqAverage', { n: PASS }), value: started ? `${stats.averageScore}%` : '—', pct: started ? Math.min(100, (100 * stats.averageScore) / PASS) : 0, met: scoreOk },
    { key: 'hours', icon: '⏱️', label: t('ad.reqHours', { n: stats.requiredHours }), value: studyTime(stats.minutesLogged, stats.hoursLogged), pct: hoursPct, met: stats.hoursLogged >= stats.requiredHours },
  ];
  const metCount = requirements.filter((r) => r.met).length;

  const heroTitle = nextLesson ? nextLesson.title
    : stats.certificateIssued ? t('ad.certificateIssuedTitle')
      : stats.eligible ? t('ad.getCertificateNow') : t('ad.moreHoursNeeded', { n: stats.requiredHours });
  const heroAction = nextLesson
    ? { to: `/adult/lesson/${nextLesson.id}`, label: `${started ? t('ad.continue') : t('ad.startCourse')} →` }
    : stats.certificateIssued || stats.eligible
      ? { to: '/adult/certificate', label: `🎓 ${stats.certificateIssued ? t('ad.viewCertificate') : t('ad.certificate')}` }
      : { to: '/adult/playground', label: `💻 ${t('ad.playground')}` };

  return (
    <Page wide>
      {/* ===== Hero ===== */}
      <section className="relative overflow-hidden rounded-3xl p-6 md:p-8 mb-6 text-white shadow-lg"
        style={{ background: 'radial-gradient(circle at 85% 15%, rgba(129,140,248,0.45), transparent 45%), linear-gradient(135deg, #0f172a 0%, #312e81 60%, #4c1d95 100%)' }}
        aria-labelledby="dash-title">
        <div className="absolute -right-10 -bottom-16 text-[180px] leading-none opacity-[0.06] select-none font-mono" aria-hidden="true">{'</>'}</div>
        <div className="relative grid lg:grid-cols-[1fr_auto] gap-8 items-center">
          <div className="min-w-0">
            <p className="text-indigo-200 text-sm font-semibold">{t('ad.courseName')} · {data.curriculumCode}</p>
            <h1 id="dash-title" className="text-2xl md:text-4xl font-bold mt-1">
              {t(returning ? 'ad.welcomeName' : 'ad.welcomeNew', { name: user?.firstName || '' })} 👋
            </h1>

            {/* Next up */}
            <div className="mt-6 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-sm p-4 md:p-5 max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-wider text-indigo-200">
                {nextLesson ? (started ? t('ad.continueWhere') : t('ad.startHere')) : t('ad.allLessonsDone')}
              </p>
              <div className="flex flex-wrap items-center gap-4 mt-2">
                <div className="flex-1 min-w-[12rem]">
                  <h2 className="text-xl md:text-2xl font-bold leading-snug">{heroTitle}</h2>
                  {nextModule && (
                    <p className="text-sm text-indigo-100 mt-1">
                      {nextModule.icon} {t('ad.moduleN', { n: nextModuleIndex + 1 })}: {nextModule.title} · {t('ad.lessonNofM', { n: nextPos, total: nextModule.lessons.length })}
                      {nextLessonInfo?.minutes ? ` · ⏱️ ${t('ad.aboutMinutes', { n: nextLessonInfo.minutes })}` : ''}
                    </p>
                  )}
                </div>
                <button type="button" onClick={() => navigate(heroAction.to)}
                  className="px-6 py-3 rounded-xl bg-white text-indigo-800 font-bold shadow-md hover:bg-indigo-50 hover:-translate-y-0.5 transition">
                  {heroAction.label}
                </button>
              </div>
            </div>
          </div>
          <div className="flex lg:flex-col items-center gap-4 justify-center">
            <Ring pct={stats.progressPercentage} label={t('ad.courseProgress')} />
            <p className="text-sm text-indigo-100 text-center">{t('ad.lessonsDoneOf', { done: stats.completedLessons, total: stats.totalLessons })}</p>
          </div>
        </div>
      </section>

      {/* ===== Key numbers ===== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-8">
        {[
          { icon: '📚', tint: 'bg-indigo-100 text-indigo-700', label: t('ad.lessons'), value: `${stats.completedLessons}/${stats.totalLessons}`, sub: t('ad.completed') },
          { icon: '⏱️', tint: 'bg-emerald-100 text-emerald-700', label: t('ad.studyTime'), value: studyTime(stats.minutesLogged, stats.hoursLogged), sub: t('ad.ofHours', { n: stats.requiredHours }) },
          { icon: '🎯', tint: 'bg-violet-100 text-violet-700', label: t('ad.averageScore'), value: started ? `${stats.averageScore}%` : '—', sub: started ? (scoreOk ? t('ad.passing') : t('ad.keepImproving')) : t('ad.noScoresYet') },
          { icon: '🎓', tint: stats.certificateIssued || stats.eligible ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700', label: t('ad.certificate'), value: stats.certificateIssued || stats.eligible ? '✓' : `${metCount}/3`, sub: stats.certificateIssued ? t('ad.issuedShort') : stats.eligible ? t('ad.readyToIssue') : t('ad.requirementsMet') },
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

      {/* minmax(0,1fr) on every screen size so long one-line descriptions can never widen the page. */}
      <div className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_340px] gap-6 items-start">
        {/* ===== Learning path ===== */}
        <section aria-labelledby="path-title" className="min-w-0">
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
            <h2 id="path-title" className="text-xl font-bold text-slate-900">{t('ad.learningPath')}</h2>
            <p className="text-sm text-slate-500">{t('ad.learningPathHelp')}</p>
          </div>
          <div className="space-y-6">
            {STAGES.map((stage) => {
              const mods = curriculum.filter((m) => stage.modules.includes(m.id));
              if (!mods.length) return null;
              return (
                <div key={stage.id}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${stage.chip}`}>{t(`ad.stage.${stage.id}`)}</span>
                    <span className="h-px flex-1 bg-slate-200" aria-hidden="true" />
                  </div>
                  <ol className="space-y-3">
                    {mods.map((m) => {
                      const index = curriculum.indexOf(m);
                      const done = m.lessons.filter((l) => l.completed).length;
                      const total = m.lessons.length;
                      const complete = total > 0 && done === total;
                      const current = nextModule && nextModule.id === m.id;
                      return (
                        <li key={m.id}>
                          <Link to={`/adult/module/${m.id}`}
                            className={`group flex items-center gap-4 rounded-2xl border bg-white p-4 md:p-5 transition hover:shadow-md ${current ? 'border-indigo-300 ring-4 ring-indigo-100' : 'border-slate-200 hover:border-indigo-200'}`}>
                            <span className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center font-bold ${complete ? 'bg-emerald-500 text-white' : current ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                              {complete ? '✓' : index + 1}
                            </span>
                            <span className="w-11 h-11 shrink-0 rounded-xl hidden sm:flex items-center justify-center text-2xl" style={{ background: `${m.color || '#6366f1'}1a` }} aria-hidden="true">{m.icon}</span>
                            <span className="flex-1 min-w-0">
                              <span className="flex flex-wrap items-center gap-2">
                                <span className="font-bold text-slate-900">{m.title}</span>
                                {current && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-indigo-600 text-white">{t('ad.youAreHere')}</span>}
                                {complete && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">✓ {t('ad.done')}</span>}
                              </span>
                              <span className="block text-sm text-slate-500 truncate">{m.description}</span>
                              <span className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
                                <span className="flex gap-1" aria-label={t('ad.lessonsDoneOf', { done, total })}>
                                  {m.lessons.map((l) => (
                                    <span key={l.id} className={`h-1.5 w-4 sm:w-5 md:w-7 rounded-full ${l.completed ? 'bg-emerald-500' : l.started ? 'bg-indigo-300' : 'bg-slate-200'}`} />
                                  ))}
                                </span>
                                <span className="text-xs text-slate-500 whitespace-nowrap">{done}/{total} · ⏱️ {t('ad.hoursN', { n: m.estimated_hours })} · {t(`ad.level.${m.difficulty}`)}</span>
                              </span>
                            </span>
                            <span className="hidden md:inline text-sm font-semibold text-indigo-600 group-hover:translate-x-0.5 transition whitespace-nowrap">
                              {complete ? t('ad.review') : done > 0 || current ? t('ad.continue') : t('ad.open')} →
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              );
            })}
          </div>
        </section>

        {/* ===== Side column ===== */}
        <aside className="space-y-4 lg:sticky lg:top-4">
          <Card className="p-5">
            <div className="flex items-center justify-between gap-2 mb-4">
              <h2 className="font-bold text-slate-900">🎓 {t('ad.roadToCertificate')}</h2>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${metCount === 3 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{metCount}/3</span>
            </div>
            <ul className="space-y-4">
              {requirements.map((r) => (
                <li key={r.key}>
                  <div className="flex items-start justify-between gap-2 text-sm mb-1.5">
                    <span className={`font-medium ${r.met ? 'text-emerald-700' : 'text-slate-700'}`}>{r.met ? '✅' : r.icon} {r.label}</span>
                    <span className="text-slate-500 whitespace-nowrap">{r.value}</span>
                  </div>
                  <Bar value={r.pct} color={r.met ? 'bg-emerald-500' : 'bg-indigo-600'} label={r.label} />
                </li>
              ))}
            </ul>
            <Link to="/adult/certificate" className="mt-5 block text-center px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              {stats.certificateIssued ? t('ad.viewCertificate') : t('ad.aboutCertificate')} →
            </Link>
          </Card>

          <Card className="p-2">
            {[
              ['/adult/progress', '📈', t('ad.myProgress'), t('ad.myProgressText'), 'bg-violet-100'],
              ['/adult/playground', '💻', t('ad.playground'), t('ad.playgroundText'), 'bg-emerald-100'],
              ['/adult/profile', '👤', t('ad.profileSettings'), t('ad.profileShortcut'), 'bg-slate-100'],
            ].map(([to, icon, title, text, tint]) => (
              <Link key={to} to={to} className="flex items-center gap-3 rounded-xl p-3 hover:bg-slate-50 transition">
                <span className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center text-lg ${tint}`} aria-hidden="true">{icon}</span>
                <span className="flex-1 min-w-0">
                  <span className="block font-semibold text-slate-900 text-sm">{title}</span>
                  <span className="block text-xs text-slate-500 truncate">{text}</span>
                </span>
                <span className="text-slate-400" aria-hidden="true">›</span>
              </Link>
            ))}
          </Card>
        </aside>
      </div>
    </Page>
  );
};

export default AdultDashboard;
