import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { adultSocialAPI } from '../services/api';
import { trackEvent } from '../services/analytics';
import { useToast } from '../context/ToastContext';
import { Bar, Button, Card, ErrorBox, Loading, Page, PageHeader, studyTime } from '../components/AdultUi';

/**
 * Adult friends & study circle.
 *
 * Every request uses adultSocialAPI (the adult_token client), so adult social data
 * can never be mixed with a child's session. The page shows real learning records
 * from the server: lessons, assessments, certificates and study time.
 */
const TABS = ['overview', 'friends', 'requests', 'discover', 'messages', 'activity', 'leaderboard', 'goals', 'settings'];
const CHEERS = ['high_five', 'star', 'keep_going', 'well_done', 'code_today'];
const CHEER_ICON = { high_five: '🙌', star: '⭐', keep_going: '💪', well_done: '👏', code_today: '💻' };
const FEED_ICON = { lesson: '📚', assessment: '📝', certificate: '🎓', checkin: '✅', cheer: '💌', friend: '🤝' };
const REPORT_REASONS = ['harassment', 'spam', 'impersonation', 'inappropriate', 'other'];

const EMPTY = {
  summary: null,
  friends: [],
  requests: { incoming: [], outgoing: [], history: [] },
  feed: [],
  board: [],
  goals: null,
  conversations: [],
  notifications: { notifications: [], unread: 0 },
  privacy: null,
  blocked: [],
  cheers: { received: [], sent: [] },
};

const relative = (date, lang) => {
  if (!date) return '';
  const secs = Math.round((new Date(date).getTime() - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(lang || 'en', { numeric: 'auto' });
  for (const [unit, s] of [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]]) {
    if (Math.abs(secs) >= s) return rtf.format(Math.round(secs / s), unit);
  }
  return rtf.format(0, 'second');
};

const Avatar = ({ person, size = 'md' }) => {
  const cls = size === 'lg' ? 'w-14 h-14 text-lg' : 'w-10 h-10 text-sm';
  return (
    <span className={`${cls} shrink-0 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-bold flex items-center justify-center shadow-sm`} aria-hidden="true">
      {person?.initials || 'AL'}
    </span>
  );
};

const Modal = ({ title, onClose, children, footer, wide = false }) => {
  const { t } = useTranslation();
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}
        className={`bg-white rounded-2xl shadow-2xl border border-slate-200 w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} max-h-[88vh] overflow-y-auto p-5 animate-pop`}>
        <div className="flex items-center justify-between gap-4 mb-4">
          <h2 className="text-xl font-bold text-slate-900">{title}</h2>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-500" aria-label={t('adf.close')}>✕</button>
        </div>
        {children}
        {footer && <div className="flex flex-wrap justify-end gap-2 pt-4 border-t border-slate-100 mt-4">{footer}</div>}
      </div>
    </div>
  );
};

const Empty = ({ icon = '🌱', title, text, action }) => (
  <div className="py-12 text-center">
    <div className="text-5xl mb-3" aria-hidden="true">{icon}</div>
    <p className="font-semibold text-slate-800">{title}</p>
    {text && <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">{text}</p>}
    {action && <div className="mt-4 flex justify-center">{action}</div>}
  </div>
);

const TabButton = ({ id, current, onClick, label, count }) => (
  <button type="button" role="tab" onClick={() => onClick(id)} aria-selected={current === id}
    className={`shrink-0 px-3 py-2 rounded-xl text-sm font-semibold transition whitespace-nowrap ${
      current === id ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-white hover:text-indigo-600'
    }`}>
    {label}
    {count > 0 && <span className={`ml-2 text-[10px] rounded-full px-1.5 py-0.5 ${current === id ? 'bg-white/20' : 'bg-indigo-100 text-indigo-700'}`}>{count}</span>}
  </button>
);

const MiniStat = ({ label, value, icon, color = 'text-indigo-600' }) => (
  <Card className="p-4">
    <div className="flex items-start justify-between gap-2">
      <div>
        <div className="text-xs font-medium text-slate-500">{label}</div>
        <div className={`text-2xl font-bold mt-1 ${color}`}>{value}</div>
      </div>
      <span className="text-2xl" aria-hidden="true">{icon}</span>
    </div>
  </Card>
);

const StatusChip = ({ status, t }) => {
  const map = {
    friend: ['adf.statusFriend', 'bg-emerald-100 text-emerald-700'],
    incoming: ['adf.statusIncoming', 'bg-amber-100 text-amber-700'],
    outgoing: ['adf.statusOutgoing', 'bg-sky-100 text-sky-700'],
    self: ['adf.statusSelf', 'bg-slate-100 text-slate-600'],
    none: ['adf.statusNone', 'bg-slate-100 text-slate-600'],
  };
  const [key, cls] = map[status] || map.none;
  return <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${cls}`}>{t(key)}</span>;
};

const CheerBar = ({ onPick, busy, t }) => (
  <div className="flex flex-wrap gap-1" aria-label={t('adf.cheerTitle')}>
    {CHEERS.map((k) => (
      <button key={k} type="button" onClick={() => onPick(k)} disabled={Boolean(busy)} title={t(`adf.cheer.${k}`)}
        className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-indigo-50 border border-slate-200 text-base transition disabled:opacity-50">
        {CHEER_ICON[k]}
      </button>
    ))}
  </div>
);

const AdultFriends = () => {
  const { t, i18n } = useTranslation();
  const { notify, confirm } = useToast();
  const [tab, setTab] = useState('overview');
  const [data, setData] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [requestNote, setRequestNote] = useState('');
  const [metric, setMetric] = useState('lessons');
  const [period, setPeriod] = useState('all');
  const [activeFriend, setActiveFriend] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeQuery, setComposeQuery] = useState('');
  const [goalForm, setGoalForm] = useState({ title: '', description: '', targetMinutes: 300 });
  const [checkinNote, setCheckinNote] = useState('');
  const [privacyForm, setPrivacyForm] = useState(null);
  const [profile, setProfile] = useState(null);
  const [reportTarget, setReportTarget] = useState(null);
  const [reportForm, setReportForm] = useState({ reason: 'other', details: '', block: false });
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    try {
      const [summary, friends, requests, feed, board, goals, conversations, notifications, privacy, blocked, cheers] = await Promise.all([
        adultSocialAPI.summary(),
        adultSocialAPI.getFriends(),
        adultSocialAPI.getRequests(),
        adultSocialAPI.getFeed(40),
        adultSocialAPI.getLeaderboard(metric, period),
        adultSocialAPI.getGoals(),
        adultSocialAPI.getConversations(),
        adultSocialAPI.getNotifications(50),
        adultSocialAPI.getPrivacy(),
        adultSocialAPI.getBlocked(),
        adultSocialAPI.getCheers(40),
      ]);
      setData({
        summary: summary.data,
        friends: friends.data.friends || [],
        requests: requests.data,
        feed: feed.data.feed || [],
        board: board.data.board || [],
        goals: goals.data,
        conversations: conversations.data.conversations || [],
        notifications: notifications.data,
        privacy: privacy.data.privacy,
        blocked: blocked.data.blocked || [],
        cheers: cheers.data,
      });
      const pv = privacy.data.privacy || {};
      setPrivacyForm((p) => p || {
        allowSearch: Boolean(pv.allow_search),
        showProgress: Boolean(pv.show_progress),
        showActivity: Boolean(pv.show_activity),
        allowMessages: Boolean(pv.allow_messages),
      });
      setGoalForm((g) => (g.title || goals.data.mine ? {
        title: goals.data.mine?.title || g.title,
        description: goals.data.mine?.description || g.description,
        targetMinutes: goals.data.mine?.targetMinutes || g.targetMinutes,
      } : g));
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || t('ad.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [metric, period, t]);

  useEffect(() => {
    load();
    const timer = setInterval(() => { if (!document.hidden) load(); }, 30000);
    const onBack = () => { if (!document.hidden) load(); };
    window.addEventListener('focus', onBack);
    document.addEventListener('visibilitychange', onBack);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', onBack);
      document.removeEventListener('visibilitychange', onBack);
    };
  }, [load]);

  useEffect(() => {
    if (query.trim().length < 2) { setResults(null); setSearching(false); return undefined; }
    setSearching(true);
    const h = setTimeout(() => {
      adultSocialAPI.search(query.trim())
        .then((r) => setResults(r.data.users || []))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 350);
    return () => clearTimeout(h);
  }, [query]);

  const activeFriendId = activeFriend?.id;
  useEffect(() => {
    if (!activeFriendId) { setMessages([]); return undefined; }
    let live = true;
    adultSocialAPI.getMessages(activeFriendId, { limit: 100 })
      .then((r) => { if (live) setMessages(r.data.messages || []); })
      .catch(() => { if (live) setMessages([]); });
    adultSocialAPI.markMessagesRead(activeFriendId).catch(() => {});
    return () => { live = false; };
  }, [activeFriendId]);

  useEffect(() => {
    if (tab === 'leaderboard') trackEvent('adult_friends_leaderboard_viewed', { metric, period });
    if (tab === 'discover') trackEvent('adult_friends_discover_viewed');
  }, [tab, metric, period]);

  const act = async (action, fn, successKey, vars) => {
    setBusy(action);
    try {
      const res = await fn();
      trackEvent('adult_friends_action', { action });
      if (successKey) notify(t(successKey, vars || {}), 'success');
      await load();
      return res;
    } catch (err) {
      notify(err.response?.data?.error || t('adf.error'), 'error');
      return null;
    } finally {
      setBusy(null);
    }
  };

  const sendRequest = async (person) => {
    const res = await act(`request:${person.id}`, () => adultSocialAPI.sendRequest(person.id, requestNote),
      'adf.requestSent');
    if (res) {
      const next = res.data.status === 'accepted' ? 'friend' : 'outgoing';
      setResults((list) => list?.map((p) => (p.id === person.id ? { ...p, status: next } : p)));
    }
  };

  const accept = (r) => act(`accept:${r.id}`, () => adultSocialAPI.acceptRequest(r.id), 'adf.accepted');
  const decline = (r) => act(`decline:${r.id}`, () => adultSocialAPI.declineRequest(r.id));
  const cancel = (r) => act(`cancel:${r.id}`, () => adultSocialAPI.cancelRequest(r.id));
  const removeFriend = async (person) => {
    const ok = await confirm({
      title: t('adf.removeTitle'), message: t('adf.removeText', { name: person.name }),
      confirmLabel: t('adf.removeYes'), danger: true, icon: '👋',
    });
    if (ok) await act(`remove:${person.id}`, () => adultSocialAPI.removeFriend(person.id), 'adf.friendRemoved');
  };
  const blockPerson = async (person) => {
    const ok = await confirm({
      title: t('adf.blockTitle'), message: t('adf.blockText', { name: person.name }),
      confirmLabel: t('adf.block'), danger: true, icon: '🔒',
    });
    if (ok) {
      await act(`block:${person.id}`, () => adultSocialAPI.block({ userId: person.id, reason: 'blocked' }), 'adf.blocked');
      setProfile(null);
    }
  };
  const unblock = (person) => act(`unblock:${person.id}`, () => adultSocialAPI.unblock(person.id), 'adf.unblocked');

  const cheer = (person, kind) => act(`cheer:${person.id}:${kind}`, () => adultSocialAPI.sendCheer(person.id, kind),
    'adf.cheerSent', { emoji: CHEER_ICON[kind], name: person.name });

  const openConversation = (friend) => {
    setActiveFriend(friend);
    setDraft('');
    setTab('messages');
  };

  const startConversation = (friend) => {
    setComposeOpen(false);
    setComposeQuery('');
    openConversation(friend);
    trackEvent('adult_friends_action', { action: 'message_started' });
  };

  const sendMessage = async () => {
    const body = draft.trim();
    if (!body || !activeFriend) return;
    setBusy('message:send');
    try {
      const res = await adultSocialAPI.sendMessage(activeFriend.id, body);
      setMessages((list) => [...list, { ...res.data.message, outgoing: true }]);
      setDraft('');
      trackEvent('adult_friends_action', { action: 'message_sent' });
      await load();
    } catch (err) {
      notify(err.response?.data?.error || t('adf.error'), 'error');
    } finally {
      setBusy(null);
    }
  };

  const deleteMessage = (m) => act(`msgdel:${m.id}`, () => adultSocialAPI.deleteMessage(m.id));

  const openProfile = async (personOrId) => {
    const id = typeof personOrId === 'object' ? personOrId.id : personOrId;
    setBusy(`profile:${id}`);
    try {
      const r = await adultSocialAPI.getProfile(id);
      setProfile(r.data);
    } catch (err) {
      notify(err.response?.data?.error || t('adf.error'), 'error');
    } finally {
      setBusy(null);
    }
  };

  const saveGoal = () => act('goal:save', () => adultSocialAPI.saveGoal({
    title: goalForm.title, description: goalForm.description, targetMinutes: Number(goalForm.targetMinutes),
  }), 'adf.goalSaved');

  const checkIn = async () => {
    const res = await act('goal:checkin', () => adultSocialAPI.checkIn(checkinNote), 'adf.checkedIn');
    if (res) setCheckinNote('');
  };

  const savePrivacy = () => act('privacy:save', () => adultSocialAPI.savePrivacy(privacyForm), 'adf.privacySaved');

  const submitReport = async () => {
    const ok = await confirm({
      title: t('adf.reportTitle'), message: t('adf.reportConfirm'), confirmLabel: t('adf.report'),
      danger: true, icon: '🚩',
    });
    if (!ok) return;
    await act(`report:${reportTarget.id}`, () => adultSocialAPI.report({
      userId: reportTarget.id, ...reportForm,
    }), 'adf.reportSent');
    setReportTarget(null);
    setReportForm({ reason: 'other', details: '', block: false });
  };

  const markNotificationsRead = () => act('notify:read', () => adultSocialAPI.markNotificationsRead(), 'adf.notificationsRead');

  const feedText = (e) => {
    const who = e.isYou ? t('adf.you') : e.name;
    const d = e.data || {};
    switch (e.type) {
      case 'lesson': return t('adf.feedLesson', { who, title: d.title });
      case 'assessment': return t('adf.feedAssessment', { who, title: d.title, kind: t(`ad.assess.${d.kind}`), percent: d.percent });
      case 'certificate': return t('adf.feedCertificate', { who, title: d.title });
      case 'checkin': return t('adf.feedCheckin', { who, minutes: studyTime(d.minutes || 0) });
      case 'cheer': return d.outgoing ? t('adf.feedCheerOut', { who, emoji: CHEER_ICON[d.kind], name: d.name })
        : t('adf.feedCheerIn', { who, emoji: CHEER_ICON[d.kind], name: d.name });
      case 'friend': return t('adf.feedFriend', { who, name: d.name });
      default: return t('adf.feedActivity', { who });
    }
  };

  const metricValue = (v) => {
    if (metric === 'hours') return `${v} h`;
    if (metric === 'score') return `${v}%`;
    return v;
  };

  const personActions = (person, compact = false) => (
    <div className={`flex flex-wrap gap-2 ${compact ? '' : 'mt-3'}`}>
      <Button onClick={() => openConversation(person)} className="!py-1.5 !px-3 !text-xs">{t('adf.message')}</Button>
      <Button variant="secondary" onClick={() => openProfile(person)} className="!py-1.5 !px-3 !text-xs">{t('adf.profile')}</Button>
      <CheerBar onPick={(k) => cheer(person, k)} busy={busy.startsWith(`cheer:${person.id}`)} t={t} />
    </div>
  );

  const personCard = (person) => (
    <Card key={person.id} className="p-4">
      <div className="flex items-start gap-3">
        <Avatar person={person} size="lg" />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-bold text-slate-900 truncate">{person.name}</h3>
            <StatusChip status={person.status} t={t} />
          </div>
          <p className="text-xs text-slate-500 truncate">{person.occupation || t('adf.adultLearner')}</p>
          {person.stats && (
            <p className="text-[11px] text-slate-500 mt-1">
              ✅ {person.stats.lessons}/{person.stats.totalLessons} · ⏱ {studyTime(person.stats.hours * 60)} · 🏅 {person.stats.certificates}
              {person.mutual > 0 && ` · 🤝 ${t('adf.mutual', { n: person.mutual })}`}
            </p>
          )}
          {person.private && <p className="text-[11px] text-slate-400 mt-1">{t('adf.privateHint')}</p>}
        </div>
      </div>
      {personActions(person)}
    </Card>
  );

  const requestCard = (r, incoming) => (
    <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
      <Avatar person={{ initials: r.person.name.split(' ').map((x) => x[0]).join('').slice(0, 2) }} />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-900 truncate">{r.person.name}</p>
        <p className="text-[11px] text-slate-500 truncate">{r.note || r.person.occupation || relative(r.createdAt, i18n.language)}</p>
      </div>
      <div className="flex flex-wrap justify-end gap-1.5">
        {incoming ? (
          <>
            <Button onClick={() => accept(r)} disabled={Boolean(busy)} className="!py-1.5 !px-3 !text-xs">{t('adf.accept')}</Button>
            <Button variant="secondary" onClick={() => decline(r)} disabled={Boolean(busy)} className="!py-1.5 !px-3 !text-xs">{t('adf.decline')}</Button>
          </>
        ) : (
          <Button variant="secondary" onClick={() => cancel(r)} disabled={Boolean(busy)} className="!py-1.5 !px-3 !text-xs">{t('adf.cancel')}</Button>
        )}
      </div>
    </div>
  );

  const selectedGoal = data.goals?.mine;
  const goalPct = selectedGoal?.targetMinutes ? Math.min(100, Math.round((100 * (selectedGoal.minutesLogged || 0)) / selectedGoal.targetMinutes)) : 0;

  if (loading && !data.summary) return <Page><Loading /></Page>;
  if (error && !data.summary) return <Page><ErrorBox message={error} onRetry={load} /></Page>;

  const s = data.summary || {};

  return (
    <Page wide>
      <PageHeader
        title={t('adf.title')}
        subtitle={t('adf.subtitle')}
        actions={<Button variant="secondary" onClick={load} disabled={loading} className="!py-2">🔄 {t('adf.refresh')}</Button>}
      />

      <div className="flex gap-1 overflow-x-auto pb-2 mb-5 -mx-1 px-1" role="tablist" aria-label={t('adf.title')}>
        {TABS.map((id) => (
          <TabButton key={id} id={id} current={tab} onClick={setTab}
            label={t(`adf.tab.${id}`)}
            count={{ requests: s.incoming, messages: s.unreadMessages, activity: s.unreadCheers }[id] || 0} />
        ))}
      </div>

      {error && <div className="mb-4"><ErrorBox message={error} onRetry={load} /></div>}

      {/* OVERVIEW */}
      {tab === 'overview' && (
        <div className="grid lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <MiniStat icon="🤝" label={t('adf.statFriends')} value={s.friends || 0} />
              <MiniStat icon="📨" label={t('adf.statRequests')} value={s.incoming || 0} color="text-amber-600" />
              <MiniStat icon="💬" label={t('adf.statMessages')} value={s.unreadMessages || 0} color="text-sky-600" />
              <MiniStat icon="💌" label={t('adf.statCheers')} value={s.unreadCheers || 0} color="text-rose-600" />
            </div>

            <Card className="p-5 bg-gradient-to-br from-indigo-600 to-violet-700 text-white border-0">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold">{t('adf.buddyTitle')}</h2>
                  <p className="text-sm text-indigo-100 mt-1">{t('adf.buddyText')}</p>
                </div>
                <Button variant="secondary" onClick={() => setTab('discover')} className="bg-white/15 !text-white !border-white/30 hover:!bg-white/25">
                  {t('adf.findBuddy')} →
                </Button>
              </div>
              {data.friends.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {data.friends.slice(0, 6).map((f) => (
                    <button key={f.id} type="button" onClick={() => openConversation(f)}
                      className="flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-sm hover:bg-white/25">
                      <span className="w-6 h-6 rounded-full bg-white/25 flex items-center justify-center text-[10px] font-bold">{f.initials}</span>
                      {f.name.split(' ')[0]}
                    </button>
                  ))}
                </div>
              )}
            </Card>

            <Card className="p-5">
              <div className="flex items-center justify-between gap-3 mb-3">
                <h2 className="font-bold text-slate-900">{t('adf.recentActivity')}</h2>
                <button type="button" onClick={() => setTab('activity')} className="text-sm text-indigo-600 font-semibold">{t('adf.viewAll')} →</button>
              </div>
              {data.feed.length === 0 ? <Empty icon="🌱" title={t('adf.noActivity')} />
                : (
                  <ul className="space-y-2">
                    {data.feed.slice(0, 6).map((e, i) => (
                      <li key={`${e.userId}-${e.type}-${i}`} className="flex items-start gap-3 p-2 rounded-xl hover:bg-slate-50">
                        <span className="text-xl" aria-hidden="true">{FEED_ICON[e.type] || '✨'}</span>
                        <span className="flex-1 text-sm text-slate-700">{feedText(e)}</span>
                        <span className="text-[11px] text-slate-400 whitespace-nowrap">{relative(e.at, i18n.language)}</span>
                      </li>
                    ))}
                  </ul>
                )}
            </Card>
          </div>

          <div className="space-y-5">
            <Card className="p-5">
              <h2 className="font-bold text-slate-900 mb-1">{t('adf.goalsTitle')}</h2>
              <p className="text-xs text-slate-500 mb-3">{t('adf.goalsHelp')}</p>
              {selectedGoal ? (
                <>
                  <p className="font-semibold text-slate-800">{selectedGoal.title}</p>
                  <div className="mt-2"><Bar value={goalPct} label={t('adf.progress')} /></div>
                  <p className="text-xs text-slate-500 mt-2">
                    {studyTime(selectedGoal.minutesLogged)} {t('adf.ofTarget')} {studyTime(selectedGoal.targetMinutes)}
                  </p>
                </>
              ) : <p className="text-sm text-slate-500">{t('adf.noGoal')}</p>}
              <Button onClick={() => setTab('goals')} className="w-full mt-4 !py-2">{selectedGoal ? t('adf.checkIn') : t('adf.setGoal')}</Button>
            </Card>

            <Card className="p-5">
              <div className="flex items-center justify-between gap-2 mb-3">
                <h2 className="font-bold text-slate-900">{t('adf.notificationsTitle')}</h2>
                {data.notifications.unread > 0 && <button type="button" onClick={markNotificationsRead} className="text-xs text-indigo-600 font-semibold">{t('adf.markAllRead')}</button>}
              </div>
              {data.notifications.notifications.length === 0 ? <p className="text-sm text-slate-500">{t('adf.noNotifications')}</p>
                : (
                  <ul className="space-y-2 max-h-72 overflow-y-auto">
                    {data.notifications.notifications.slice(0, 12).map((n) => (
                      <li key={n.id} className={`p-2 rounded-xl text-sm ${n.readAt ? 'bg-slate-50 text-slate-600' : 'bg-indigo-50 text-indigo-900'}`}>
                        <span className="font-semibold">{n.actor?.name || 'KidsCode'}</span>{' '}
                        {t(`adf.notify.${n.type}`, { ...n.data, name: n.actor?.name || '' })}
                        <span className="block text-[11px] opacity-60">{relative(n.createdAt, i18n.language)}</span>
                      </li>
                    ))}
                  </ul>
                )}
            </Card>
          </div>
        </div>
      )}

      {/* FRIENDS */}
      {tab === 'friends' && (
        data.friends.length === 0
          ? <Card><Empty icon="🤝" title={t('adf.noFriends')} text={t('adf.noFriendsText')} action={<Button onClick={() => setTab('discover')}>{t('adf.findBuddy')}</Button>} /></Card>
          : <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">{data.friends.map(personCard)}</div>
      )}

      {/* REQUESTS */}
      {tab === 'requests' && (
        <div className="grid lg:grid-cols-2 gap-5">
          <Card className="p-5">
            <h2 className="font-bold text-slate-900 mb-3">{t('adf.incomingRequests')}</h2>
            {data.requests.incoming.length === 0 ? <p className="text-sm text-slate-500">{t('adf.noRequests')}</p>
              : <div className="space-y-2">{data.requests.incoming.map((r) => requestCard(r, true))}</div>}
          </Card>
          <Card className="p-5">
            <h2 className="font-bold text-slate-900 mb-3">{t('adf.outgoingRequests')}</h2>
            {data.requests.outgoing.length === 0 ? <p className="text-sm text-slate-500">{t('adf.noRequests')}</p>
              : <div className="space-y-2">{data.requests.outgoing.map((r) => requestCard(r, false))}</div>}
          </Card>
          {data.requests.history.length > 0 && (
            <Card className="p-5 lg:col-span-2">
              <h2 className="font-bold text-slate-900 mb-3">{t('adf.requestHistory')}</h2>
              <div className="space-y-2">
                {data.requests.history.map((r) => (
                  <div key={r.id} className="flex items-center justify-between gap-3 text-sm p-2 rounded-xl bg-slate-50">
                    <span>{r.person.name}</span>
                    <span className="text-xs text-slate-500">{t(`adf.status.${r.status}`)} · {relative(r.respondedAt || r.createdAt, i18n.language)}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* DISCOVER */}
      {tab === 'discover' && (
        <div className="max-w-3xl mx-auto space-y-4">
          <Card className="p-5">
            <h2 className="font-bold text-slate-900">{t('adf.discoverTitle')}</h2>
            <p className="text-sm text-slate-500 mt-1">{t('adf.discoverHelp')}</p>
            <div className="flex flex-col sm:flex-row gap-3 mt-4">
              <input type="search" value={query} onChange={(e) => setQuery(e.target.value)}
                placeholder={t('adf.searchPlaceholder')} aria-label={t('adf.search')}
                className="flex-1 px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none" />
              <input type="text" value={requestNote} onChange={(e) => setRequestNote(e.target.value.slice(0, 240))}
                placeholder={t('adf.notePlaceholder')} aria-label={t('adf.requestNote')}
                className="sm:w-56 px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            {query.trim().length > 0 && query.trim().length < 2 && <p className="text-xs text-slate-400 mt-2">{t('adf.searchMinimum')}</p>}
          </Card>

          <Card className="p-5">
            {searching ? <Loading />
              : results === null ? <Empty icon="🔎" title={t('adf.searchPrompt')} />
                : results.length === 0 ? <Empty icon="🔍" title={t('adf.noResults')} />
                  : (
                    <ul className="space-y-3">
                      {results.map((p) => (
                        <li key={p.id} className="flex flex-wrap items-center gap-3 p-3 rounded-2xl bg-slate-50">
                          <Avatar person={p} />
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-slate-900 truncate">{p.name}</span>
                              <StatusChip status={p.status} t={t} />
                            </div>
                            <p className="text-xs text-slate-500 truncate">
                              {p.occupation || t('adf.adultLearner')}
                              {p.stats && ` · ${p.stats.lessons}/${p.stats.totalLessons} ${t('adf.lessonsShort')}`}
                              {p.mutual > 0 && ` · 🤝 ${t('adf.mutual', { n: p.mutual })}`}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="secondary" onClick={() => openProfile(p)} className="!py-1.5 !px-3 !text-xs">{t('adf.profile')}</Button>
                            {p.status === 'none' && <Button onClick={() => sendRequest(p)} disabled={Boolean(busy)} className="!py-1.5 !px-3 !text-xs">{t('adf.sendRequest')}</Button>}
                            {p.status === 'friend' && <Button variant="secondary" onClick={() => openConversation(p)} className="!py-1.5 !px-3 !text-xs">{t('adf.message')}</Button>}
                            {(p.status === 'outgoing' || p.status === 'incoming') && (
                              <span className="text-xs text-slate-500 px-2">{t(`adf.status${p.status[0].toUpperCase()}${p.status.slice(1)}`)}</span>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
          </Card>
        </div>
      )}

      {/* MESSAGES */}
      {tab === 'messages' && (
        <div className="grid md:grid-cols-3 gap-4 min-h-[520px]">
          <Card className="p-3 overflow-y-auto max-h-[600px]">
            <div className="flex items-center justify-between gap-2 px-2 py-2">
              <h2 className="font-bold text-slate-900">{t('adf.tab.messages')}</h2>
              <Button onClick={() => setComposeOpen(true)} className="!py-1.5 !px-3 !text-xs">✚ {t('adf.newMessage')}</Button>
            </div>
            {data.conversations.length === 0 ? (
              <Empty icon="💬" title={t('adf.noConversations')}
                action={<Button onClick={() => setComposeOpen(true)} className="!py-1.5 !px-3 !text-xs">{t('adf.newMessage')}</Button>} />
            ) : (
                <ul className="space-y-1">
                  {data.conversations.map((c) => (
                    <li key={c.friend.id}>
                      <button type="button" onClick={() => setActiveFriend(c.friend)}
                        className={`w-full flex items-center gap-3 p-2 rounded-xl text-left transition ${
                          activeFriend?.id === c.friend.id ? 'bg-indigo-50 ring-1 ring-indigo-200' : 'hover:bg-slate-50'
                        }`}>
                        <Avatar person={c.friend} />
                        <span className="flex-1 min-w-0">
                          <span className="block font-semibold text-slate-900 truncate">{c.friend.name}</span>
                          <span className="block text-xs text-slate-500 truncate">{c.last.outgoing ? '↗ ' : '↙ '}{c.last.body}</span>
                        </span>
                        {c.unread > 0 && <span className="bg-indigo-600 text-white text-[10px] rounded-full px-2 py-0.5">{c.unread}</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
          </Card>

          <Card className="md:col-span-2 p-4 flex flex-col">
            {!activeFriend ? <Empty icon="💬" title={t('adf.selectConversation')}
              action={<Button onClick={() => setComposeOpen(true)}>{t('adf.newMessage')}</Button>} />
              : (
                <>
                  <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                    <Avatar person={activeFriend} />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900 truncate">{activeFriend.name}</p>
                      <p className="text-[11px] text-slate-500">{t('adf.friendsOnly')}</p>
                    </div>
                    <button type="button" onClick={() => openProfile(activeFriend)} className="text-sm text-indigo-600 font-semibold">{t('adf.profile')}</button>
                  </div>

                  <div className="flex-1 space-y-2 overflow-y-auto max-h-[420px] py-4" aria-live="polite">
                    {messages.length === 0 && <p className="text-center text-sm text-slate-400 py-8">{t('adf.noMessages')}</p>}
                    {messages.map((m) => (
                      <div key={m.id} className={`flex ${m.outgoing ? 'justify-end' : 'justify-start'}`}>
                        <div className={`group max-w-[85%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap break-words ${
                          m.outgoing ? 'bg-indigo-600 text-white rounded-br-sm' : 'bg-slate-100 text-slate-800 rounded-bl-sm'
                        }`}>
                          {m.body}
                          <button type="button" onClick={() => deleteMessage(m)} title={t('adf.deleteMessage')}
                            className={`ml-2 text-xs opacity-0 group-hover:opacity-100 focus:opacity-100 ${m.outgoing ? 'text-indigo-200' : 'text-slate-400'}`}>🗑</button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2 pt-3 border-t border-slate-100">
                    <input type="text" value={draft} onChange={(e) => setDraft(e.target.value.slice(0, 2000))}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                      placeholder={t('adf.messagePlaceholder')} aria-label={t('adf.messagePlaceholder')}
                      className="flex-1 px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none" />
                    <Button onClick={sendMessage} disabled={!draft.trim() || busy === 'message:send'}>{t('adf.send')}</Button>
                  </div>
                </>
              )}
          </Card>
        </div>
      )}

      {/* ACTIVITY */}
      {tab === 'activity' && (
        <div className="max-w-4xl mx-auto space-y-4">
          <Card className="p-5">
            <h2 className="font-bold text-slate-900">{t('adf.activityTitle')}</h2>
            <p className="text-sm text-slate-500 mt-1">{t('adf.activityHelp')}</p>
          </Card>
          {data.feed.length === 0 ? <Card><Empty icon="🌱" title={t('adf.noActivity')} /></Card>
            : (
              <ul className="space-y-3">
                {data.feed.map((e, i) => (
                  <li key={`${e.userId}-${e.type}-${i}`}>
                    <Card className="p-4 flex flex-wrap items-center gap-3">
                      <Avatar person={{ initials: (e.name || 'AL').split(' ').map((x) => x[0]).join('').slice(0, 2) }} />
                      <span className="text-2xl" aria-hidden="true">{FEED_ICON[e.type] || '✨'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-800">{feedText(e)}</p>
                        <p className="text-[11px] text-slate-400">{relative(e.at, i18n.language)}</p>
                      </div>
                      {!e.isYou && (
                        <CheerBar onPick={(k) => cheer({ id: e.userId, name: e.name }, k)} busy={busy.startsWith(`cheer:${e.userId}`)} t={t} />
                      )}
                    </Card>
                  </li>
                ))}
              </ul>
            )}
        </div>
      )}

      {/* LEADERBOARD */}
      {tab === 'leaderboard' && (
        <div className="max-w-4xl mx-auto space-y-4">
          <Card className="p-5">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="font-bold text-slate-900">{t('adf.leaderboardTitle')}</h2>
                <p className="text-sm text-slate-500 mt-1">{t('adf.leaderboardHelp')}</p>
              </div>
              <div className="flex gap-2">
                <select value={metric} onChange={(e) => setMetric(e.target.value)} aria-label={t('adf.metric')}
                  className="px-3 py-2 rounded-xl border border-slate-300 text-sm">
                  {['lessons', 'hours', 'score', 'streak'].map((m) => <option key={m} value={m}>{t(`adf.metric.${m}`)}</option>)}
                </select>
                <select value={period} onChange={(e) => setPeriod(e.target.value)} aria-label={t('adf.period')}
                  className="px-3 py-2 rounded-xl border border-slate-300 text-sm">
                  <option value="all">{t('adf.periodAll')}</option>
                  <option value="week">{t('adf.periodWeek')}</option>
                </select>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <ol className="space-y-2">
              {data.board.map((p) => (
                <li key={p.id} className={`flex items-center gap-3 p-3 rounded-2xl ${p.isYou ? 'bg-indigo-50 ring-1 ring-indigo-200' : 'bg-slate-50'}`}>
                  <span className="w-9 text-center font-bold text-slate-500">#{p.rank}</span>
                  <Avatar person={p} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{p.name} {p.isYou && <span className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded-full">{t('adf.you')}</span>}</p>
                    <p className="text-xs text-slate-500 truncate">{p.occupation || t('adf.adultLearner')}</p>
                  </div>
                  <div className="text-right">
                    <span className="block text-xl font-bold text-indigo-600">{metricValue(p.value)}</span>
                  </div>
                </li>
              ))}
            </ol>
            {data.board.length === 0 && <Empty icon="🏆" title={t('adf.noBoard')} />}
          </Card>
        </div>
      )}

      {/* GOALS */}
      {tab === 'goals' && (
        <div className="grid lg:grid-cols-2 gap-5">
          <Card className="p-5">
            <h2 className="font-bold text-slate-900">{t('adf.myGoal')}</h2>
            <p className="text-xs text-slate-500 mt-1">{t('adf.goalsHelp')}</p>
            <div className="space-y-3 mt-4">
              <label className="block text-sm font-medium text-slate-700">
                {t('adf.goalTitle')}
                <input type="text" value={goalForm.title} onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value.slice(0, 120) })}
                  placeholder={t('adf.goalPlaceholder')} className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-300" />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                {t('adf.goalDescription')}
                <textarea value={goalForm.description} onChange={(e) => setGoalForm({ ...goalForm, description: e.target.value.slice(0, 500) })}
                  rows={3} className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-300 resize-none" />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                {t('adf.goalTarget')}
                <input type="number" min={30} max={6000} step={30} value={goalForm.targetMinutes}
                  onChange={(e) => setGoalForm({ ...goalForm, targetMinutes: e.target.value })}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-300" />
              </label>
              <Button onClick={saveGoal} disabled={goalForm.title.trim().length < 3} className="w-full">{t('adf.save')}</Button>
            </div>
            {selectedGoal && (
              <div className="mt-5 p-4 rounded-2xl bg-indigo-50">
                <p className="font-semibold text-indigo-900">{selectedGoal.title}</p>
                <div className="mt-2"><Bar value={goalPct} label={t('adf.progress')} /></div>
                <p className="text-xs text-indigo-700 mt-2">{studyTime(selectedGoal.minutesLogged)} {t('adf.ofTarget')} {studyTime(selectedGoal.targetMinutes)}</p>
              </div>
            )}
          </Card>

          <div className="space-y-5">
            <Card className="p-5">
              <h2 className="font-bold text-slate-900">{t('adf.checkInTitle')}</h2>
              <p className="text-xs text-slate-500 mt-1">{t('adf.checkInHelp')}</p>
              <textarea value={checkinNote} onChange={(e) => setCheckinNote(e.target.value.slice(0, 500))} rows={3}
                placeholder={t('adf.checkInNote')} className="mt-3 w-full px-3 py-2 rounded-xl border border-slate-300 resize-none" />
              <Button onClick={checkIn} className="w-full mt-3">{t('adf.checkIn')}</Button>
            </Card>

            <Card className="p-5">
              <h2 className="font-bold text-slate-900 mb-3">{t('adf.friendsGoals')}</h2>
              {data.goals?.friends?.length ? (
                <ul className="space-y-2">
                  {data.goals.friends.map((f) => (
                    <li key={f.id} className="flex items-center gap-3 p-2 rounded-xl bg-slate-50">
                      <Avatar person={f} />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 truncate">{f.name}</p>
                        <p className="text-xs text-slate-500 truncate">{f.title}</p>
                      </div>
                      <span className="text-xs font-semibold text-indigo-600">{studyTime(f.targetMinutes)}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-slate-500">{t('adf.noFriendsGoals')}</p>}
            </Card>
          </div>
        </div>
      )}

      {/* SETTINGS */}
      {tab === 'settings' && (
        <div className="grid lg:grid-cols-2 gap-5">
          <Card className="p-5">
            <h2 className="font-bold text-slate-900">{t('adf.privacyTitle')}</h2>
            <p className="text-xs text-slate-500 mt-1 mb-4">{t('adf.privacyHelp')}</p>
            {privacyForm && (
              <div className="space-y-3">
                {[
                  ['allowSearch', 'adf.allowSearch'],
                  ['showProgress', 'adf.showProgress'],
                  ['showActivity', 'adf.showActivity'],
                  ['allowMessages', 'adf.allowMessages'],
                ].map(([key, label]) => (
                  <label key={key} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 cursor-pointer">
                    <span className="text-sm font-medium text-slate-700">{t(label)}</span>
                    <input type="checkbox" checked={Boolean(privacyForm[key])}
                      onChange={(e) => setPrivacyForm({ ...privacyForm, [key]: e.target.checked })}
                      className="w-5 h-5 accent-indigo-600" />
                  </label>
                ))}
                <Button onClick={savePrivacy} className="w-full">{t('adf.save')}</Button>
              </div>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="font-bold text-slate-900">{t('adf.blockedTitle')}</h2>
            {data.blocked.length === 0 ? <p className="text-sm text-slate-500 mt-2">{t('adf.noBlocked')}</p>
              : (
                <ul className="space-y-2 mt-3">
                  {data.blocked.map((p) => (
                    <li key={p.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                      <Avatar person={p} />
                      <span className="flex-1 font-semibold text-slate-800 truncate">{p.name}</span>
                      <Button variant="secondary" onClick={() => unblock(p)} className="!py-1.5 !px-3 !text-xs">{t('adf.unblock')}</Button>
                    </li>
                  ))}
                </ul>
              )}
          </Card>
        </div>
      )}

      {/* PROFILE DIALOG */}
      {profile && (
        <Modal title={t('adf.profileTitle')} onClose={() => setProfile(null)} wide
          footer={<>
            <Button variant="secondary" onClick={() => setProfile(null)}>{t('adf.close')}</Button>
            {!profile.person.isYou && (
              <>
                {profile.person.status === 'friend' && (
                  <Button variant="secondary" onClick={() => removeFriend(profile.person)}>{t('adf.removeFriend')}</Button>
                )}
                <Button variant="secondary" onClick={() => { setReportTarget(profile.person); setProfile(null); }}>🚩 {t('adf.report')}</Button>
                <Button variant="danger" onClick={() => blockPerson(profile.person)}>{t('adf.block')}</Button>
              </>
            )}
          </>}>
          <div className="flex flex-wrap items-center gap-4">
            <Avatar person={profile.person} size="lg" />
            <div>
              <h3 className="text-xl font-bold text-slate-900">{profile.person.name}</h3>
              <p className="text-sm text-slate-500">{profile.person.occupation || t('adf.adultLearner')}</p>
              <p className="text-xs text-slate-400">{t('adf.joined')} {relative(profile.person.joined, i18n.language)}</p>
            </div>
          </div>
          {profile.person.stats ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
              {[
                [t('adf.statLessons'), `${profile.person.stats.lessons}/${profile.person.stats.totalLessons}`],
                [t('adf.progress'), `${profile.person.stats.progress}%`],
                [t('adf.statHours'), studyTime(profile.person.stats.hours * 60)],
                [t('adf.statCertificates'), profile.person.stats.certificates],
              ].map(([label, value]) => (
                <div key={label} className="p-3 rounded-xl bg-slate-50 text-center">
                  <div className="text-xs text-slate-500">{label}</div>
                  <div className="text-lg font-bold text-indigo-600">{value}</div>
                </div>
              ))}
            </div>
          ) : <p className="mt-4 text-sm text-slate-500">{t('adf.privateHint')}</p>}
          {profile.goal && (
            <div className="mt-4 p-4 rounded-xl bg-indigo-50">
              <p className="text-xs text-indigo-600 font-semibold">{t('adf.friendsGoals')}</p>
              <p className="font-semibold text-indigo-900">{profile.goal.title}</p>
            </div>
          )}
          <div className="mt-5">
            <h4 className="font-bold text-slate-800 mb-2">{t('adf.recentActivity')}</h4>
            {profile.recentActivity.length === 0 ? <p className="text-sm text-slate-500">{t('adf.noActivity')}</p>
              : (
                <ul className="space-y-1 max-h-56 overflow-y-auto">
                  {profile.recentActivity.map((e, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm p-2 rounded-lg bg-slate-50">
                      <span>{FEED_ICON[e.type] || '✨'}</span>
                      <span className="flex-1">{feedText({ ...e, name: profile.person.name })}</span>
                      <span className="text-[11px] text-slate-400">{relative(e.at, i18n.language)}</span>
                    </li>
                  ))}
                </ul>
              )}
          </div>
          {!profile.person.isYou && personActions(profile.person)}
        </Modal>
      )}

      {/* NEW MESSAGE DIALOG */}
      {composeOpen && (() => {
        const q = composeQuery.trim().toLowerCase();
        const candidates = data.friends.filter((f) => !q || `${f.name} ${f.occupation || ''}`.toLowerCase().includes(q));
        return (
          <Modal title={t('adf.composeTitle')} onClose={() => setComposeOpen(false)}>
            <p className="text-sm text-slate-500 mb-4">{t('adf.composeHelp')}</p>
            <input type="search" value={composeQuery} onChange={(e) => setComposeQuery(e.target.value)}
              placeholder={t('adf.findFriend')} aria-label={t('adf.findFriend')}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none" />
            {data.friends.length === 0 ? (
              <p className="text-sm text-slate-500 mt-4">{t('adf.noFriendsToMessage')}</p>
            ) : candidates.length === 0 ? (
              <p className="text-sm text-slate-500 mt-4">{t('adf.noMatchingFriends')}</p>
            ) : (
              <ul className="mt-3 space-y-1 max-h-72 overflow-y-auto">
                {candidates.map((f) => (
                  <li key={f.id}>
                    <button type="button" onClick={() => startConversation(f)}
                      className="w-full flex items-center gap-3 p-2 rounded-xl text-left hover:bg-indigo-50 transition">
                      <Avatar person={f} />
                      <span className="flex-1 min-w-0">
                        <span className="block font-semibold text-slate-900 truncate">{f.name}</span>
                        <span className="block text-xs text-slate-500 truncate">{f.occupation || t('adf.adultLearner')}</span>
                      </span>
                      <span className="text-indigo-600 text-sm font-semibold" aria-hidden="true">→</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Modal>
        );
      })()}

      {/* REPORT DIALOG */}
      {reportTarget && (
        <Modal title={t('adf.reportTitle')} onClose={() => setReportTarget(null)}
          footer={<>
            <Button variant="secondary" onClick={() => setReportTarget(null)}>{t('adf.close')}</Button>
            <Button variant="danger" onClick={submitReport}>{t('adf.report')}</Button>
          </>}>
          <p className="text-sm text-slate-600 mb-4">{t('adf.reportText', { name: reportTarget.name })}</p>
          <label className="block text-sm font-medium text-slate-700">
            {t('adf.reportReason')}
            <select value={reportForm.reason} onChange={(e) => setReportForm({ ...reportForm, reason: e.target.value })}
              className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-300">
              {REPORT_REASONS.map((r) => <option key={r} value={r}>{t(`adf.reason.${r}`)}</option>)}
            </select>
          </label>
          <label className="block text-sm font-medium text-slate-700 mt-3">
            {t('adf.reportDetails')}
            <textarea rows={3} value={reportForm.details} onChange={(e) => setReportForm({ ...reportForm, details: e.target.value.slice(0, 500) })}
              className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-300 resize-none" />
          </label>
          <label className="flex items-center gap-2 mt-3 text-sm text-slate-700">
            <input type="checkbox" checked={reportForm.block} onChange={(e) => setReportForm({ ...reportForm, block: e.target.checked })}
              className="w-4 h-4 accent-red-600" />
            {t('adf.reportAndBlock')}
          </label>
        </Modal>
      )}
    </Page>
  );
};

export default AdultFriends;
