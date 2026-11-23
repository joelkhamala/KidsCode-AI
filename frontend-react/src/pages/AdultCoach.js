import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { adultAiAPI } from '../services/api';
import { Page, Card, Loading, ErrorBox, Ring } from '../components/AdultUi';
import ActivityPlayer from '../components/ai/ActivityPlayer';
import CoachChat from '../components/ai/CoachChat';
import useStudyTimer from '../utils/useStudyTimer';

/**
 * AI Coach for adult learners: adaptive practice that climbs Bloom's six thinking levels
 * (remember -> create) for each skill, a short lesson before each new step, a skills map,
 * and Coach Kodi to ask questions. Uses the same engine as the children's Coach through
 * the adult login, with grown-up wording. Practice time counts towards study hours.
 */
const AdultCoach = () => {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'sw' ? 'sw' : 'en';
  const [catalog, setCatalog] = useState(null);
  const [profile, setProfile] = useState(null);
  const [language, setLanguage] = useState(null);
  const [current, setCurrent] = useState(null);
  const [showLesson, setShowLesson] = useState(false);
  const [loading, setLoading] = useState(true);
  // 'next' while the Next button is fetching (it shows its own spinner); 'other' for everything else.
  const [loadingKind, setLoadingKind] = useState(null);
  const [error, setError] = useState('');
  useStudyTimer({ kind: 'practice' });

  const loadProfile = useCallback(async (lang) => {
    const r = await adultAiAPI.profile(lang, locale);
    setProfile(r.data);
    return r.data;
  }, [locale]);

  const loadNext = useCallback(async ({ lang, concept, fresh, via = 'other' } = {}) => {
    setLoading(true);
    setLoadingKind(via);
    setError('');
    try {
      const r = await adultAiAPI.next({ language: lang, locale, concept, fresh });
      setCurrent(r.data);
      setShowLesson(Boolean(r.data.lesson));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      setError(e.response?.data?.error || t('ad.loadFailed'));
    } finally {
      setLoading(false);
      setLoadingKind(null);
    }
  }, [locale, t]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [cat, prof] = await Promise.all([adultAiAPI.catalog(locale), adultAiAPI.profile(undefined, locale)]);
        if (cancelled) return;
        setCatalog(cat.data);
        setProfile(prof.data);
        setLanguage(prof.data.language);
        await loadNext({ lang: prof.data.language });
      } catch (e) {
        if (!cancelled) { setError(e.response?.data?.error || t('ad.loadFailed')); setLoading(false); }
      }
    })();
    return () => { cancelled = true; };
  }, [locale, loadNext, t]);

  const chooseLanguage = async (lang) => {
    if (lang === language) return;
    setLanguage(lang);
    await adultAiAPI.savePreferences({ language: lang, locale }).catch(() => {});
    await loadProfile(lang).catch(() => {});
    await loadNext({ lang });
  };

  const levels = useMemo(() => catalog?.bloomLevels || [], [catalog]);
  const levelNames = useMemo(() => Object.fromEntries(levels.map((b) => [b.id, `${b.icon} ${b.name}`])), [levels]);

  if (error && !current) return <Page><ErrorBox message={error} onRetry={() => window.location.reload()} /></Page>;
  if (!catalog || !profile || (!current && loading)) return <Page><Loading /></Page>;

  const languages = (catalog.languages || []).filter((l) => l.ageAppropriate);
  const langInfo = languages.find((l) => l.id === language) || (catalog.languages || []).find((l) => l.id === language);
  const concepts = profile.summary.concepts || [];
  const unlocked = concepts.filter((c) => c.unlocked);
  const lockedCount = concepts.length - unlocked.length;
  const rec = current?.recommendation;
  const currentConcept = rec ? concepts.find((c) => c.id === rec.concept) : null;
  const currentLevel = rec ? levels.find((b) => b.id === rec.level) : null;
  const lesson = current?.lesson;
  const aiOn = Boolean(profile.ai?.aiEnabled);
  const xp = profile.xp || { total: 0, week: 0, answered: 0 };

  return (
    <Page wide>
      {/* ===== Hero ===== */}
      <section className="relative overflow-hidden rounded-3xl p-6 md:p-8 mb-6 text-white shadow-lg"
        style={{ background: 'radial-gradient(circle at 85% 15%, rgba(56,189,248,0.4), transparent 45%), linear-gradient(135deg, #0f172a 0%, #312e81 60%, #4c1d95 100%)' }}
        aria-labelledby="coach-title">
        <div className="relative grid lg:grid-cols-[1fr_auto] gap-8 items-center">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/15">{aiOn ? `✨ ${t('adc.aiOn')}` : `📚 ${t('adc.aiOff')}`}</span>
            </div>
            <h1 id="coach-title" className="text-2xl md:text-4xl font-bold">🤖 {t('adc.title')}</h1>
            <p className="text-indigo-100 mt-2 max-w-2xl">{t('adc.subtitle')}</p>
            <div className="mt-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-indigo-200 mb-2">{t('adc.practiseIn')}</p>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t('adc.practiseIn')}>
                {languages.map((l) => (
                  <button key={l.id} type="button" role="radio" aria-checked={l.id === language} onClick={() => chooseLanguage(l.id)}
                    className={`px-3 py-1.5 rounded-xl text-sm font-semibold border transition ${l.id === language ? 'bg-white text-indigo-800 border-white' : 'bg-white/10 text-white border-white/20 hover:bg-white/20'}`}>
                    {l.icon} {l.name}{l.recommended && l.id !== language ? ' ★' : ''}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap lg:flex-col items-center gap-4 justify-center">
            <Ring pct={profile.summary.percent} label={t('adc.mastery', { lang: langInfo ? langInfo.name : '' })} />
            {/* XP earned here: every correct answer adds points (fewer when hints were used). */}
            <div className="rounded-2xl bg-white/10 border border-white/20 px-4 py-3 text-center min-w-[11rem]" aria-live="polite">
              <p className="text-3xl font-bold text-amber-300">⭐ {xp.total.toLocaleString()}</p>
              <p className="text-xs font-semibold uppercase tracking-wider text-indigo-100">{t('adc.xpTotal')}</p>
              <p className="text-xs text-indigo-200 mt-1">{t('adc.xpWeek', { xp: xp.week })} · {t('adc.xpAnswered', { count: xp.answered })}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_340px] gap-6 items-start">
        <div className="space-y-4 min-w-0">
          {error && <div className="rounded-xl px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm" role="alert">{error}</div>}

          {/* What we are practising and why */}
          {rec && (
            <Card className="p-5">
              <div className="flex flex-wrap items-start gap-4">
                <span className="w-12 h-12 shrink-0 rounded-2xl bg-indigo-50 flex items-center justify-center text-2xl" aria-hidden="true">{currentConcept?.icon || '🧠'}</span>
                <div className="flex-1 min-w-[12rem]">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-bold text-slate-900 text-lg">{currentConcept?.name || rec.concept}</h2>
                    {currentLevel && <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-violet-100 text-violet-800">{currentLevel.icon} {currentLevel.name}</span>}
                  </div>
                  <p className="text-sm text-slate-600 mt-1">{rec.reasonText}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {lesson && !showLesson && (
                    <button type="button" onClick={() => setShowLesson(true)} className="px-3 py-2 rounded-xl border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50">📖 {t('adc.readLesson')}</button>
                  )}
                  <button type="button" onClick={() => loadNext({ lang: language, concept: rec.concept, fresh: true })} disabled={loading}
                    className="px-3 py-2 rounded-xl border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">🔄 {t('adc.different')}</button>
                </div>
              </div>
            </Card>
          )}

          {/* Short lesson before a new step */}
          {lesson && showLesson && (
            <Card className="p-5 md:p-6 border-l-4 border-l-indigo-500">
              <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">{t('adc.learnFirst')}</p>
              <h2 className="text-xl font-bold text-slate-900 mt-1">{lesson.title}</h2>
              {lesson.bridge && <p className="text-sm text-emerald-700 font-semibold mt-2">🔗 {lesson.bridge}</p>}
              <p className="text-slate-700 mt-3 leading-relaxed">{lesson.explanation}</p>
              {lesson.analogy && <p className="mt-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-950">💡 {lesson.analogy}</p>}
              {lesson.example && <pre className="mt-3 bg-slate-900 text-slate-100 text-sm rounded-xl p-4 overflow-x-auto"><code>{lesson.example}</code></pre>}
              {lesson.goal && <p className="mt-3 text-sm font-semibold text-slate-700">🎯 {lesson.goal}</p>}
              <button type="button" onClick={() => setShowLesson(false)} className="mt-4 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">{t('adc.startQuestion')} →</button>
            </Card>
          )}

          {loading && loadingKind === 'other' && current && (
            <Card className="p-8 text-center" role="status">
              <span className="inline-block w-10 h-10 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin" aria-hidden="true" />
              <p className="font-semibold text-slate-900 mt-3">{t('adc.preparing')}</p>
              <p className="text-sm text-slate-600 mt-1">{t('adc.preparingHint')}</p>
            </Card>
          )}

          {current && !showLesson && !(loading && loadingKind === 'other') && (
            <ActivityPlayer adult client={adultAiAPI} activityId={current.activityId} activity={current.activity} levelNames={levelNames}
              onFinished={() => loadProfile(language).catch(() => {})} onNext={() => loadNext({ lang: language, via: 'next' })}
              nextLoading={loading && loadingKind === 'next'} nextLoadingLabel={t('adc.preparing')} nextLoadingHint={t('adc.preparingHint')} />
          )}
        </div>

        {/* ===== Side column ===== */}
        <aside className="space-y-4 lg:sticky lg:top-4">
          {currentConcept && (
            <Card className="p-5">
              <h2 className="font-bold text-slate-900">{t('adc.thinkingLevels')}</h2>
              <p className="text-xs text-slate-500 mb-3">{currentConcept.icon} {currentConcept.name}</p>
              <ol className="flex flex-col-reverse gap-1.5">
                {levels.map((b, i) => {
                  const s = currentConcept.levels.find((x) => x.level === b.id) || {};
                  const here = rec && rec.level === b.id;
                  return (
                    <li key={b.id} className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm border ${here ? 'border-indigo-300 bg-indigo-50' : s.mastered ? 'border-emerald-200 bg-emerald-50' : 'border-slate-100'}`} aria-current={here ? 'step' : undefined}>
                      <span className={`w-6 h-6 shrink-0 rounded-full text-xs font-bold flex items-center justify-center ${s.mastered ? 'bg-emerald-500 text-white' : here ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>{s.mastered ? '✓' : i + 1}</span>
                      <span className="flex-1 font-medium text-slate-800">{b.icon} {b.name}</span>
                      {here && <span className="text-[10px] font-bold uppercase text-indigo-700">{t('ad.youAreHere')}</span>}
                    </li>
                  );
                })}
              </ol>
            </Card>
          )}

          <Card className="p-5">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h2 className="font-bold text-slate-900">{t('adc.skills')}</h2>
              <span className="text-xs font-semibold text-slate-500">{t('adc.skillsMastered', { n: concepts.filter((c) => c.levels.every((l) => l.mastered)).length, total: concepts.length })}</span>
            </div>
            <ul className="space-y-1">
              {unlocked.map((c) => {
                const done = c.levels.filter((l) => l.mastered).length;
                const active = rec && rec.concept === c.id;
                return (
                  <li key={c.id}>
                    <button type="button" onClick={() => loadNext({ lang: language, concept: c.id })} disabled={loading}
                      className={`w-full flex items-center gap-3 rounded-xl px-3 py-2 text-left transition ${active ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}>
                      <span className="text-lg" aria-hidden="true">{c.icon}</span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-semibold text-slate-800 truncate">{c.name}</span>
                        <span className="flex gap-0.5 mt-1" aria-label={t('adc.levelsDone', { n: done })}>
                          {c.levels.map((l) => <span key={l.level} className={`h-1.5 flex-1 rounded-full ${l.mastered ? 'bg-emerald-500' : l.attempts ? 'bg-indigo-300' : 'bg-slate-200'}`} />)}
                        </span>
                      </span>
                      <span className="text-xs text-slate-500 whitespace-nowrap">{done}/6</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {lockedCount > 0 && <p className="text-xs text-slate-500 mt-3">🔒 {t('adc.lockedSkills', { n: lockedCount })}</p>}
          </Card>
        </aside>
      </div>

      <CoachChat adult client={adultAiAPI} context={{ language, task: current?.activity?.prompt || '' }} />
    </Page>
  );
};

export default AdultCoach;
