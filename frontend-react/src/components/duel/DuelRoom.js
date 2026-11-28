import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import CodeEditor from '../CodeEditor';
import RunConsole from '../RunConsole';
import { codeAPI } from '../../services/api';

const fmtTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
const scoreColor = (score) => (score >= 80 ? 'text-emerald-600' : score >= 50 ? 'text-amber-600' : 'text-rose-600');

const StatusBar = ({ match, remaining, connected }) => {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div className="rounded-xl bg-slate-50 p-3">
        <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">{t('duel.timeLeft')}</span>
        <span className={`font-display text-xl ${remaining <= 20 ? 'text-rose-600' : 'text-slate-800'}`}>{fmtTime(remaining)}</span>
      </div>
      <div className="rounded-xl bg-slate-50 p-3">
        <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">{t('duel.you')}</span>
        <span className={`font-display text-xl ${scoreColor(match.you?.score || 0)}`}>{match.you?.score || 0}</span>
      </div>
      <div className="rounded-xl bg-slate-50 p-3">
        <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">{t('duel.opponent')}</span>
        <span className="font-display text-lg text-slate-800 truncate">{match.opponent?.name || '—'}</span>
      </div>
      <div className="rounded-xl bg-slate-50 p-3">
        <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">Status</span>
        <span className={`text-sm font-extrabold ${connected ? 'text-emerald-600' : 'text-slate-500'}`}>
          {match.opponent?.submitted ? '✅ ' : connected ? '🟢 ' : '⚪ '}
          {match.opponent?.submitted ? t('duel.submitted') : connected ? 'Online' : 'Away'}
        </span>
      </div>
    </div>
  );
};

const Result = ({ match, onRematch, onBack, t }) => {
  const title = match.result === 'won' ? t('duel.resultWon') : match.result === 'tie' ? t('duel.resultTie') : t('duel.resultLost');
  const b = match.you?.breakdown || {};
  const p = match.payout;
  return (
    <div className="text-center sm:text-left">
      <div className="rounded-2xl bg-gradient-to-br from-indigo-50 to-sky-50 p-6 mb-5">
        <p className="font-display text-3xl text-slate-800 mb-1">{title}</p>
        <p className="text-lg font-extrabold text-indigo-700">{match.you?.score || 0} · {t('duel.score')}</p>
        {p && <p className="text-sm font-bold text-slate-600 mt-2">{t('duel.rewards', p)} · {t('duel.rating', { delta: p.ratingDelta > 0 ? `+${p.ratingDelta}` : p.ratingDelta })}</p>}
      </div>
      <h3 className="font-extrabold text-slate-800 mb-3">{t('duel.breakdown')}</h3>
      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[['correctness', b.correctness], ['hiddenTests', b.hiddenTests], ['speed', b.speed], ['attempts', b.attempts]].map(([key, value]) => (
          <div key={key} className="rounded-xl border border-slate-200 p-3">
            <dt className="text-xs font-bold text-slate-500">{t(`duel.${key}`)}</dt>
            <dd className="font-display text-xl text-slate-800">{value || 0}</dd>
          </div>
        ))}
      </dl>
      <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
        <button type="button" className="btn-primary" onClick={onRematch}>🔁 {t('duel.rematch')}</button>
        <button type="button" className="btn-secondary" onClick={onBack}>← {t('duel.next')}</button>
      </div>
    </div>
  );
};

const Quiz = ({ challenge, answers, onAnswer, onSubmit, busy }) => {
  const { t } = useTranslation();
  const ready = answers.length === challenge.questions.length && answers.every((a) => Number.isInteger(a));
  return (
    <div>
      <ol className="space-y-4">
        {challenge.questions.map((q, i) => (
          <li key={q.id} className="rounded-xl border border-slate-200 p-4">
            <p className="font-extrabold text-slate-800 mb-3">{i + 1}. {q.prompt}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {q.options.map((option, oi) => (
                <button
                  key={oi}
                  type="button"
                  aria-pressed={answers[i] === oi}
                  onClick={() => onAnswer(i, oi)}
                  className={`answer-btn text-left ${answers[i] === oi ? 'selected' : ''}`}
                >
                  <span className="font-bold text-indigo-600 mr-2">{String.fromCharCode(65 + oi)}.</span> {option}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ol>
      <button type="button" className="btn-primary mt-5 w-full sm:w-auto" disabled={!ready || busy} onClick={onSubmit}>
        {busy ? '…' : t('duel.submit')}
      </button>
      {!ready && <p className="text-xs font-semibold text-slate-500 mt-2">{t('duel.answerAll')}</p>}
    </div>
  );
};

const DuelRoom = ({ match, challenge, challengeLoading, busy, notice, onSubmit, onLeave, onRematch, onBack }) => {
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  const [answers, setAnswers] = useState([]);
  const [run, setRun] = useState(null);
  const [running, setRunning] = useState(false);
  const [drift, setDrift] = useState(0);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (match?.serverNow) setDrift(match.serverNow - Date.now());
  }, [match?.serverNow]);
  // Polls refresh the challenge object every few seconds; reset only when the
  // actual task changes, never while a child is typing.
  const starterCode = challenge?.starterCode || '';
  const questionCount = challenge?.questions?.length || 0;
  const challengeKey = challenge ? `${match?.id}|${challenge.title}` : '';
  useEffect(() => {
    if (!challengeKey) return;
    setCode(starterCode);
    setAnswers(Array(questionCount).fill(null));
    setRun(null);
  }, [challengeKey, starterCode, questionCount]);

  const remaining = useMemo(() => {
    if (!match?.endsAt || match.status !== 'active') return 0;
    return Math.max(0, Math.floor((Date.parse(match.endsAt.replace(' ', 'T') + 'Z') + drift - now) / 1000));
  }, [match?.endsAt, match?.status, drift, now]);

  if (!match) return <div className="card p-6" role="status" aria-busy="true">…</div>;

  if (match.status === 'waiting') {
    return (
      <section className="card p-8 text-center" aria-live="polite">
        <div className="mx-auto mb-4 h-14 w-14 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" aria-hidden="true" />
        {notice && <p className="mb-4 rounded-xl bg-sky-50 p-3 text-sm font-bold text-sky-800" role="status">{notice}</p>}
        <h2 className="font-display text-2xl text-slate-800 mb-2">{match.format === 'friend' ? t('duel.inviteWaiting') : t('duel.searching')}</h2>
        <p className="text-sm font-semibold text-slate-500 mb-5">{match.format === 'friend' ? t('duel.friendHelp') : t('duel.searchingHelp')}</p>
        <button type="button" className="btn-secondary" onClick={onLeave}>{t('duel.cancel')}</button>
      </section>
    );
  }

  if (match.status === 'finished' || match.status === 'cancelled') {
    return (
      <section className="card p-6">
        {match.status === 'cancelled' ? (
          <div className="text-center">
            <h2 className="font-display text-2xl text-slate-800 mb-4">{t('duel.resultCancelled')}</h2>
            <button type="button" className="btn-primary" onClick={onBack}>{t('duel.next')}</button>
          </div>
        ) : <Result match={match} onRematch={onRematch} onBack={onBack} t={t} />}
      </section>
    );
  }

  const runCode = async () => {
    setRunning(true);
    try {
      const res = await codeAPI.runCode(code, 'javascript');
      const text = res.data?.output || '';
      setRun({ ok: !res.data?.error, output: text.split('\n') });
    } catch (err) {
      setRun({ ok: false, output: [err.response?.data?.error || t('duel.loadError')] });
    } finally {
      setRunning(false);
    }
  };

  const submitCode = () => onSubmit({ code, final: true });
  const submitQuiz = () => onSubmit({ answers, final: true });

  return (
    <section className="space-y-4">
      <StatusBar match={match} remaining={remaining} connected={match.opponent?.connected} />
      {notice && <p className="rounded-xl bg-sky-50 p-3 text-sm font-bold text-sky-800" role="status">{notice}</p>}
      <div className="card p-5 sm:p-6">
        {challengeLoading && <p role="status" aria-busy="true">…</p>}
        {challenge && (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wide text-indigo-600">{match.modeName} · {match.difficulty}</p>
                <h2 className="font-display text-2xl sm:text-3xl text-slate-800">{challenge.title}</h2>
              </div>
              <button type="button" className="btn-secondary text-xs" onClick={onLeave}>{t('duel.cancel')}</button>
            </div>
            <p className="font-semibold text-slate-700 mb-4 whitespace-pre-line">{challenge.instructions}</p>

            {challenge.mode === 'code_quiz' ? (
              <Quiz challenge={challenge} answers={answers} onAnswer={(i, v) => setAnswers((a) => a.map((x, j) => (j === i ? v : x)))} onSubmit={submitQuiz} busy={busy} />
            ) : (
              <>
                {challenge.grid && (
                  <pre className="mb-4 inline-block rounded-xl bg-slate-900 p-3 font-mono text-sm text-emerald-300" aria-label="Maze map">
                    {challenge.grid.join('\n')}
                  </pre>
                )}
                {!!challenge.examples?.length && (
                  <div className="mb-4">
                    <h3 className="text-xs font-extrabold uppercase tracking-wide text-slate-500 mb-2">{t('duel.examples')}</h3>
                    <div className="flex flex-wrap gap-2">
                      {challenge.examples.map((ex, i) => (
                        <code key={i} className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-mono text-slate-700">
                          {JSON.stringify(ex.input)} → {JSON.stringify(ex.output)}
                        </code>
                      ))}
                    </div>
                  </div>
                )}
                <CodeEditor value={code} onChange={setCode} language="javascript" height={260} ariaLabel={t('duel.challenge')} onRun={runCode} />
                <div className="flex flex-wrap gap-3 mt-4">
                  <button type="button" className="btn-secondary" disabled={running} onClick={runCode}>{running ? t('duel.running') : t('duel.run')}</button>
                  <button type="button" className="btn-primary" disabled={busy || !!match.you?.submitted} onClick={submitCode}>
                    {busy ? '…' : t('duel.submit')}
                  </button>
                </div>
                {!!challenge.hints?.length && !match.you?.attempts && (
                  <details className="mt-4 text-sm">
                    <summary className="cursor-pointer font-bold text-indigo-700">💡 {t('duel.hint', { n: 1 })}</summary>
                    <p className="mt-2 font-semibold text-slate-600">{challenge.hints[0]}</p>
                  </details>
                )}
                {run && <div className="mt-4"><h3 className="text-xs font-extrabold text-slate-600 mb-1">{t('duel.output')}</h3><RunConsole result={{ ok: run.ok, output: run.output }} maxHeight={140} /></div>}
              </>
            )}
          </>
        )}
      </div>
    </section>
  );
};

export default DuelRoom;
