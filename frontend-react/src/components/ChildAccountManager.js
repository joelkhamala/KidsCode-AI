import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { parentAPI } from '../services/api';

const ChildAccountManager = ({ onChildCreated, onClose }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    username: '', displayName: '', age: '', password: '', email: '',
    avatarUrl: '', maxDailyMinutes: '', allowedDays: [], requireParentApproval: false,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [createdChild, setCreatedChild] = useState(null);

  const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleDayToggle = (day) => {
    setFormData((prev) => ({
      ...prev,
      allowedDays: prev.allowedDays.includes(day)
        ? prev.allowedDays.filter((d) => d !== day)
        : [...prev.allowedDays, day],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.username || !formData.displayName || !formData.age) {
      setError(t('parent.pc.required'));
      return;
    }
    if (Number(formData.age) < 4 || Number(formData.age) > 17) {
      setError(t('parent.pc.ageRange'));
      return;
    }

    setLoading(true);
    try {
      const childData = {
        username: formData.username.trim(),
        displayName: formData.displayName.trim(),
        age: parseInt(formData.age, 10),
        // Omit the password so the server generates a secure one-time credential.
        ...(formData.password ? { password: formData.password } : {}),
        email: formData.email?.trim() || null,
        avatarUrl: formData.avatarUrl?.trim() || null,
        restrictions: {
          maxDailyMinutes: formData.maxDailyMinutes ? parseInt(formData.maxDailyMinutes, 10) : null,
          allowedDays: formData.allowedDays.length > 0 ? formData.allowedDays : null,
          requireParentApproval: formData.requireParentApproval,
        },
      };

      const res = await parentAPI.createChild(childData);
      setCreatedChild({ ...res.data.child, loginCredentials: res.data.loginCredentials });
      onChildCreated(res.data.child);
    } catch (err) {
      setError(err.response?.data?.error || t('parent.pc.failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {createdChild ? (
            <div>
              <div className="text-center mb-6">
                <div className="text-6xl mb-4">✅</div>
                <h2 className="font-display text-3xl text-slate-800 mb-2">{t('parent.pc.created')}</h2>
                <p className="text-slate-600">{t('parent.pc.createdHelp')}</p>
              </div>

              <div className="bg-indigo-50 border-2 border-indigo-300 rounded-xl p-6 mb-6">
                <h3 className="font-bold text-slate-800 mb-4 text-center">{t('parent.pc.credentials')}</h3>
                <div className="space-y-3">
                  <div className="bg-white rounded-lg p-4">
                    <div className="text-sm text-slate-600 mb-1">{t('parent.pc.username')}</div>
                    <div className="font-mono text-lg font-bold text-indigo-600">{createdChild.loginCredentials.username}</div>
                  </div>
                  {createdChild.loginCredentials.email && (
                    <div className="bg-white rounded-lg p-4">
                      <div className="text-sm text-slate-600 mb-1">{t('parent.pc.emailOptional')}</div>
                      <div className="font-mono text-lg font-bold text-indigo-600">{createdChild.loginCredentials.email}</div>
                    </div>
                  )}
                  <div className="bg-white rounded-lg p-4">
                    <div className="text-sm text-slate-600 mb-1">{t('auth.password')}</div>
                    <div className="font-mono text-lg font-bold text-indigo-600">{createdChild.loginCredentials.password}</div>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">⚠️ {t('parent.pc.important')}</p>
                </div>
              </div>

              <div className="text-center space-y-3">
                <p className="text-slate-600">{t('parent.pc.canLogin', { name: createdChild.displayName })}</p>
                <button onClick={onClose} className="w-full py-3 px-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700">
                  {t('parent.pc.done')}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="font-display text-3xl text-slate-800 mb-2">{t('parent.pc.createTitle')}</h2>
                  <p className="text-slate-600">{t('parent.pc.createHelp')}</p>
                </div>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-3xl leading-none" aria-label={t('ui.close')}>×</button>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-100 border-2 border-red-300 rounded-xl text-red-700 text-sm" role="alert">{error}</div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-4">
                  <h3 className="font-bold text-slate-800">{t('parent.pc.basic')}</h3>

                  <div>
                    <label className="form-label" htmlFor="new-child-username">{t('parent.pc.username')} *</label>
                    <input id="new-child-username" type="text" name="username" value={formData.username} onChange={handleChange}
                      className="form-input" placeholder="coolkid123" required />
                    <p className="text-xs text-slate-500 mt-1">{t('parent.pc.usedForLogin')}</p>
                  </div>

                  <div>
                    <label className="form-label" htmlFor="new-child-email">{t('parent.pc.emailOptional')}</label>
                    <input id="new-child-email" type="email" name="email" value={formData.email} onChange={handleChange}
                      className="form-input" placeholder="child@email.com" />
                    <p className="text-xs text-slate-500 mt-1">{t('parent.pc.emailHint')}</p>
                  </div>

                  <div>
                    <label className="form-label" htmlFor="new-child-name">{t('parent.pc.displayName')} *</label>
                    <input id="new-child-name" type="text" name="displayName" value={formData.displayName} onChange={handleChange}
                      className="form-input" placeholder="Alex" required />
                    <p className="text-xs text-slate-500 mt-1">{t('parent.pc.shownInApp')}</p>
                  </div>

                  <div>
                    <label className="form-label" htmlFor="new-child-age">{t('parent.pc.age')} *</label>
                    <input id="new-child-age" type="number" name="age" value={formData.age} onChange={handleChange}
                      className="form-input" placeholder="10" min="4" max="17" required />
                    <p className="text-xs text-slate-500 mt-1">{t('parent.pc.ageHint')}</p>
                  </div>

                  <div>
                    <label className="form-label" htmlFor="new-child-password">{t('parent.pc.passwordOptional')}</label>
                    <input id="new-child-password" type="text" name="password" value={formData.password} onChange={handleChange}
                      className="form-input" placeholder={t('parent.pc.passwordHelp')} />
                    <p className="text-xs text-slate-500 mt-1">{t('parent.pc.passwordHelp')}</p>
                  </div>

                  <div>
                    <label className="form-label" htmlFor="new-child-avatar">{t('parent.pc.avatar')}</label>
                    <input id="new-child-avatar" type="url" name="avatarUrl" value={formData.avatarUrl} onChange={handleChange}
                      className="form-input" placeholder="https://example.com/avatar.jpg" />
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-slate-200">
                  <h3 className="font-bold text-slate-800">{t('parent.pc.controls')}</h3>

                  <div>
                    <label className="form-label" htmlFor="new-child-limit">{t('parent.dailyLimit')}</label>
                    <input id="new-child-limit" type="number" name="maxDailyMinutes" value={formData.maxDailyMinutes} onChange={handleChange}
                      className="form-input" placeholder="60" min="0" max="1440" />
                    <p className="text-xs text-slate-500 mt-1">{t('parent.pc.noLimit')}</p>
                  </div>

                  <div>
                    <span className="form-label">{t('parent.allowedDays')}</span>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {daysOfWeek.map((day) => (
                        <button key={day} type="button" onClick={() => handleDayToggle(day)}
                          className={`py-2 px-3 rounded-lg text-sm font-bold transition-colors ${
                            formData.allowedDays.includes(day) ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}>
                          {day.charAt(0).toUpperCase() + day.slice(1)}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{t('parent.pc.allDays')}</p>
                  </div>

                  <label className="flex items-center gap-3">
                    <input type="checkbox" name="requireParentApproval" checked={formData.requireParentApproval}
                      onChange={handleChange} className="w-5 h-5 text-indigo-600 rounded" />
                    <span className="text-sm text-slate-700">{t('parent.pc.approval')}</span>
                  </label>
                </div>

                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={onClose} className="flex-1 py-3 px-4 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200">
                    {t('parent.pc.cancel')}
                  </button>
                  <button type="submit" disabled={loading}
                    className="flex-1 py-3 px-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50">
                    {loading ? t('parent.pc.creating') : t('parent.pc.create')}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChildAccountManager;
