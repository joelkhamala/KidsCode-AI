import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { codeHistoryAPI, socialAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  STICKERS, avatarOf, StickerBar, CheerDialog, ProfileDialog, NewDuelDialog, PlayDuelDialog, DuelResult, ProjectDialog,
} from '../components/FriendsKit';

/**
 * Friends & Leaderboard. Every number comes from the child's real learning records on
 * the server, and the page refreshes itself every 30 seconds, when the child comes back
 * to the tab, and after every friend action - so it stays in sync with the rest of KidsCode.
 *
 * Friends can: cheer each other with stickers (no free text), duel on a skill, share and
 * remix projects, see each other's profile, keep a buddy streak and chase a team goal.
 */
const REFRESH_MS = 30000;
const medal = (rank) => (rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null);
const FEED_ICON = { lesson: '📚', badge: '🏅', quiz: '📝', skill: '🤖', friend: '🤝', project: '🎨', duel: '⚔️' };

const Social = () => {
  const { t, i18n } = useTranslation();
  const { loadProgress } = useAuth();
  const { notify, confirm } = useToast();
  const loc = i18n.language === 'sw' ? 'sw' : 'en';

  const [tab, setTab] = useState('leaderboard');
  const [timeframe, setTimeframe] = useState('all');
  const [settings, setSettings] = useState({ friendsEnabled: true, sharingEnabled: true });
  const [board, setBoard] = useState(null);
  const [friendsBoard, setFriendsBoard] = useState(null);
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState({ requests: [], sent: [] });
  const [feed, setFeed] = useState([]);
  const [team, setTeam] = useState(null);
  const [inbox, setInbox] = useState({ items: [], unread: 0 });
  const [duels, setDuels] = useState({ duels: [], record: { won: 0, lost: 0, tied: 0 } });
  const [projects, setProjects] = useState([]);
  const [saved, setSaved] = useState(null);
  const [share, setShare] = useState({ id: '', title: '' });
  const [updatedAt, setUpdatedAt] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [busy, setBusy] = useState(null);
  const [dialog, setDialog] = useState(null); // { kind: 'cheer'|'profile'|'newDuel'|'duel'|'project', ... }
  const lastQuery = useRef('');

  const load = useCallback(async () => {
    try {
      const [st, b, fb, fr, rq, fd, tm, ib, du, pr] = await Promise.all([
        socialAPI.getSettings(),
        socialAPI.getLeaderboard(timeframe, 50),
        socialAPI.getFriendsLeaderboard(timeframe),
        socialAPI.getFriends(),
        socialAPI.getFriendRequests(),
        socialAPI.getActivityFeed(30),
        socialAPI.getTeam(),
        socialAPI.getInbox(loc),
        socialAPI.getDuels(loc),
        socialAPI.getProjects(),
      ]);
      setSettings(st.data);
      setBoard(b.data);
      setFriendsBoard(fb.data);
      setFriends(fr.data.friends || []);
      setRequests({ requests: rq.data.requests || [], sent: rq.data.sent || [] });
      setFeed(fd.data.feed || []);
      setTeam(tm.data);
      setInbox(ib.data);
      setDuels(du.data);
      setProjects(pr.data.projects || []);
      setUpdatedAt(new Date());
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || t('socialUi.loadError'));
    } finally {
      setLoading(false);
    }
  }, [timeframe, loc, t]);

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

  // Opening the inbox marks it as read (after the child has seen what is new).
  useEffect(() => {
    if (tab !== 'inbox' || !inbox.unread) return undefined;
    const h = setTimeout(() => socialAPI.markInboxSeen().then(load).catch(() => {}), 2500);
    return () => clearTimeout(h);
  }, [tab, inbox.unread, load]);

  // Saved creations that can be shared.
  useEffect(() => {
    if (tab !== 'projects' || saved) return;
    codeHistoryAPI.getHistory(30, 0).then((r) => setSaved(r.data.history || r.data.codes || r.data.items || [])).catch(() => setSaved([]));
  }, [tab, saved]);

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
    notify(res.data.status === 'accepted' ? t('socialUi.newFriend') : t('socialUi.requestSent'), 'success');
  });
  const accept = (requestId, personId) => act(personId, () => socialAPI.acceptFriendRequest(requestId), t('socialUi.newFriend'));
  const reject = (requestId, personId) => act(personId, () => socialAPI.rejectFriendRequest(requestId));
  const removeFriend = async (friend) => {
    const ok = await confirm({ title: t('socialUi.removeTitle'), message: t('socialUi.removeText'), confirmLabel: t('socialUi.removeYes'), danger: true, icon: '👋' });
    if (ok) act(friend.id, () => socialAPI.removeFriend(friend.id));
  };
  const cheerEvent = (e, sticker) => act(`cheer:${e.id}`, () => socialAPI.cheer({ to: e.userId, sticker, eventId: e.id }),
    t('fr.cheerSent', { emoji: STICKERS[sticker], name: e.name }));
  const cheerProject = (p, sticker) => act(`cheer:${p.id}`, () => socialAPI.cheer({ to: p.ownerId, sticker, projectId: p.id }),
    t('fr.cheerSent', { emoji: STICKERS[sticker], name: p.ownerName }));
  const declineDuel = (d) => act(`duel:${d.id}`, () => socialAPI.declineDuel(d.id));
  const shareProject = () => act('share', async () => {
    await socialAPI.shareProject({ codeHistoryId: Number(share.id), title: share.title });
    setShare({ id: '', title: '' });
    notify(t('fr.shared'), 'success');
  });

  const closeDialog = useCallback(() => setDialog(null), []);
  const openProject = useCallback((id) => setDialog({ kind: 'project', id }), []);

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
  const friendsOn = settings.friendsEnabled;

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
      project: t('fr.feedProject', { title: e.title }),
      duel: t('fr.feedDuel', { skill: e.skill?.[loc] || e.skill?.en, name: e.opponent, score: e.score }),
    }[e.type];
    return <><span className="font-extrabold text-slate-800">{name}</span> {what}</>;
  };

  const inboxText = (i) => {
    const name = <span className="font-extrabold text-slate-800">{i.name}</span>;
    if (i.type === 'request') return <>{name} {t('fr.inboxRequest')}</>;
    if (i.type === 'cheer') {
      return i.about
        ? <>{name} {t('fr.inboxCheerAbout', { what: t(`fr.what.${i.about}`), emoji: i.emoji, label: t(`fr.sticker.${i.sticker}`) })}</>
        : <>{name} {t('fr.inboxCheer', { emoji: i.emoji, label: t(`fr.sticker.${i.sticker}`) })}</>;
    }
    if (i.type === 'duel') {
      return i.duel.yourTurn ? <>{name} {t('fr.inboxDuelTurn', { skill: `${i.duel.icon} ${i.duel.skill}` })}</>
        : <>{t('fr.inboxDuelDone', { skill: `${i.duel.icon} ${i.duel.skill}`, name: i.name })}</>;
    }
    return <>{name} {t('fr.inboxProject', { title: i.title })}</>;
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center">
        <div className="text-6xl mb-3 animate-bounce" aria-hidden="true">👥</div>
        <p className="font-bold text-slate-600">{t('common.loading')}</p>
      </div>
    );
  }

  const myTurnDuels = duels.duels.filter((d) => d.yourTurn).length;
  const tabs = [
    ['leaderboard', `🏆 ${t('social.leaderboard')}`],
    ...(friendsOn ? [
      ['friends', `👥 ${t('social.friends')} (${friends.length})`],
      ['inbox', `🔔 ${t('fr.tabInbox')}${inbox.unread ? ` (${inbox.unread})` : ''}`],
      ['duels', `⚔️ ${t('fr.tabDuels')}${myTurnDuels ? ` (${myTurnDuels})` : ''}`],
      ['projects', `🎨 ${t('fr.tabProjects')}`],
      ['search', `🔍 ${t('social.findFriends')}`],
      ['activity', `📣 ${t('social.activity')}`],
    ] : []),
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
      {!friendsOn && <div className="card p-4 mb-4 bg-amber-50 border-2 border-amber-200 font-bold text-amber-800" role="status">🔒 {t('fr.off')}</div>}

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
          {friendsOn && (
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
          )}
        </div>
      )}

      {tab === 'friends' && (
        <div className="space-y-5">
          {team && (
            <section className="card p-5 bg-gradient-to-br from-green-50 to-emerald-50" aria-labelledby="team-title">
              <h2 id="team-title" className="font-display text-xl text-slate-800 mb-1">🤝 {t('fr.teamTitle')}</h2>
              {team.members.length <= 1 ? <p className="text-sm font-semibold text-slate-600">{t('fr.teamAlone')}</p> : (
                <>
                  <p className="text-sm font-semibold text-slate-600 mb-2">{team.reached ? `🎉 ${t('fr.teamDone')}` : t('fr.teamText', { total: team.total, goal: team.goal })}</p>
                  <div className="kid-bar mb-2" role="progressbar" aria-valuenow={Math.min(team.total, team.goal)} aria-valuemin={0} aria-valuemax={team.goal}>
                    <div className="kid-bar-fill" style={{ width: `${Math.min(100, (100 * team.total) / team.goal)}%` }} />
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs font-bold text-slate-600">
                    {team.members.map((m) => <span key={m.id} className="px-2 py-1 rounded-full bg-white">{avatarOf(m.id)} {m.isYou ? t('socialUi.youName') : m.name}: {m.xp} XP</span>)}
                  </div>
                </>
              )}
            </section>
          )}

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
                  <li key={f.id} className="p-4 rounded-2xl bg-slate-50 border-2 border-slate-100">
                    <div className="flex gap-3">
                      <span className="text-4xl" aria-hidden="true">{avatarOf(f.id)}</span>
                      <span className="flex-1 min-w-0">
                        <span className="block font-extrabold text-slate-800 truncate">{f.name}</span>
                        <span className="block font-display text-lg text-indigo-600">{f.totalXp} XP</span>
                        <PersonLine p={f} />
                        {f.buddyStreak > 0 && <span className="block text-xs font-extrabold text-orange-600 mt-1" title={t('fr.buddyHelp')}>🤝🔥 {t('fr.buddy', { n: f.buddyStreak })}</span>}
                        {f.friendsSince && (
                          <span className="block text-xs text-slate-400 mt-1">{t('social.friendsSince')} {new Date(f.friendsSince.replace(' ', 'T') + 'Z').toLocaleDateString(i18n.language)}</span>
                        )}
                      </span>
                      <button type="button" disabled={busy === f.id} onClick={() => removeFriend(f)} className="self-start text-slate-400 hover:text-red-600 font-bold" aria-label={`${t('socialUi.removeTitle')} ${f.name}`}>✗</button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <button type="button" className="btn-secondary text-xs py-1 px-3" onClick={() => setDialog({ kind: 'cheer', friend: f })}>🙌 {t('fr.cheer')}</button>
                      <button type="button" className="btn-secondary text-xs py-1 px-3" onClick={() => setDialog({ kind: 'newDuel', friend: f })}>⚔️ {t('fr.duel')}</button>
                      <button type="button" className="btn-secondary text-xs py-1 px-3" onClick={() => setDialog({ kind: 'profile', id: f.id })}>👀 {t('fr.profile')}</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {requests.sent.length > 0 && (
            <section className="card p-5" aria-labelledby="sent-title">
              <h2 id="sent-title" className="font-display text-xl text-slate-800 mb-3">⏳ {t('socialUi.sentTitle')}</h2>
              <ul className="flex flex-wrap gap-2">
                {requests.sent.map((r) => <li key={r.id} className="px-3 py-2 rounded-full bg-slate-100 font-bold text-sm text-slate-700">{avatarOf(r.to.id)} {r.to.name}</li>)}
              </ul>
            </section>
          )}
        </div>
      )}

      {tab === 'inbox' && (
        <section className="card p-5" aria-labelledby="inbox-title">
          <h2 id="inbox-title" className="font-display text-2xl text-slate-800 mb-3">🔔 {t('fr.tabInbox')}</h2>
          {inbox.items.length === 0 ? <p className="text-center py-8 text-slate-600 font-semibold">📭 {t('fr.inboxEmpty')}</p> : (
            <ul className="space-y-2">
              {inbox.items.map((i) => (
                <li key={i.id} className={`flex flex-wrap items-center gap-3 p-3 rounded-2xl ${i.isNew ? 'bg-amber-50 border-2 border-amber-200' : 'bg-slate-50'}`}>
                  <span className="text-2xl" aria-hidden="true">{i.type === 'cheer' ? i.emoji : i.type === 'duel' ? '⚔️' : i.type === 'project' ? '🎨' : '👋'}</span>
                  <span className="flex-1 min-w-[10rem] text-sm text-slate-700">
                    {i.isNew && <span className="mr-2 text-xs font-extrabold bg-amber-400 text-white px-2 py-0.5 rounded-full">{t('fr.new')}</span>}
                    {inboxText(i)}
                    {i.type === 'duel' && !i.duel.yourTurn && <span className="block"><DuelResult duel={i.duel} /></span>}
                    <span className="block text-xs text-slate-400 mt-0.5">{ago(i.at)}</span>
                  </span>
                  {i.type === 'request' && (
                    <>
                      <button type="button" className="btn-primary text-sm" disabled={busy === i.fromId} onClick={() => accept(i.requestId, i.fromId)}>✓ {t('social.accept')}</button>
                      <button type="button" className="btn-secondary text-sm" disabled={busy === i.fromId} onClick={() => reject(i.requestId, i.fromId)}>✗ {t('social.reject')}</button>
                    </>
                  )}
                  {i.type === 'duel' && i.duel.yourTurn && <button type="button" className="btn-primary text-sm" onClick={() => setDialog({ kind: 'duel', id: i.duel.id })}>▶ {t('fr.play')}</button>}
                  {i.type === 'project' && <button type="button" className="btn-secondary text-sm" onClick={() => openProject(i.projectId)}>👀 {t('fr.open')}</button>}
                  {i.type === 'cheer' && friends.some((f) => f.id === i.fromId) && (
                    <button type="button" className="btn-secondary text-sm" onClick={() => setDialog({ kind: 'cheer', friend: friends.find((f) => f.id === i.fromId) })}>🙌 {t('fr.cheer')}</button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {tab === 'duels' && (
        <section className="card p-5" aria-labelledby="duels-title">
          <h2 id="duels-title" className="font-display text-2xl text-slate-800 mb-1">⚔️ {t('fr.duelsTitle')}</h2>
          <p className="text-sm font-semibold text-slate-600 mb-1">{t('fr.duelsHelp', { finish: 10, win: 20 })}</p>
          <p className="text-sm font-extrabold text-indigo-700 mb-4">🏆 {t('fr.duelRecord', duels.record)}</p>
          {duels.duels.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-slate-600 font-semibold mb-3">{t('fr.duelsEmpty')}</p>
              <button type="button" className="btn-primary" onClick={() => setTab('friends')}>👥 {t('social.friends')}</button>
            </div>
          ) : (
            <ul className="space-y-2">
              {duels.duels.map((d) => (
                <li key={d.id} className={`flex flex-wrap items-center gap-3 p-3 rounded-2xl ${d.yourTurn ? 'bg-indigo-50 border-2 border-indigo-200' : 'bg-slate-50'}`}>
                  <span className="text-3xl" aria-hidden="true">{d.icon}</span>
                  <span className="flex-1 min-w-[10rem]">
                    <span className="block font-extrabold text-slate-800">{t('fr.duelWith', { skill: d.skill, name: d.opponent })} <span className="text-xs text-slate-500">· {d.languageName}</span></span>
                    {d.yourTurn ? <span className="text-sm font-extrabold text-indigo-700">▶ {t('fr.duelYourTurn')}</span> : <DuelResult duel={d} />}
                  </span>
                  {d.yourTurn && <button type="button" className="btn-primary text-sm" onClick={() => setDialog({ kind: 'duel', id: d.id })}>▶ {t('fr.play')}</button>}
                  {d.yourTurn && !d.youStarted && <button type="button" className="btn-secondary text-sm" disabled={busy === `duel:${d.id}`} onClick={() => declineDuel(d)}>{t('fr.duelDecline')}</button>}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {tab === 'projects' && (
        <div className="space-y-5">
          <section className="card p-5" aria-labelledby="share-title">
            <h2 id="share-title" className="font-display text-2xl text-slate-800 mb-1">🎨 {t('fr.shareTitle')}</h2>
            <p className="text-sm font-semibold text-slate-600 mb-3">{t('fr.projectsHelp')}</p>
            {!settings.sharingEnabled ? <p className="font-bold text-amber-700">🔒 {t('fr.sharingOff')}</p>
              : saved && saved.length === 0 ? <p className="font-semibold text-slate-500">💾 {t('fr.noSaved')}</p> : (
                <div className="grid sm:grid-cols-[1fr_1fr_auto] gap-2 items-end">
                  <label className="block">
                    <span className="block text-xs font-extrabold text-slate-600 mb-1">{t('fr.shareFrom')}</span>
                    <select className="w-full px-3 py-2 rounded-xl border-2 border-slate-200 font-semibold" value={share.id}
                      onChange={(e) => {
                        const item = (saved || []).find((s) => String(s.id) === e.target.value);
                        setShare({ id: e.target.value, title: share.title || (item ? String(item.title || '').slice(0, 60) : '') });
                      }}>
                      <option value="">…</option>
                      {(saved || []).map((s) => <option key={s.id} value={s.id}>{s.title || `#${s.id}`}</option>)}
                    </select>
                  </label>
                  <label className="block">
                    <span className="block text-xs font-extrabold text-slate-600 mb-1">{t('fr.shareName')}</span>
                    <input className="w-full px-3 py-2 rounded-xl border-2 border-slate-200 font-semibold" maxLength={60} value={share.title} onChange={(e) => setShare({ ...share, title: e.target.value })} />
                  </label>
                  <button type="button" className="btn-primary" disabled={!share.id || !share.title.trim() || busy === 'share'} onClick={shareProject}>📤 {t('fr.shareBtn')}</button>
                </div>
              )}
          </section>

          <section className="card p-5" aria-labelledby="projects-title">
            <h2 id="projects-title" className="font-display text-2xl text-slate-800 mb-3">🖼️ {t('fr.projectsTitle')}</h2>
            {projects.length === 0 ? <p className="text-center py-6 text-slate-600 font-semibold">{t('fr.projectsEmpty')}</p> : (
              <ul className="grid md:grid-cols-2 gap-3">
                {projects.map((p) => (
                  <li key={p.id} className="p-4 rounded-2xl bg-slate-50 border-2 border-slate-100">
                    <span className="block font-extrabold text-slate-800">🎨 {p.title}</span>
                    <span className="block text-xs font-bold text-slate-500 mb-2">{p.isYours ? t('fr.yours') : `${avatarOf(p.ownerId)} ${t('fr.by', { name: p.ownerName })}`} · {ago(p.createdAt?.replace(' ', 'T') + 'Z')}</span>
                    <div className="flex flex-wrap items-center gap-2">
                      <button type="button" className="btn-secondary text-xs py-1 px-3" onClick={() => openProject(p.id)}>👀 {t('fr.open')}</button>
                      {p.isYours ? (
                        Object.entries(p.cheers.counts).map(([k, n]) => <span key={k} className="text-sm font-bold">{STICKERS[k]} {n}</span>)
                      ) : (
                        <StickerBar compact counts={p.cheers.counts} mine={p.cheers.mine} disabled={busy === `cheer:${p.id}`} onPick={(s) => cheerProject(p, s)} />
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {tab === 'search' && (
        <section className="card p-5" aria-labelledby="search-title">
          <h2 id="search-title" className="font-display text-2xl text-slate-800 mb-3">🔍 {t('social.findFriends')}</h2>
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('social.searchByUsername')} aria-label={t('social.searchByUsername')}
            className="w-full px-4 py-3 border-2 border-slate-300 rounded-2xl focus:border-indigo-500 outline-none font-semibold mb-2" />
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
                {u.friendshipStatus === 'none' && <button type="button" disabled={busy === u.id} className="btn-primary text-sm" onClick={() => sendRequest(u)}>➕ {t('social.addFriend')}</button>}
                {u.friendshipStatus === 'incoming' && <button type="button" disabled={busy === u.id} className="btn-primary text-sm" onClick={() => accept(u.requestId, u.id)}>✓ {t('social.accept')}</button>}
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
          {feed.length === 0 ? <p className="text-center py-8 text-slate-600 font-semibold">🌱 {t('social.noRecentActivity')}</p> : (
            <ul className="space-y-2">
              {feed.map((e) => (
                <li key={e.id} className={`flex items-start gap-3 p-3 rounded-2xl ${e.isYou ? 'bg-indigo-50' : 'bg-slate-50'}`}>
                  <span className="text-2xl" aria-hidden="true">{e.type === 'badge' || e.type === 'skill' ? e.icon || FEED_ICON[e.type] : FEED_ICON[e.type]}</span>
                  <span className="flex-1 text-sm text-slate-700">
                    {feedText(e)}
                    <span className="block text-xs text-slate-400 mt-0.5">{ago(e.at)}</span>
                    {e.type === 'project' && <button type="button" className="text-xs font-extrabold text-indigo-600 underline mt-1" onClick={() => openProject(e.projectId)}>👀 {t('fr.open')}</button>}
                    <span className="block mt-2">
                      {e.isYou || e.type === 'duel' ? (
                        Object.entries(e.cheers?.counts || {}).map(([k, n]) => <span key={k} className="mr-2 text-sm font-bold">{STICKERS[k]} {n}</span>)
                      ) : (
                        <StickerBar compact counts={e.cheers?.counts} mine={e.cheers?.mine} disabled={busy === `cheer:${e.id}`} onPick={(s) => cheerEvent(e, s)} />
                      )}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {dialog?.kind === 'cheer' && <CheerDialog friend={dialog.friend} onClose={closeDialog} onSent={load} />}
      {dialog?.kind === 'profile' && <ProfileDialog friendId={dialog.id} onClose={closeDialog} onOpenProject={openProject} />}
      {dialog?.kind === 'newDuel' && <NewDuelDialog friend={dialog.friend} onClose={closeDialog} onSent={load} />}
      {dialog?.kind === 'duel' && <PlayDuelDialog duelId={dialog.id} onClose={closeDialog} onDone={() => { load(); if (loadProgress) loadProgress(); }} />}
      {dialog?.kind === 'project' && <ProjectDialog projectId={dialog.id} onClose={closeDialog} onChanged={load} />}
    </div>
  );
};

export default Social;
