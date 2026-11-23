import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import api, { curriculumAPI, aiAPI } from '../services/api';
import { getTranslatedLesson, getTranslatedModule } from '../translations/lessons';
import { isDone } from '../utils/learningPath';


// Friendly display name from the child's username ("amina_2015" -> "Amina")
const friendlyName = (user) => {
  const raw = user?.displayName || user?.display_name || user?.firstName || user?.username?.split('_')[0] || '';
  if (!raw) return null;
  return raw.charAt(0).toUpperCase() + raw.slice(1);
};

const greetingKey = () => {
  const h = new Date().getHours();
  if (h < 12) return 'kidHome.goodMorning';
  if (h < 17) return 'kidHome.goodAfternoon';
  return 'kidHome.goodEvening';
};

const Dashboard = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { currentUser, userXP, userStreak, userProgress } = useAuth();
  const [curriculum, setCurriculum] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [quizPassed, setQuizPassed] = useState({}); // moduleId -> bool
  const [journey, setJourney] = useState(null); // life-long Coding Journey summary

  const loadCurriculum = useCallback(async () => {
    try {
      setLoadError(false);
      const res = await curriculumAPI.getCurriculum();
      setCurriculum(res.data.curriculum || []);
    } catch (err) {
      console.error('Failed to load curriculum:', err);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCurriculum();
  }, [loadCurriculum]);

  useEffect(() => {
    let cancelled = false;
    aiAPI.journey(undefined, i18n.language === 'sw' ? 'sw' : 'en')
      .then((res) => { if (!cancelled) setJourney(res.data); })
      .catch(() => {}); // the home page works without it
    return () => { cancelled = true; };
  }, [i18n.language, userXP]);

  // For modules whose lessons are all finished, ask the server whether the quiz is passed.
  useEffect(() => {
    let cancelled = false;
    const finishedModules = curriculum.filter(
      m => m.lessons.length > 0 && m.lessons.every(l => isDone(userProgress[l.id]))
    );
    if (!finishedModules.length) return;
    Promise.all(
      finishedModules.map(m =>
        api.get(`/module/completion/${m.id}`)
          .then(r => [m.id, r.data?.moduleCompleted === true])
          .catch(() => [m.id, false])
      )
    ).then(entries => {
      if (!cancelled) setQuizPassed(Object.fromEntries(entries));
    });
    return () => { cancelled = true; };
  }, [curriculum, userProgress]);

  const lang = i18n.language;
  const moduleTitle = (m) => getTranslatedModule(m.id, lang)?.title || m.title;
  const lessonTitle = (l) => getTranslatedLesson(l.id, lang)?.title || l.title;

  const completedCount = Object.values(userProgress).filter(isDone).length;
  const totalLessons = curriculum.reduce((sum, m) => sum + m.lessons.length, 0);
  const isFirstVisit = completedCount === 0 && !userXP;
  const level = Math.floor((userXP || 0) / 200) + 1;
  const name = friendlyName(currentUser);

  // Work out the single best "next thing" for this child to do.
  const next = useMemo(() => {
    for (let i = 0; i < curriculum.length; i++) {
      const module = curriculum[i];
      const lessonIndex = module.lessons.findIndex(l => !isDone(userProgress[l.id]));
      if (lessonIndex !== -1) {
        return { type: 'lesson', module, moduleIndex: i, lesson: module.lessons[lessonIndex], lessonIndex };
      }
      if (module.lessons.length && quizPassed[module.id] !== true) {
        return { type: 'quiz', module, moduleIndex: i };
      }
    }
    return curriculum.length ? { type: 'allDone', moduleIndex: curriculum.length } : null;
  }, [curriculum, userProgress, quizPassed]);

  // Show a short, friendly slice of the map: the last finished world, where you are, and what is next.
  const mapItems = useMemo(() => {
    const withIndex = curriculum.map((module, i) => ({ module, i })).filter(x => x.module.lessons.length > 0);
    const currentIndex = next ? next.moduleIndex : 0;
    const pos = withIndex.findIndex(x => x.i >= currentIndex);
    const anchor = pos === -1 ? withIndex.length - 1 : pos;
    const start = Math.max(0, anchor - 1);
    const items = withIndex.slice(start, start + 4);
    return { items, hidden: withIndex.length - items.length };
  }, [curriculum, next]);

  const startNext = () => {
    if (!next) return navigate('/curriculum');
    if (next.type === 'lesson') return navigate(`/lesson/${next.module.id}/${next.lesson.id}`);
    if (next.type === 'quiz') return navigate(`/quiz/${next.module.id}`);
    return navigate('/playground');
  };

  const getDailyTip = () => {
    const tips = t('kidHome.tips', { returnObjects: true });
    const list = Array.isArray(tips) ? tips : [];
    return list.length ? list[new Date().getDay() % list.length] : '';
  };

  // ---------- Hero ----------
  const heroTitle = isFirstVisit
    ? t('kidHome.firstHello', { name: name || t('kidHome.friend') })
    : `${t(greetingKey())}, ${name || t('kidHome.friend')}!`;

  let heroSubtitle = t('kidHome.firstSubtitle');
  let buttonLabel = t('kidHome.startFirstLesson');
  let nextLine = null;

  if (!isFirstVisit && next) {
    if (next.type === 'lesson') {
      heroSubtitle = t('kidHome.continueSubtitle');
      buttonLabel = t('kidHome.keepGoing');
      nextLine = { icon: next.module.icon, top: moduleTitle(next.module), bottom: lessonTitle(next.lesson),
        step: t('kidHome.lessonOf', { n: next.lessonIndex + 1, total: next.module.lessons.length }) };
    } else if (next.type === 'quiz') {
      heroSubtitle = t('kidHome.quizSubtitle');
      buttonLabel = t('kidHome.takeQuiz');
      nextLine = { icon: '🧩', top: moduleTitle(next.module), bottom: t('kidHome.quizTime'), step: null };
    } else {
      heroSubtitle = t('kidHome.allDoneSubtitle');
      buttonLabel = t('kidHome.goCreate');
    }
  } else if (isFirstVisit && next?.type === 'lesson') {
    nextLine = { icon: next.module.icon, top: moduleTitle(next.module), bottom: lessonTitle(next.lesson),
      step: t('kidHome.takesMinutes') };
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 md:py-8">
      {/* ===== HERO: one big obvious thing to do ===== */}
      <section className="kid-hero animate-fade-in mb-8" aria-labelledby="kid-hero-title">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="kid-mascot animate-float" aria-hidden="true">🤖</div>
          <div className="flex-1 text-center md:text-left">
            <h1 id="kid-hero-title" className="font-display text-3xl md:text-5xl text-white mb-2 leading-tight">
              {heroTitle} {isFirstVisit ? '🎉' : '👋'}
            </h1>
            <p className="text-white/90 text-lg md:text-xl font-semibold mb-5">{heroSubtitle}</p>

            {nextLine && (
              <div className="kid-next-chip mb-5">
                <span className="text-3xl" aria-hidden="true">{nextLine.icon}</span>
                <div className="text-left min-w-0">
                  <div className="text-xs font-extrabold uppercase tracking-wide text-indigo-500 truncate">{nextLine.top}</div>
                  <div className="font-extrabold text-slate-800 text-lg leading-snug">{nextLine.bottom}</div>
                  {nextLine.step && <div className="text-slate-500 text-sm font-semibold">{nextLine.step}</div>}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={startNext}
              disabled={loading && !loadError}
              className="kid-go-btn"
            >
              <span aria-hidden="true">▶</span> {loading ? t('kidHome.gettingReady') : buttonLabel}
            </button>

            {loadError && (
              <p className="text-white font-semibold mt-3">
                {t('kidHome.loadError')}{' '}
                <button type="button" onClick={loadCurriculum} className="underline font-extrabold">{t('kidHome.tryAgain')}</button>
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ===== First visit: how it works ===== */}
      {isFirstVisit && (
        <section className="mb-8" aria-labelledby="how-title">
          <h2 id="how-title" className="font-display text-2xl text-slate-800 mb-4 text-center md:text-left">
            {t('kidHome.howItWorks')}
          </h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { icon: '📖', title: t('kidHome.step1Title'), text: t('kidHome.step1Text'), color: 'kid-step-blue' },
              { icon: '🧪', title: t('kidHome.step2Title'), text: t('kidHome.step2Text'), color: 'kid-step-green' },
              { icon: '⭐', title: t('kidHome.step3Title'), text: t('kidHome.step3Text'), color: 'kid-step-yellow' },
            ].map((s, i) => (
              <div key={s.title} className={`kid-step ${s.color}`}>
                <div className="kid-step-num">{i + 1}</div>
                <div className="text-4xl mb-2" aria-hidden="true">{s.icon}</div>
                <div className="font-display text-xl text-slate-800 mb-1">{s.title}</div>
                <p className="text-slate-600 font-semibold text-sm">{s.text}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ===== Returning: friendly stats ===== */}
      {!isFirstVisit && (
        <section className="grid grid-cols-3 gap-3 md:gap-4 mb-8" aria-label={t('dashboard.yourProgress')}>
          <div className="stat-card">
            <div className="stat-value text-amber-500">⭐ {userXP || 0}</div>
            <div className="text-slate-600 text-xs md:text-sm font-bold mt-1">{t('kidHome.starsEarned')}</div>
          </div>
          <div className="stat-card">
            <div className="stat-value text-green-600">✅ {completedCount}</div>
            <div className="text-slate-600 text-xs md:text-sm font-bold mt-1">
              {t('kidHome.lessonsFinished', { total: totalLessons || '…' })}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-value text-orange-500">🔥 {userStreak || 0}</div>
            <div className="text-slate-600 text-xs md:text-sm font-bold mt-1">
              {userStreak > 1 ? t('kidHome.streakDays') : t('kidHome.streakStart')}
            </div>
          </div>
        </section>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* ===== Adventure map ===== */}
        <section className="lg:col-span-2 card p-5 md:p-6" aria-labelledby="map-title">
          <div className="flex items-center justify-between mb-4 gap-2">
            <h2 id="map-title" className="font-display text-2xl text-slate-800">🗺️ {t('kidHome.adventureMap')}</h2>
            {!isFirstVisit && (
              <span className="text-sm font-extrabold text-indigo-600 whitespace-nowrap">
                {t('dashboard.level')} {level}
              </span>
            )}
          </div>

          {loading && <p className="text-slate-500 font-semibold">{t('kidHome.gettingReady')}</p>}

          <ol className="space-y-3">
            {mapItems.items.map(({ module, i }) => {
              const done = module.lessons.filter(l => isDone(userProgress[l.id])).length;
              const total = module.lessons.length;
              const currentIndex = next ? next.moduleIndex : 0;
              const state = i < currentIndex ? 'done' : i === currentIndex ? 'current' : 'locked';
              const pct = total ? Math.round((done / total) * 100) : 0;

              const body = (
                <>
                  <span className="kid-map-icon" aria-hidden="true">
                    {state === 'locked' ? '🔒' : module.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-slate-800 truncate">{moduleTitle(module)}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="kid-bar flex-1"><div className="kid-bar-fill" style={{ width: `${pct}%` }} /></div>
                      <span className="text-xs font-bold text-slate-500 whitespace-nowrap">{done}/{total}</span>
                    </div>
                  </div>
                  <span className={`kid-map-tag kid-map-tag-${state}`}>
                    {state === 'done' ? t('kidHome.mapDone') : state === 'current' ? t('kidHome.mapHere') : t('kidHome.mapSoon')}
                  </span>
                </>
              );

              return (
                <li key={module.id}>
                  {state === 'locked' ? (
                    <div className="kid-map-row kid-map-locked" title={t('kidHome.lockedHint')}>{body}</div>
                  ) : (
                    <Link to="/curriculum" className={`kid-map-row ${state === 'current' ? 'kid-map-current' : ''}`}>
                      {body}
                    </Link>
                  )}
                </li>
              );
            })}
          </ol>

          {curriculum.length > 0 && (
            <Link to="/curriculum" className="btn-secondary w-full justify-center mt-5">
              📚 {mapItems.hidden > 0 ? t('kidHome.seeWholeMap', { n: mapItems.hidden }) : t('dashboard.viewAllLessons')}
            </Link>
          )}
        </section>

        {/* ===== More fun things ===== */}
        <aside className="space-y-6">
          {journey && (() => {
            const stage = journey.stages.find((s) => s.id === journey.currentStage);
            const pct = Math.round((100 * journey.stagesDone) / Math.max(1, journey.totalStages));
            return (
              <Link to="/journey" className="card p-5 block bg-gradient-to-br from-indigo-50 to-sky-50 hover:no-underline" aria-labelledby="journey-home-title">
                <h2 id="journey-home-title" className="font-extrabold text-indigo-800 mb-1">🗺️ {t('journey.homeCard')}</h2>
                <p className="font-display text-2xl text-slate-800">{journey.legend.unlocked ? '🏆' : (stage?.icon || '🐣')} {journey.rank}</p>
                {stage && <p className="text-sm font-semibold text-slate-600 mb-2">{t('journey.homeNext', { stage: stage.name })}</p>}
                <div className="kid-bar mb-2" style={{ height: 8 }}><div className="kid-bar-fill" style={{ width: `${pct}%` }} /></div>
                <span className="text-sm font-extrabold text-indigo-600">{t('journey.stageOf', { n: journey.stagesDone, total: journey.totalStages })} · {t('journey.seeMap')} →</span>
              </Link>
            );
          })()}
          <section aria-labelledby="fun-title">
            <h2 id="fun-title" className="font-display text-2xl text-slate-800 mb-3">🎈 {t('kidHome.moreFun')}</h2>
            <div className="grid grid-cols-2 gap-3">
              <Link to="/playground" className="kid-tile kid-tile-purple">
                <span className="text-4xl" aria-hidden="true">🎨</span>
                <span>{t('kidHome.tilePlayground')}</span>
              </Link>
              <Link to="/coach" className="kid-tile kid-tile-blue">
                <span className="text-4xl" aria-hidden="true">🤖</span>
                <span>{t('kidHome.tileCoach')}</span>
              </Link>
              <Link to="/social" className="kid-tile kid-tile-green">
                <span className="text-4xl" aria-hidden="true">🏅</span>
                <span>{t('kidHome.tileFriends')}</span>
              </Link>
              <Link to="/profile" className="kid-tile kid-tile-orange">
                <span className="text-4xl" aria-hidden="true">🏆</span>
                <span>{t('kidHome.tileBadges')}</span>
              </Link>
            </div>
          </section>

          <section className="card p-5 bg-gradient-to-br from-yellow-50 to-amber-50" aria-labelledby="tip-title">
            <h2 id="tip-title" className="font-extrabold text-amber-800 mb-2">💡 {t('dashboard.codingTip')}</h2>
            <p className="text-slate-700 font-semibold leading-relaxed">{getDailyTip()}</p>
          </section>
        </aside>
      </div>
    </div>
  );
};

export default Dashboard;
