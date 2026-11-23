import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { aiAPI } from '../services/api';

/**
 * My Coding Journey: the life-long path from a newbie's first steps to professional
 * skills, stage by stage, then endless Legend levels. Data: GET /api/ai/journey.
 */
const STATE_STYLE = {
  done: { chip: 'bg-green-100 text-green-800', dot: 'journey-dot-done' },
  open: { chip: 'bg-indigo-100 text-indigo-800', dot: 'journey-dot-open' },
  locked: { chip: 'bg-slate-100 text-slate-500', dot: 'journey-dot-locked' },
};

const Stars = ({ n, total }) => (
  <span className="whitespace-nowrap text-sm" aria-hidden="true">
    {Array.from({ length: total }, (_, i) => (
      <span key={i} className={i < n ? '' : 'opacity-25 grayscale'}>⭐</span>
    ))}
  </span>
);

const Journey = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const locale = i18n.language === 'sw' ? 'sw' : 'en';
  const [journey, setJourney] = useState(null);
  const [languages, setLanguages] = useState([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const currentRef = useRef(null);

  const load = useCallback(async (language) => {
    setLoading(true);
    setError(null);
    try {
      const [j, cat] = await Promise.all([aiAPI.journey(language, locale), aiAPI.catalog(locale)]);
      setJourney(j.data);
      setLanguages(cat.data.languages || []);
    } catch (err) {
      setError(err.response?.data?.error || t('journey.error'));
    } finally {
      setLoading(false);
    }
  }, [locale, t]);

  useEffect(() => { load(); }, [load]);

  // Bring the stage the child is working on into view.
  useEffect(() => {
    if (journey && currentRef.current) currentRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [journey]);

  const switchLanguage = async (lang, { goToCoach = false } = {}) => {
    setPickerOpen(false);
    await aiAPI.savePreferences({ language: lang, locale }).catch(() => {});
    if (goToCoach) navigate('/coach');
    else load(lang);
  };

  const practise = (conceptId) => navigate(`/coach?concept=${encodeURIComponent(conceptId)}`);

  if (loading && !journey) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="text-6xl mb-3 animate-bounce" aria-hidden="true">🗺️</div>
        <p className="font-bold text-slate-600">{t('journey.loading')}</p>
      </div>
    );
  }
  if (error && !journey) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="text-6xl mb-3" aria-hidden="true">🧭</div>
        <p className="font-bold text-slate-700 mb-4">{error}</p>
        <button type="button" className="btn-primary" onClick={() => load()}>{t('journey.retry')}</button>
      </div>
    );
  }

  const lang = languages.find((l) => l.id === journey.language);
  const doneStages = journey.stages.filter((s) => s.state === 'done');
  const heroIcon = journey.legend.unlocked ? '🏆' : (doneStages[doneStages.length - 1]?.icon || '🐣');
  const overallPct = Math.round((100 * journey.stagesDone) / Math.max(1, journey.totalStages));

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 md:py-8">
      <h1 className="page-title mb-2">🗺️ {t('journey.title')}</h1>
      <p className="text-slate-600 font-semibold mb-6 max-w-2xl">{t('journey.subtitle')}</p>

      {/* Who am I now */}
      <section className="card p-6 mb-6 flex flex-col sm:flex-row items-center gap-5" aria-labelledby="rank-title">
        <div className="kid-mascot shrink-0" style={{ background: '#fef9c3', borderColor: '#fde047' }} aria-hidden="true">{heroIcon}</div>
        <div className="flex-1 w-full text-center sm:text-left">
          <p className="text-sm font-extrabold text-slate-500 uppercase tracking-wide">{t('journey.youAre')}</p>
          <h2 id="rank-title" className="font-display text-3xl text-indigo-700 mb-2">{journey.rank}</h2>
          <div className="flex justify-between text-sm font-bold text-slate-600 mb-1">
            <span>{t('journey.stageOf', { n: journey.stagesDone, total: journey.totalStages })}</span>
            <span>{overallPct}%</span>
          </div>
          <div className="kid-bar" role="progressbar" aria-valuenow={journey.stagesDone} aria-valuemin={0} aria-valuemax={journey.totalStages}>
            <div className="kid-bar-fill" style={{ width: `${overallPct}%` }} />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 justify-center sm:justify-start text-sm font-bold text-slate-600">
            <span>{t('journey.learning')} {lang ? `${lang.icon} ${lang.name}` : journey.language}</span>
            <button type="button" className="text-indigo-600 underline font-extrabold" aria-expanded={pickerOpen} onClick={() => setPickerOpen((o) => !o)}>
              {t('journey.change')}
            </button>
          </div>
          {pickerOpen && (
            <div className="mt-3 flex flex-wrap gap-2 justify-center sm:justify-start">
              {languages.filter((l) => l.ageAppropriate || l.id === journey.language).map((l) => (
                <button key={l.id} type="button" onClick={() => switchLanguage(l.id)} aria-pressed={l.id === journey.language}
                  className={`px-3 py-1 rounded-full border-2 text-sm font-extrabold ${l.id === journey.language ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300'}`}>
                  {l.icon} {l.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* The path */}
      <ol className="journey-path" aria-label={t('journey.title')}>
        {journey.stages.map((s) => {
          const style = STATE_STYLE[s.state];
          const isCurrent = s.id === journey.currentStage;
          const stars = s.skills.reduce((n, k) => n + k.masteredLevels, 0);
          const total = s.skills.reduce((n, k) => n + k.totalLevels, 0);
          return (
            <li key={s.id} className="journey-step" ref={isCurrent ? currentRef : null} aria-current={isCurrent ? 'step' : undefined}>
              <span className={`journey-dot ${style.dot}`} aria-hidden="true">
                {s.state === 'done' ? '✓' : s.state === 'locked' ? '🔒' : s.icon}
              </span>
              <article className={`card p-5 ${isCurrent ? 'ring-4 ring-indigo-200' : ''} ${s.state === 'locked' ? 'opacity-80' : ''}`}>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="text-xs font-extrabold text-slate-400">#{s.number}</span>
                  <h2 className="font-display text-xl text-slate-800">{s.icon} {s.name}</h2>
                  <span className={`text-xs font-extrabold px-2 py-0.5 rounded-full ${style.chip}`}>{t(`journey.${s.state}`)}</span>
                  {s.pro && <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">⭐ {t('journey.pro')}</span>}
                </div>
                <p className="text-slate-600 font-semibold text-sm mb-3">
                  {s.state === 'locked' && <span className="font-extrabold text-slate-500">{t('journey.whatYouLearn')}: </span>}
                  {s.about}
                </p>

                {s.state !== 'locked' && (
                  <div className="mb-3">
                    <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
                      <span>{t('journey.stars', { n: stars, total })}</span><span>{s.percent}%</span>
                    </div>
                    <div className="kid-bar" style={{ height: 8 }}><div className="kid-bar-fill" style={{ width: `${s.percent}%` }} /></div>
                  </div>
                )}

                <ul className="space-y-2">
                  {s.skills.map((k) => (
                    <li key={k.id} className="flex flex-wrap items-center gap-2 bg-slate-50 rounded-xl px-3 py-2">
                      <span className="text-xl" aria-hidden="true">{k.icon}</span>
                      <span className="flex-1 min-w-[8rem] font-bold text-slate-700 text-sm">{k.name}</span>
                      {k.unlocked ? (
                        <>
                          <Stars n={k.masteredLevels} total={k.totalLevels} />
                          <span className="sr-only">{t('coachUi.starsLabel', { n: k.masteredLevels })}</span>
                          {!k.mastered && (
                            <button type="button" className="btn-secondary text-xs py-1 px-3" onClick={() => practise(k.id)}>
                              ▶ {t('journey.practise')}
                            </button>
                          )}
                        </>
                      ) : (
                        <span className="text-sm" aria-label={t('journey.locked')}>🔒</span>
                      )}
                    </li>
                  ))}
                </ul>

                {s.state === 'locked' && (
                  <p className="text-xs font-bold text-slate-500 mt-3">
                    🔑 {s.needs.length
                      ? <>{t('journey.unlocksWhen')} {s.needs.map((n) => `${n.icon} ${n.name}`).join(', ')}</>
                      : t('journey.unlocksSoon')}
                  </p>
                )}
                <p className={`text-xs font-extrabold mt-3 ${s.state === 'done' ? 'text-green-700' : 'text-indigo-600'}`}>
                  🎖️ {s.state === 'done' ? t('journey.earnedRank', { rank: s.rank }) : t('journey.earnRank', { rank: s.rank })}
                </p>
              </article>
            </li>
          );
        })}

        {journey.nextLanguage && (
          <li className="journey-step">
            <span className="journey-dot journey-dot-open" aria-hidden="true">🚀</span>
            <article className="card p-5 bg-gradient-to-br from-sky-50 to-indigo-50">
              <h2 className="font-display text-xl text-slate-800 mb-1">{t('journey.nextWorldTitle', { lang: `${journey.nextLanguage.icon} ${journey.nextLanguage.name}` })}</h2>
              <p className="text-slate-600 font-semibold text-sm mb-3">{t('journey.nextWorldText', { lang: journey.nextLanguage.name })}</p>
              <button type="button" className="btn-primary" onClick={() => switchLanguage(journey.nextLanguage.id, { goToCoach: true })}>
                {journey.nextLanguage.icon} {t('journey.nextWorldGo', { lang: journey.nextLanguage.name })}
              </button>
            </article>
          </li>
        )}

        <li className="journey-step">
          <span className={`journey-dot ${journey.legend.unlocked ? 'journey-dot-legend' : 'journey-dot-locked'}`} aria-hidden="true">🏆</span>
          <article className={`card p-5 ${journey.legend.unlocked ? 'bg-gradient-to-br from-amber-50 to-yellow-100 ring-4 ring-amber-200' : ''}`}>
            <h2 className="font-display text-xl text-slate-800 mb-1">
              ♾️ {journey.legend.unlocked ? t('journey.legendLevel', { n: journey.legend.level }) : t('journey.legendTitle')}
            </h2>
            {journey.legend.unlocked ? (
              <>
                <p className="text-slate-700 font-semibold text-sm mb-2">
                  {t('journey.legendWins', { n: journey.legend.winsToNext, next: journey.legend.level + 1 })}
                </p>
                <div className="kid-bar mb-3" style={{ height: 8 }}>
                  <div className="kid-bar-fill" style={{ width: `${(100 * (journey.legend.winsPerLevel - journey.legend.winsToNext)) / journey.legend.winsPerLevel}%` }} />
                </div>
                <button type="button" className="btn-primary" onClick={() => navigate('/coach')}>⚡ {t('journey.legendGo')}</button>
              </>
            ) : (
              <p className="text-slate-600 font-semibold text-sm">{t('journey.legendLocked')}</p>
            )}
          </article>
        </li>
      </ol>

      {!journey.legend.unlocked && (
        <div className="text-center mt-6">
          <button type="button" className="btn-primary" onClick={() => navigate('/coach')}>🤖 {t('journey.keepGoing')}</button>
        </div>
      )}
    </div>
  );
};

export default Journey;
