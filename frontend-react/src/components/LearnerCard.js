import React from 'react';
import { useTranslation } from 'react-i18next';
import LearnerInsights from './ai/LearnerInsights';

// Shared pieces for the parent and teacher dashboards.

const DAY = 86400000;

// learner is optional: without a last-active date we fall back to whether they have any progress.
export const activityStatus = (lastActive, learner) => {
  if (!lastActive) {
    const started = learner && ((learner.completedLessons || 0) > 0 || (learner.xp || 0) > 0);
    return started
      ? { key: 'unknown', color: '#64748b', attention: false }
      : { key: 'never', color: '#94a3b8', attention: true };
  }
  const days = Math.floor((Date.now() - new Date(lastActive).getTime()) / DAY);
  if (days <= 0) return { key: 'today', color: '#22c55e', attention: false, days };
  if (days <= 7) return { key: 'recent', color: '#f59e0b', attention: false, days };
  return { key: 'away', color: '#ef4444', attention: true, days };
};

export const LearnerCard = ({ learner, totalLessons, fallbackIcon = '🧒', onViewProgress, onStartLearning, onRemove, busy }) => {
  const { t } = useTranslation();
  const status = activityStatus(learner.lastActive, learner);
  const level = Math.floor((learner.xp || 0) / 200) + 1;
  const name = learner.displayName || learner.username;
  const pct = totalLessons ? Math.min(100, Math.round(((learner.completedLessons || 0) / totalLessons) * 100)) : 0;

  return (
    <article className={`learner-card ${status.attention ? 'needs-attention' : ''}`}>
      <div className="flex items-start gap-3">
        <div className="w-14 h-14 bg-indigo-100 rounded-full flex items-center justify-center text-3xl flex-shrink-0 overflow-hidden" aria-hidden="true">
          {learner.avatarUrl ? <img src={learner.avatarUrl} alt="" className="w-full h-full object-cover" /> : fallbackIcon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-extrabold text-lg text-slate-800 truncate">{name}</h3>
          <p className="text-sm text-slate-500 truncate">
            @{learner.username}{learner.age ? ` · ${t('adultUi.age', { age: learner.age })}` : ''}
          </p>
          {learner.className && (
            <p className="text-xs font-bold text-indigo-600 truncate">🏫 {learner.className}</p>
          )}
          <p className="text-sm font-semibold mt-1 flex items-center gap-2" style={{ color: status.color }}>
            <span className="status-dot" style={{ background: status.color }} aria-hidden="true" />
            {t(`adultUi.status.${status.key}`, { days: status.days })}
          </p>
        </div>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg px-2 py-1"
            aria-label={t('adultUi.removeLabel', { name })}
            title={t('adultUi.removeLabel', { name })}
          >
            🗑️
          </button>
        )}
      </div>

      <div>
        <div className="flex justify-between text-sm mb-1">
          <span className="text-slate-600 font-semibold">
            {t('adultUi.lessonsOf', { done: learner.completedLessons || 0, total: totalLessons || '…' })}
          </span>
          <span className="font-bold text-slate-500">{t('dashboard.level')} {level} · ⭐ {learner.xp || 0} · 🔥 {learner.streak || 0}</span>
        </div>
        <div className="kid-bar"><div className="kid-bar-fill" style={{ width: `${pct}%` }} /></div>
      </div>

      <div className="flex flex-wrap gap-2">
        {onStartLearning && (
          <button type="button" onClick={onStartLearning} disabled={busy} className="btn-primary text-sm py-2 px-4 flex-1 justify-center">
            ▶ {t('adultUi.startLearningAs', { name })}
          </button>
        )}
        <button type="button" onClick={onViewProgress} className="btn-secondary text-sm py-2 px-4 flex-1 justify-center">
          📊 {t('adultUi.viewProgress')}
        </button>
      </div>
    </article>
  );
};

export const LearnerDetail = ({ progress, name, onClose, onDownloadReport, downloadingReport }) => {
  const { t } = useTranslation();
  if (!progress) return null;
  const items = [
    { label: t('parent.currentLevel'), value: progress.currentLevel || 1, color: 'text-indigo-600' },
    { label: t('parent.completedLessons'), value: progress.completedLessons || 0, color: 'text-green-600' },
    { label: t('parent.averageScore'), value: `${progress.averageScore || 0}%`, color: 'text-purple-600' },
    { label: t('parent.totalXPEarned'), value: progress.totalXP || 0, color: 'text-amber-500' },
    { label: t('parent.currentStreak'), value: `🔥 ${progress.streak || 0}`, color: 'text-orange-500' },
    { label: t('parent.timeSpent'), value: t('adultUi.minutes', { n: progress.timeSpentMinutes || 0 }), color: 'text-sky-600' },
  ];

  return (
    <section className="card p-6 mb-8" style={{ borderColor: '#a5b4fc' }} data-progress-section aria-labelledby="detail-title">
      <div className="flex justify-between items-start gap-3 mb-5">
        <div>
          <h2 id="detail-title" className="font-display text-2xl text-slate-800">📊 {t('adultUi.progressOf', { name })}</h2>
          <p className="text-sm text-slate-500 font-semibold">
            {t('parent.lastActive')}: {progress.lastActive ? new Date(progress.lastActive).toLocaleDateString() : t('parent.never')}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {onDownloadReport && (
            <button type="button" onClick={onDownloadReport} disabled={downloadingReport} className="btn-secondary text-sm py-1 px-3">
              ⬇ {t('adultUi.downloadReport')}
            </button>
          )}
          <button type="button" onClick={onClose} className="btn-secondary text-sm py-1 px-3" aria-label={t('ui.close')}>✕</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        {items.map(i => (
          <div key={i.label} className="rounded-2xl bg-slate-50 p-4">
            <div className={`font-display text-2xl ${i.color}`}>{i.value}</div>
            <div className="text-xs font-bold text-slate-500 mt-1">{i.label}</div>
          </div>
        ))}
      </div>

      <h3 className="font-extrabold text-slate-800 mb-3">🏆 {t('parent.recentAchievements')}</h3>
      {progress.recentAchievements?.length ? (
        <div className="grid sm:grid-cols-2 gap-3 mb-6">
          {progress.recentAchievements.map((a, idx) => (
            <div key={idx} className="p-3 bg-amber-50 border-2 border-amber-200 rounded-2xl flex items-center gap-3">
              <span className="text-3xl" aria-hidden="true">{a.icon || '🏆'}</span>
              <div>
                <div className="font-bold text-slate-800">{a.name}</div>
                <div className="text-sm text-slate-600">{a.description}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-slate-500 font-semibold bg-slate-50 rounded-2xl p-4 mb-6">🌟 {t('parent.noAchievements')}</p>
      )}

      <LearnerInsights learnerId={progress.childId} />
    </section>
  );
};
