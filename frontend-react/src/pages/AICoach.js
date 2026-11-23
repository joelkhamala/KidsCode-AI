import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { aiAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import ActivityPlayer from '../components/ai/ActivityPlayer';
import BloomLadder from '../components/ai/BloomLadder';
import CoachChat from '../components/ai/CoachChat';

/**
 * AI Coach: adaptive practice that follows Bloom's taxonomy, moving each
 * learner from what they know to what they do not know yet.
 *
 * Layout for kids: the current lesson/activity comes first; the language choice is a
 * small "Change" control; progress lives in a sidebar (below the activity on phones).
 */
const Stars = ({ count, total = 6, label }) => (
  <span className="whitespace-nowrap text-sm" aria-label={label}>
    {Array.from({ length: total }, (_, i) => (
      <span key={i} aria-hidden="true" style={{ opacity: i < count ? 1 : 0.2 }}>⭐</span>
    ))}
  </span>
);

const AICoach = () => {
  const { t, i18n } = useTranslation();
  const { loadProgress } = useAuth();
  const locale = i18n.language === 'sw' ? 'sw' : 'en';
  // The Journey page links here with ?concept=... to practise one skill.
  const [searchParams] = useSearchParams();
  const wantedConcept = searchParams.get('concept');

  const [catalog, setCatalog] = useState(null);
  const [language, setLanguage] = useState(null);
  const [profile, setProfile] = useState(null);
  const [current, setCurrent] = useState(null); // { activityId, activity, recommendation, lesson }
  const [showLesson, setShowLesson] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [showLocked, setShowLocked] = useState(false);

  const loadProfile = useCallback(async (lang) => {
    const res = await aiAPI.profile(lang, locale);
    setProfile(res.data);
    return res.data;
  }, [locale]);

  const loadNext = useCallback(async ({ lang, concept, fresh } = {}) => {
    setLoading(true);
    setError(null);
    try {
      const res = await aiAPI.next({ language: lang, locale, concept, fresh });
      setCurrent(res.data);
      setShowLesson(Boolean(res.data.lesson));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err.response?.data?.error || t('coach.error'));
    } finally {
      setLoading(false);
    }
  }, [locale, t]);

  // Initial load: catalog + profile (which tells us the learner's language) + first activity
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [cat, prof] = await Promise.all([aiAPI.catalog(locale), aiAPI.profile(undefined, locale)]);
        if (cancelled) return;
        setCatalog(cat.data);
        setProfile(prof.data);
        setLanguage(prof.data.language);
        const wanted = wantedConcept && prof.data.summary.concepts.find((c) => c.id === wantedConcept && c.unlocked);
        await loadNext({ lang: prof.data.language, concept: wanted ? wanted.id : undefined });
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.error || t('coach.error'));
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [locale, loadNext, t, wantedConcept]);

  const chooseLanguage = async (lang) => {
    setPickerOpen(false);
    if (lang === language) return;
    setLanguage(lang);
    await aiAPI.savePreferences({ language: lang, locale }).catch(() => {});
    await loadProfile(lang).catch(() => {});
    await loadNext({ lang });
  };

  const practiseConcept = (conceptId) => loadNext({ lang: language, concept: conceptId });

  const onFinished = async () => {
    await loadProfile(language).catch(() => {});
    if (loadProgress) loadProgress();
  };

  const bloomLevels = useMemo(() => catalog?.bloomLevels || [], [catalog]);
  const levelNames = useMemo(() => Object.fromEntries(bloomLevels.map((b) => [b.id, `${b.icon} ${b.name}`])), [bloomLevels]);
  const currentLevel = bloomLevels.find((b) => b.id === current?.recommendation.level);
  const currentConcept = useMemo(() => {
    if (!profile || !current) return null;
    return profile.summary.concepts.find((c) => c.id === current.recommendation.concept) || null;
  }, [profile, current]);

  const languages = catalog?.languages || [];
  const primaryLangs = languages.filter((l) => l.ageAppropriate);
  const otherLangs = languages.filter((l) => !l.ageAppropriate);
  const langInfo = languages.find((l) => l.id === language);

  const concepts = profile?.summary.concepts || [];
  const unlockedConcepts = concepts.filter((c) => c.unlocked);
  const lockedConcepts = concepts.filter((c) => !c.unlocked);

  const renderLangTile = (l) => (
    <button
      key={l.id}
      type="button"
      onClick={() => chooseLanguage(l.id)}
      aria-pressed={language === l.id}
      className={`lesson-row ${language === l.id ? 'is-next' : ''}`}
      style={{ alignItems: 'flex-start' }}
    >
      <span className="text-3xl" aria-hidden="true">{l.icon}</span>
      <span className="flex-1 min-w-0">
        <span className="block font-extrabold text-slate-800">
          {l.name}
          {l.recommended && <span className="ml-2 text-xs font-extrabold text-amber-600">★ {t('coach.recommended')}</span>}
        </span>
        <span className="block text-xs text-slate-600 font-semibold">{l.description}</span>
      </span>
      {language === l.id && <span className="pill-go">✓</span>}
    </button>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 pt-6 md:pt-8 pb-28">
      {/* ===== Header: who, which language, how far ===== */}
      <header className="flex flex-col md:flex-row md:items-center gap-4 mb-5">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="kid-mascot animate-float" style={{ width: 64, height: 64, fontSize: '2.2rem', background: '#eef2ff', borderColor: '#c7d2fe' }} aria-hidden="true">🤖</div>
          <div className="min-w-0">
            <h1 className="page-title" style={{ fontSize: '2rem' }}>{t('coach.title')}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="text-sm font-bold text-slate-600">{t('coachUi.learning')}</span>
              {langInfo ? (
                <button
                  type="button"
                  onClick={() => setPickerOpen((o) => !o)}
                  aria-expanded={pickerOpen}
                  className="tab-btn text-sm"
                  style={{ padding: '4px 12px' }}
                >
                  {langInfo.icon} {langInfo.name} <span className="text-indigo-500">· {t('coachUi.change')} ▾</span>
                </button>
              ) : (
                <span className="text-sm text-slate-400">…</span>
              )}
              <Link to="/journey" className="tab-btn text-sm" style={{ padding: '4px 12px' }}>🗺️ {t('journey.title')}</Link>
            </div>
          </div>
        </div>
        {profile && (
          <div className="card p-3 md:w-72" style={{ boxShadow: '0 4px 0 #bae6fd' }}>
            <div className="flex justify-between text-sm font-extrabold text-slate-700 mb-1">
              <span>{t('coachUi.yourProgress', { lang: langInfo?.name || '' })}</span>
              <span className="text-indigo-600">{profile.summary.percent}%</span>
            </div>
            <div className="kid-bar" role="progressbar" aria-valuenow={profile.summary.percent} aria-valuemin={0} aria-valuemax={100}>
              <div className="kid-bar-fill" style={{ width: `${profile.summary.percent}%` }} />
            </div>
          </div>
        )}
      </header>

      {/* ===== Language picker (only when asked for) ===== */}
      {pickerOpen && (
        <section className="card p-5 mb-6" aria-labelledby="lang-title">
          <div className="flex justify-between items-start gap-3 mb-3">
            <div>
              <h2 id="lang-title" className="font-display text-xl text-slate-800">{t('coach.chooseLanguage')}</h2>
              <p className="text-sm text-slate-600">{t('coachUi.pickerHelp')}</p>
            </div>
            <button type="button" className="btn-secondary text-sm py-1 px-3" onClick={() => setPickerOpen(false)} aria-label={t('ui.close')}>✕</button>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">{primaryLangs.map(renderLangTile)}</div>
          {otherLangs.length > 0 && (
            <div className="mt-3">
              <button type="button" className="text-sm font-bold text-indigo-600" onClick={() => setShowMore((s) => !s)} aria-expanded={showMore}>
                {t('coach.moreLanguages')} {showMore ? '▲' : '▼'}
              </button>
              {showMore && <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-2">{otherLangs.map(renderLangTile)}</div>}
            </div>
          )}
        </section>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* ===== Main column ===== */}
        <div className="lg:col-span-2 space-y-4 min-w-0">
          {loading && (
            <div className="card p-10 text-center text-slate-600" role="status">
              <div className="text-5xl mb-3 animate-float" aria-hidden="true">🤖</div>
              <p className="font-bold">{t('coach.loading')}</p>
            </div>
          )}

          {error && !loading && (
            <div className="card p-8 text-center" role="alert">
              <div className="text-5xl mb-2" aria-hidden="true">😕</div>
              <p className="text-slate-700 font-bold mb-4">{error}</p>
              <button type="button" className="kid-go-btn" onClick={() => loadNext({ lang: language })}>{t('coach.retry')}</button>
            </div>
          )}

          {!loading && current && (
            <>
              {/* Kodi explains why this was picked */}
              <div className="flex items-start gap-3">
                <div className="text-3xl flex-shrink-0" aria-hidden="true">🤖</div>
                <div className="flex-1 bg-white border-3 rounded-2xl rounded-tl-none px-4 py-3 text-slate-700 font-semibold" style={{ border: '3px solid #c7d2fe' }}>
                  <span className="sr-only">{t('coach.whyThis')} </span>
                  {current.recommendation.reasonText}
                  {currentConcept && currentLevel && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="text-xs font-extrabold bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">{currentConcept.icon} {currentConcept.name}</span>
                      <span className="text-xs font-extrabold bg-amber-100 text-amber-700 px-2 py-1 rounded-full">{currentLevel.icon} {currentLevel.name}: {currentLevel.kidGoal}</span>
                    </div>
                  )}
                </div>
              </div>

              {current.lesson && showLesson && (
                <section className="card p-5 md:p-7" style={{ borderColor: '#a5b4fc' }} aria-labelledby="lesson-title">
                  <div className="text-xs font-extrabold uppercase tracking-wide text-indigo-500 mb-1">📖 {t('coach.learnFirst')}</div>
                  <h2 id="lesson-title" className="font-display text-2xl md:text-3xl text-slate-800 mb-3">{current.lesson.title}</h2>
                  {current.lesson.bridge && (
                    <p className="bg-green-50 border-2 border-green-200 rounded-2xl p-3 mb-3 text-slate-700">🔗 <strong>{t('coach.youKnow')}:</strong> {current.lesson.bridge}</p>
                  )}
                  <p className="text-slate-700 text-lg mb-4 whitespace-pre-wrap leading-relaxed">{current.lesson.explanation}</p>
                  {current.lesson.analogy && (
                    <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-3 mb-4 text-slate-700">💡 <strong>{t('coach.thinkOfIt')}:</strong> {current.lesson.analogy}</div>
                  )}
                  {current.lesson.example && (
                    <div className="mb-4">
                      <div className="text-xs font-extrabold text-slate-500 mb-1">📝 {t('coach.example')}</div>
                      <pre className="bg-slate-900 text-green-300 rounded-2xl p-4 text-sm font-code overflow-x-auto whitespace-pre" style={{ border: 'none' }}>{current.lesson.example}</pre>
                    </div>
                  )}
                  {current.lesson.goal && <p className="text-indigo-700 font-bold mb-4">🎯 {t('coach.goal')}: {current.lesson.goal}</p>}
                  <button type="button" className="kid-go-btn" onClick={() => setShowLesson(false)}>{t('coach.ready')}</button>
                </section>
              )}

              {(!current.lesson || !showLesson) && (
                <>
                  <ActivityPlayer
                    activityId={current.activityId}
                    activity={current.activity}
                    levelNames={levelNames}
                    onFinished={onFinished}
                    onNext={() => loadNext({ lang: language, fresh: true })}
                  />
                  <div className="flex flex-wrap gap-2">
                    {current.lesson && (
                      <button type="button" className="btn-secondary text-sm py-2" onClick={() => setShowLesson(true)}>📖 {t('coachUi.readAgain')}</button>
                    )}
                    <button type="button" className="btn-secondary text-sm py-2" onClick={() => loadNext({ lang: language, fresh: true })}>
                      🔀 {t('coachUi.different')}
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* ===== Sidebar: progress ===== */}
        <aside className="space-y-4 min-w-0">
          {currentConcept && <BloomLadder concept={currentConcept} bloomLevels={bloomLevels} currentLevel={current?.recommendation.level} />}

          {profile && (
            <section className="card p-5" aria-labelledby="skills-title">
              <h2 id="skills-title" className="font-display text-xl text-slate-800 mb-1">🗺️ {t('coachUi.skills')}</h2>
              <p className="text-xs text-slate-500 font-semibold mb-3">{t('coachUi.skillsHelp')}</p>
              <ul className="space-y-2">
                {unlockedConcepts.map((c) => {
                  const mastered = c.levels.filter((l) => l.mastered).length;
                  const isNow = c.id === currentConcept?.id;
                  return (
                    <li key={c.id} className={`lesson-row ${isNow ? 'is-next' : ''}`} style={{ cursor: 'default' }}>
                      <span className="text-2xl" aria-hidden="true">{c.icon}</span>
                      <span className="flex-1 min-w-0">
                        <span className="block font-extrabold text-slate-800 text-sm truncate">{c.name}</span>
                        <Stars count={mastered} label={t('coachUi.starsLabel', { n: mastered })} />
                      </span>
                      {isNow ? (
                        <span className="pill-go">{t('coachUi.now')}</span>
                      ) : (
                        <button type="button" className="btn-secondary text-xs py-1 px-3" onClick={() => practiseConcept(c.id)}>{t('coach.practise')}</button>
                      )}
                    </li>
                  );
                })}
              </ul>
              {lockedConcepts.length > 0 && (
                <div className="mt-3">
                  <button type="button" onClick={() => setShowLocked((s) => !s)} aria-expanded={showLocked} className="text-sm font-bold text-slate-500">
                    🔒 {t('coachUi.lockedCount', { n: lockedConcepts.length })} {showLocked ? '▲' : '▼'}
                  </button>
                  {showLocked && (
                    <ul className="mt-2 space-y-1">
                      {lockedConcepts.map((c) => (
                        <li key={c.id} className="text-sm text-slate-500 font-semibold">🔒 {c.name}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </section>
          )}

          {profile?.ai && (
            <p className="text-xs text-slate-500 font-semibold px-1">
              {profile.ai.aiEnabled ? `✨ ${t('coach.aiMode')}` : `📴 ${t('coach.offlineMode')}`}
            </p>
          )}
        </aside>
      </div>

      <CoachChat context={{ task: current?.activity?.prompt, language }} />
    </div>
  );
};

export default AICoach;
