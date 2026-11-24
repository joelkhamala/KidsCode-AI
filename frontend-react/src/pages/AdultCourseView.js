import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { adultAPI } from '../services/api';
import { getAdultUser } from '../utils/authStorage';
import { Page, Card, Loading, ErrorBox, studyTime, Ring, COURSES, PASS_MARK as PASS } from '../components/AdultUi';

/**
 * Adult course view: detailed view of a single course (by course ID: 1-4).
 * Shows only the modules and lessons for that specific course.
 */
const AdultCourseView = () => {
  const { courseNum } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const user = getAdultUser();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setError('');
    adultAPI.curriculum().then((r) => setData(r.data)).catch((e) => setError(e.response?.data?.error || t('ad.loadFailed')));
  }, [t]);
  useEffect(() => { load(); window.scrollTo(0, 0); }, [load, courseNum]);

  if (error) return <Page><ErrorBox message={error} onRetry={load} /></Page>;
  if (!data) return <Page><Loading /></Page>;

  const courseId = Number(courseNum);
  if (courseId < 1 || courseId > COURSES.length) {
    return <Page><ErrorBox message={t('ad.courseNotFound')} /><div className="text-center mt-4"><Link to="/adult/dashboard" className="text-indigo-600 font-semibold">← {t('ad.backToCourses')}</Link></div></Page>;
  }

  const { stats, curriculum, nextLesson } = data;
  const started = stats.completedLessons > 0;

  // Get the course and its modules/lessons
  const course = COURSES[courseId - 1];
  const courseModules = curriculum.filter((m) => course.modules.includes(m.id));
  const courseLessons = courseModules.flatMap((m) => m.lessons);
  
  const nextLessonInCourse = courseLessons.find((l) => !l.completed);
  const completedInCourse = courseLessons.filter((l) => l.completed).length;
  const totalInCourse = courseLessons.length;
  const courseProgressPct = totalInCourse ? Math.round((100 * completedInCourse) / totalInCourse) : 0;

  // This course's own certificate: its lessons, its average score and the time spent in its lessons.
  const status = (data.courses || []).find((c) => c.id === courseId);
  const cr = status ? status.requirements : null;
  const requirements = cr ? [
    { key: 'lessons', icon: '📚', label: t('ad.reqCourseLessons', { n: cr.allLessonsCompleted.required }), value: `${cr.allLessonsCompleted.current}/${cr.allLessonsCompleted.required}`, pct: (100 * cr.allLessonsCompleted.current) / (cr.allLessonsCompleted.required || 1), met: cr.allLessonsCompleted.met },
    { key: 'score', icon: '📝', label: t('ad.reqAverage', { n: PASS }), value: cr.allLessonsCompleted.current ? `${cr.passedAssessments.current}%` : '—', pct: cr.allLessonsCompleted.current ? Math.min(100, (100 * cr.passedAssessments.current) / PASS) : 0, met: cr.passedAssessments.met },
    { key: 'hours', icon: '⏱️', label: t('ad.reqCourseHours', { n: cr.sufficientHours.required }), value: studyTime(null, cr.sufficientHours.current), pct: Math.min(100, (100 * cr.sufficientHours.current) / (cr.sufficientHours.required || 1)), met: cr.sufficientHours.met },
  ] : [];
  const metCount = requirements.filter((r) => r.met).length;
  const certified = Boolean(status && status.certificate);
  const certReady = Boolean(status && status.eligible);

  const heroTitle = nextLessonInCourse ? nextLessonInCourse.title
    : certified ? t('ad.certificateIssuedTitle')
      : certReady ? t('ad.getCertificateNow') : t('ad.courseMoreHoursNeeded', { n: status ? status.requiredHours : 0 });
  const heroAction = nextLessonInCourse
    ? { to: `/adult/lesson/${nextLessonInCourse.id}`, label: `${started ? t('ad.continue') : t('ad.startCourse')} →` }
    : { to: `/adult/certificate?course=${courseId}`, label: `🎓 ${certified ? t('ad.viewCertificate') : t('ad.certificate')}` };

  const prevCourse = courseId > 1 ? COURSES[courseId - 2] : null;
  const nextCourse = courseId < COURSES.length ? COURSES[courseId] : null;

  return (
    <Page wide>
      {/* ===== Breadcrumb ===== */}
      <nav className="text-sm text-slate-500 mb-4 flex flex-wrap items-center gap-1" aria-label={t('ad.breadcrumb')}>
        <Link to="/adult/dashboard" className="hover:text-indigo-600">{t('ad.allCourses')}</Link>
        <span aria-hidden="true">›</span>
        <span className="text-slate-700 font-medium">{t('ad.courseN', { n: courseId })}: {course.title}</span>
      </nav>

      {/* ===== Hero ===== */}
      <section className="relative overflow-hidden rounded-3xl p-6 md:p-8 mb-6 text-white shadow-lg"
        style={{ background: 'radial-gradient(circle at 85% 15%, rgba(129,140,248,0.45), transparent 45%), linear-gradient(135deg, #0f172a 0%, #312e81 60%, #4c1d95 100%)' }}
        aria-labelledby="dash-title">
        <div className="absolute -right-10 -bottom-16 text-[180px] leading-none opacity-[0.06] select-none font-mono" aria-hidden="true">{'</>'}</div>
        <div className="relative grid lg:grid-cols-[1fr_auto] gap-8 items-center">
          <div className="min-w-0">
            <p className="text-indigo-200 text-sm font-semibold">{t('ad.courseN', { n: courseId })} · {course.title}</p>
            <h1 id="dash-title" className="text-2xl md:text-4xl font-bold mt-1">
              {t(started ? 'ad.welcomeName' : 'ad.welcomeNew', { name: user?.firstName || '' })} 👋
            </h1>

            {/* Next up */}
            <div className="mt-6 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-sm p-4 md:p-5 max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-wider text-indigo-200">
                {nextLessonInCourse ? (started ? t('ad.continueWhere') : t('ad.startHere')) : t('ad.allLessonsDone')}
              </p>
              <div className="flex flex-wrap items-center gap-4 mt-2">
                <div className="flex-1 min-w-[12rem]">
                  <h2 className="text-xl md:text-2xl font-bold leading-snug">{heroTitle}</h2>
                  {nextLessonInCourse && (
                    <p className="text-sm text-indigo-100 mt-1">
                      {courseModules.find(m => m.lessons.includes(nextLessonInCourse))?.icon} {t('ad.courseN', { n: courseId })}: {course.title} · {t('ad.lessonNofM', { n: (courseLessons.findIndex((l) => l.id === nextLessonInCourse.id) + 1), total: totalInCourse })}
                      {nextLessonInCourse?.minutes ? ` · ⏱️ ${t('ad.aboutMinutes', { n: nextLessonInCourse.minutes })}` : ''}
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
            <Ring pct={courseProgressPct} label={t('ad.courseProgress')} />
            <p className="text-sm text-indigo-100 text-center">{t('ad.lessonsDoneOf', { done: completedInCourse, total: totalInCourse })}</p>
          </div>
        </div>
      </section>

      {/* ===== Key numbers ===== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-8">
        {[
          { icon: '📚', tint: 'bg-indigo-100 text-indigo-700', label: t('ad.lessons'), value: `${completedInCourse}/${totalInCourse}`, sub: t('ad.completed') },
          { icon: '⏱️', tint: 'bg-emerald-100 text-emerald-700', label: t('ad.studyTime'), value: studyTime(status ? status.minutesLogged : 0), sub: t('ad.ofHours', { n: status ? status.requiredHours : 0 }) },
          { icon: '🎯', tint: 'bg-violet-100 text-violet-700', label: t('ad.averageScore'), value: completedInCourse ? `${status ? status.averageScore : 0}%` : '—', sub: completedInCourse ? (cr && cr.passedAssessments.met ? t('ad.passing') : t('ad.keepImproving')) : t('ad.noScoresYet') },
          { icon: '🎓', tint: certified || certReady ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700', label: t('ad.certificate'), value: certified || certReady ? '✓' : `${metCount}/3`, sub: certified ? t('ad.issuedShort') : certReady ? t('ad.readyToIssue') : t('ad.requirementsMet') },
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

      {/* ===== Course Modules & Lessons ===== */}
      <section aria-labelledby="modules-title" className="mb-8">
        <h2 id="modules-title" className="text-2xl font-bold text-slate-900 mb-6">{t('ad.learningPath')}</h2>
        <div className="space-y-4">
          {courseModules.map((module) => {
            const done = module.lessons.filter((l) => l.completed).length;
            const total = module.lessons.length;
            const complete = total > 0 && done === total;
            const current = nextLesson && nextLesson.moduleId === module.id;
            
            return (
              <div key={module.id}>
                <Link to={`/adult/module/${module.id}`}
                  className={`group flex items-center gap-4 rounded-2xl border bg-white p-5 transition hover:shadow-md ${current ? 'border-indigo-600 ring-4 ring-indigo-100 bg-indigo-50' : 'border-slate-200 hover:border-indigo-200'}`}>
                  <span className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center font-bold ${complete ? 'bg-emerald-500 text-white' : current ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                    {complete ? '✓' : (courseModules.findIndex(m => m.id === module.id) + 1)}
                  </span>
                  <span className="w-11 h-11 shrink-0 rounded-xl hidden sm:flex items-center justify-center text-2xl" style={{ background: `${module.color || '#6366f1'}1a` }} aria-hidden="true">{module.icon}</span>
                  <span className="flex-1 min-w-0">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-slate-900">{module.title}</span>
                      {complete && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">✓ {t('ad.done')}</span>}
                    </span>
                    <span className="block text-sm text-slate-500 truncate">{module.description}</span>
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
                      <span className="flex gap-1" aria-label={t('ad.lessonsDoneOf', { done, total })}>
                        {module.lessons.map((l) => (
                          <span key={l.id} className={`h-1.5 w-4 sm:w-5 md:w-7 rounded-full ${l.completed ? 'bg-emerald-500' : l.started ? 'bg-indigo-300' : 'bg-slate-200'}`} />
                        ))}
                      </span>
                      <span className="text-xs text-slate-500 whitespace-nowrap">{done}/{total} · ⏱️ {t('ad.hoursN', { n: module.estimated_hours })} · {t(`ad.level.${module.difficulty}`)}</span>
                    </span>
                  </span>
                  <span className="hidden md:inline text-sm font-semibold text-indigo-600 group-hover:translate-x-0.5 transition whitespace-nowrap">
                    {complete ? t('ad.review') : done > 0 || current ? t('ad.continue') : t('ad.open')} →
                  </span>
                </Link>
              </div>
            );
          })}
        </div>
      </section>

      {/* ===== Course Navigation ===== */}
      <div className="flex flex-wrap gap-3 justify-between mt-8">
        {prevCourse ? (
          <Link to={`/adult/course/${prevCourse.id}/view`} className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 transition">
            ← {t('ad.prevModule')} {prevCourse.id}: {prevCourse.title}
          </Link>
        ) : <div />}
        {nextCourse ? (
          <Link to={`/adult/course/${nextCourse.id}/view`} className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition">
            {t('ad.nextModule')} {nextCourse.id}: {nextCourse.title} →
          </Link>
        ) : <div />}
      </div>
    </Page>
  );
};

export default AdultCourseView;
