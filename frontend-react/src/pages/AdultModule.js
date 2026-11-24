import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { adultAPI } from '../services/api';
import { Page, Card, Loading, ErrorBox, Ring, stageOf } from '../components/AdultUi';

/**
 * One module: a hero (stage, level, hours, progress ring, one clear action), the lessons
 * as a connected timeline with their status, a side panel explaining how each lesson
 * works, and links to the previous and next modules.
 */
const AdultModule = () => {
  const { moduleId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setError('');
    adultAPI.curriculum().then((r) => setData(r.data)).catch((e) => setError(e.response?.data?.error || t('ad.loadFailed')));
  }, [t]);
  useEffect(() => { load(); window.scrollTo(0, 0); }, [load, moduleId]);

  if (error) return <Page><ErrorBox message={error} onRetry={load} /></Page>;
  if (!data) return <Page><Loading /></Page>;

  const index = data.curriculum.findIndex((m) => String(m.id) === String(moduleId));
  const m = data.curriculum[index];
  if (!m) {
    return <Page><ErrorBox message={t('ad.moduleNotFound')} /><div className="text-center mt-4"><Link to="/adult/dashboard" className="text-indigo-600 font-semibold">← {t('ad.backToCourse')}</Link></div></Page>;
  }
  const total = m.lessons.length;
  const done = m.lessons.filter((l) => l.completed).length;
  const complete = total > 0 && done === total;
  const next = m.lessons.find((l) => !l.completed);
  const prevModule = data.curriculum[index - 1];
  const nextModule = data.curriculum[index + 1];
  const minutes = m.lessons.reduce((s, l) => s + (l.minutes || 0), 0);
  const scored = m.lessons.filter((l) => l.completed);
  const avg = scored.length ? Math.round(scored.reduce((s, l) => s + (l.score || 0), 0) / scored.length) : null;
  const stage = stageOf(m.id);
  const pct = total ? Math.round((100 * done) / total) : 0;

  const action = complete
    ? (nextModule ? { to: `/adult/module/${nextModule.id}`, label: `${t('ad.nextModule')} →` } : { to: '/adult/certificate', label: `🎓 ${t('ad.certificate')}` })
    : { to: `/adult/lesson/${next.id}`, label: `${done ? t('ad.continue') : t('ad.startModule')} →` };

  const steps = [
    ['📖', t('ad.step.learn'), t('ad.howStepLearn')],
    ['💻', t('ad.step.practise'), t('ad.howStepPractise')],
    ['📝', t('ad.step.test'), t('ad.howStepTest')],
    ['🎤', t('ad.step.oral'), t('ad.howStepOral')],
  ];

  return (
    <Page wide>
      <nav className="text-sm text-slate-500 mb-4 flex flex-wrap items-center gap-1" aria-label={t('ad.breadcrumb')}>
        <Link to="/adult/dashboard" className="hover:text-indigo-600">{t('ad.course')}</Link>
        <span aria-hidden="true">›</span>
        <span className="text-slate-700 font-medium">{t('ad.moduleN', { n: index + 1 })}: {m.title}</span>
      </nav>

      {/* ===== Hero ===== */}
      <section className="relative overflow-hidden rounded-3xl p-6 md:p-8 mb-6 text-white shadow-lg"
        style={{ background: `radial-gradient(circle at 90% 10%, ${m.color || '#6366f1'}66, transparent 50%), linear-gradient(135deg, #0f172a 0%, #312e81 65%, #4c1d95 100%)` }}
        aria-labelledby="module-title">
        <div className="absolute -right-6 -bottom-10 text-[160px] leading-none opacity-10 select-none" aria-hidden="true">{m.icon}</div>
        <div className="relative grid lg:grid-cols-[1fr_auto] gap-8 items-center">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="w-12 h-12 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center text-2xl" aria-hidden="true">{m.icon}</span>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-200">{t('ad.moduleN', { n: index + 1 })}</span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${stage.chip}`}>{t(`ad.stage.${stage.id}`)}</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/15 text-white">{t(`ad.level.${m.difficulty}`)}</span>
            </div>
            <h1 id="module-title" className="text-2xl md:text-4xl font-bold">{m.title}</h1>
            <p className="text-indigo-100 mt-2 max-w-2xl">{m.description}</p>

            <dl className="flex flex-wrap gap-x-6 gap-y-2 mt-5 text-sm">
              {[
                ['📚', t('ad.lessons'), `${done}/${total}`],
                ['⏱️', t('ad.lessonTime'), t('ad.lessonTimeTotal', { n: Math.round((minutes / 60) * 10) / 10 })],
                ['📅', t('ad.studyGuide'), t('ad.hoursN', { n: m.estimated_hours })],
                ['🎯', t('ad.averageScore'), avg === null ? '—' : `${avg}%`],
              ].map(([icon, label, value]) => (
                <div key={label}>
                  <dt className="text-indigo-200 text-xs">{label}</dt>
                  <dd className="font-semibold"><span aria-hidden="true">{icon} </span>{value}</dd>
                </div>
              ))}
            </dl>

            <div className="flex flex-wrap items-center gap-3 mt-6">
              <button type="button" onClick={() => navigate(action.to)}
                className="px-6 py-3 rounded-xl bg-white text-indigo-800 font-bold shadow-md hover:bg-indigo-50 hover:-translate-y-0.5 transition">
                {action.label}
              </button>
              {complete && <span className="px-3 py-1.5 rounded-full bg-emerald-400/20 border border-emerald-300/40 text-emerald-100 text-sm font-semibold">✓ {t('ad.moduleComplete')}</span>}
              {!complete && next && <span className="text-sm text-indigo-100">{t('ad.upNext')}: <span className="font-semibold text-white">{next.title}</span></span>}
            </div>
          </div>
          <div className="flex lg:flex-col items-center gap-3 justify-center">
            <Ring pct={pct} label={t('ad.moduleProgress')} />
          </div>
        </div>
      </section>

      <div className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
        {/* ===== Lessons timeline ===== */}
        <section className="min-w-0" aria-labelledby="lessons-title">
          <h2 id="lessons-title" className="text-xl font-bold text-slate-900 mb-4">{t('ad.lessonsInModule', { n: total })}</h2>
          <ol className="relative">
            {m.lessons.map((l, i) => {
              const isNext = next && next.id === l.id;
              const last = i === total - 1;
              const state = l.completed ? 'done' : l.locked ? 'locked' : isNext ? 'next' : l.started ? 'started' : 'todo';
              // A locked lesson is shown but not linked: the lesson before it must be passed first.
              const Row = state === 'locked' ? 'div' : Link;
              return (
                <li key={l.id} className="relative pl-14 pb-4">
                  {!last && <span className={`absolute left-[19px] top-10 bottom-0 w-0.5 ${l.completed ? 'bg-emerald-300' : 'bg-slate-200'}`} aria-hidden="true" />}
                  <span className={`absolute left-0 top-3 w-10 h-10 rounded-full flex items-center justify-center font-bold ring-4 ring-slate-50 ${state === 'done' ? 'bg-emerald-500 text-white' : state === 'next' ? 'bg-indigo-600 text-white' : 'bg-white border-2 border-slate-200 text-slate-500'}`} aria-hidden="true">
                    {state === 'done' ? '✓' : state === 'locked' ? '🔒' : i + 1}
                  </span>
                  <Row {...(state === 'locked' ? { 'aria-disabled': true } : { to: `/adult/lesson/${l.id}` })}
                    className={`group flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border p-4 md:p-5 transition ${state === 'locked' ? 'bg-slate-50 border-slate-200 opacity-75' : `bg-white hover:shadow-md ${state === 'next' ? 'border-indigo-300 ring-4 ring-indigo-100' : 'border-slate-200 hover:border-indigo-200'}`}`}>
                    <span className="flex-1 min-w-[12rem]">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-slate-400">{t('ad.lessonNofM', { n: i + 1, total })}</span>
                        {state === 'next' && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-indigo-600 text-white">{t('ad.upNext')}</span>}
                        {state === 'started' && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">{t('ad.inProgress')}</span>}
                        {state === 'done' && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">✓ {t('ad.done')}</span>}
                        {state === 'locked' && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-600">🔒 {t('ad.locked')}</span>}
                      </span>
                      <span className="block font-bold text-slate-900 text-base md:text-lg mt-0.5">{l.title}</span>
                      <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1">
                        <span>⏱️ {t('ad.aboutMinutes', { n: l.minutes })}</span>
                        {state === 'locked' && l.unlockAfter && <span>{t('ad.unlocksAfter', { title: l.unlockAfter.title })}</span>}
                        {state === 'done' && (
                          <span className="flex items-center gap-2">
                            <span className="h-1.5 w-20 rounded-full bg-slate-100 overflow-hidden" aria-hidden="true">
                              <span className={`block h-full rounded-full ${l.score >= 70 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${l.score || 0}%` }} />
                            </span>
                            <span className="font-semibold text-slate-600">{t('ad.scoreN', { n: l.score })}</span>
                          </span>
                        )}
                      </span>
                    </span>
                    <span className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition ${state === 'locked' ? 'bg-slate-200 text-slate-500' : state === 'next' ? 'bg-indigo-600 text-white group-hover:bg-indigo-700' : state === 'done' ? 'bg-emerald-50 text-emerald-700 group-hover:bg-emerald-100' : 'bg-slate-100 text-slate-700 group-hover:bg-indigo-50 group-hover:text-indigo-700'}`}>
                      {state === 'locked' ? `🔒 ${t('ad.locked')}` : `${state === 'done' ? t('ad.review') : state === 'next' ? (l.started ? t('ad.continue') : t('ad.startLesson')) : state === 'started' ? t('ad.continue') : t('ad.open')} →`}
                    </span>
                  </Row>
                </li>
              );
            })}
          </ol>
        </section>

        {/* ===== Side column ===== */}
        <aside className="space-y-4 lg:sticky lg:top-4">
          <Card className="p-5">
            <h2 className="font-bold text-slate-900 mb-1">{t('ad.howLessonsWork')}</h2>
            <p className="text-sm text-slate-500 mb-4">{t('ad.howLessonsWorkHelp')}</p>
            <ol className="space-y-3">
              {steps.map(([icon, title, text], i) => (
                <li key={title} className="flex gap-3">
                  <span className="w-9 h-9 shrink-0 rounded-xl bg-indigo-50 flex items-center justify-center text-lg" aria-hidden="true">{icon}</span>
                  <span className="text-sm">
                    <span className="block font-semibold text-slate-800">{i + 1}. {title}</span>
                    <span className="block text-slate-500">{text}</span>
                  </span>
                </li>
              ))}
            </ol>
          </Card>

          <Card className="p-2">
            {[[prevModule, -1], [nextModule, 1]].filter(([mod]) => mod).map(([mod, dir]) => (
              <Link key={mod.id} to={`/adult/module/${mod.id}`} className="flex items-center gap-3 rounded-xl p-3 hover:bg-slate-50 transition">
                {dir < 0 && <span className="text-slate-400" aria-hidden="true">‹</span>}
                <span className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center text-xl" style={{ background: `${mod.color || '#6366f1'}1a` }} aria-hidden="true">{mod.icon}</span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-400">{dir < 0 ? t('ad.prevModule') : t('ad.nextModule')}</span>
                  <span className="block font-semibold text-slate-900 text-sm truncate">{mod.title}</span>
                </span>
                {dir > 0 && <span className="text-slate-400" aria-hidden="true">›</span>}
              </Link>
            ))}
            <Link to="/adult/dashboard" className="flex items-center gap-3 rounded-xl p-3 hover:bg-slate-50 transition">
              <span className="w-10 h-10 shrink-0 rounded-xl bg-slate-100 flex items-center justify-center text-lg" aria-hidden="true">🗺️</span>
              <span className="font-semibold text-slate-900 text-sm">{t('ad.allModules')}</span>
            </Link>
          </Card>
        </aside>
      </div>
    </Page>
  );
};

export default AdultModule;
