import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { aiAPI, codeAPI } from '../../services/api';
import CodeEditor from '../CodeEditor';
import { runPython, preloadPython, isPythonLoaded } from '../../utils/pythonRunner';

/**
 * Renders one adaptive activity of any type and handles hints, running code,
 * submitting and showing feedback.
 *
 * Props: activityId, activity (public view - no answers), onFinished(result), onNext(),
 *        levelNames (optional map of Bloom level id -> display name),
 *        client (the Coach API to use - children's by default, adultAiAPI for adults),
 *        adult (grown-up styling for the adult course pages)
 */
const ADULT_PRIMARY = 'px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold shadow-sm';
const ADULT_SECONDARY = 'px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50 text-sm font-semibold text-slate-700';
const CODE_TYPES = ['write_code', 'create'];
const OPTION_TYPES = ['mcq', 'complete_code', 'find_bug'];

function CodeBlock({ code, lineNumbers, label }) {
  if (!code) return null;
  const lines = code.split('\n');
  return (
    <pre className="bg-slate-900 text-green-300 rounded-xl p-4 text-sm font-code overflow-x-auto" aria-label={label}>
      {lines.map((line, i) => (
        <div key={i} className="whitespace-pre">
          {lineNumbers && <span className="select-none text-slate-500 inline-block w-8 text-right mr-3">{i + 1}</span>}
          {line || ' '}
        </div>
      ))}
    </pre>
  );
}

const ActivityPlayer = ({
  activityId, activity, onFinished, onNext, levelNames = {}, client = aiAPI, adult = false,
  nextLoading = false, nextLoadingLabel, nextLoadingHint,
}) => {
  const { t } = useTranslation();
  const [selected, setSelected] = useState(null);
  const [text, setText] = useState('');
  const [code, setCode] = useState(activity.starterCode || '');
  const [hints, setHints] = useState([]);
  const [hintLoading, setHintLoading] = useState(false);
  const [runOutput, setRunOutput] = useState(null);
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const startedAt = useRef(Date.now());
  const resultRef = useRef(null);

  // Reset when a new activity arrives
  useEffect(() => {
    setSelected(null);
    setText('');
    setCode(activity.starterCode || '');
    setHints([]);
    setRunOutput(null);
    setResult(null);
    setError(null);
    startedAt.current = Date.now();
  }, [activityId, activity.starterCode]);

  useEffect(() => {
    if (result && resultRef.current) resultRef.current.focus();
  }, [result]);

  // Start downloading Python as soon as a Python coding activity opens, so Run feels quick.
  useEffect(() => {
    if (CODE_TYPES.includes(activity.type) && activity.language === 'python') preloadPython().catch(() => {});
  }, [activity.type, activity.language]);

  const isCode = CODE_TYPES.includes(activity.type);
  const isOptions = OPTION_TYPES.includes(activity.type);
  // JavaScript runs in the server sandbox; Python runs for real in the browser (Pyodide).
  const canRun = isCode && ['javascript', 'python'].includes(activity.language);
  const editorLanguage = { javascript: 'javascript', python: 'python', html_css: 'html' }[activity.language] || 'text';
  const learnerAnswer = isCode ? code : activity.type === 'predict_output' ? text : null;

  const askHint = async () => {
    if (hints.length >= (activity.hintCount || 3)) return;
    setHintLoading(true);
    try {
      const res = await client.hint(activityId, hints.length + 1, learnerAnswer);
      setHints((h) => [...h, res.data.hint]);
    } catch (err) {
      setError(t('coach.error'));
    } finally {
      setHintLoading(false);
    }
  };

  const runCode = async () => {
    setRunning(true);
    try {
      if (activity.language === 'python') {
        if (!isPythonLoaded()) setRunOutput({ text: t('coach.pyLoading'), error: false });
        const r = await runPython(code);
        const lines = [...r.output, ...(r.error ? [r.error] : [])];
        setRunOutput({ text: lines.join('\n') || t('coach.noOutput'), error: Boolean(r.error) });
        return;
      }
      const res = await codeAPI.runCode(code, 'javascript');
      setRunOutput({ text: res.data.output, error: res.data.error });
    } catch (err) {
      setRunOutput({ text: err && err.message ? err.message : t('coach.error'), error: true });
    } finally {
      setRunning(false);
    }
  };

  const canSubmit = !submitting && !result && (
    (isOptions && selected !== null)
    || (activity.type === 'predict_output' && text.trim())
    || (isCode && code.trim()));

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    const submission = { timeSeconds: Math.round((Date.now() - startedAt.current) / 1000) };
    if (isOptions) submission.answerIndex = selected;
    if (activity.type === 'predict_output') submission.text = text;
    if (isCode) submission.code = code;
    try {
      const res = await client.submit(activityId, submission);
      setResult(res.data);
      if (onFinished) onFinished(res.data);
    } catch (err) {
      setError(err.response?.data?.error || t('coach.error'));
    } finally {
      setSubmitting(false);
    }
  };

  const optionClass = (i) => {
    const font = activity.codeOptions ? ' font-code text-sm whitespace-pre-wrap' : '';
    if (adult) {
      const base = 'w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl border transition' + font;
      if (result) return `${base} border-slate-200 ${i === result.details?.correctIndex || i === selected ? '' : 'opacity-60'}`;
      return `${base} ${selected === i ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200' : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50'}`;
    }
    if (result) {
      if (i === result.details?.correctIndex) return `answer-btn${font}`;
      if (i === selected) return `answer-btn${font}`;
      return `answer-btn${font} opacity-60`;
    }
    return `answer-btn${font} ${selected === i ? 'selected' : ''}`;
  };
  const optionStyle = (i) => {
    if (!result) return undefined;
    if (i === result.details?.correctIndex) return { borderColor: '#22c55e', background: '#f0fdf4' };
    if (i === selected) return { borderColor: '#f87171', background: '#fef2f2' };
    return undefined;
  };

  const isBlocks = activity.language === 'blocks' || activity.language === 'scratch';

  return (
    <div className={adult ? 'bg-white rounded-2xl border border-slate-200 shadow-sm p-5 md:p-6 space-y-5' : 'card p-5 md:p-6 space-y-5'}>
      <div>
        <div className="text-sm font-bold text-indigo-600 mb-1">{activity.title}</div>
        <p className={`text-xl ${adult ? 'font-semibold text-slate-900' : 'font-bold text-slate-800'} whitespace-pre-wrap leading-snug`}>{activity.prompt}</p>
      </div>

      {activity.expectedOutputShown && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
          <div className="text-xs font-bold text-amber-700 mb-1">{t('coach.shouldPrint')}</div>
          <pre className="font-code text-sm text-slate-800 whitespace-pre-wrap">{activity.expectedOutputShown.join('\n')}</pre>
        </div>
      )}

      {activity.code && <CodeBlock code={activity.code} lineNumbers={activity.showLineNumbers || activity.type === 'predict_output'} label="code" />}
      {isBlocks && activity.code && <p className="text-xs text-slate-500">{t('coach.blocksNote')}</p>}

      {isOptions && (
        <fieldset className="space-y-2">
          <legend className="sr-only">{t('coach.pickOne')}</legend>
          {activity.options.map((opt, i) => (
            <button
              key={i}
              type="button"
              className={optionClass(i)}
              style={optionStyle(i)}
              onClick={() => !result && setSelected(i)}
              aria-pressed={selected === i}
              disabled={Boolean(result)}
            >
              <span className={adult ? 'w-7 h-7 shrink-0 rounded-lg bg-slate-100 text-slate-600 text-sm font-bold flex items-center justify-center' : 'answer-letter'}>
                {result && i === result.details?.correctIndex ? '✓' : result && i === selected ? '✗' : String.fromCharCode(65 + i)}
              </span>
              <span className="flex-1">{opt}</span>
            </button>
          ))}
        </fieldset>
      )}

      {activity.type === 'predict_output' && (
        <label className="block">
          <span className="text-sm font-bold text-slate-700">{t('coach.yourAnswer')}</span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={Boolean(result)}
            rows={4}
            className="mt-1 w-full p-3 font-code text-sm rounded-xl border-2 border-slate-200 focus:border-indigo-500 outline-none"
            placeholder={t('coach.typeOutput')}
            spellCheck="false"
          />
        </label>
      )}

      {isCode && (
        <div className="space-y-2">
          <CodeEditor
            value={code}
            onChange={setCode}
            language={editorLanguage}
            height={Math.min(420, Math.max(200, code.split('\n').length * 22 + 60))}
            readOnly={Boolean(result)}
            placeholder={t('coach.writeCode')}
            ariaLabel={t('coach.writeCode')}
            onRun={canRun ? runCode : undefined}
          />
          {canRun ? (
            <div className="flex items-start gap-3">
              <button type="button" className={adult ? ADULT_SECONDARY : 'btn-primary text-sm py-2'} onClick={runCode} disabled={running || !code.trim()}>
                {running ? t('coach.running') : t('coach.run')}
              </button>
              {runOutput && (
                <pre className={`flex-1 output-panel text-sm ${runOutput.error ? 'has-error' : ''}`}>{runOutput.text}</pre>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-500">{t('coach.notRunNote')}</p>
          )}
        </div>
      )}

      {/* Hints */}
      {!result && (
        <div className="space-y-2">
          {hints.map((h, i) => (
            <div key={i} className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-sm text-slate-700 whitespace-pre-wrap">
              💡 <strong>{t('coach.hint')} {i + 1}:</strong> {h}
            </div>
          ))}
          <div className="flex flex-wrap gap-3">
            <button type="button" className={adult ? ADULT_SECONDARY : 'btn-secondary text-sm py-2'} onClick={askHint} disabled={hintLoading || hints.length >= (activity.hintCount || 3)}>
              💡 {hints.length >= (activity.hintCount || 3) ? t('coach.noMoreHints') : `${t('coach.hint')} (${hints.length + 1}/${activity.hintCount || 3})`}
            </button>
            <button type="button" className={adult ? ADULT_PRIMARY : 'kid-go-btn'} style={adult ? undefined : { minHeight: 48, fontSize: '1.15rem', padding: '8px 24px' }} onClick={submit} disabled={!canSubmit}>
              {submitting ? t('coach.checking') : t('coach.check')}
            </button>
          </div>
        </div>
      )}

      {error && <div className="text-red-600 text-sm" role="alert">{error}</div>}

      {/* Result */}
      {result && (
        <div ref={resultRef} tabIndex={-1} aria-live="polite" className={`rounded-xl p-4 border-2 outline-none ${result.correct ? 'bg-green-50 border-green-300' : 'bg-orange-50 border-orange-300'}`}>
          <div className="flex justify-between items-center mb-2">
            <div className={adult ? 'text-xl font-bold' : 'font-display text-2xl animate-pop'}>{result.correct ? `🎉 ${t('coach.correct')}` : `🌱 ${t('coach.notYet')}`}</div>
            {result.xpEarned > 0 && <div className="font-bold text-indigo-600">+{result.xpEarned} {t('coach.xp')}</div>}
          </div>
          <p className="text-slate-700 mb-2">{result.feedback}</p>

          {result.mastery?.levelUp && (
            <div className="bg-indigo-100 text-indigo-800 rounded-lg p-2 mb-2 font-bold">
              🏅 {t('coach.levelUp', { level: levelNames[result.mastery.levelUp.completed] || result.mastery.levelUp.completed, next: levelNames[result.mastery.levelUp.next] || '🏆' })}
            </div>
          )}
          {result.unlockedConcepts?.length > 0 && (
            <div className="bg-purple-100 text-purple-800 rounded-lg p-2 mb-2 font-bold">
              🔓 {t('coach.unlocked')} {result.unlockedConcepts.map((c) => `${c.icon} ${c.name}`).join(', ')}
            </div>
          )}

          {result.explanation && (
            <div className="mt-2">
              <div className="text-xs font-bold text-slate-500 uppercase">{t('coach.explanation')}</div>
              <p className="text-slate-700 whitespace-pre-wrap">{result.explanation}</p>
            </div>
          )}

          {!result.correct && result.details?.expectedOutput && (
            <div className="grid md:grid-cols-2 gap-3 mt-3">
              <div>
                <div className="text-xs font-bold text-slate-500">{t('coach.expected')}</div>
                <pre className="font-code text-sm bg-white rounded p-2 whitespace-pre-wrap">{result.details.expectedOutput.join('\n')}</pre>
              </div>
              {(result.details.output || result.details.error) && (
                <div>
                  <div className="text-xs font-bold text-slate-500">{t('coach.got')}</div>
                  <pre className="font-code text-sm bg-white rounded p-2 whitespace-pre-wrap">{result.details.error || (result.details.output || []).join('\n')}</pre>
                </div>
              )}
            </div>
          )}

          {result.details?.tips?.length > 0 && (
            <div className="mt-3">
              <div className="text-xs font-bold text-slate-500 uppercase">{t('coach.tips')}</div>
              <ul className="list-disc pl-5 text-sm text-slate-700">{result.details.tips.map((tip, i) => <li key={i}>{tip}</li>)}</ul>
            </div>
          )}

          {result.details?.review && (
            <div className="mt-3 bg-white rounded-lg p-3">
              <div className="text-xs font-bold text-slate-500 uppercase">🤖 {t('coach.coachSays')}</div>
              <p className="text-slate-700">{result.details.review.summary}</p>
              {result.details.review.strengths?.length > 0 && (
                <p className="text-sm text-green-700 mt-1">✅ {t('coach.strengths')}: {result.details.review.strengths.join(' • ')}</p>
              )}
              {result.details.review.improvements?.length > 0 && (
                <p className="text-sm text-orange-700 mt-1">🔧 {t('coach.improve')}: {result.details.review.improvements.join(' • ')}</p>
              )}
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button type="button" className={`${adult ? ADULT_PRIMARY : 'kid-go-btn'} inline-flex items-center gap-2 disabled:cursor-wait`}
              onClick={onNext} disabled={nextLoading} aria-busy={nextLoading} autoFocus>
              {nextLoading && <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" aria-hidden="true" />}
              {nextLoading ? (nextLoadingLabel || t('coach.loading')) : t('coach.next')}
            </button>
            {nextLoading && nextLoadingHint && <p className="text-sm text-slate-600" role="status">{nextLoadingHint}</p>}
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityPlayer;
