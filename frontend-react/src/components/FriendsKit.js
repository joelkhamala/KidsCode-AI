import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { aiAPI, socialAPI } from '../services/api';
import { useToast } from '../context/ToastContext';

/**
 * Building blocks for things friends do together: sticker cheers, friend profiles,
 * code duels and shared projects. Used by the Social page.
 */
export const STICKERS = { high_five: '🙌', star: '🌟', strong: '💪', wow: '🤩', clap: '👏', lets_code: '💻' };
const AVATARS = ['🦊', '🐼', '🦁', '🐸', '🐵', '🦄', '🐯', '🐙', '🐧', '🐨'];
export const avatarOf = (id) => AVATARS[(id || 0) % AVATARS.length];

/** A simple accessible dialog that closes with Escape or the backdrop. */
export const Dialog = ({ title, onClose, children, wide = false }) => {
  const { t } = useTranslation();
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label={title} className="bg-white rounded-3xl shadow-2xl w-full text-left overflow-y-auto"
        style={{ maxWidth: wide ? 720 : 480, maxHeight: '90vh', border: '4px solid #c7d2fe' }}>
        <div className="flex items-center justify-between gap-3 px-5 pt-5">
          <h2 className="font-display text-2xl text-slate-800">{title}</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700 text-2xl font-bold px-2" aria-label={t('fr.close')}>×</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
};

/** Sticker buttons. `counts`/`mine` show cheers already on something. */
export const StickerBar = ({ onPick, counts = {}, mine = [], compact = false, disabled = false }) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap gap-1">
      {Object.entries(STICKERS).filter(([k]) => !compact || k !== 'lets_code').map(([k, emoji]) => (
        <button key={k} type="button" disabled={disabled || mine.includes(k)} onClick={() => onPick(k)} title={t(`fr.sticker.${k}`)}
          aria-label={t(`fr.sticker.${k}`)} aria-pressed={mine.includes(k)}
          className={`rounded-full border-2 px-2 py-0.5 text-sm font-bold transition ${mine.includes(k) ? 'bg-amber-100 border-amber-300' : 'bg-white border-slate-200 hover:border-indigo-300'}`}>
          {emoji}{counts[k] ? <span className="ml-1 text-xs text-slate-600">{counts[k]}</span> : null}
          {!compact && <span className="ml-1 text-xs text-slate-600">{t(`fr.sticker.${k}`)}</span>}
        </button>
      ))}
    </div>
  );
};

export const CheerDialog = ({ friend, onClose, onSent }) => {
  const { t } = useTranslation();
  const { notify } = useToast();
  const [busy, setBusy] = useState(false);
  const send = async (sticker) => {
    setBusy(true);
    try {
      await socialAPI.cheer({ to: friend.id, sticker });
      notify(t('fr.cheerSent', { emoji: STICKERS[sticker], name: friend.name }), 'success');
      onSent && onSent();
      onClose();
    } catch (err) {
      notify(err.response?.data?.error || t('socialUi.somethingWrong'), 'error');
      setBusy(false);
    }
  };
  return (
    <Dialog title={t('fr.cheerFor', { name: friend.name })} onClose={onClose}>
      <p className="text-sm font-semibold text-slate-600 mb-4">{t('fr.cheerHelp')}</p>
      <div className="grid grid-cols-2 gap-2">
        {Object.entries(STICKERS).map(([k, emoji]) => (
          <button key={k} type="button" disabled={busy} onClick={() => send(k)}
            className="flex items-center gap-2 p-3 rounded-2xl border-2 border-slate-200 hover:border-indigo-400 bg-slate-50 font-extrabold text-slate-700">
            <span className="text-3xl" aria-hidden="true">{emoji}</span>{t(`fr.sticker.${k}`)}
          </button>
        ))}
      </div>
    </Dialog>
  );
};

export const ProfileDialog = ({ friendId, onClose, onOpenProject }) => {
  const { t, i18n } = useTranslation();
  const [p, setP] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    socialAPI.getProfile(friendId, i18n.language === 'sw' ? 'sw' : 'en')
      .then((r) => setP(r.data)).catch((e) => setError(e.response?.data?.error || t('socialUi.somethingWrong')));
  }, [friendId, i18n.language, t]);
  return (
    <Dialog title={p ? `${avatarOf(p.id)} ${p.name}` : '…'} onClose={onClose} wide>
      {error && <p className="font-bold text-red-600">{error}</p>}
      {!p && !error && <p className="text-slate-500 font-semibold">{t('common.loading')}</p>}
      {p && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            {[['⭐', `${p.totalXp}`, 'XP'], ['✅', p.lessons, t('social.lessons')], ['🔥', p.streak, t('profileUi.days')], ['🤝', p.buddyStreak, t('fr.buddyHelp')]].map(([icon, n, label]) => (
              <div key={label} className="rounded-2xl bg-slate-50 p-3">
                <div className="font-display text-2xl text-slate-800">{icon} {n}</div>
                <div className="text-xs font-bold text-slate-500">{label}</div>
              </div>
            ))}
          </div>
          <section className="rounded-2xl bg-indigo-50 p-4">
            <h3 className="font-extrabold text-indigo-800 mb-1">🗺️ {t('fr.profileJourney')} · {p.journey.languageName}</h3>
            <p className="font-display text-xl text-slate-800">{p.journey.rank}</p>
            <p className="text-sm font-semibold text-slate-600">
              {t('fr.profileStage', { n: p.journey.stagesDone, total: p.journey.totalStages })}
              {p.journey.current ? ` · ${t('fr.profileNow', { stage: p.journey.current })}` : ''}
            </p>
          </section>
          <section>
            <h3 className="font-extrabold text-slate-700 mb-2">🏅 {t('fr.profileBadges')}</h3>
            {p.badges.length ? (
              <div className="flex flex-wrap gap-2">{p.badges.map((b) => <span key={b.name} className="px-3 py-1 rounded-full bg-amber-50 border-2 border-amber-200 text-sm font-bold">{b.icon} {b.name}</span>)}</div>
            ) : <p className="text-sm text-slate-500 font-semibold">{t('fr.profileNoBadges')}</p>}
          </section>
          {p.projects.length > 0 && (
            <section>
              <h3 className="font-extrabold text-slate-700 mb-2">🎨 {t('fr.profileProjects')}</h3>
              <div className="flex flex-wrap gap-2">
                {p.projects.map((pr) => (
                  <button key={pr.id} type="button" className="btn-secondary text-sm" onClick={() => onOpenProject(pr.id)}>▶ {pr.title}</button>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </Dialog>
  );
};

/** Choose a language and skill, then send the duel. */
export const NewDuelDialog = ({ friend, onClose, onSent }) => {
  const { t, i18n } = useTranslation();
  const { notify } = useToast();
  const locale = i18n.language === 'sw' ? 'sw' : 'en';
  const [languages, setLanguages] = useState([]);
  const [language, setLanguage] = useState(null);
  const [skills, setSkills] = useState([]);
  const [concept, setConcept] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([aiAPI.catalog(locale), aiAPI.profile(undefined, locale)]).then(([cat, prof]) => {
      setLanguages((cat.data.languages || []).filter((l) => l.ageAppropriate || l.id === prof.data.language));
      setLanguage(prof.data.language);
    }).catch(() => {});
  }, [locale]);

  useEffect(() => {
    if (!language) return;
    aiAPI.profile(language, locale).then((r) => {
      const unlocked = r.data.summary.concepts.filter((c) => c.unlocked);
      setSkills(unlocked);
      setConcept(unlocked.length ? unlocked[unlocked.length - 1].id : '');
    }).catch(() => setSkills([]));
  }, [language, locale]);

  const start = async () => {
    setBusy(true);
    try {
      await socialAPI.startDuel({ to: friend.id, language, concept });
      notify(t('fr.duelSent', { name: friend.name }), 'success');
      onSent && onSent();
      onClose();
    } catch (err) {
      notify(err.response?.data?.error || t('socialUi.somethingWrong'), 'error');
      setBusy(false);
    }
  };

  return (
    <Dialog title={`⚔️ ${t('fr.duelNew', { name: friend.name })}`} onClose={onClose}>
      <p className="text-sm font-semibold text-slate-600 mb-4">{t('fr.duelsHelp', { finish: 10, win: 20 })}</p>
      <label className="block text-sm font-extrabold text-slate-700 mb-1" htmlFor="duel-lang">{t('fr.duelLanguage')}</label>
      <select id="duel-lang" className="w-full mb-3 px-3 py-2 rounded-xl border-2 border-slate-200 font-semibold" value={language || ''} onChange={(e) => setLanguage(e.target.value)}>
        {languages.map((l) => <option key={l.id} value={l.id}>{l.icon} {l.name}</option>)}
      </select>
      <label className="block text-sm font-extrabold text-slate-700 mb-1" htmlFor="duel-skill">{t('fr.duelSkill')}</label>
      {skills.length ? (
        <select id="duel-skill" className="w-full mb-4 px-3 py-2 rounded-xl border-2 border-slate-200 font-semibold" value={concept} onChange={(e) => setConcept(e.target.value)}>
          {skills.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
        </select>
      ) : <p className="text-sm font-semibold text-slate-500 mb-4">{t('fr.duelNoSkills')}</p>}
      <button type="button" className="btn-primary w-full justify-center" disabled={busy || !concept} onClick={start}>⚔️ {t('fr.duelStart')}</button>
    </Dialog>
  );
};

/** Answer the 5 duel questions, then see the marking. */
export const PlayDuelDialog = ({ duelId, onClose, onDone }) => {
  const { t, i18n } = useTranslation();
  const { notify } = useToast();
  const locale = i18n.language === 'sw' ? 'sw' : 'en';
  const [duel, setDuel] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    socialAPI.getDuel(duelId, locale).then((r) => setDuel(r.data)).catch((e) => notify(e.response?.data?.error || t('socialUi.somethingWrong'), 'error'));
  }, [duelId, locale, notify, t]);

  const submit = async () => {
    if (Object.keys(answers).length < duel.questions.length) { notify(t('fr.duelAnswerAll'), 'warning'); return; }
    setBusy(true);
    try {
      const r = await socialAPI.answerDuel(duelId, duel.questions.map((_, i) => answers[i]), locale);
      setResult(r.data);
      onDone && onDone();
    } catch (err) {
      notify(err.response?.data?.error || t('socialUi.somethingWrong'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const title = duel ? `⚔️ ${t('fr.duelWith', { skill: `${duel.icon} ${duel.skill}`, name: duel.opponent })}` : '⚔️';
  return (
    <Dialog title={title} onClose={onClose} wide>
      {!duel && <p className="text-slate-500 font-semibold">{t('common.loading')}</p>}
      {duel && !duel.yourTurn && !result && <DuelResult duel={duel} />}
      {duel && (duel.yourTurn || result) && (
        <div className="space-y-5">
          {result && (
            <div className="rounded-2xl bg-indigo-50 p-4 text-center">
              <p className="font-display text-2xl text-indigo-700">{t('fr.duelYouScored', { score: result.score, total: result.total })}</p>
              <DuelResult duel={result.duel} />
            </div>
          )}
          {duel.questions.map((q, i) => {
            const mark = result && result.marking[i];
            return (
              <section key={q.n} className="rounded-2xl border-2 border-slate-100 p-4">
                <p className="text-xs font-extrabold text-slate-400 mb-1">{t('fr.duelQuestion', { n: q.n, total: duel.questions.length })} · {q.levelName}</p>
                <p className="font-bold text-slate-800 mb-2 whitespace-pre-line">{q.prompt}</p>
                {q.code && <pre className="bg-slate-900 text-slate-100 text-sm rounded-xl p-3 mb-3 overflow-x-auto"><code>{q.code}</code></pre>}
                <div className="grid gap-2">
                  {q.options.map((opt, j) => {
                    const chosen = answers[i] === j;
                    const isRight = mark && mark.correctIndex === j;
                    return (
                      <button key={j} type="button" disabled={Boolean(result)} onClick={() => setAnswers((a) => ({ ...a, [i]: j }))} aria-pressed={chosen}
                        className={`answer-btn text-left ${q.codeOptions ? 'font-mono text-sm' : ''} ${chosen ? 'ring-4 ring-indigo-200 border-indigo-400' : ''} ${isRight ? 'bg-green-50 border-green-400' : ''} ${mark && chosen && !mark.correct ? 'bg-red-50 border-red-300' : ''}`}>
                        {opt}
                      </button>
                    );
                  })}
                </div>
                {mark && <p className={`mt-2 text-sm font-extrabold ${mark.correct ? 'text-green-700' : 'text-red-600'}`}>{mark.correct ? `✓ ${t('fr.duelCorrect')}` : `✗ ${t('fr.duelWrong')}`}</p>}
              </section>
            );
          })}
          {!result && <button type="button" className="btn-primary w-full justify-center" disabled={busy} onClick={submit}>🏁 {t('fr.duelSubmit')}</button>}
        </div>
      )}
    </Dialog>
  );
};

export const DuelResult = ({ duel }) => {
  const { t } = useTranslation();
  if (duel.status !== 'done') {
    return <p className="font-bold text-slate-600">⏳ {t('fr.duelWaiting', { name: duel.opponent })}</p>;
  }
  return (
    <div>
      <p className="font-display text-xl text-slate-800">
        {duel.result === 'won' ? t('fr.duelWon') : duel.result === 'tie' ? t('fr.duelTie') : t('fr.duelLost', { name: duel.opponent })}
      </p>
      <p className="text-sm font-bold text-slate-600">{t('fr.duelScore', { you: duel.yourScore, them: duel.theirScore, name: duel.opponent })}</p>
    </div>
  );
};

/** Look at a shared project; JavaScript/blocks ones open in the Playground to remix. */
export const ProjectDialog = ({ projectId, onClose, onChanged }) => {
  const { t } = useTranslation();
  const { notify, confirm } = useToast();
  const navigate = useNavigate();
  const [p, setP] = useState(null);
  useEffect(() => {
    socialAPI.getProject(projectId).then((r) => setP(r.data)).catch((e) => { notify(e.response?.data?.error || t('socialUi.somethingWrong'), 'error'); onClose(); });
  }, [projectId, notify, onClose, t]);

  const remix = () => {
    try {
      localStorage.setItem('playground_code', p.code);
      if (p.blocksXml) localStorage.setItem('playground_blocks', p.blocksXml); else localStorage.removeItem('playground_blocks');
      localStorage.setItem('playground_mode', p.blocksXml ? 'blocks' : 'code');
    } catch { /* storage blocked - the Playground still opens */ }
    navigate('/playground');
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(p.code); notify(t('fr.copied'), 'success'); } catch { /* ignore */ }
  };
  const unshare = async () => {
    const ok = await confirm({ title: t('fr.unshareTitle'), message: p.title, confirmLabel: t('fr.unshare'), danger: true, icon: '🎨' });
    if (!ok) return;
    await socialAPI.unshareProject(p.id).catch(() => {});
    onChanged && onChanged();
    onClose();
  };

  return (
    <Dialog title={p ? `🎨 ${p.title}` : '🎨'} onClose={onClose} wide>
      {!p ? <p className="text-slate-500 font-semibold">{t('common.loading')}</p> : (
        <div>
          <p className="text-sm font-bold text-slate-500 mb-3">{p.isYours ? t('fr.yours') : t('fr.by', { name: p.ownerName })} · {p.language}</p>
          <pre className="bg-slate-900 text-slate-100 text-sm rounded-xl p-4 mb-4 overflow-auto" style={{ maxHeight: 320 }}><code>{p.code}</code></pre>
          <div className="flex flex-wrap gap-2">
            {(p.language === 'javascript' || p.language === 'blocks') && <button type="button" className="btn-primary" onClick={remix}>🎨 {t('fr.remix')}</button>}
            <button type="button" className="btn-secondary" onClick={copy}>📋 {t('fr.copy')}</button>
            {p.isYours && <button type="button" className="btn-secondary" onClick={unshare}>🗑️ {t('fr.unshare')}</button>}
          </div>
        </div>
      )}
    </Dialog>
  );
};
