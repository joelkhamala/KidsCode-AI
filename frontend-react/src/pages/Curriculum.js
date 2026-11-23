import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api, { curriculumAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getTranslatedModule, getTranslatedLesson } from '../translations/lessons';
import { isDone, playableModules, mapProgress } from '../utils/learningPath';
import JourneyStrip from '../components/JourneyStrip';

const difficultyClass = {
  beginner: 'badge-beginner',
  intermediate: 'badge-intermediate',
  advanced: 'badge-advanced',
};

const Curriculum = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { notify } = useToast();
  const { userProgress } = useAuth();
  const [curriculum, setCurriculum] = useState([]);
  const [loadError, setLoadError] = useState(false);
  const [moduleCompletions, setModuleCompletions] = useState({});
  const [expanded, setExpanded] = useState({});

  const loadCurriculum = useCallback(async () => {
    try {
      setLoadError(false);
      const res = await curriculumAPI.getCurriculum();
      setCurriculum(res.data.curriculum || []);
    } catch (err) {
      console.error('Failed to load curriculum:', err);
      setLoadError(true);
    }
  }, []);

  useEffect(() => { loadCurriculum(); }, [loadCurriculum]);

  const modules = useMemo(() => playableModules(curriculum), [curriculum]);
  const comingSoonCount = curriculum.length - modules.length;

  // Quiz status only matters for modules whose lessons are all finished.
  useEffect(() => {
    let cancelled = false;
    const finished = modules.filter(m => m.lessons.every(l => isDone(userProgress[l.id])));
    if (!finished.length) return;
    Promise.all(finished.map(m =>
      api.get(`/module/completion/${m.id}`).then(r => [m.id, r.data]).catch(() => [m.id, null])
    )).then(entries => {
      if (!cancelled) setModuleCompletions(Object.fromEntries(entries));
    });
    return () => { cancelled = true; };
  }, [modules, userProgress]);

  const lang = i18n.language;
  const moduleTitle = (m) => getTranslatedModule(m.id, lang)?.title || m.title;
  const moduleDesc = (m) => getTranslatedModule(m.id, lang)?.description || m.description;
  const lessonTitle = (l) => getTranslatedLesson(l.id, lang)?.title || l.title;

  const moduleDone = (m) => moduleCompletions[m.id]?.moduleCompleted === true;
  const moduleUnlocked = (index) => index === 0 || moduleDone(modules[index - 1]);

  // The module the child is working on right now (first unlocked, unfinished one).
  const currentIndex = useMemo(() => {
    const i = modules.findIndex((m, idx) => (idx === 0 || moduleDone(modules[idx - 1])) && !moduleDone(m));
    return i === -1 ? modules.length - 1 : i;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modules, moduleCompletions]);

  const isExpanded = (m, index) => (expanded[m.id] !== undefined ? expanded[m.id] : index === currentIndex);

  const toggle = (m, index) => {
    if (!moduleUnlocked(index)) {
      notify(t('learn.moduleLockedMsg', { name: moduleTitle(modules[index - 1]) }), 'warning');
      return;
    }
    setExpanded(prev => ({ ...prev, [m.id]: !isExpanded(m, index) }));
  };

  const openLesson = (module, lesson, unlocked, prevLesson) => {
    if (!unlocked) {
      notify(t('learn.lessonLockedMsg', { name: prevLesson ? lessonTitle(prevLesson) : '' }), 'warning');
      return;
    }
    navigate(`/lesson/${module.id}/${lesson.id}`);
  };

  if (loadError) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="text-6xl mb-4" aria-hidden="true">😕</div>
        <h1 className="font-display text-2xl text-slate-800 mb-2">{t('kidHome.loadError')}</h1>
        <button type="button" onClick={loadCurriculum} className="btn-primary mt-4">{t('kidHome.tryAgain')}</button>
      </div>
    );
  }

  if (!curriculum.length) {
    return (
      <div className="p-8 text-center text-slate-600">
        <div className="text-5xl mb-4 animate-float" aria-hidden="true">🗺️</div>
        <div className="font-bold">{t('kidHome.gettingReady')}</div>
      </div>
    );
  }

  const { done: totalDone, total: totalLessons } = mapProgress(curriculum, userProgress);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 md:py-8">
      <header className="mb-6">
        <h1 className="page-title mb-1">🗺️ {t('learn.title')}</h1>
        <p className="text-slate-600 font-semibold">{t('learn.subtitle')}</p>
        <div className="flex items-center gap-3 mt-4 max-w-md">
          <div className="kid-bar flex-1"><div className="kid-bar-fill" style={{ width: `${totalLessons ? (totalDone / totalLessons) * 100 : 0}%` }} /></div>
          <span className="text-sm font-extrabold text-slate-600 whitespace-nowrap">
            {t('learn.overall', { done: totalDone, total: totalLessons })}
          </span>
        </div>
      </header>

      <ol className="space-y-5">
        {modules.map((module, index) => {
          const unlocked = moduleUnlocked(index);
          const done = moduleDone(module);
          const open = unlocked && isExpanded(module, index);
          const finishedLessons = module.lessons.filter(l => isDone(userProgress[l.id])).length;
          const allLessonsDone = finishedLessons === module.lessons.length;
          const completion = moduleCompletions[module.id];
          const nextLessonIdx = module.lessons.findIndex(l => !isDone(userProgress[l.id]));
          const pct = Math.round((finishedLessons / module.lessons.length) * 100);
          const isCurrent = index === currentIndex && unlocked && !done;

          return (
            <li key={module.id}>
              <section
                className={`module-card overflow-hidden ${!unlocked ? 'opacity-70' : ''}`}
                style={isCurrent ? { borderColor: '#818cf8', boxShadow: '0 8px 0 #c7d2fe' } : undefined}
              >
                <button
                  type="button"
                  onClick={() => toggle(module, index)}
                  aria-expanded={open}
                  className="w-full text-left p-5 md:p-6 flex items-center gap-4"
                >
                  <div className="text-5xl flex-shrink-0" aria-hidden="true">{unlocked ? module.icon : '🔒'}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-xs font-extrabold uppercase tracking-wide text-slate-500">
                        {t('learn.world', { n: index + 1 })}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${difficultyClass[module.difficulty] || 'badge-beginner'}`}>
                        {t(`curriculum.${module.difficulty || 'beginner'}`)}
                      </span>
                      {done && <span className="kid-map-tag kid-map-tag-done">{t('kidHome.mapDone')}</span>}
                      {isCurrent && <span className="kid-map-tag kid-map-tag-current">{t('kidHome.mapHere')}</span>}
                    </div>
                    <h2 className="font-display text-xl md:text-2xl text-slate-800">{moduleTitle(module)}</h2>
                    <p className="text-slate-600 text-sm font-semibold mt-1">
                      {unlocked ? moduleDesc(module) : t('learn.moduleLockedMsg', { name: moduleTitle(modules[index - 1]) })}
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                      <div className="kid-bar flex-1"><div className="kid-bar-fill" style={{ width: `${pct}%` }} /></div>
                      <span className="text-xs font-bold text-slate-500 whitespace-nowrap">{finishedLessons}/{module.lessons.length}</span>
                    </div>
                  </div>
                  {unlocked && (
                    <span className="text-2xl text-slate-400 transition-transform" style={{ transform: open ? 'rotate(180deg)' : 'none' }} aria-hidden="true">▾</span>
                  )}
                </button>

                {open && (
                  <div className="px-5 md:px-6 pb-6 space-y-2">
                    {module.lessons.map((lesson, li) => {
                      const lessonDone = isDone(userProgress[lesson.id]);
                      const prev = module.lessons[li - 1];
                      const lessonUnlocked = li === 0 || isDone(userProgress[prev.id]);
                      const isNext = li === nextLessonIdx;
                      const score = userProgress[lesson.id]?.score;
                      return (
                        <button
                          key={lesson.id}
                          type="button"
                          aria-disabled={!lessonUnlocked}
                          onClick={() => openLesson(module, lesson, lessonUnlocked, prev)}
                          className={`lesson-row ${lessonDone ? 'is-done' : ''} ${isNext ? 'is-next' : ''} ${!lessonUnlocked ? 'opacity-60' : ''}`}
                        >
                          <span className="lesson-num">{lessonDone ? '✓' : lessonUnlocked ? li + 1 : '🔒'}</span>
                          <span className="flex-1 min-w-0">
                            <span className="block font-extrabold text-slate-800">{lessonTitle(lesson)}</span>
                            {!lessonUnlocked && (
                              <span className="block text-xs font-semibold text-slate-500">{t('learn.finishPrevious')}</span>
                            )}
                          </span>
                          {isNext && <span className="pill-go">▶ {li === 0 && finishedLessons === 0 ? t('learn.start') : t('learn.next')}</span>}
                          {lessonDone && score > 0 && (
                            <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-1 rounded-full">⭐ {score}</span>
                          )}
                        </button>
                      );
                    })}

                    {/* Module quiz */}
                    <button
                      type="button"
                      aria-disabled={!allLessonsDone}
                      onClick={() => allLessonsDone
                        ? navigate(`/quiz/${module.id}`)
                        : notify(t('learn.quizLockedMsg', { n: module.lessons.length - finishedLessons }), 'warning')}
                      className={`lesson-row ${completion?.quizPassed ? 'is-done' : allLessonsDone ? 'is-next' : 'opacity-60'}`}
                      style={{ borderStyle: 'dashed' }}
                    >
                      <span className="lesson-num">{completion?.quizPassed ? '✓' : allLessonsDone ? '🧩' : '🔒'}</span>
                      <span className="flex-1">
                        <span className="block font-extrabold text-purple-800">🧩 {t('learn.quizName')}</span>
                        <span className="block text-xs font-semibold text-slate-500">
                          {completion?.quizPassed
                            ? t('learn.quizPassed', { score: completion.quizScore })
                            : allLessonsDone ? t('learn.quizReady') : t('learn.quizLockedMsg', { n: module.lessons.length - finishedLessons })}
                        </span>
                      </span>
                      {allLessonsDone && !completion?.quizPassed && <span className="pill-go">▶ {t('learn.go')}</span>}
                    </button>
                  </div>
                )}
              </section>
            </li>
          );
        })}
      </ol>

      {/* After the lessons, the life-long Coding Journey keeps going. */}
      <JourneyStrip />

      {comingSoonCount > 0 && (
        <p className="text-center text-slate-500 font-semibold mt-8">
          🚧 {t('learn.comingSoon', { n: comingSoonCount })}
        </p>
      )}
    </div>
  );
};

export default Curriculum;
