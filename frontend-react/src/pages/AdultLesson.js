import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { adultAPI } from '../services/api';
import WebWorkbench from '../components/WebWorkbench';
import { SERVER_LANGUAGES, languageForModule } from '../components/codeLanguages';
import LessonText from '../components/LessonText';
import useStudyTimer from '../utils/useStudyTimer';

/**
 * One lesson of the adult course: learn, practise (checked automatically), written test,
 * oral practice, then complete. Code is saved to the server as you type.
 */
const local = {
  get: (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage may be blocked */ } },
};
const STEPS = ['learn', 'practise', 'test', 'oral'];

const Badge = ({ ok, children }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${ok ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>
    {ok ? '✓' : '○'} {children}
  </span>
);

const PANE_NAME = { html: 'HTML', css: 'CSS', js: 'JavaScript', java: 'Java', python: 'Python', sql: 'SQL' };
const PANE_STYLE = {
  html: 'bg-orange-100 text-orange-800', css: 'bg-sky-100 text-sky-800', js: 'bg-yellow-100 text-yellow-800',
  java: SERVER_LANGUAGES.java.chip, python: SERVER_LANGUAGES.python.chip, sql: SERVER_LANGUAGES.sql.chip,
};
const EMPTY_CODE = { html: '', css: '', js: '', java: '', python: '', sql: '' };
/** Every language box from saved or example code (missing ones become empty). */
const codeFrom = (saved) => Object.fromEntries(Object.keys(EMPTY_CODE).map((k) => [k, (saved && saved[k]) || '']));
/** The language the lesson is practised in: 'web', 'java', 'python' or 'sql'. */
const lessonLanguage = (lesson) => lesson.language || languageForModule(lesson.moduleId);
const hasExample = (lesson) => Object.values(lesson.example || {}).some(Boolean);

/** The editor tab a lesson's task is about: its own language, or the web tab most checks look at. */
function mainPane(lesson) {
  const language = lessonLanguage(lesson);
  if (language !== 'web') return language;
  const counts = { html: 0, css: 0, js: 0 };
  (lesson.checks || []).forEach((c) => { if (counts[c.in] !== undefined) counts[c.in] += 1; });
  const [pane, n] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return n > 0 ? pane : 'html';
}

const AdultLesson = () => {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [lesson, setLesson] = useState(null);
  const [error, setError] = useState('');
  const [step, setStep] = useState('learn');
  const [code, setCode] = useState(EMPTY_CODE);
  const prefsKey = `adult_lesson_prefs_${lessonId}`;
  const [mode, setMode] = useState(() => (local.get(prefsKey) || {}).mode || 'code');
  const [blocksXml, setBlocksXml] = useState(() => (local.get(prefsKey) || {}).blocksXml || '');
  const [saveState, setSaveState] = useState('saved'); // saved | saving | unsaved | error
  const [practical, setPractical] = useState(null);
  const [answers, setAnswers] = useState({});
  const [quizResult, setQuizResult] = useState(null);
  const [oralText, setOralText] = useState('');
  const [oralDone, setOralDone] = useState(false);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState(null); // { kind: 'ok'|'err', text }
  const [finished, setFinished] = useState(null);
  const [showHints, setShowHints] = useState(false);
  const loaded = useRef(false);
  useStudyTimer({ lessonId: Number(lessonId), kind: 'lesson' });

  const load = useCallback(async () => {
    loaded.current = false;
    setLesson(null); setError(''); setPractical(null); setQuizResult(null); setAnswers({}); setFinished(null); setMessage(null); setOralDone(false); setOralText('');
    try {
      const r = await adultAPI.lesson(lessonId);
      const l = r.data.lesson;
      setLesson(l);
      setCode(codeFrom(l.savedCode));
      setOralDone(l.best.oral !== null);
      setStep(l.completed ? 'practise' : 'learn');
      setSaveState('saved');
      setTimeout(() => { loaded.current = true; }, 0);
    } catch (e) {
      setError(e.response?.status === 404 ? t('ad.lessonNotFound') : (e.response?.data?.error || t('ad.loadFailed')));
    }
  }, [lessonId, t]);
  useEffect(() => { load(); window.scrollTo(0, 0); }, [load]);

  // Remember editor mode and blocks per lesson.
  useEffect(() => { local.set(prefsKey, { mode, blocksXml }); }, [prefsKey, mode, blocksXml]);

  // Auto-save code a few seconds after typing stops.
  const currentId = lesson ? lesson.id : null;
  useEffect(() => {
    if (!loaded.current || !currentId) return undefined;
    setSaveState('unsaved');
    const h = setTimeout(() => {
      setSaveState('saving');
      adultAPI.saveLesson(currentId, code).then(() => setSaveState('saved')).catch(() => setSaveState('error'));
    }, 2500);
    return () => clearTimeout(h);
  }, [code, currentId]);

  // Warn before leaving with unsaved code.
  useEffect(() => {
    const onLeave = (e) => { if (saveState === 'unsaved' || saveState === 'saving') { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', onLeave);
    return () => window.removeEventListener('beforeunload', onLeave);
  }, [saveState]);

  const run = async (key, fn) => {
    setBusy(key); setMessage(null);
    try { return await fn(); } catch (e) {
      setMessage({ kind: 'err', text: e.response?.data?.error || t('ad.somethingWrong') });
      return null;
    } finally { setBusy(''); }
  };

  const loadExample = () => {
    const ex = lesson.example || {};
    setCode(codeFrom(ex));
    setMode('code');
    setStep('practise');
  };
  const checkWork = () => run('check', async () => {
    const r = await adultAPI.checkLesson(lesson.id, code);
    setPractical(r.data);
    setSaveState('saved');
    setLesson((l) => ({ ...l, best: { ...l.best, practical: Math.max(l.best.practical || 0, r.data.score) } }));
  });
  const submitQuiz = () => run('quiz', async () => {
    if (Object.keys(answers).length < lesson.quiz.length) { setMessage({ kind: 'err', text: t('ad.answerAll') }); return; }
    const r = await adultAPI.quiz(lesson.id, lesson.quiz.map((_, i) => answers[i]));
    setQuizResult(r.data);
    setLesson((l) => ({ ...l, best: { ...l.best, written: Math.max(l.best.written || 0, r.data.score) } }));
  });
  const submitOral = () => run('oral', async () => {
    await adultAPI.oral(lesson.id, oralText);
    setOralDone(true);
    setMessage({ kind: 'ok', text: t('ad.oralSaved') });
  });
  const complete = () => run('complete', async () => {
    const r = await adultAPI.complete(lesson.id, code);
    setFinished(r.data);
    setLesson((l) => ({ ...l, completed: true, score: r.data.score }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  if (error) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="text-5xl mb-3" aria-hidden="true">📄</div>
        <p className="text-slate-700 font-semibold mb-4">{error}</p>
        <div className="flex justify-center gap-2">
          <button type="button" className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold" onClick={load}>{t('ad.tryAgain')}</button>
          <Link to="/adult/dashboard" className="px-4 py-2 rounded-xl border border-slate-300 font-semibold text-slate-700">{t('ad.backToCourse')}</Link>
        </div>
      </div>
    );
  }
  if (!lesson) {
    return <div className="max-w-7xl mx-auto px-4 py-16 text-center text-slate-500 font-semibold">{t('ad.loading')}</div>;
  }

  const practicalOk = (lesson.best.practical || 0) >= lesson.passMark && (!practical || practical.passed || lesson.completed);
  const writtenOk = (lesson.best.written || 0) >= lesson.passMark;
  // Learn is ticked once the learner has read it and moved on (or already has results).
  const learnDone = lesson.completed || practicalOk || writtenOk || oralDone || step !== 'learn';
  const stepDone = { learn: learnDone, practise: practicalOk, test: writtenOk, oral: oralDone };
  const saveLabel = { saved: t('ad.saved'), saving: t('ad.saving'), unsaved: t('ad.unsaved'), error: t('ad.saveError') }[saveState];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <nav className="text-sm text-slate-500 mb-2" aria-label={t('ad.breadcrumb')}>
        <Link to="/adult/dashboard" className="hover:text-indigo-600">{t('ad.course')}</Link>
        <span className="mx-2">›</span>
        <Link to={`/adult/module/${lesson.moduleId}`} className="hover:text-indigo-600">{lesson.moduleIcon} {lesson.moduleTitle}</Link>
        <span className="mx-2">›</span>
        <span className="text-slate-700">{t('ad.lessonNofM', { n: lesson.number, total: lesson.lessonsInModule })}</span>
      </nav>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">{lesson.title}</h1>
          <p className="text-sm text-slate-500 mt-1">
            ⏱️ {t('ad.aboutMinutes', { n: lesson.minutes })} · {lesson.completed
              ? <span className="text-emerald-700 font-semibold">✓ {t('ad.completedScore', { score: lesson.score })}</span>
              : t('ad.passMarkNote', { n: lesson.passMark })}
          </p>
        </div>
        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${saveState === 'error' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`} aria-live="polite">💾 {saveLabel}</span>
      </div>

      {finished && (
        <section className="mb-6 rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-5" role="status">
          <h2 className="text-xl font-bold text-emerald-900">🎉 {t('ad.lessonComplete')}</h2>
          <p className="text-emerald-800 mt-1">{t('ad.lessonScore', { score: finished.score, practical: finished.practical, written: finished.written })}</p>
          {finished.courseFinished && <p className="text-emerald-900 font-semibold mt-2">🎓 {t('ad.courseFinishedNote')}</p>}
          <div className="flex flex-wrap gap-2 mt-4">
            {finished.next && <button type="button" className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold" onClick={() => navigate(`/adult/lesson/${finished.next.id}`)}>{t('ad.nextLesson')}: {finished.next.title} →</button>}
            <Link to={`/adult/module/${lesson.moduleId}`} className="px-4 py-2 rounded-xl border border-emerald-300 text-emerald-800 font-semibold">{t('ad.backToModule')}</Link>
            {finished.courseFinished && <Link to="/adult/certificate" className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold">🎓 {t('ad.certificate')}</Link>}
          </div>
        </section>
      )}

      {/* Steps */}
      <div className="flex flex-wrap gap-2 mb-5" role="tablist" aria-label={t('ad.lessonSteps')}>
        {STEPS.map((s, i) => (
          <button key={s} type="button" role="tab" aria-selected={step === s} onClick={() => setStep(s)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition ${step === s ? 'bg-indigo-600 text-white border-indigo-600 shadow' : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step === s ? 'bg-white/20' : stepDone[s] ? 'bg-emerald-500 text-white' : 'bg-slate-100'}`}>
              {stepDone[s] ? '✓' : i + 1}
            </span>
            {t(`ad.step.${s}`)}
          </button>
        ))}
      </div>

      {message && (
        <div className={`mb-4 rounded-xl px-4 py-3 text-sm font-semibold ${message.kind === 'ok' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`} role="alert">
          {message.text}
        </div>
      )}

      {step === 'learn' && (
        <div className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_320px] gap-6">
          <article className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <LessonText text={lesson.content} />
          </article>
          <aside className="space-y-4">
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5">
              <h2 className="font-bold text-indigo-900 mb-2">🎯 {t('ad.yourTask')}</h2>
              <p className="text-sm text-indigo-900">{lesson.challenge}</p>
              <button type="button" className="mt-4 w-full px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold" onClick={() => setStep('practise')}>{t('ad.startPractising')} →</button>
            </div>
            {hasExample(lesson) && (
              <button type="button" onClick={loadExample} className="w-full px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 font-semibold hover:bg-slate-50">📝 {t('ad.tryExample')}</button>
            )}
          </aside>
        </div>
      )}

      {step === 'practise' && (
        <div className="space-y-4">
          {/* items-start: each card is only as tall as its content (no empty stretch when the checklist grows). */}
          <div className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_360px] gap-4 items-start">
            <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col" aria-labelledby="task-title">
              {/* Task */}
              <div className="p-5 md:p-6 border-l-4 border-indigo-500 bg-gradient-to-br from-indigo-50 via-white to-white">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-lg shadow-sm" aria-hidden="true">🎯</span>
                  <h2 id="task-title" className="font-bold text-slate-900 text-lg mr-auto">{t('ad.yourTask')}</h2>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${PANE_STYLE[mainPane(lesson)]}`}>{t('ad.codeGoesIn', { pane: PANE_NAME[mainPane(lesson)] })}</span>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600">{t('ad.passMarkChip', { n: lesson.passMark })}</span>
                </div>
                <p className="text-slate-800 text-base md:text-[17px] leading-relaxed">{lesson.challenge}</p>
                <div className="flex flex-wrap gap-2 mt-4">
                  {lesson.hints.length > 0 && (
                    <button type="button" onClick={() => setShowHints((s) => !s)} aria-expanded={showHints} aria-controls="task-hints"
                      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold border transition ${showHints ? 'bg-amber-100 border-amber-300 text-amber-900' : 'bg-white border-slate-300 text-slate-700 hover:border-amber-300 hover:bg-amber-50'}`}>
                      💡 {showHints ? t('ad.hideHints') : t('ad.showHints')} <span className="text-xs opacity-70">({lesson.hints.length})</span>
                    </button>
                  )}
                  {hasExample(lesson) && (
                    <button type="button" onClick={loadExample}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold border bg-white border-slate-300 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 transition">
                      📝 {t('ad.loadExample')}
                    </button>
                  )}
                </div>
                {showHints && (
                  <ol id="task-hints" className="mt-4 space-y-2">
                    {lesson.hints.map((h, i) => (
                      <li key={i} className="flex gap-3 items-start rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-950">
                        <span className="shrink-0 w-6 h-6 rounded-full bg-amber-400 text-white text-xs font-bold flex items-center justify-center">{i + 1}</span>
                        <span className="pt-0.5">{h}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
              {/* How it works - fills the card's lower part with useful guidance */}
              <ol className="mt-auto grid sm:grid-cols-3 gap-px bg-slate-200 border-t border-slate-200 text-sm" aria-label={t('ad.howItWorks')}>
                {[['✍️', lessonLanguage(lesson) === 'web' ? t('ad.taskHow1') : t('ad.taskHow1Run', { language: PANE_NAME[lessonLanguage(lesson)] })], ['🔍', t('ad.taskHow2')], ['🏁', t('ad.taskHow3', { n: lesson.passMark })]].map(([icon, text], i) => (
                  <li key={i} className="bg-slate-50 px-4 py-3 flex gap-2.5 items-start">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-white border border-slate-300 text-slate-600 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                    <span className="text-slate-600"><span aria-hidden="true">{icon} </span>{text}</span>
                  </li>
                ))}
              </ol>
            </section>
            <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col" aria-labelledby="checks-title">
              <div className="px-5 pt-5 pb-3 flex items-center justify-between gap-3">
                <h2 id="checks-title" className="font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm" aria-hidden="true">✓</span>
                  {t('ad.checklist')}
                </h2>
                {practical && (
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${practical.passed ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                    {t('ad.checksPassed', { n: practical.passedCount, total: practical.total })}
                  </span>
                )}
              </div>
              <ul className="px-3 space-y-1.5">
                {lesson.checks.map((c, i) => {
                  const r = practical && practical.results[i];
                  const state = !r ? 'todo' : r.passed ? 'ok' : 'bad';
                  return (
                    <li key={i} className={`flex items-start gap-3 rounded-xl px-2.5 py-2 text-sm ${state === 'ok' ? 'bg-emerald-50' : state === 'bad' ? 'bg-red-50' : 'bg-slate-50'}`}>
                      <span className={`mt-0.5 shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${state === 'ok' ? 'bg-emerald-500 text-white' : state === 'bad' ? 'bg-red-500 text-white' : 'border-2 border-slate-300 bg-white'}`}
                        aria-label={state === 'ok' ? t('ad.checkOk') : state === 'bad' ? t('ad.checkMissing') : t('ad.checkTodo')}>
                        {state === 'ok' ? '✓' : state === 'bad' ? '✕' : ''}
                      </span>
                      <span className={`flex-1 leading-snug ${state === 'bad' ? 'text-red-800' : 'text-slate-700'}`}>{c.label}</span>
                      <span className={`shrink-0 px-1.5 py-0.5 rounded-md text-[10px] font-bold ${PANE_STYLE[c.in] || 'bg-slate-100 text-slate-600'}`}>{PANE_NAME[c.in] || c.in}</span>
                    </li>
                  );
                })}
              </ul>
              <div className="p-5 mt-auto space-y-3">
                {practical && (
                  <div className={`rounded-xl px-4 py-3 border ${practical.passed ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`} role="status">
                    <div className="flex items-baseline justify-between gap-2 mb-1.5">
                      <span className={`text-sm font-semibold ${practical.passed ? 'text-emerald-800' : 'text-amber-800'}`}>
                        {practical.passed ? `🎉 ${t('ad.practicalPassedShort')}` : `🔧 ${t('ad.practicalNotYetShort', { n: lesson.passMark })}`}
                      </span>
                      <span className={`text-lg font-bold ${practical.passed ? 'text-emerald-700' : 'text-amber-700'}`}>{practical.score}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-700 ${practical.passed ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${practical.score}%` }} />
                    </div>
                  </div>
                )}
                <button type="button" disabled={busy === 'check'} onClick={checkWork}
                  className={`w-full px-4 py-2.5 rounded-xl font-semibold transition disabled:opacity-60 ${practical?.passed ? 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'}`}>
                  {busy === 'check' ? t('ad.checking') : `🔍 ${practical ? t('ad.checkAgain') : t('ad.checkWork')}`}
                </button>
                {practical?.passed && !writtenOk && (
                  <button type="button" onClick={() => setStep('test')} className="w-full px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm">
                    📝 {t('ad.goToTest')} →
                  </button>
                )}
              </div>
            </section>
          </div>
          <WebWorkbench key={lesson.id} initialTab={mainPane(lesson)} value={code} onChange={setCode} mode={mode} onModeChange={setMode} blocksXml={blocksXml} onBlocksXml={setBlocksXml} usesJquery={lesson.usesJquery} editorHeight={320} language={lessonLanguage(lesson)} />
        </div>
      )}

      {step === 'test' && (
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 max-w-3xl" aria-labelledby="test-title">
          <h2 id="test-title" className="text-xl font-bold text-slate-900 mb-1">📝 {t('ad.writtenTest')}</h2>
          <p className="text-sm text-slate-500 mb-5">{t('ad.writtenHelp', { n: lesson.passMark })}{lesson.best.written !== null ? ` · ${t('ad.bestSoFar', { score: lesson.best.written })}` : ''}</p>
          <ol className="space-y-6">
            {lesson.quiz.map((q, i) => {
              const mark = quizResult && quizResult.marking[i];
              return (
                <li key={q.n}>
                  <fieldset>
                    <legend className="font-semibold text-slate-900 mb-2">{q.n}. {q.q}</legend>
                    <div className="space-y-2">
                      {q.options.map((opt, j) => {
                        const chosen = answers[i] === j;
                        const right = mark && mark.correctIndex === j;
                        return (
                          <label key={j} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${right ? 'border-emerald-400 bg-emerald-50' : mark && chosen ? 'border-red-300 bg-red-50' : chosen ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                            <input type="radio" name={`q${i}`} className="mt-1" checked={chosen} onChange={() => { setAnswers((a) => ({ ...a, [i]: j })); setQuizResult(null); }} />
                            <span className="text-slate-800">{opt}</span>
                          </label>
                        );
                      })}
                    </div>
                    {mark && <p className={`mt-2 text-sm ${mark.correct ? 'text-emerald-700' : 'text-red-700'}`}>{mark.correct ? '✓' : '✗'} {mark.why}</p>}
                  </fieldset>
                </li>
              );
            })}
          </ol>
          <div className="flex flex-wrap items-center gap-3 mt-6">
            <button type="button" disabled={busy === 'quiz'} onClick={submitQuiz} className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold">{t('ad.submitAnswers')}</button>
            {quizResult && (
              <span className={`font-semibold ${quizResult.passed ? 'text-emerald-700' : 'text-amber-700'}`} role="status">
                {quizResult.passed ? t('ad.testPassed', { score: quizResult.score }) : t('ad.testNotYet', { score: quizResult.score })}
              </span>
            )}
          </div>
        </section>
      )}

      {step === 'oral' && (
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 max-w-3xl" aria-labelledby="oral-title">
          <h2 id="oral-title" className="text-xl font-bold text-slate-900 mb-1">🎤 {t('ad.oralPractice')}</h2>
          <p className="text-sm text-slate-500 mb-4">{t('ad.oralHelp')}</p>
          <blockquote className="border-l-4 border-indigo-400 bg-indigo-50 rounded-r-xl px-4 py-3 text-indigo-900 font-semibold mb-4">{lesson.oral}</blockquote>
          {oralDone && !oralText ? (
            <p className="text-emerald-700 font-semibold">✓ {t('ad.oralAlreadyDone')}</p>
          ) : null}
          <label htmlFor="oral-text" className="block text-sm font-semibold text-slate-700 mb-1">{t('ad.oralWrite')}</label>
          <textarea id="oral-text" value={oralText} onChange={(e) => setOralText(e.target.value)} rows={7} className="w-full rounded-xl border border-slate-300 p-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none" />
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-slate-500">{t('ad.words', { n: oralText.trim().split(/\s+/).filter(Boolean).length })} / 30</span>
            <button type="button" disabled={busy === 'oral' || oralText.trim().split(/\s+/).filter(Boolean).length < 30} onClick={submitOral} className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold">{t('ad.saveAnswer')}</button>
          </div>
        </section>
      )}

      {/* Finish */}
      <section className="mt-6 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-wrap items-center gap-4" aria-label={t('ad.finishLesson')}>
        <div className="flex flex-wrap gap-2 flex-1">
          <Badge ok={practicalOk}>{t('ad.reqPractical', { n: lesson.passMark })}</Badge>
          <Badge ok={writtenOk}>{t('ad.reqWritten', { n: lesson.passMark })}</Badge>
          <Badge ok={oralDone}>{t('ad.reqOral')}</Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          {lesson.prev && <button type="button" onClick={() => navigate(`/adult/lesson/${lesson.prev.id}`)} className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50">← {t('ad.previous')}</button>}
          {!lesson.completed || finished === null ? (
            <button type="button" disabled={busy === 'complete' || !writtenOk} onClick={complete} title={!writtenOk ? t('ad.passTestFirst') : ''}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold">
              {lesson.completed ? `✓ ${t('ad.saveCompletion')}` : `✓ ${t('ad.completeLesson')}`}
            </button>
          ) : null}
          {lesson.next && <button type="button" onClick={() => navigate(`/adult/lesson/${lesson.next.id}`)} className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50">{t('ad.next')} →</button>}
        </div>
      </section>
    </div>
  );
};

export default AdultLesson;
