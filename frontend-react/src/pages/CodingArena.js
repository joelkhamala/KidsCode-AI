import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { duelAPI, socialAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import ModePicker from '../components/duel/ModePicker';
import FriendDuel from '../components/duel/FriendDuel';
import DuelRoom from '../components/duel/DuelRoom';
import { ArenaProfile, History, Leaderboard } from '../components/duel/DuelStats';

const MATCH_KEY = 'kidscode_duel_match';
const errText = (err, fallback) => err?.response?.data?.error || fallback;

/** SSE through fetch sends the HttpOnly cookie without putting credentials in the URL. */
function useDuelEvents(matchId, onEvent) {
  useEffect(() => {
    if (!matchId) return undefined;
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch(`/api/duels/${matchId}/events`, {
          headers: { Accept: 'text/event-stream' },
          credentials: 'include',
          signal: controller.signal,
        });
        if (!res.ok || !res.body) return;
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const chunks = buffer.split('\n\n');
          buffer = chunks.pop() || '';
          for (const chunk of chunks) {
            const line = chunk.split('\n').find((l) => l.startsWith('data:'));
            if (!line) continue;
            try { onEvent(JSON.parse(line.slice(5).trim())); } catch { /* ignore malformed event */ }
          }
        }
      } catch { /* reconnect is handled by the polling fallback */ }
    })();
    return () => controller.abort();
  }, [matchId, onEvent]);
}

const CodingArena = () => {
  const { t } = useTranslation();
  const { loadProgress } = useAuth();
  const { notify } = useToast();

  const [tab, setTab] = useState('arena');
  const [modes, setModes] = useState([]);
  const [mode, setMode] = useState('code_race');
  const [difficulty, setDifficulty] = useState('easy');
  const [matchId, setMatchId] = useState(() => localStorage.getItem(MATCH_KEY));
  const [match, setMatch] = useState(null);
  const [challenge, setChallenge] = useState(null);
  const [challengeLoading, setChallengeLoading] = useState(false);
  const [board, setBoard] = useState([]);
  const [period, setPeriod] = useState('all');
  const [history, setHistory] = useState([]);
  const [profile, setProfile] = useState(null);
  const [friends, setFriends] = useState([]);
  const [invites, setInvites] = useState([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [offline, setOffline] = useState(false);

  const refreshMatch = useCallback(async (id) => {
    if (!id) return;
    try {
      const res = await duelAPI.getMatch(id);
      const next = res.data.match;
      setMatch(next);
      setOffline(false);
      if (next.status === 'active') {
        setChallengeLoading(true);
        try {
          const ch = await duelAPI.getChallenge(id);
          setChallenge(ch.data.challenge);
        } catch {
          setChallenge(null);
        } finally {
          setChallengeLoading(false);
        }
      } else {
        setChallenge(null);
      }
      if (next.status === 'finished' || next.status === 'cancelled') localStorage.removeItem(MATCH_KEY);
      setError(null);
    } catch (err) {
      if (err.response?.status === 404 || err.response?.status === 403) {
        localStorage.removeItem(MATCH_KEY);
        setMatchId(null);
        setMatch(null);
      } else {
        setError(errText(err, t('duel.loadError')));
      }
    }
  }, [t]);

  const refreshStats = useCallback(async () => {
    try {
      const [prof, hist, modesRes] = await Promise.all([duelAPI.profile(), duelAPI.history(), duelAPI.getModes()]);
      setProfile(prof.data);
      setHistory(hist.data.history || []);
      setModes(modesRes.data.modes || []);
    } catch (err) {
      setError(errText(err, t('duel.loadError')));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const refreshFriends = useCallback(async () => {
    try {
      const [friendList, inviteList] = await Promise.all([socialAPI.getFriends(), duelAPI.invites()]);
      setFriends(friendList.data.friends || []);
      setInvites(inviteList.data.invites || []);
    } catch {
      setFriends([]);
      setInvites([]);
    }
  }, []);

  useEffect(() => { refreshStats(); }, [refreshStats]);
  useEffect(() => { refreshFriends(); }, [refreshFriends]);
  useEffect(() => {
    if (matchId) localStorage.setItem(MATCH_KEY, String(matchId));
    refreshMatch(matchId);
  }, [matchId, refreshMatch]);

  const onEvent = useCallback(() => { refreshMatch(matchId); refreshStats(); }, [matchId, refreshMatch, refreshStats]);
  useDuelEvents(matchId, onEvent);

  // Polling is a safety net when SSE is unavailable behind a proxy or on mobile.
  useEffect(() => {
    if (!matchId) return undefined;
    const id = setInterval(() => refreshMatch(matchId), 5000);
    return () => clearInterval(id);
  }, [matchId, refreshMatch]);

  useEffect(() => {
    if (match?.status !== 'active') return undefined;
    const id = setInterval(() => duelAPI.heartbeat(match.id).catch(() => setOffline(true)), 8000);
    return () => clearInterval(id);
  }, [match?.id, match?.status]);

  useEffect(() => {
    if (matchId || tab !== 'arena') return undefined;
    const id = setInterval(refreshFriends, 5000);
    return () => clearInterval(id);
  }, [matchId, tab, refreshFriends]);

  useEffect(() => {
    if (tab !== 'leaderboard') return;
    duelAPI.leaderboard(period).then((res) => setBoard(res.data.leaderboard || [])).catch(() => setBoard([]));
  }, [tab, period]);

  const start = async () => {
    setBusy(true);
    setNotice(null);
    try {
      const res = await duelAPI.queue(mode, difficulty);
      setMatchId(res.data.matchId);
      setMatch(res.data.match);
      setChallenge(null);
      setTab('arena');
    } catch (err) {
      notify(errText(err, t('duel.loadError')), 'error');
    } finally {
      setBusy(false);
    }
  };

  const openInvite = async (friendId) => {
    setBusy(true);
    setNotice(null);
    try {
      const res = await duelAPI.invite(friendId, mode, difficulty);
      setMatchId(res.data.matchId);
      setMatch(res.data.match);
      setChallenge(null);
      setNotice(t('duel.inviteSent'));
      setTab('arena');
      refreshFriends();
    } catch (err) {
      notify(errText(err, t('duel.loadError')), 'error');
    } finally {
      setBusy(false);
    }
  };

  const answerInvite = async (id, accept) => {
    setBusy(true);
    try {
      const res = accept ? await duelAPI.acceptInvite(id) : await duelAPI.declineInvite(id);
      if (accept) {
        setMatchId(id);
        setMatch(res.data.match);
        setChallenge(null);
        setNotice(null);
      } else {
        notify(t('duel.declined'), 'info');
      }
      refreshFriends();
    } catch (err) {
      notify(errText(err, t('duel.loadError')), 'error');
    } finally {
      setBusy(false);
    }
  };

  const submit = async (payload) => {
    setBusy(true);
    try {
      const res = await duelAPI.submit(matchId, payload);
      setNotice(res.data.final ? null : t('duel.submitted'));
      setMatch(res.data.match);
      if (res.data.match.status !== 'active') setChallenge(null);
      loadProgress();
      refreshStats();
    } catch (err) {
      if (err.response?.status === 409 || err.response?.status === 429) {
        notify(errText(err, 'Try again.'), 'warning');
        refreshMatch(matchId);
      } else {
        notify(errText(err, t('duel.loadError')), 'error');
      }
    } finally {
      setBusy(false);
    }
  };

  const leave = async () => {
    try {
      await duelAPI.leave(matchId);
      setNotice(t('duel.left'));
      setMatchId(null);
      setMatch(null);
      setChallenge(null);
      localStorage.removeItem(MATCH_KEY);
      refreshStats();
      loadProgress();
    } catch (err) {
      notify(errText(err, t('duel.loadError')), 'error');
    }
  };

  const tabs = [
    ['arena', t('duel.tabArena')], ['leaderboard', t('duel.tabLeaderboard')],
    ['history', t('duel.tabHistory')], ['profile', t('duel.tabProfile')],
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="page-title">⚔️ {t('duel.title')}</h1>
          <p className="font-semibold text-slate-600">{t('duel.subtitle')}</p>
        </div>
        {profile && (
          <div className="flex flex-wrap gap-2">
            <span className="rounded-xl bg-indigo-50 px-3 py-2 text-sm font-extrabold text-indigo-700">⭐ {profile.rankName} · {profile.rating}</span>
            <span className="rounded-xl bg-amber-50 px-3 py-2 text-sm font-extrabold text-amber-700">🪙 {profile.coins}</span>
            <span className="rounded-xl bg-sky-50 px-3 py-2 text-sm font-extrabold text-sky-700">💎 {profile.gems}</span>
          </div>
        )}
      </header>

      <nav aria-label={t('duel.title')} className="flex flex-wrap gap-2" role="tablist">
        {tabs.map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
            className={`tab-btn ${tab === id ? 'active' : ''}`}>{label}</button>
        ))}
      </nav>

      {offline && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-800" role="status">{t('duel.offline')}</p>}
      {error && <p className="rounded-xl bg-rose-50 p-3 text-sm font-bold text-rose-800" role="alert">{error}</p>}

      {tab === 'arena' && (
        <div className="space-y-5">
          {!matchId && !match && (
            <>
              <ModePicker modes={modes} selected={mode} onSelect={setMode} difficulty={difficulty} onDifficulty={setDifficulty} onStart={start} busy={busy} />
              <FriendDuel
                friends={friends} invites={invites} busy={busy}
                onInvite={openInvite}
                onAccept={(id) => answerInvite(id, true)}
                onDecline={(id) => answerInvite(id, false)}
              />
            </>
          )}
          {(matchId || match) && (
            <DuelRoom
              match={match} challenge={challenge} challengeLoading={challengeLoading} busy={busy} notice={notice}
              onSubmit={submit} onLeave={leave}
              onRematch={() => {
                const friendId = match?.format === 'friend' ? match.opponent?.id : null;
                localStorage.removeItem(MATCH_KEY);
                setMatchId(null);
                setMatch(null);
                setNotice(null);
                if (friendId) openInvite(friendId); else start();
              }}
              onBack={() => { localStorage.removeItem(MATCH_KEY); setMatchId(null); setMatch(null); setChallenge(null); setNotice(null); }}
            />
          )}
        </div>
      )}
      {tab === 'leaderboard' && <Leaderboard board={board} period={period} onPeriod={setPeriod} />}
      {tab === 'history' && <History rows={history} />}
      {tab === 'profile' && <ArenaProfile profile={profile} />}
      {loading && <p className="text-center text-sm font-semibold text-slate-500" role="status">…</p>}
    </div>
  );
};

export default CodingArena;
