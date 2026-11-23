import { useTranslation } from 'react-i18next';

/**
 * The six thinking steps (Bloom's taxonomy) for one concept, shown as a ladder:
 * Remember at the bottom, Create at the top. Untouched steps show no percentage,
 * so a child never sees "10%" for something they have not tried yet.
 */
const BloomLadder = ({ concept, bloomLevels, currentLevel }) => {
  const { t } = useTranslation();
  if (!concept || !bloomLevels?.length) return null;
  const byId = Object.fromEntries(concept.levels.map((l) => [l.level, l]));
  const masteredCount = concept.levels.filter((l) => l.mastered).length;

  return (
    <section className="card p-5" aria-labelledby="ladder-title">
      <h2 id="ladder-title" className="font-display text-xl text-slate-800">🪜 {t('coachUi.ladderTitle')}</h2>
      <p className="text-xs text-slate-500 font-semibold mb-3">
        {concept.icon} {concept.name} · {t('coachUi.stepsDone', { n: masteredCount, total: bloomLevels.length })}
      </p>
      <ol className="flex flex-col-reverse gap-2">
        {bloomLevels.map((b, i) => {
          const s = byId[b.id] || { p: 0, mastered: false, attempts: 0 };
          const isCurrent = currentLevel === b.id;
          const tried = (s.attempts || 0) > 0;
          const pct = s.mastered ? 100 : tried ? Math.round((s.p || 0) * 100) : 0;
          const status = s.mastered
            ? `✅ ${t('coach.mastered')}`
            : isCurrent ? `👉 ${t('coachUi.youAreHere')}`
              : s.struggling ? `💪 ${t('coach.struggling')}`
                : tried ? `${pct}%` : '';
          return (
            <li
              key={b.id}
              className="rounded-2xl p-2.5 border-2"
              style={{
                borderColor: isCurrent ? '#818cf8' : s.mastered ? '#86efac' : '#e2e8f0',
                background: isCurrent ? '#eef2ff' : s.mastered ? '#f0fdf4' : '#ffffff',
              }}
              aria-current={isCurrent ? 'step' : undefined}
            >
              <div className="flex justify-between items-center gap-2">
                <span className="font-extrabold text-sm text-slate-800">
                  <span className="text-slate-400 mr-1">{i + 1}.</span>{b.icon} {b.name}
                </span>
                <span className="text-xs font-bold text-slate-500 whitespace-nowrap">{status}</span>
              </div>
              <div className="text-xs text-slate-500 font-semibold">{b.kidGoal}</div>
              {(tried || s.mastered) && (
                <div className="kid-bar mt-1.5" style={{ height: 6 }} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={b.name}>
                  <div className="kid-bar-fill" style={{ width: `${pct}%` }} />
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
};

export default BloomLadder;
