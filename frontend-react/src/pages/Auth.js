import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import AdultPortalCard from '../components/AdultPortalCard';

const Auth = () => {
  const { t } = useTranslation();
  const [isLogin, setIsLogin] = useState(true);
  const [accountMode, setAccountMode] = useState('child'); // 'child', 'parent', or 'teacher'
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '',
    age: '',
    parent_email: '',
    firstName: '',
    lastName: '',
    phoneNumber: ''
  });
  const [error, setError] = useState('');
  const [showParentEmail, setShowParentEmail] = useState(false);
  
  const { login, register, parentLogin, parentRegister, teacherLogin, teacherRegister } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (name === 'age') {
      setShowParentEmail(parseInt(value) < 13);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!formData.email || !formData.password) {
      setError(accountMode === 'child'
        ? t('authUi.errorChildLogin')
        : t('authUi.errorAdultLogin'));
      return;
    }

    const result = accountMode === 'parent' 
      ? await parentLogin(formData.email, formData.password)
      : accountMode === 'teacher'
      ? await teacherLogin(formData.email, formData.password)
      : await login(formData.email, formData.password);
      
    if (result.success) {
      if (accountMode === 'teacher') {
        navigate('/teacher-dashboard');
      } else {
        navigate(accountMode === 'parent' ? '/parent-dashboard' : '/');
      }
    } else {
      setError(t('authUi.errorPrefix', { message: result.error }));
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    
    if (accountMode === 'parent' || accountMode === 'teacher') {
      // Parent/Teacher registration
      if (!formData.firstName || !formData.lastName || !formData.email || !formData.password) {
        setError(t('authUi.errorFillAll'));
        return;
      }

      if (formData.password.length < 8) {
        setError(t('authUi.errorShortPassword', { min: 8 }));
        return;
      }

      const registrationData = {
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phoneNumber: formData.phoneNumber
      };

      const result = accountMode === 'teacher' 
        ? await teacherRegister(registrationData)
        : await parentRegister(registrationData);

      if (result.success) {
        navigate(accountMode === 'teacher' ? '/teacher-dashboard' : '/parent-dashboard');
      } else {
        setError(t('authUi.errorPrefix', { message: result.error }));
      }
    } else {
      // Child registration
      if (!formData.username || !formData.email || !formData.password) {
        setError(t('authUi.errorFillAll'));
        return;
      }

      const result = await register(formData);
      if (result.success) {
        navigate('/');
      } else {
        setError(t('authUi.errorPrefix', { message: result.error }));
      }
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Hero */}
      <div className="hidden lg:flex flex-col justify-center flex-1 p-12 bg-gradient-to-br from-sky-100 via-indigo-100/50 to-sky-100">
        <div className="max-w-lg">
          <div className="text-7xl mb-6 animate-float">🚀</div>
          <h1 className="font-display text-5xl text-slate-800 mb-4 leading-tight">
            {t('authUi.heroLine1')}<br />{t('authUi.heroLine2a')}<span className="text-indigo-600">{t('authUi.heroLine2Highlight')}</span>{t('authUi.heroLine2b')}
          </h1>
          <p className="text-slate-700 text-xl mb-10 leading-relaxed">
            {t('authUi.heroSubtitle')}
          </p>

          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-white rounded-2xl border-2 border-sky-200">
              <span className="text-3xl" aria-hidden="true">🎮</span>
              <div>
                <div className="font-bold">{t('authUi.feature1Title')}</div>
                <div className="text-slate-700 text-sm">{t('authUi.feature1Text')}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-white rounded-2xl border-2 border-sky-200">
              <span className="text-3xl" aria-hidden="true">🐢</span>
              <div>
                <div className="font-bold">{t('authUi.feature2Title')}</div>
                <div className="text-slate-700 text-sm">{t('authUi.feature2Text')}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-white rounded-2xl border-2 border-sky-200">
              <span className="text-3xl" aria-hidden="true">🏆</span>
              <div>
                <div className="font-bold">{t('authUi.feature3Title')}</div>
                <div className="text-slate-700 text-sm">{t('authUi.feature3Text')}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Auth Forms */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-sky-50/50">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <img 
              src="/kidscode_logo.png" 
              alt="KIDSCODE" 
              className="mx-auto w-64 md:w-80 mb-4"
              onError={(e) => {
                // Fallback if logo image not found
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'block';
              }}
            />
            <div className="hidden">
              <div className="text-5xl mb-3">🚀</div>
              <h1 className="font-display text-3xl text-indigo-600">KIDSCODE</h1>
            </div>
          </div>

          {/* Guest-first path: prominent, friendly, and available at every width. */}
          <div className="guest-cta mb-6 rounded-2xl border-2 border-indigo-200 bg-gradient-to-r from-sky-50 via-white to-indigo-50 p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <div
                className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white text-2xl shadow-sm"
                aria-hidden="true"
              >
                🎮
              </div>
              <div className="min-w-0 flex-1">
                <span className="mb-1 inline-flex rounded-full bg-indigo-100 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-indigo-700">
                  {t('authUi.tryBadge')}
                </span>
                <p className="text-sm font-extrabold leading-tight text-slate-800">{t('authUi.tryTitle')}</p>
                <p className="mt-0.5 text-xs leading-snug text-slate-600">{t('authUi.tryNote')}</p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/try')}
                className="btn-primary w-full shrink-0 justify-center px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 sm:w-auto"
              >
                {t('authUi.tryAction')} <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 bg-white p-1 rounded-xl">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2.5 rounded-lg font-bold text-sm transition-all ${
                isLogin ? 'bg-indigo-600 text-white' : 'text-slate-600'
              }`}
            >
              {t('auth.signIn')}
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2.5 rounded-lg font-bold text-sm transition-all ${
                !isLogin ? 'bg-indigo-600 text-white' : 'text-slate-600'
              }`}
            >
              {t('auth.register')}
            </button>
          </div>

          {/* Account Type Selector */}
          <div className="grid grid-cols-3 gap-2 mb-4 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setAccountMode('child')}
              className={`py-2 rounded-lg font-medium text-xs transition-all ${
                accountMode === 'child' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600'
              }`}
            >
              👦 {t('auth.childAccount')}
            </button>
            <button
              onClick={() => setAccountMode('parent')}
              className={`py-2 rounded-lg font-medium text-xs transition-all ${
                accountMode === 'parent' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600'
              }`}
            >
              👨‍👩‍👧 {t('auth.parentAccount')}
            </button>
            <button
              onClick={() => setAccountMode('teacher')}
              className={`py-2 rounded-lg font-medium text-xs transition-all ${
                accountMode === 'teacher' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600'
              }`}
            >
              👨‍🏫 {t('auth.teacherAccount')}
            </button>
          </div>

          {/* Login Form */}
          {isLogin ? (
            <div className="card p-6">
              <h2 className="font-display text-2xl text-slate-800 mb-1">
                {accountMode === 'parent' ? t('authUi.signInParentTitle') : accountMode === 'teacher' ? t('authUi.signInTeacherTitle') : t('authUi.signInChildTitle')}
              </h2>
              <p className="text-slate-700 text-sm mb-6">
                {accountMode === 'parent'
                  ? t('authUi.signInParentSubtitle')
                  : accountMode === 'teacher'
                  ? t('authUi.signInTeacherSubtitle')
                  : t('authUi.signInChildSubtitle')}
              </p>
              
              {error && (
                <div className="mb-4 p-3 bg-red-100 border-2 border-red-300 rounded-xl text-red-800 text-sm font-bold" role="alert">
                  {error}
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="form-label">
                    {accountMode === 'child' ? t('auth.emailOrUsername') : t('auth.email')}
                  </label>
                  <input
                    type="text"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="form-input"
                    placeholder={accountMode === 'child' ? t('authUi.placeholderUsernameOrEmail') : t('authUi.placeholderEmail')}
                  />
                </div>
                <div>
                  <label className="form-label">{t('auth.password')}</label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="••••••••"
                  />
                </div>
                <button type="submit" className="btn-primary w-full justify-center py-3 text-base">
                  {accountMode === 'parent' ? t('auth.signIn') + ' 👨‍👩‍👧' : accountMode === 'teacher' ? t('auth.signIn') + ' 👨‍🏫' : t('auth.letsGo') + ' 🚀'}
                </button>
              </form>

            </div>
          ) : (
            /* Register Form */
            <div className="card p-6">
              <h2 className="font-display text-2xl text-slate-800 mb-1">
                {accountMode === 'parent' ? t('authUi.registerParentTitle') : accountMode === 'teacher' ? t('authUi.registerTeacherTitle') : t('authUi.registerChildTitle')}
              </h2>
              <p className="text-slate-700 text-sm mb-6">
                {accountMode === 'parent'
                  ? t('authUi.registerParentSubtitle')
                  : accountMode === 'teacher'
                  ? t('authUi.registerTeacherSubtitle')
                  : t('authUi.registerChildSubtitle')}
              </p>
              
              {error && (
                <div className="mb-4 p-3 bg-red-100 border-2 border-red-300 rounded-xl text-red-800 text-sm font-bold" role="alert">
                  {error}
                </div>
              )}

              <form onSubmit={handleRegister} className="space-y-4">
                {accountMode === 'parent' || accountMode === 'teacher' ? (
                  /* Parent/Teacher Registration Fields */
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="form-label">{t('auth.firstName')}</label>
                        <input
                          type="text"
                          name="firstName"
                          value={formData.firstName}
                          onChange={handleChange}
                          className="form-input"
                          placeholder={t('authUi.placeholderFirstName')}
                        />
                      </div>
                      <div>
                        <label className="form-label">{t('auth.lastName')}</label>
                        <input
                          type="text"
                          name="lastName"
                          value={formData.lastName}
                          onChange={handleChange}
                          className="form-input"
                          placeholder={t('authUi.placeholderLastName')}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="form-label">{t('auth.email')}</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="form-input"
                        placeholder={t('authUi.placeholderParentEmail')}
                      />
                    </div>
                    <div>
                      <label className="form-label">{t('auth.phoneNumber')}</label>
                        <input
                        type="tel"
                        name="phoneNumber"
                        value={formData.phoneNumber}
                        onChange={handleChange}
                        className="form-input"
                        placeholder="+1234567890"
                      />
                    </div>
                    <div>
                      <label className="form-label">{t('auth.password')}</label>
                      <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        className="form-input"
                        placeholder={t('authUi.placeholderPassword')}
                      />
                    </div>
                  </>
                ) : (
                  /* Child Registration Fields */
                  <>
                    <div>
                      <label className="form-label">{t('auth.username')}</label>
                      <input
                        type="text"
                        name="username"
                        value={formData.username}
                        onChange={handleChange}
                        className="form-input"
                        placeholder={t('authUi.placeholderUsername')}
                      />
                    </div>
                    <div>
                      <label className="form-label">{t('auth.email')}</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="form-input"
                        placeholder={t('authUi.placeholderEmail')}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="form-label">{t('auth.password')}</label>
                        <input
                          type="password"
                          name="password"
                          value={formData.password}
                          onChange={handleChange}
                          className="form-input"
                          placeholder={t('authUi.placeholderMinChars', { n: 6 })}
                        />
                      </div>
                      <div>
                        <label className="form-label">{t('auth.age')}</label>
                        <input
                          type="number"
                          name="age"
                          value={formData.age}
                          onChange={handleChange}
                          className="form-input"
                          placeholder="10"
                          min="4"
                          max="17"
                        />
                      </div>
                    </div>
                    {showParentEmail && (
                      <div>
                        <label className="form-label">
                          {t('authUi.parentEmailLabel')} <span className="text-red-700 font-bold">{t('authUi.parentEmailRequired')}</span>
                        </label>
                        <input
                          type="email"
                          name="parent_email"
                          value={formData.parent_email}
                          onChange={handleChange}
                          className="form-input"
                          placeholder={t('authUi.placeholderParentEmail')}
                        />
                      </div>
                    )}
                  </>
                )}
                <button type="submit" className="btn-primary w-full justify-center py-3 text-base">
                  {accountMode === 'parent' ? t('auth.startAdventure') + ' 👨‍👩‍👧' : accountMode === 'teacher' ? t('auth.startAdventure') + ' 👨‍🏫' : t('auth.startAdventure') + ' 🎮'}
                </button>
              </form>
            </div>
          )}

          <AdultPortalCard />
        </div>
      </div>
    </div>
  );
};

export default Auth;
