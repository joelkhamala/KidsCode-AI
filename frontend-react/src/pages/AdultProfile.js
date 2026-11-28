import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { adultAPI } from '../services/api';
import { setAdultAuth } from '../utils/authStorage';
import { Page, PageHeader, Card, Loading, Button } from '../components/AdultUi';

/** Adult learner profile (name on the certificate, contact, goals) and password change. */
const inputCls = 'w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none';

const AdultProfile = () => {
  const { t } = useTranslation();
  const [form, setForm] = useState(null);
  const [msg, setMsg] = useState(null);
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [pwMsg, setPwMsg] = useState(null);
  const [busy, setBusy] = useState('');

  useEffect(() => {
    adultAPI.me().then((r) => {
      const u = r.data.user;
      setForm({ firstName: u.firstName || '', lastName: u.lastName || '', email: u.email || '', phoneNumber: u.phoneNumber || '', occupation: u.occupation || '', educationLevel: u.educationLevel || '', learningGoals: u.learningGoals || '' });
    }).catch(() => setMsg({ ok: false, text: t('ad.loadFailed') }));
  }, [t]);

  const save = async (e) => {
    e.preventDefault();
    setBusy('profile'); setMsg(null);
    try {
      const r = await adultAPI.updateProfile(form);
      setAdultAuth(null, r.data.user);
      setMsg({ ok: true, text: t('ad.profileSaved') });
    } catch (err) {
      setMsg({ ok: false, text: err.response?.data?.error || t('ad.somethingWrong') });
    } finally { setBusy(''); }
  };
  const changePassword = async (e) => {
    e.preventDefault();
    setPwMsg(null);
    if (pw.next.length < 8) { setPwMsg({ ok: false, text: t('ad.passwordTooShort') }); return; }
    if (pw.next !== pw.confirm) { setPwMsg({ ok: false, text: t('ad.passwordsDiffer') }); return; }
    setBusy('pw');
    try {
      await adultAPI.changePassword(pw.current, pw.next);
      setPw({ current: '', next: '', confirm: '' });
      setPwMsg({ ok: true, text: t('ad.passwordChanged') });
    } catch (err) {
      setPwMsg({ ok: false, text: err.response?.data?.code === 'wrong_password' ? t('ad.wrongCurrentPassword') : (err.response?.data?.error || t('ad.somethingWrong')) });
    } finally { setBusy(''); }
  };

  if (!form) return <Page>{msg ? <p className="text-red-700">{msg.text}</p> : <Loading />}</Page>;
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const Note = ({ m }) => (m ? <p className={`text-sm font-semibold ${m.ok ? 'text-emerald-700' : 'text-red-700'}`} role="status">{m.text}</p> : null);

  return (
    <Page>
      <PageHeader title={`👤 ${t('ad.profileSettings')}`} subtitle={t('ad.profileIntro')} />
      <div className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_380px] gap-6">
        <Card className="p-6">
          <form onSubmit={save} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <label className="block"><span className="block text-sm font-semibold text-slate-700 mb-1">{t('ad.firstName')}</span><input required className={inputCls} value={form.firstName} onChange={set('firstName')} /></label>
              <label className="block"><span className="block text-sm font-semibold text-slate-700 mb-1">{t('ad.lastName')}</span><input required className={inputCls} value={form.lastName} onChange={set('lastName')} /></label>
            </div>
            <p className="text-xs text-slate-500">{t('ad.nameOnCertificate')}</p>
            <label className="block"><span className="block text-sm font-semibold text-slate-700 mb-1">{t('ad.email')}</span><input disabled className={`${inputCls} bg-slate-50 text-slate-500`} value={form.email} /></label>
            <label className="block"><span className="block text-sm font-semibold text-slate-700 mb-1">{t('ad.phoneOptional')}</span><input type="tel" className={inputCls} value={form.phoneNumber} onChange={set('phoneNumber')} /></label>
            <div className="grid sm:grid-cols-2 gap-4">
              <label className="block"><span className="block text-sm font-semibold text-slate-700 mb-1">{t('ad.occupation')}</span><input className={inputCls} value={form.occupation} onChange={set('occupation')} /></label>
              <label className="block"><span className="block text-sm font-semibold text-slate-700 mb-1">{t('ad.education')}</span>
                <select className={inputCls} value={form.educationLevel} onChange={set('educationLevel')}>
                  <option value="">—</option>
                  {['primary', 'secondary', 'certificate', 'diploma', 'degree', 'postgraduate'].map((k) => <option key={k} value={k}>{t(`ad.edu.${k}`)}</option>)}
                </select>
              </label>
            </div>
            <label className="block"><span className="block text-sm font-semibold text-slate-700 mb-1">{t('ad.goals')}</span><textarea rows={3} className={inputCls} value={form.learningGoals} onChange={set('learningGoals')} /></label>
            <div className="flex items-center gap-3"><Button type="submit" disabled={busy === 'profile'}>{t('ad.saveChanges')}</Button><Note m={msg} /></div>
          </form>
        </Card>
        <Card className="p-6">
          <h2 className="font-bold text-slate-900 mb-4">🔒 {t('ad.changePassword')}</h2>
          <form onSubmit={changePassword} className="space-y-3">
            <label className="block"><span className="block text-sm font-semibold text-slate-700 mb-1">{t('ad.currentPassword')}</span><input type="password" required autoComplete="current-password" className={inputCls} value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} /></label>
            <label className="block"><span className="block text-sm font-semibold text-slate-700 mb-1">{t('ad.newPassword')}</span><input type="password" required minLength={8} autoComplete="new-password" className={inputCls} value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} /></label>
            <label className="block"><span className="block text-sm font-semibold text-slate-700 mb-1">{t('ad.confirmPassword')}</span><input type="password" required autoComplete="new-password" className={inputCls} value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} /></label>
            <Button type="submit" disabled={busy === 'pw'} className="w-full">{t('ad.changePassword')}</Button>
            <Note m={pwMsg} />
          </form>
        </Card>
      </div>
    </Page>
  );
};

export default AdultProfile;
