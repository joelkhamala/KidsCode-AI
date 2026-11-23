import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { aiAPI } from '../services/api';

/**
 * A compact view of the life-long Coding Journey (every stage + endless Legend levels),
 * shown on the learning map so children see that learning keeps going after the lessons.
 */
const DOT = {
  done: 'bg-green-500 text-white border-green-600',
  open: 'bg-indigo-100 border-indigo-400',
  locked: 'bg-slate-100 border-slate-200 opacity-70',
};

const JourneyStrip = () => {
  const { t, i18n } = useTranslation();
  const [journey, setJourney] = useState(null);

  useEffect(() => {
    let cancelled = false;
    aiAPI.journey(undefined, i18n.language === 'sw' ? 'sw' : 'en')
      .then((res) => { if (!cancelled) setJourney(res.data); })
      .catch(() => {}); // the map still works without it
    return () => { cancelled = true; };
  }, [i18n.language]);

  if (!journey) return null;
  const current = journey.stages.find((s) => s.id === journey.currentStage);

  return (
    <section className="card p-5 md:p-6 mt-8 bg-gradient-to-br from-indigo-50 to-amber-50" aria-labelledby="journey-strip-title">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
        <h2 id="journey-strip-title" className="font-display text-2xl text-slate-800">🚀 {t('journey.mapTitle')}</h2>
        <span className="text-sm font-extrabold text-indigo-700">
          {t('journey.youAre')} {journey.rank}
        </span>
      </div>
      <p className="text-slate-600 font-semibold text-sm mb-4">{t('journey.mapText')}</p>

      <ol className="flex flex-wrap gap-x-2 gap-y-4" aria-label={t('journey.title')}>
        {journey.stages.map((s) => {
          const isCurrent = s.id === journey.currentStage;
          return (
            <li key={s.id} className="flex flex-col items-center w-20 text-center" aria-current={isCurrent ? 'step' : undefined}>
              <span className={`w-12 h-12 rounded-full border-4 flex items-center justify-center text-xl ${DOT[s.state]} ${isCurrent ? 'ring-4 ring-indigo-300' : ''}`}
                title={`${s.name} - ${t(`journey.${s.state}`)}`} aria-hidden="true">
                {s.state === 'done' ? '✓' : s.state === 'locked' ? '🔒' : s.icon}
              </span>
              <span className={`text-xs font-bold mt-1 leading-tight ${s.state === 'locked' ? 'text-slate-400' : 'text-slate-700'}`}>
                {s.name}
                <span className="sr-only"> ({t(`journey.${s.state}`)})</span>
              </span>
              {s.pro && <span className="text-[10px] font-extrabold text-amber-700">⭐ {t('journey.pro')}</span>}
            </li>
          );
        })}
        <li className="flex flex-col items-center w-20 text-center">
          <span className={`w-12 h-12 rounded-full border-4 flex items-center justify-center text-xl ${journey.legend.unlocked ? 'bg-amber-300 border-amber-500' : DOT.locked}`} aria-hidden="true">♾️</span>
          <span className="text-xs font-bold mt-1 leading-tight text-slate-700">
            {journey.legend.unlocked ? t('journey.legendLevel', { n: journey.legend.level }) : t('journey.legendTitle')}
          </span>
        </li>
      </ol>

      <div className="flex flex-wrap items-center gap-3 mt-5">
        <Link to="/journey" className="btn-primary">🗺️ {t('journey.seeMap')}</Link>
        {current && <span className="text-sm font-semibold text-slate-600">{t('journey.homeNext', { stage: `${current.icon} ${current.name}` })}</span>}
      </div>
    </section>
  );
};

export default JourneyStrip;
