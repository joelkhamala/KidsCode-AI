import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { teacherAPI } from '../services/api';
import { useToast } from '../context/ToastContext';

/** Teacher in-app notifications and account settings. */
const TeacherSettings = ({ onUnreadChange }) => {
  const { t } = useTranslation();
  const { notify } = useToast();
  const [notifications, setNotifications] = useState([]);
  const [profile, setProfile] = useState({ firstName: '', lastName: '', phoneNumber: '', email: '' });
  const [password, setPassword] = useState({ currentPassword: '', newPassword: '' });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [notesRes, profileRes] = await Promise.all([
        teacherAPI.getNotifications(), teacherAPI.getProfile(),
      ]);
      const notes = notesRes.data.notifications || [];
      setNotifications(notes);
      setProfile(profileRes.data.teacher || {});
      onUnreadChange?.(notesRes.data.unread || 0);
    } catch (err) {
      notify(err.response?.data?.error || t('adultUi.loadFailed'), 'error');
    } finally {
      setLoading(false);
    }
  }, [notify, onUnreadChange, t]);

  useEffect(() => { load(); }, [load]);

  const markRead = async (id) => {
    try {
      await teacherAPI.markNotificationRead(id);
      setNotifications((list) => list.map((n) => (n.id === id ? { ...n, read: true } : n)));
      onUnreadChange?.(notifications.filter((n) => !n.read && n.id !== id).length);
    } catch { /* keep the list usable if one update fails */ }
  };

  const markAllRead = async () => {
    try {
      await teacherAPI.markAllNotificationsRead();
      setNotifications((list) => list.map((n) => ({ ...n, read: true })));
      onUnreadChange?.(0);
    } catch (err) {
      notify(err.response?.data?.error || t('adultUi.actionFailed'), 'error');
    }
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    try {
      await teacherAPI.updateProfile(profile);
      notify(t('parent.settingsSaved'), 'success');
    } catch (err) {
      notify(err.response?.data?.error || t('adultUi.actionFailed'), 'error');
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    try {
      await teacherAPI.changePassword(password.currentPassword, password.newPassword);
      setPassword({ currentPassword: '', newPassword: '' });
      notify(t('parent.passwordChanged'), 'success');
    } catch (err) {
      notify(err.response?.data?.error || t('adultUi.actionFailed'), 'error');
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-slate-600">⏳ {t('parent.approval.loading')}</div>;
  }

  return (
    <div className="space-y-6">
      <section className="card p-6" aria-labelledby="teacher-notes-title">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 id="teacher-notes-title" className="font-display text-2xl text-slate-800">🔔 {t('parent.notificationsTitle')}</h2>
          {notifications.some((n) => !n.read) && (
            <button type="button" onClick={markAllRead} className="btn-secondary text-sm">
              {t('parent.markAllRead')}
            </button>
          )}
        </div>
        {notifications.length === 0 ? (
          <p className="text-slate-600 text-center py-6">✅ {t('parent.noNotifications')}</p>
        ) : (
          <ul className="space-y-2">
            {notifications.map((n) => (
              <li key={n.id} className={`p-4 rounded-xl border ${n.read ? 'bg-slate-50 border-slate-200' : 'bg-indigo-50 border-indigo-200'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800">{n.title}</p>
                    <p className="text-sm text-slate-600">{n.body}</p>
                    <p className="text-xs text-slate-500 mt-1">{new Date(n.created_at).toLocaleString()}</p>
                  </div>
                  {!n.read && (
                    <button type="button" onClick={() => markRead(n.id)} className="btn-secondary text-xs" aria-label={t('parent.markAllRead')}>
                      ✓
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card p-6" aria-labelledby="teacher-profile-title">
        <h2 id="teacher-profile-title" className="font-display text-2xl text-slate-800 mb-4">👤 {t('teacher.profileTitle')}</h2>
        <form onSubmit={saveProfile} className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="form-label" htmlFor="teacher-first">{t('parent.firstName')}</label>
            <input id="teacher-first" className="form-input" value={profile.firstName || ''}
              onChange={(e) => setProfile({ ...profile, firstName: e.target.value })} required />
          </div>
          <div>
            <label className="form-label" htmlFor="teacher-last">{t('parent.lastName')}</label>
            <input id="teacher-last" className="form-input" value={profile.lastName || ''}
              onChange={(e) => setProfile({ ...profile, lastName: e.target.value })} required />
          </div>
          <div>
            <label className="form-label" htmlFor="teacher-email">{t('auth.email')}</label>
            <input id="teacher-email" type="email" className="form-input" value={profile.email || ''}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
          </div>
          <div>
            <label className="form-label" htmlFor="teacher-phone">{t('parent.phoneNumber')}</label>
            <input id="teacher-phone" type="tel" className="form-input" value={profile.phoneNumber || ''}
              onChange={(e) => setProfile({ ...profile, phoneNumber: e.target.value })} />
          </div>
          <div className="md:col-span-2"><button type="submit" className="btn-primary">{t('parent.saveProfile')}</button></div>
        </form>
        <form onSubmit={savePassword} className="grid sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-200">
          <div>
            <label className="form-label" htmlFor="teacher-current-pw">{t('parent.currentPassword')}</label>
            <input id="teacher-current-pw" type="password" className="form-input" value={password.currentPassword}
              onChange={(e) => setPassword({ ...password, currentPassword: e.target.value })} required />
          </div>
          <div>
            <label className="form-label" htmlFor="teacher-new-pw">{t('parent.newPassword')}</label>
            <input id="teacher-new-pw" type="password" minLength="8" className="form-input" value={password.newPassword}
              onChange={(e) => setPassword({ ...password, newPassword: e.target.value })} required />
          </div>
          <div className="flex items-end"><button type="submit" className="btn-primary">{t('parent.changePassword')}</button></div>
        </form>
      </section>
    </div>
  );
};

export default TeacherSettings;
