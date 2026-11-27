import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { adultAPI } from '../services/api';
import { getAdultUser } from '../utils/authStorage';
import { Page, Card, Loading, ErrorBox, studyTime, Ring, COURSES, courseOf, PASS_MARK as PASS } from '../components/AdultUi';
import { SERVER_LANGUAGES } from '../components/codeLanguages';

/**
 * Adult learner home:
 *   - hero: greeting, the lesson to continue, overall progress
 *   - key numbers (lessons, study time, average score, certificate)
 *   - the four courses (Web, Java, Python & AI, Databases), each opening its course page
 *   - side column: road to the certificate, practise any language, shortcuts
 */

/** What each course is practised in (shown as a badge on its card). */
const COURSE_LANGUAGE = {
  1: { label: 'HTML · CSS · JS', chip: 'bg-orange-100 text-orange-800', playground: 'web', icon: '🌐' },
  2: { label: 'Java', chip: SERVER_LANGUAGES.java.chip, playground: 'java', icon: SERVER_LANGUAGES.java.icon },
  3: { label: 'Python', chip: SERVER_LANGUAGES.python.chip, playground: 'python', icon: SERVER_LANGUAGES.python.icon },
  4: { label: 'SQL', chip: SERVER_LANGUAGES.sql.chip, playground: 'sql', icon: SERVER_LANGUAGES.sql.icon },
  5: { label: 'Java', chip: SERVER_LANGUAGES.java.chip, playground: 'java', icon: SERVER_LANGUAGES.java.icon },
  6: { label: 'Python', chip: SERVER_LANGUAGES.python.chip, playground: 'python', icon: SERVER_LANGUAGES.python.icon },
};

/** A small progress ring for the course cards. */
const MiniRing = ({ pct, color }) => {
  const r = 22;
  const c = 2 * Math.PI * r;
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" className="shrink-0" aria-hidden="true">
      <circle cx="28" cy="28" r={r} fill="none" stroke="#e2e8f0" strokeWidth="6" />
      <circle cx="28" cy="28" r={r} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c - (c * pct) / 100} transform="rotate(-90 28 28)" style={{ transition: 'stroke-dashoffset 0.7s' }} />
      <text x="28" y="32" textAnchor="middle" fontSize="12" fontWeight="700" fill="#0f172a">{pct}%</text>
    </svg>
  );
};

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
  const returning = started || (stats.minutesLogged || 0) >= 5;

  // Every lesson in course order, with its module.
  const allLessons = curriculum.flatMap((m) => m.lessons.map((l, i) => ({ ...l, module: m, position: i + 1 })));
  // Continue a lesson the learner has opened but not finished; otherwise the first unfinished one.
  const resume = allLessons.find((l) => l.started && !l.completed && !l.locked) || allLessons.find((l) => !l.completed && !l.locked) || null;
  const resumeCourse = resume ? courseOf(resume.module.id) : null;

  const courses = COURSES.map((course) => {
    const modules = curriculum.filter((m) => course.modules.includes(m.id));
    const lessons = modules.flatMap((m) => m.lessons);
    const done = lessons.filter((l) => l.completed).length;
    const total = lessons.length;
    const status = total > 0 && done === total ? 'done' : done > 0 || lessons.some((l) => l.started) ? 'active' : 'new';
    return {
      ...course, modules, done, total, status,
      pct: total ? Math.round((100 * done) / total) : 0,
      hours: modules.reduce((sum, m) => sum + (m.estimated_hours || 0), 0),
    };
  });

  const scoreOk = started && stats.averageScore >= PASS;
  // One certificate per course (from the curriculum response).
  const certs = data.courses || [];
  const earnedCount = certs.filter((c) => c.certificate).length;
  const readyCourse = certs.find((c) => c.eligible && !c.certificate);

  const heroAction = resume
    ? { to: `/adult/lesson/${resume.id}`, label: `${returning ? t('ad.continue') : t('ad.startCourse')} →` }
    : readyCourse
      ? { to: `/adult/certificate?course=${readyCourse.id}`, label: `🎓 ${t('ad.claimCertificate')}` }
      : { to: '/adult/certificate', label: `🎓 ${t('ad.certsTitle')}` };
  const heroTitle = resume ? resume.title
    : readyCourse ? t('ad.certReadyFor', { course: t(`ad.stage.${readyCourse.id}`) }) : t('ad.certsTitle');

  const STATUS = {
    new: { text: t('ad.notStarted'), chip: 'bg-slate-100 text-slate-600', cta: t('ad.start') },
    active: { text: t('ad.inProgress'), chip: 'bg-indigo-100 text-indigo-800', cta: t('ad.continue') },
    done: { text: `✓ ${t('ad.completed')}`, chip: 'bg-emerald-100 text-emerald-800', cta: t('ad.review') },
  };

  return (
    <Page wide>
      {/* ===== Hero ===== */}
      <section className="relative overflow-hidden rounded-3xl p-6 md:p-8 mb-6 text-white shadow-lg"
        style={{ background: 'radial-gradient(circle at 85% 15%, rgba(129,140,248,0.45), transparent 45%), linear-gradient(135deg, #0f172a 0%, #312e81 60%, #4c1d95 100%)' }}
        aria-labelledby="dash-title">
        <div className="absolute -right-10 -bottom-16 text-[180px] leading-none opacity-[0.06] select-none font-mono" aria-hidden="true">{'</>'}</div>
        <div className="relative grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_auto] gap-8 items-center">
          <div className="min-w-0">
            <p className="text-indigo-200 text-sm font-semibold">{t('ad.programmeName')} · {t('ad.coursesAvailable', { count: COURSES.length })}</p>
            <h1 id="dash-title" className="text-2xl md:text-4xl font-bold mt-1">
              {t(returning ? 'ad.welcomeName' : 'ad.welcomeNew', { name: user?.firstName || '' })} 👋
            </h1>

            {/* Continue */}
            <div className="mt-6 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-sm p-4 md:p-5 max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-wider text-indigo-200">
                {resume ? (returning ? t('ad.continueWhere') : t('ad.startHere')) : t('ad.allLessonsDone')}
              </p>
              <div className="flex flex-wrap items-center gap-4 mt-2">
                <div className="flex-1 min-w-[12rem]">
                  <h2 className="text-xl md:text-2xl font-bold leading-snug">{heroTitle}</h2>
                  {resume && (
                    <p className="text-sm text-indigo-100 mt-1">
                      {resumeCourse.icon} {t(`ad.stage.${resumeCourse.id}`)} · {resume.module.title} · {t('ad.lessonNofM', { n: resume.position, total: resume.module.lessons.length })}
                      {resume.minutes ? ` · ⏱️ ${t('ad.aboutMinutes', { n: resume.minutes })}` : ''}
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
          { icon: '⏱️', tint: 'bg-emerald-100 text-emerald-700', label: t('ad.studyTime'), value: studyTime(stats.minutesLogged, stats.hoursLogged), sub: t('ad.logged') },
          { icon: '🎯', tint: 'bg-violet-100 text-violet-700', label: t('ad.averageScore'), value: started ? `${stats.averageScore}%` : '—', sub: started ? (scoreOk ? t('ad.passing') : t('ad.keepImproving')) : t('ad.noScoresYet') },
          { icon: '🎓', tint: earnedCount ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700', label: t('ad.certsShort'), value: `${earnedCount}/${certs.length || COURSES.length}`, sub: readyCourse ? t('ad.readyToIssue') : t('ad.certsEarnedLabel') },
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

      {/* minmax(0,1fr) on every screen size so long text can never widen the page. */}
      <div className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_340px] gap-6 items-start">
        {/* ===== Courses ===== */}
        <section aria-labelledby="courses-title" className="min-w-0">
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
            <h2 id="courses-title" className="text-xl font-bold text-slate-900">{t('ad.yourCourses')}</h2>
            <p className="text-sm text-slate-500">{t('ad.yourCoursesHelp')}</p>
          </div>
          <ul className="grid grid-cols-[minmax(0,1fr)] md:grid-cols-2 gap-4">
            {courses.map((c) => {
              const lang = COURSE_LANGUAGE[c.id];
              const st = STATUS[c.status];
              const isResume = resumeCourse && resumeCourse.id === c.id;
              return (
                <li key={c.id} className="min-w-0">
                  <Link to={`/adult/course/${c.id}/view`}
                    className={`group relative flex flex-col h-full rounded-2xl border bg-white p-5 shadow-sm transition hover:shadow-lg hover:-translate-y-0.5 overflow-hidden ${isResume ? 'border-indigo-300 ring-4 ring-indigo-100' : 'border-slate-200 hover:border-indigo-200'}`}>
                    <span className="absolute inset-x-0 top-0 h-1.5" style={{ background: c.color }} aria-hidden="true" />
                    <div className="flex items-start gap-4">
                      <span className="w-14 h-14 shrink-0 rounded-2xl flex items-center justify-center text-3xl" style={{ background: `${c.color}1f` }} aria-hidden="true">{c.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{t('ad.courseN', { n: c.id })}</p>
                        <h3 className="text-lg font-bold text-slate-900 leading-snug group-hover:text-indigo-700 transition">{t(`ad.stage.${c.id}`)}</h3>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${lang.chip}`}>{lang.icon} {lang.label}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${st.chip}`}>{st.text}</span>
                        </div>
                      </div>
                      <MiniRing pct={c.pct} color={c.status === 'done' ? '#10b981' : c.color} />
                    </div>

                    <p className="text-sm text-slate-600 mt-3 flex-1">{t(`ad.courseDesc.${c.id}`)}</p>

                    {/* One segment per module, filled by how much of it is done. */}
                    <div className="flex gap-1 mt-4" aria-label={t('ad.lessonsDoneOf', { done: c.done, total: c.total })}>
                      {c.modules.map((m) => {
                        const d = m.lessons.filter((l) => l.completed).length;
                        const p = m.lessons.length ? (100 * d) / m.lessons.length : 0;
                        return (
                          <span key={m.id} className="h-1.5 flex-1 rounded-full bg-slate-100 overflow-hidden" title={`${m.title}: ${d}/${m.lessons.length}`}>
                            <span className="block h-full rounded-full" style={{ width: `${p}%`, background: p === 100 ? '#10b981' : c.color }} />
                          </span>
                        );
                      })}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-3 border-t border-slate-100">
                      <span className="text-xs text-slate-500">
                        {t('ad.lessonsDoneOf', { done: c.done, total: c.total })} · {c.modules.length} {t('ad.modules').toLowerCase()} · ⏱️ {t('ad.hoursN', { n: c.hours })}
                      </span>
                      <span className="text-sm font-semibold text-indigo-600 group-hover:translate-x-0.5 transition whitespace-nowrap">{st.cta} →</span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        {/* ===== Side column ===== */}
        <aside className="space-y-4 lg:sticky lg:top-4">
          {/* One certificate per course */}
          <Card className="p-5">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h2 className="font-bold text-slate-900">🎓 {t('ad.certsTitle')}</h2>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${earnedCount ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{earnedCount}/{certs.length}</span>
            </div>
            <ul className="space-y-2.5">
              {certs.map((c) => {
                const met = Object.values(c.requirements).filter((r) => r.met).length;
                return (
                  <li key={c.id}>
                    <Link to={`/adult/certificate?course=${c.id}`} className="flex items-center gap-3 rounded-xl px-2 py-1.5 -mx-2 hover:bg-slate-50 transition">
                      <span className="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-base" style={{ background: `${(COURSES.find((x) => x.id === c.id) || {}).color || '#6366f1'}1f` }} aria-hidden="true">
                        {c.certificate ? '🏅' : (COURSES.find((x) => x.id === c.id) || {}).icon}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-semibold text-slate-800 truncate">{t(`ad.stage.${c.id}`)}</span>
                        <span className="flex gap-1 mt-1" aria-label={t('ad.requirementsMetOf', { n: met, total: 3 })}>
                          {Object.entries(c.requirements).map(([k, r]) => <span key={k} className={`h-1 flex-1 rounded-full ${r.met ? 'bg-emerald-500' : 'bg-slate-200'}`} />)}
                        </span>
                      </span>
                      <span className={`shrink-0 text-[11px] font-bold ${c.certificate ? 'text-emerald-700' : c.eligible ? 'text-amber-700' : 'text-slate-400'}`}>
                        {c.certificate ? `✓ ${t('ad.certStatus.earned')}` : c.eligible ? t('ad.certStatus.ready') : `${c.progressPercentage}%`}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <Link to="/adult/certificate" className="mt-4 block text-center px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              {t('ad.aboutCertificate')} →
            </Link>
          </Card>

          <Card className="p-5">
            <h2 className="font-bold text-slate-900">💻 {t('ad.practiseAny')}</h2>
            <p className="text-xs text-slate-500 mt-1 mb-3">{t('ad.practiseAnyHelp')}</p>
            <div className="grid grid-cols-2 gap-2">
              {Object.values(COURSE_LANGUAGE).filter((l, i, all) => all.findIndex((x) => x.playground === l.playground) === i).map((l) => (
                <Link key={l.playground} to={`/adult/playground?lang=${l.playground}`}
                  className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl text-sm font-semibold transition hover:shadow-sm hover:-translate-y-0.5 ${l.chip}`}>
                  <span aria-hidden="true">{l.icon}</span> {l.playground === 'web' ? 'Web' : l.label}
                </Link>
              ))}
            </div>
          </Card>

          <Card className="p-2">
            {[
              ['/adult/coach', '🤖', t('adc.title'), t('adc.shortcut'), 'bg-sky-100'],
              ['/adult/progress', '📈', t('ad.myProgress'), t('ad.myProgressText'), 'bg-violet-100'],
              ['/adult/friends', '🤝', t('adf.tab.friends'), t('adf.shortcut'), 'bg-emerald-100'],
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
