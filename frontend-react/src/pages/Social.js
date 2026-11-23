import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { socialAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

/**
 * Friends & Leaderboard. Every number comes from the child's real learning records on
 * the server (XP, finished lessons, live streak, badges, AI Coach skills), and the page
 * refreshes itself every 30 seconds, when the child comes back to the tab, and after
 * every friend action - so it stays in sync with the rest of KidsCode.
 */
const REFRESH_MS = 30000;
const AVATARS = ['🦊', '🐼', '🦁', '🐸', '🐵', '🦄', '🐯', '🐙', '🐧', '🐨'];
const avatarOf = (id) => AVATARS[(id || 0) % AVATARS.length];
const medal = (rank) => (rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null);
const FEED_ICON = { lesson: '📚', badge: '🏅', quiz: '📝', skill: '🤖', friend: '🤝' };

const Social = () => {
  const { t, i18n } = useTranslation();
  const { loadProgress } = useAuth();
  const { notify, confirm } = useToast();
  const loc = i18n.language === 'sw' ? 'sw' : 'en';

  const [tab, setTab] = useState('leaderboard');
  const [timeframe, setTimeframe] = useState('all');
  const [board, setBoard] = useState(null);
  const [friendsBoard, setFriendsBoard] = useState(null);
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState({ requests: [], sent: [] });
  const [feed, setFeed] = useState([]);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [busy, setBusy] = useState(null); // id of the person an action is running for
  const lastQuery = useRef('');

  const load = useCallback(async () => {
    try {
      const [b, fb, fr, rq, fd] = await Promise.all([
        socialAPI.getLeaderboard(timeframe, 50),
        socialAPI.getFriendsLeaderboard(timeframe),
        socialAPI.getFriends(),
        socialAPI.getFriendRequests(),
        socialAPI.getActivityFeed(30),
      ]);
      setBoard(b.data);
      setFriendsBoard(fb.data);
      setFriends(fr.data.friends || []);
      setRequests({ requests: rq.data.requests || [], sent: rq.data.sent || [] });
      setFeed(fd.data.feed || []);
      setUpdatedAt(new Date());
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || t('socialUi.loadError'));
    } finally {
      setLoading(false);
    }
  }, [timeframe, t]);

  // Load now, then keep in sync: every 30s while visible, and when the child returns to the tab.
  useEffect(() => {
    load();
    const timer = setInterval(() => { if (!document.hidden) load(); }, REFRESH_MS);
    const onBack = () => { if (!document.hidden) load(); };
    window.addEventListener('focus', onBack);
    document.addEventListener('visibilitychange', onBack);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', onBack);
      document.removeEventListener('visibilitychange', onBack);
    };
  }, [load]);

  const search = useCallback(async (q = query) => {
    const text = q.trim();
    lastQuery.current = text;
    if (text.length < 2) { setResults(null); return; }
    try {
      const res = await socialAPI.searchUsers(text);
      if (lastQuery.current === text) setResults(res.data.users || []);
    } catch {
      setResults([]);
    }
  }, [query]);

  // Search as you type (short pause so we do not ask on every key).
  useEffect(() => {
    const h = setTimeout(() => search(query), 350);
    return () => clearTimeout(h);
  }, [query, search]);

  const act = async (id, fn, okMessage) => {
    setBusy(id);
    try {
      await fn();
      if (okMessage) notify(okMessage, 'success');
      await Promise.all([load(), search()]);
      if (loadProgress) loadProgress();
    } catch (err) {
      notify(err.response?.data?.error || t('socialUi.somethingWrong'), 'error');
    } finally {
      setBusy(null);
    }
  };

  const sendRequest = (user) => act(user.id, async () => {
    const res = await socialAPI.sendFriendRequest(user.id);
    if (res.data.status === 'accepted') notify(t('socialUi.newFriend'), 'success');
    else notify(t('socialUi.requestSent'), 'success');
  });
  const accept = (requestId, personId) => act(personId, () => socialAPI.acceptFriendRequest(requestId), t('socialUi.newFriend'));
  const reject = (requestId, personId) => act(personId, () => socialAPI.rejectFriendRequest(requestId));
  const removeFriend = async (friend) => {
    const ok = await confirm({ title: t('socialUi.removeTitle'), message: t('socialUi.removeText'), confirmLabel: t('socialUi.removeYes'), danger: true, icon: '👋' });
    if (ok) act(friend.id, () => socialAPI.removeFriend(friend.id));
  };

  const ago = (date) => {
    if (!date) return '';
    const secs = Math.round((new Date(date).getTime() - Date.now()) / 1000);
    const rtf = new Intl.RelativeTimeFormat(i18n.language, { numeric: 'auto' });
    const steps = [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]];
    for (const [unit, s] of steps) if (Math.abs(secs) >= s) return rtf.format(Math.round(secs / s), unit);
    return rtf.format(0, 'second');
  };

  const xpLabel = timeframe === 'week' ? t('socialUi.xpWeek') : timeframe === 'month' ? t('socialUi.xpMonth') : 'XP';
  const you = board?.you;
  const rankText = you && you.xp > 0
    ? t(timeframe === 'week' ? 'socialUi.rankWeek' : timeframe === 'month' ? 'socialUi.rankMonth' : 'socialUi.rankLine', { rank: you.rank, total: you.total })
    : t('socialUi.notRanked');

  const PersonLine = ({ p }) => (
    <span className="block text-xs font-semibold text-slate-500">
      {t('socialUi.level', { n: p.level })} · ✅ {t('socialUi.lessonsN', { n: p.lessons })} · 🔥 {t('socialUi.streakN', { n: p.streak })} · 🏅 {t('socialUi.badgesN', { n: p.badges })}
    </span>
  );

  const BoardRow = ({ p }) => (
    <li className={`flex items-center gap-3 p-3 rounded-2xl ${p.isYou ? 'bg-indigo-50 border-2 border-indigo-300' : 'bg-slate-50'}`}>
      <span className="w-9 shrink-0 text-center font-display text-xl text-slate-500" aria-label={`#${p.rank}`}>{medal(p.rank) || `#${p.rank}`}</span>
      <span className="hidden sm:inline text-3xl" aria-hidden="true">{avatarOf(p.id)}</span>
      <span className="flex-1 min-w-0">
        <span className="block font-extrabold text-slate-800 truncate">
          {p.name}
          {p.isYou && <span className="ml-2 text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-full align-middle">{t('social.you')}</span>}
        </span>
        <PersonLine p={p} />
      </span>
      <span className="text-right">
        <span className="block font-display text-2xl text-indigo-600">{p.xp}</span>
        <span className="block text-xs font-bold text-slate-500">{xpLabel}</span>
      </span>
    </li>
  );

  const feedText = (e) => {
    const name = e.isYou ? t('socialUi.youName') : e.name;
    const what = {
      lesson: t('socialUi.feedLesson', { title: e.title }),
      badge: t('socialUi.feedBadge', { title: e.title }),
      quiz: t('socialUi.feedQuiz', { title: e.title, percent: e.percent }),
      skill: t('socialUi.feedSkill', { skill: e.skill?.[loc] || e.skill?.en, level: e.level?.[loc] || e.level?.en }),
      friend: t('socialUi.feedFriend', { friend: e.friend }),
    }[e.type];
    return <><span className="font-extrabold text-slate-800">{name}</span> {what}</>;
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center">
        <div className="text-6xl mb-3 animate-bounce" aria-hidden="true">👥</div>
        <p className="font-bold text-slate-600">{t('common.loading')}</p>
      </div>
    );
  }

  const tabs = [
    ['leaderboard', `🏆 ${t('social.leaderboard')}`],
    ['friends', `👥 ${t('social.friends')} (${friends.length})${requests.requests.length ? ` · ${requests.requests.length} 🔔` : ''}`],
    ['search', `🔍 ${t('social.findFriends')}`],
    ['activity', `📣 ${t('social.activity')}`],
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 md:py-8">
      <header className="mb-5">
        <h1 className="page-title mb-1">👥 {t('social.title')}</h1>
        <p className="text-slate-600 font-semibold">{t('social.subtitle')}</p>
      </header>

      {error && (
        <div className="card p-4 mb-4 border-2 border-red-200 bg-red-50 flex items-center justify-between gap-3" role="alert">
          <span className="font-bold text-red-700">{error}</span>
          <button type="button" className="btn-secondary text-sm" onClick={load}>{t('socialUi.refresh')}</button>
        </div>
      )}

      {/* Where am I? */}
      {you && (
        <section className="rounded-3xl shadow-lg p-5 mb-5 text-white flex items-center gap-4" style={{ background: 'linear-gradient(90deg, #6366f1, #9333ea)' }} aria-live="polite">
          <span className="text-5xl" aria-hidden="true">{you.xp > 0 ? (medal(you.rank) || '🏆') : '🌱'}</span>
          <span className="flex-1">
            <span className="block text-sm font-bold opacity-90">{t('social.yourRank')}</span>
            <span className="block font-display text-2xl md:text-3xl">{rankText}</span>
            {you.xp > 0 && <span className="block text-sm font-bold opacity-90">{t('socialUi.topPercent', { p: you.topPercent })} · {you.xp} {xpLabel}</span>}
          </span>
        </section>
      )}

      <div className="flex flex-wrap items-center gap-2 mb-5" role="tablist">
        {tabs.map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`tab-btn text-sm ${tab === id ? 'active' : ''}`}>
            {label}
          </button>
        ))}
        <span className="ml-auto text-xs font-bold text-slate-500 flex items-center gap-2">
          {updatedAt && t('socialUi.updated', { time: ago(updatedAt) })}
          <button type="button" onClick={load} className="text-indigo-600 underline">{t('socialUi.refresh')}</button>
        </span>
      </div>

      {tab === 'leaderboard' && (
        <div className="space-y-5">
          <div className="flex gap-2" role="radiogroup" aria-label={t('social.leaderboard')}>
            {[['all', t('social.allTime')], ['month', t('social.thisMonth')], ['week', t('social.thisWeek')]].map(([id, label]) => (
              <button key={id} type="button" role="radio" aria-checked={timeframe === id} onClick={() => setTimeframe(id)}
                className={`px-3 py-1 rounded-full text-sm font-extrabold border-2 ${timeframe === id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-700 border-slate-200'}`}>
                {label}
              </button>
            ))}
          </div>

          <section className="card p-5" aria-labelledby="board-title">
            <h2 id="board-title" className="font-display text-2xl text-slate-800 mb-3">🏆 {t('social.globalLeaderboard')}</h2>
            {!board || board.leaderboard.every((p) => p.xp === 0) ? (
              <p className="text-center py-8 text-slate-600 font-semibold">🌱 {timeframe === 'all' ? t('social.completeToAppear') : t('socialUi.periodEmpty')}</p>
            ) : (
              <ol className="space-y-2">{board.leaderboard.map((p) => <BoardRow key={p.id} p={p} />)}</ol>
            )}
          </section>

          <section className="card p-5" aria-labelledby="friends-board-title">
            <h2 id="friends-board-title" className="font-display text-2xl text-slate-800 mb-3">👥 {t('social.friendsLeaderboard')}</h2>
            {!friendsBoard || friendsBoard.leaderboard.length <= 1 ? (
              <div className="text-center py-6">
                <p className="text-slate-600 font-semibold mb-3">{t('socialUi.friendsBoardEmpty')}</p>
                <button type="button" className="btn-primary" onClick={() => setTab('search')}>🔍 {t('social.findFriends')}</button>
              </div>
            ) : (
              <ol className="space-y-2">{friendsBoard.leaderboard.map((p) => <BoardRow key={p.id} p={p} />)}</ol>
            )}
          </section>
        </div>
      )}

      {tab === 'friends' && (
        <div className="space-y-5">
          {requests.requests.length > 0 && (
            <section className="card p-5 border-2 border-amber-200" aria-labelledby="req-title">
              <h2 id="req-title" className="font-display text-2xl text-slate-800 mb-3">🔔 {t('social.friendRequests')} ({requests.requests.length})</h2>
              <ul className="space-y-2">
                {requests.requests.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center gap-3 p-3 rounded-2xl bg-amber-50">
                    <span className="text-3xl" aria-hidden="true">{avatarOf(r.from.id)}</span>
                    <span className="flex-1 min-w-[10rem]">
                      <span className="block font-extrabold text-slate-800">{r.from.name} <span className="font-semibold text-slate-600">{t('socialUi.wantsFriend')}</span></span>
                      <PersonLine p={r.from} />
                    </span>
                    <button type="button" disabled={busy === r.from.id} className="btn-primary text-sm" onClick={() => accept(r.id, r.from.id)}>✓ {t('social.accept')}</button>
                    <button type="button" disabled={busy === r.from.id} className="btn-secondary text-sm" onClick={() => reject(r.id, r.from.id)}>✗ {t('social.reject')}</button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="card p-5" aria-labelledby="my-friends-title">
            <h2 id="my-friends-title" className="font-display text-2xl text-slate-800 mb-3">👥 {t('social.myFriends')} ({friends.length})</h2>
            {friends.length === 0 ? (
              <div className="text-center py-6">
                <div className="text-5xl mb-2" aria-hidden="true">👋</div>
                <p className="text-slate-600 font-semibold mb-3">{t('social.noFriendsYet')}</p>
                <button type="button" className="btn-primary" onClick={() => setTab('search')}>🔍 {t('social.findFriends')}</button>
              </div>
            ) : (
              <ul className="grid md:grid-cols-2 gap-3">
                {friends.map((f) => (
                  <li key={f.id} className="p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 flex gap-3">
                    <span className="text-4xl" aria-hidden="true">{avatarOf(f.id)}</span>
                    <span className="flex-1 min-w-0">
                      <span className="block font-extrabold text-slate-800 truncate">{f.name}</span>
                      <span className="block font-display text-lg text-indigo-600">{f.totalXp} XP</span>
                      <PersonLine p={f} />
                      {f.friendsSince && (
                        <span className="block text-xs text-slate-400 mt-1">{t('social.friendsSince')} {new Date(f.friendsSince.replace(' ', 'T') + 'Z').toLocaleDateString(i18n.language)}</span>
                      )}
                    </span>
                    <button type="button" disabled={busy === f.id} onClick={() => removeFriend(f)} className="self-start text-slate-400 hover:text-red-600 font-bold" aria-label={`${t('socialUi.removeTitle')} ${f.name}`}>✗</button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {requests.sent.length > 0 && (
            <section className="card p-5" aria-labelledby="sent-title">
              <h2 id="sent-title" className="font-display text-xl text-slate-800 mb-3">⏳ {t('socialUi.sentTitle')}</h2>
              <ul className="flex flex-wrap gap-2">
                {requests.sent.map((r) => (
                  <li key={r.id} className="px-3 py-2 rounded-full bg-slate-100 font-bold text-sm text-slate-700">{avatarOf(r.to.id)} {r.to.name}</li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      {tab === 'search' && (
        <section className="card p-5" aria-labelledby="search-title">
          <h2 id="search-title" className="font-display text-2xl text-slate-800 mb-3">🔍 {t('social.findFriends')}</h2>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('social.searchByUsername')}
            aria-label={t('social.searchByUsername')}
            className="w-full px-4 py-3 border-2 border-slate-300 rounded-2xl focus:border-indigo-500 outline-none font-semibold mb-2"
          />
          <p className="text-xs font-semibold text-slate-500 mb-4">{t('socialUi.searchHint')}</p>
          {results && results.length === 0 && <p className="text-center py-6 text-slate-600 font-semibold">{t('socialUi.noResults')}</p>}
          <ul className="space-y-2">
            {(results || []).map((u) => (
              <li key={u.id} className="flex flex-wrap items-center gap-3 p-3 rounded-2xl bg-slate-50">
                <span className="text-3xl" aria-hidden="true">{avatarOf(u.id)}</span>
                <span className="flex-1 min-w-[10rem]">
                  <span className="block font-extrabold text-slate-800">{u.name} <span className="text-indigo-600 font-display">{u.totalXp} XP</span></span>
                  <PersonLine p={u} />
                </span>
                {u.friendshipStatus === 'none' && (
                  <button type="button" disabled={busy === u.id} className="btn-primary text-sm" onClick={() => sendRequest(u)}>➕ {t('social.addFriend')}</button>
                )}
                {u.friendshipStatus === 'incoming' && (
                  <button type="button" disabled={busy === u.id} className="btn-primary text-sm" onClick={() => accept(u.requestId, u.id)}>✓ {t('social.accept')}</button>
                )}
                {u.friendshipStatus === 'pending' && <span className="text-sm font-extrabold text-amber-600">⏳ {t('socialUi.waiting')}</span>}
                {u.friendshipStatus === 'accepted' && <span className="text-sm font-extrabold text-green-600">✓ {t('social.friends')}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {tab === 'activity' && (
        <section className="card p-5" aria-labelledby="feed-title">
          <h2 id="feed-title" className="font-display text-2xl text-slate-800 mb-1">📣 {t('social.recentActivity')}</h2>
          <p className="text-sm font-semibold text-slate-500 mb-4">{t('socialUi.feedHelp')}</p>
          {feed.length === 0 ? (
            <p className="text-center py-8 text-slate-600 font-semibold">🌱 {t('social.noRecentActivity')}</p>
          ) : (
            <ul className="space-y-2">
              {feed.map((e) => (
                <li key={e.id} className={`flex items-start gap-3 p-3 rounded-2xl ${e.isYou ? 'bg-indigo-50' : 'bg-slate-50'}`}>
                  <span className="text-2xl" aria-hidden="true">{e.type === 'badge' || e.type === 'skill' ? e.icon || FEED_ICON[e.type] : FEED_ICON[e.type]}</span>
                  <span className="flex-1 text-sm text-slate-700">
                    {feedText(e)}
                    <span className="block text-xs text-slate-400 mt-0.5">{ago(e.at)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
};

export default Social;
