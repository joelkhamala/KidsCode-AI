import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { parentAPI } from '../services/api';
import { useToast } from '../context/ToastContext';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const ParentNotifications = () => {
  const { t } = useTranslation();
  const { notify } = useToast();
  const [notifications, setNotifications] = useState([]);
  const [profile, setProfile] = useState({ firstName: '', lastName: '', phoneNumber: '', email: '' });
  const [prefs, setPrefs] = useState({});
  const [password, setPassword] = useState({ currentPassword: '', newPassword: '' });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [notesRes, profileRes, prefsRes] = await Promise.all([
        parentAPI.getNotifications(), parentAPI.getProfile(), parentAPI.getNotificationPreferences(),
      ]);
      setNotifications(notesRes.data.notifications || []);
      setProfile(profileRes.data.parent || {});
      setPrefs(prefsRes.data.preferences || {});
    } catch (err) {
      notify(err.response?.data?.error || t('adultUi.loadFailed'), 'error');
    } finally {
      setLoading(false);
    }
  }, [notify, t]);

  useEffect(() => { load(); }, [load]);

  const markRead = async (id) => {
    try {
      await parentAPI.markNotificationRead(id);
      setNotifications((list) => list.map((n) => (n.id === id ? { ...n, read: true, read_at: new Date().toISOString() } : n)));
    } catch { /* keep the list usable if a single update fails */ }
  };

  const markAllRead = async () => {
    try {
      await parentAPI.markAllNotificationsRead();
      setNotifications((list) => list.map((n) => ({ ...n, read: true })));
    } catch (err) {
      notify(err.response?.data?.error || t('adultUi.actionFailed'), 'error');
    }
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    try {
      await parentAPI.updateProfile(profile);
      notify(t('parent.settingsSaved'), 'success');
    } catch (err) {
      notify(err.response?.data?.error || t('adultUi.actionFailed'), 'error');
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    try {
      await parentAPI.changePassword(password.currentPassword, password.newPassword);
      setPassword({ currentPassword: '', newPassword: '' });
      notify(t('parent.passwordChanged'), 'success');
    } catch (err) {
      notify(err.response?.data?.error || t('adultUi.actionFailed'), 'error');
    }
  };

  const savePrefs = async (e) => {
    e.preventDefault();
    try {
      await parentAPI.updateNotificationPreferences(prefs);
      notify(t('parent.settingsSaved'), 'success');
    } catch (err) {
      notify(err.response?.data?.error || t('adultUi.actionFailed'), 'error');
    }
  };

  if (loading) return <div className="text-center py-8 text-slate-600">⏳ {t('parent.approval.loading')}</div>;

  return (
    <div className="space-y-6">
      <section className="card p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="font-display text-2xl text-slate-800">🔔 {t('parent.notificationsTitle')}</h2>
          {notifications.some((n) => !n.read) && (
            <button type="button" onClick={markAllRead} className="btn-secondary text-sm">{t('parent.markAllRead')}</button>
          )}
        </div>
        {notifications.length === 0 ? (
          <p className="text-slate-600 text-center py-6">✅ {t('parent.noNotifications')}</p>
        ) : (
          <ul className="space-y-2">
            {notifications.map((n) => (
              <li key={n.id} className={`p-4 rounded-xl border ${n.read ? 'bg-slate-50 border-slate-200' : 'bg-indigo-50 border-indigo-200'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-slate-800">{n.title}</p>
                    <p className="text-sm text-slate-600">{n.body}</p>
                    <p className="text-xs text-slate-500 mt-1">{new Date(n.created_at).toLocaleString()}</p>
                  </div>
                  {!n.read && (
                    <button type="button" onClick={() => markRead(n.id)} className="btn-secondary text-xs">✓</button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card p-6">
        <h2 className="font-display text-2xl text-slate-800 mb-4">👤 {t('parent.profileTitle')}</h2>
        <form onSubmit={saveProfile} className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="form-label" htmlFor="parent-first">{t('parent.firstName')}</label>
            <input id="parent-first" className="form-input" value={profile.firstName || ''} onChange={(e) => setProfile({ ...profile, firstName: e.target.value })} required />
          </div>
          <div>
            <label className="form-label" htmlFor="parent-last">{t('parent.lastName')}</label>
            <input id="parent-last" className="form-input" value={profile.lastName || ''} onChange={(e) => setProfile({ ...profile, lastName: e.target.value })} required />
          </div>
          <div>
            <label className="form-label" htmlFor="parent-email">{t('auth.email')}</label>
            <input id="parent-email" type="email" className="form-input" value={profile.email || ''} onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
          </div>
          <div>
            <label className="form-label" htmlFor="parent-phone">{t('parent.phoneNumber')}</label>
            <input id="parent-phone" type="tel" className="form-input" value={profile.phoneNumber || ''} onChange={(e) => setProfile({ ...profile, phoneNumber: e.target.value })} />
          </div>
          <div className="md:col-span-2"><button type="submit" className="btn-primary">{t('parent.saveProfile')}</button></div>
        </form>
        <form onSubmit={savePassword} className="grid sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-200">
          <div>
            <label className="form-label" htmlFor="parent-current-pw">{t('parent.currentPassword')}</label>
            <input id="parent-current-pw" type="password" className="form-input" value={password.currentPassword} onChange={(e) => setPassword({ ...password, currentPassword: e.target.value })} required />
          </div>
          <div>
            <label className="form-label" htmlFor="parent-new-pw">{t('parent.newPassword')}</label>
            <input id="parent-new-pw" type="password" minLength="8" className="form-input" value={password.newPassword} onChange={(e) => setPassword({ ...password, newPassword: e.target.value })} required />
          </div>
          <div className="flex items-end"><button type="submit" className="btn-primary">{t('parent.changePassword')}</button></div>
        </form>
      </section>

      <section className="card p-6">
        <h2 className="font-display text-2xl text-slate-800 mb-4">⚙️ {t('parent.notificationPrefs')}</h2>
        <form onSubmit={savePrefs} className="grid md:grid-cols-2 gap-4">
          {[
            ['emailNotifications', 'parent.emailNotifications'],
            ['weeklyReports', 'parent.weeklyReports'],
            ['achievementAlerts', 'parent.achievementAlerts'],
            ['loginAlerts', 'parent.loginAlerts'],
          ].map(([key, label]) => (
            <label key={key} className="flex items-center gap-3 text-sm text-slate-700">
              <input type="checkbox" className="w-5 h-5" checked={Boolean(prefs[key])}
                onChange={(e) => setPrefs({ ...prefs, [key]: e.target.checked })} />
              {t(label)}
            </label>
          ))}
          <div>
            <label className="form-label" htmlFor="report-day">{t('parent.reportDay')}</label>
            <select id="report-day" className="form-input" value={prefs.reportDay || 'sunday'} onChange={(e) => setPrefs({ ...prefs, reportDay: e.target.value })}>
              {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label" htmlFor="report-time">{t('parent.reportTime')}</label>
            <input id="report-time" type="time" className="form-input" value={prefs.reportTime || '18:00'} onChange={(e) => setPrefs({ ...prefs, reportTime: e.target.value })} />
          </div>
          <div className="md:col-span-2"><button type="submit" className="btn-primary">{t('parent.savePreferences')}</button></div>
        </form>
      </section>
    </div>
  );
};

export default ParentNotifications;
