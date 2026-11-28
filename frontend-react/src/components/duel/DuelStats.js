import React from 'react';
import { useTranslation } from 'react-i18next';

export const Leaderboard = ({ board, period, onPeriod }) => {
  const { t } = useTranslation();
  return (
    <section className="card p-5 sm:p-6" aria-labelledby="duel-board-title">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h2 id="duel-board-title" className="font-display text-2xl text-slate-800">🏆 {t('duel.tabLeaderboard')}</h2>
          <p className="text-xs font-semibold text-slate-500">{t('duel.subtitle')}</p>
        </div>
        <fieldset className="flex gap-1 rounded-xl bg-slate-100 p-1">
          <legend className="sr-only">Period</legend>
          {['all', 'week', 'month'].map((p) => (
            <button key={p} type="button" aria-pressed={period === p} onClick={() => onPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold ${period === p ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-white'}`}>
              {p === 'all' ? 'All time' : p === 'week' ? 'This week' : 'This month'}
            </button>
          ))}
        </fieldset>
      </div>
      {!board?.length && <p className="rounded-xl bg-slate-50 p-6 text-center font-semibold text-slate-600">{t('duel.leaderboardEmpty')}</p>}
      {!!board?.length && (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead><tr className="text-xs uppercase tracking-wide text-slate-500">
              <th scope="col" className="py-2 pr-4">#</th>
              <th scope="col" className="py-2 pr-4">Player</th>
              <th scope="col" className="py-2 pr-4">Rank</th>
              <th scope="col" className="py-2 pr-4">Rating</th>
              {period !== 'all' && <th scope="col" className="py-2 pr-4">XP</th>}
              <th scope="col" className="py-2 pr-4">W-L-T</th>
            </tr></thead>
            <tbody>
              {board.map((p) => (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="py-2.5 pr-4 font-extrabold text-slate-500">{p.rank <= 3 ? ['🥇', '🥈', '🥉'][p.rank - 1] : p.rank}</td>
                  <td className="py-2.5 pr-4 font-bold text-slate-800">{p.name}</td>
                  <td className="py-2.5 pr-4 text-slate-600">{p.rankName}</td>
                  <td className="py-2.5 pr-4 font-extrabold text-indigo-700">{p.rating}</td>
                  {period !== 'all' && <td className="py-2.5 pr-4 font-bold text-emerald-700">{p.periodXp}</td>}
                  <td className="py-2.5 pr-4 text-slate-600">{p.wins}-{p.losses}-{p.ties}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

const RESULT_ICON = { won: '🏆', lost: '💪', tie: '🤝', cancelled: '—' };

export const History = ({ rows }) => {
  const { t } = useTranslation();
  return (
    <section className="card p-5 sm:p-6" aria-labelledby="duel-history-title">
      <h2 id="duel-history-title" className="font-display text-2xl text-slate-800 mb-5">📜 {t('duel.tabHistory')}</h2>
      {!rows?.length && <p className="rounded-xl bg-slate-50 p-6 text-center font-semibold text-slate-600">{t('duel.historyEmpty')}</p>}
      {!!rows?.length && (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-3">
              <span className="flex items-center gap-3">
                <span className="text-xl" aria-hidden="true">{RESULT_ICON[row.result] || '⏳'}</span>
                <span>
                  <span className="block font-extrabold text-slate-800">{row.mode.replace('_', ' ')} · {row.difficulty}</span>
                  <span className="block text-xs font-semibold text-slate-500">vs {row.opponent || '—'} · {row.finished_at ? new Date(row.finished_at).toLocaleDateString() : 'live'}</span>
                </span>
              </span>
              <span className="text-right">
                <span className="block font-display text-lg text-slate-800">{row.score || 0}</span>
                <span className="block text-xs font-bold text-indigo-600">{row.result}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export const ArenaProfile = ({ profile }) => {
  const { t } = useTranslation();
  if (!profile) return <div className="card p-6" role="status" aria-busy="true">…</div>;
  return (
    <div className="space-y-5">
      <section className="card p-5 sm:p-6">
        <p className="text-xs font-extrabold uppercase tracking-wide text-indigo-600">{profile.rankName}</p>
        <h2 className="font-display text-3xl text-slate-800">#{profile.globalRank} {t('duel.tabProfile')}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          {[
            ['Rating', profile.rating], ['Wins', profile.wins], ['Coins', profile.coins], ['Gems', profile.gems],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl bg-slate-50 p-3">
              <span className="block text-[11px] font-bold uppercase text-slate-500">{label}</span>
              <span className="font-display text-xl text-slate-800">{value}</span>
            </div>
          ))}
        </div>
      </section>
      <section className="card p-5 sm:p-6" aria-labelledby="duel-badges-title">
        <h3 id="duel-badges-title" className="font-display text-2xl text-slate-800 mb-4">🎖️ {t('duel.tabProfile')}</h3>
        {!profile.achievements?.length && <p className="text-sm font-semibold text-slate-600">{t('duel.noBadges')}</p>}
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(profile.achievements || []).map((b) => (
            <li key={b.id} className={`rounded-xl border-2 p-3 ${b.unlocked ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-slate-50 opacity-70'}`}>
              <span className="text-2xl" aria-hidden="true">{b.unlocked ? b.icon : '🔒'}</span>
              <p className="font-extrabold text-slate-800 mt-1">{b.name}</p>
              <p className="text-xs font-semibold text-slate-500">{b.unlocked ? t('duel.unlocked') : t('duel.locked')} · {b.description}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};
