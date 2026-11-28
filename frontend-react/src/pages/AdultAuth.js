import React, { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { adultAPI } from '../services/api';
import { setAdultAuth, isAdultSignedIn } from '../utils/authStorage';
import LanguageSwitcher from '../components/LanguageSwitcher';

/** The six courses (ids match the backend's COURSES); numbers come from GET /api/adult/overview. */
const COURSES = [
  { id: 1, icon: '🌐', colour: '#f97316' },
  { id: 2, icon: '☕', colour: '#e76f00' },
  { id: 3, icon: '🐍', colour: '#3776ab' },
  { id: 4, icon: '🗄️', colour: '#6366f1' },
  { id: 5, icon: '🧮', colour: '#0f766e' },
  { id: 6, icon: '🔢', colour: '#7c3aed' },
];
const FALLBACK = { modules: 23, lessons: 101, totalHours: 163, certificates: 6, courses: [] };

/** Sign in / create an account for the adult courses. */
const Field = ({ id, label, children, hint }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-semibold text-slate-700 mb-1">{label}</label>
    {children}
    {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
  </div>
);
const inputCls = 'w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none';

const AdultAuth = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [isLogin, setIsLogin] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [login, setLogin] = useState({ email: '', password: '' });
  const [info, setInfo] = useState(FALLBACK);
  useEffect(() => {
    let alive = true;
    adultAPI.overview().then((r) => { if (alive && r.data && r.data.modules) setInfo(r.data); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  const lessonsIn = (id) => (info.courses.find((c) => c.id === id) || {}).lessons;
  const numbers = { courses: COURSES.length, lessons: info.lessons, hours: info.totalHours || 163 };
  const [reg, setReg] = useState({ firstName: '', lastName: '', email: '', phoneNumber: '', password: '', confirmPassword: '', occupation: '', educationLevel: '', learningGoals: '' });

  const finish = (data) => {
    setAdultAuth(data.token, data.user);
    navigate('/adult/dashboard', { replace: true });
  };
  const submitLogin = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      const r = await adultAPI.login(login.email.trim(), login.password);
      finish(r.data);
    } catch (err) {
      setError(err.response?.status === 401 ? t('ad.wrongLogin') : (err.response?.data?.error || t('ad.somethingWrong')));
    } finally { setBusy(false); }
  };
  const submitRegister = async (e) => {
    e.preventDefault();
    setError('');
    if (reg.password.length < 8) { setError(t('ad.passwordTooShort')); return; }
    if (reg.password !== reg.confirmPassword) { setError(t('ad.passwordsDiffer')); return; }
    setBusy(true);
    try {
      const { confirmPassword, ...body } = reg;
      const r = await adultAPI.register({ ...body, email: body.email.trim() });
      finish(r.data);
    } catch (err) {
      setError(err.response?.data?.code === 'email_taken' ? t('ad.emailTaken') : (err.response?.data?.error || t('ad.somethingWrong')));
    } finally { setBusy(false); }
  };
  const set = (k) => (e) => setReg({ ...reg, [k]: e.target.value });

  // Already signed in: go straight to the course.
  if (isAdultSignedIn()) return <Navigate to="/adult/dashboard" replace />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-violet-900 px-4 py-8 flex flex-col">
      <div className="flex justify-between items-center max-w-5xl w-full mx-auto mb-6">
        <Link to="/" className="text-indigo-200 hover:text-white text-sm font-semibold">← KidsCode</Link>
        <LanguageSwitcher />
      </div>
      <div className="flex-1 grid lg:grid-cols-2 gap-10 items-center max-w-5xl w-full mx-auto">
        <div className="text-white hidden lg:block">
          <p className="text-indigo-300 font-semibold tracking-wide uppercase text-sm">KidsCode · {t('ad.professionalDevelopment')}</p>
          <h1 className="text-4xl font-bold mt-2 leading-tight">{t('ad.authTitle')}</h1>
          <p className="text-indigo-100 mt-4 text-lg">{t('ad.authPitch')}</p>

          {/* The courses on offer */}
          <ul className="mt-6 grid grid-cols-2 gap-2.5">
            {COURSES.map((c) => (
              <li key={c.id} className="flex items-center gap-3 rounded-2xl bg-white/10 border border-white/15 px-3 py-2.5 min-w-0">
                <span className="w-9 h-9 shrink-0 rounded-xl flex items-center justify-center text-lg" style={{ background: `${c.colour}40` }} aria-hidden="true">{c.icon}</span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold leading-tight">{t(`ad.stage.${c.id}`)}</span>
                  {lessonsIn(c.id) ? <span className="block text-xs text-indigo-200">{t('adp.lessons', { count: lessonsIn(c.id) })}</span> : null}
                </span>
              </li>
            ))}
          </ul>

          <ul className="mt-6 space-y-2.5 text-indigo-100">
            {['ad.authPoint1', 'ad.authPoint2', 'ad.authPoint3', 'ad.authPoint4'].map((k) => (
              <li key={k} className="flex gap-3"><span className="text-emerald-300" aria-hidden="true">✓</span>{t(k, numbers)}</li>
            ))}
          </ul>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-6 md:p-8 w-full max-w-md mx-auto">
          <h1 className="text-2xl font-bold text-slate-900 lg:hidden mb-1">{t('ad.authTitle')}</h1>
          <p className="text-slate-500 text-sm mb-3 lg:hidden">{t('ad.authPitch')}</p>
          {/* On phones: the courses as small chips above the form. */}
          <ul className="flex flex-wrap gap-1.5 mb-5 lg:hidden" aria-label={t('ad.yourCourses')}>
            {COURSES.map((c) => (
              <li key={c.id} className="px-2 py-1 rounded-lg text-[11px] font-semibold text-slate-700 bg-slate-100">
                <span aria-hidden="true">{c.icon}</span> {t(`ad.stage.${c.id}`)}
              </li>
            ))}
          </ul>
          <div className="flex mb-6 bg-slate-100 rounded-xl p-1" role="tablist">
            {[[true, t('ad.signIn')], [false, t('ad.createAccount')]].map(([val, label]) => (
              <button key={label} type="button" role="tab" aria-selected={isLogin === val} onClick={() => { setIsLogin(val); setError(''); }}
                className={`flex-1 py-2 rounded-lg font-semibold text-sm transition ${isLogin === val ? 'bg-white text-indigo-700 shadow' : 'text-slate-600'}`}>
                {label}
              </button>
            ))}
          </div>

          {error && <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold" role="alert">{error}</div>}

          {isLogin ? (
            <form onSubmit={submitLogin} className="space-y-4">
              <Field id="li-email" label={t('ad.email')}>
                <input id="li-email" type="email" autoComplete="email" required className={inputCls} value={login.email} onChange={(e) => setLogin({ ...login, email: e.target.value })} />
              </Field>
              <Field id="li-pass" label={t('ad.password')}>
                <div className="relative">
                  <input id="li-pass" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required className={`${inputCls} pr-16`} value={login.password} onChange={(e) => setLogin({ ...login, password: e.target.value })} />
                  <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-indigo-600 px-2 py-1">{showPassword ? t('ad.hide') : t('ad.show')}</button>
                </div>
              </Field>
              <button type="submit" disabled={busy} className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold">{busy ? t('ad.pleaseWait') : t('ad.signIn')}</button>
            </form>
          ) : (
            <form onSubmit={submitRegister} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field id="r-first" label={`${t('ad.firstName')} *`}><input id="r-first" required autoComplete="given-name" className={inputCls} value={reg.firstName} onChange={set('firstName')} /></Field>
                <Field id="r-last" label={`${t('ad.lastName')} *`}><input id="r-last" required autoComplete="family-name" className={inputCls} value={reg.lastName} onChange={set('lastName')} /></Field>
              </div>
              <Field id="r-email" label={`${t('ad.email')} *`}><input id="r-email" type="email" required autoComplete="email" className={inputCls} value={reg.email} onChange={set('email')} /></Field>
              <Field id="r-phone" label={t('ad.phoneOptional')}><input id="r-phone" type="tel" autoComplete="tel" className={inputCls} value={reg.phoneNumber} onChange={set('phoneNumber')} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field id="r-pass" label={`${t('ad.password')} *`} hint={t('ad.min8')}><input id="r-pass" type="password" required minLength={8} autoComplete="new-password" className={inputCls} value={reg.password} onChange={set('password')} /></Field>
                <Field id="r-pass2" label={`${t('ad.confirmPassword')} *`}><input id="r-pass2" type="password" required autoComplete="new-password" className={inputCls} value={reg.confirmPassword} onChange={set('confirmPassword')} /></Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field id="r-occ" label={t('ad.occupation')}><input id="r-occ" className={inputCls} value={reg.occupation} onChange={set('occupation')} /></Field>
                <Field id="r-edu" label={t('ad.education')}>
                  <select id="r-edu" className={inputCls} value={reg.educationLevel} onChange={set('educationLevel')}>
                    <option value="">—</option>
                    {['primary', 'secondary', 'certificate', 'diploma', 'degree', 'postgraduate'].map((k) => <option key={k} value={k}>{t(`ad.edu.${k}`)}</option>)}
                  </select>
                </Field>
              </div>
              <Field id="r-goals" label={t('ad.goals')}><textarea id="r-goals" rows={2} className={inputCls} value={reg.learningGoals} onChange={set('learningGoals')} placeholder={t('ad.goalsPlaceholder')} /></Field>
              <button type="submit" disabled={busy} className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold">{busy ? t('ad.pleaseWait') : t('ad.createAccount')}</button>
            </form>
          )}
          <p className="text-xs text-slate-500 text-center mt-5">{t('ad.childrenLink')} <Link to="/auth" className="text-indigo-600 font-semibold">{t('ad.childrenLinkCta')}</Link></p>
        </div>
      </div>
    </div>
  );
};

export default AdultAuth;
