import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { parentSocialAPI } from '../services/api';
import { useToast } from '../context/ToastContext';

/**
 * Parents' view of each child's friends: who they are friends with, waiting requests and
 * shared projects, with switches for friends and sharing and a way to remove a friend.
 */
const Switch = ({ on, label, onClick, disabled }) => (
  <button type="button" role="switch" aria-checked={on} disabled={disabled} onClick={onClick}
    className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 font-bold text-sm ${on ? 'bg-green-50 border-green-300 text-green-800' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
    <span className={`inline-block w-9 h-5 rounded-full relative ${on ? 'bg-green-500' : 'bg-slate-300'}`} aria-hidden="true">
      <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all" style={{ left: on ? 18 : 2 }} />
    </span>
    {label}
  </button>
);

const ChildFriends = ({ child }) => {
  const { t, i18n } = useTranslation();
  const { notify, confirm } = useToast();
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const name = child.displayName || child.display_name || child.username;

  const load = useCallback(() => {
    parentSocialAPI.get(child.id).then((r) => setData(r.data)).catch(() => setData({ error: true }));
  }, [child.id]);
  useEffect(() => { load(); }, [load]);

  const toggle = async (key) => {
    setBusy(true);
    try {
      const r = await parentSocialAPI.update(child.id, { [key]: !data[key] });
      setData((d) => ({ ...d, ...r.data }));
      notify(t('pf.saved'), 'success');
    } catch {
      notify(t('adultUi.loadFailed'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const removeFriend = async (f) => {
    const ok = await confirm({ title: t('pf.removeTitle', { friend: f.name, child: name }), message: t('pf.removeText'), confirmLabel: t('socialUi.removeYes'), danger: true, icon: '👋' });
    if (!ok) return;
    await parentSocialAPI.removeFriend(child.id, f.id).catch(() => {});
    load();
  };
  const removeProject = async (p) => {
    const ok = await confirm({ title: t('pf.unshareTitle'), message: p.title, confirmLabel: t('fr.unshare'), danger: true, icon: '🎨' });
    if (!ok) return;
    await parentSocialAPI.removeProject(child.id, p.id).catch(() => {});
    load();
  };

  if (!data) return <div className="card p-5 text-slate-500 font-semibold">{t('common.loading')}</div>;
  if (data.error) return <div className="card p-5 text-red-600 font-semibold">{t('adultUi.loadFailed')}</div>;

  return (
    <div className="card p-5">
      <h3 className="font-display text-xl text-slate-800 mb-3">👦 {name}</h3>
      <div className="flex flex-wrap gap-2 mb-4">
        <Switch on={data.friendsEnabled} disabled={busy} label={t('pf.friendsSwitch')} onClick={() => toggle('friendsEnabled')} />
        <Switch on={data.sharingEnabled} disabled={busy || !data.friendsEnabled} label={t('pf.sharingSwitch')} onClick={() => toggle('sharingEnabled')} />
      </div>
      <h4 className="font-extrabold text-slate-700 text-sm mb-2">👥 {t('pf.friends', { n: data.friends.length })}</h4>
      {data.friends.length === 0 ? <p className="text-sm text-slate-500 font-semibold mb-3">{t('pf.noFriends')}</p> : (
        <ul className="space-y-1 mb-3">
          {data.friends.map((f) => (
            <li key={f.id} className="flex items-center gap-2 text-sm bg-slate-50 rounded-xl px-3 py-2">
              <span className="flex-1 font-bold text-slate-700">{f.name} <span className="font-semibold text-slate-500">· {f.totalXp} XP · {t('social.friendsSince')} {f.friendsSince ? new Date(f.friendsSince.replace(' ', 'T') + 'Z').toLocaleDateString(i18n.language) : ''}</span></span>
              <button type="button" className="text-red-600 font-bold text-xs underline" onClick={() => removeFriend(f)}>{t('pf.remove')}</button>
            </li>
          ))}
        </ul>
      )}
      {data.pendingRequests.length > 0 && (
        <p className="text-sm text-slate-600 font-semibold mb-3">🔔 {t('pf.pending', { names: data.pendingRequests.map((p) => p.name).join(', ') })}</p>
      )}
      <h4 className="font-extrabold text-slate-700 text-sm mb-2">🎨 {t('pf.projects', { n: data.sharedProjects.length })}</h4>
      {data.sharedProjects.length === 0 ? <p className="text-sm text-slate-500 font-semibold">{t('pf.noProjects')}</p> : (
        <ul className="space-y-1">
          {data.sharedProjects.map((p) => (
            <li key={p.id} className="flex items-center gap-2 text-sm bg-slate-50 rounded-xl px-3 py-2">
              <span className="flex-1 font-bold text-slate-700">{p.title}</span>
              <button type="button" className="text-red-600 font-bold text-xs underline" onClick={() => removeProject(p)}>{t('fr.unshare')}</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const ParentFriendsPanel = ({ children }) => {
  const { t } = useTranslation();
  if (!children || !children.length) return null;
  return (
    <section aria-labelledby="pf-title" className="mb-8">
      <h2 id="pf-title" className="font-display text-2xl text-slate-800 mb-1">🤝 {t('pf.title')}</h2>
      <p className="text-slate-600 font-semibold text-sm mb-4">{t('pf.help')}</p>
      <div className="grid md:grid-cols-2 gap-4">
        {children.map((c) => <ChildFriends key={c.id} child={c} />)}
      </div>
    </section>
  );
};

export default ParentFriendsPanel;
