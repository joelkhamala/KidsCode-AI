import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { parentAPI } from '../services/api';
import { useToast } from '../context/ToastContext';

const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const blankForm = {
  displayName: '', age: '', avatarUrl: '', maxDailyMinutes: '',
  allowedDays: [], contentFilters: '', requireParentApproval: false,
};

const ParentChildSettings = ({ children, onChanged }) => {
  const { t, i18n } = useTranslation();
  const { notify, confirm } = useToast();
  const [childId, setChildId] = useState(children[0]?.id || '');
  const [form, setForm] = useState(blankForm);
  const [report, setReport] = useState(null);
  const [linkCode, setLinkCode] = useState('');
  const [enrollmentCode, setEnrollmentCode] = useState('');
  const [loading, setLoading] = useState(false);

  const dayLabel = useCallback((key) => {
    const index = DAY_KEYS.indexOf(key);
    if (index < 0) return key;
    // 2024-01-01 was a Monday; index 0..6 maps to that week.
    const date = new Date(2024, 0, 1 + index);
    return new Intl.DateTimeFormat(i18n.language, { weekday: 'long' }).format(date);
  }, [i18n.language]);

  const load = useCallback(async () => {
    if (!childId) return;
    try {
      const [detailRes, reportRes, codeRes] = await Promise.all([
        parentAPI.getChild(childId), parentAPI.getReport(childId), parentAPI.getEnrollmentCode(childId),
      ]);
      setEnrollmentCode(codeRes.data.enrollmentCode || '');
      const child = detailRes.data.child;
      const r = child.restrictions || {};
      setForm({
        displayName: child.displayName || '',
        age: child.age || '',
        avatarUrl: child.avatarUrl || '',
        maxDailyMinutes: r.maxDailyMinutes ?? '',
        allowedDays: r.allowedDays || [],
        contentFilters: (r.contentFilters || []).join(', '),
        requireParentApproval: Boolean(r.requireParentApproval),
      });
      setReport(reportRes.data);
    } catch (err) {
      notify(err.response?.data?.error || t('adultUi.loadFailed'), 'error');
    }
  }, [childId, notify, t]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!children.some((c) => String(c.id) === String(childId))) {
      setChildId(children[0]?.id || '');
    }
  }, [children, childId]);

  const update = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));
  const toggleDay = (day) => setForm((prev) => ({
    ...prev,
    allowedDays: prev.allowedDays.includes(day)
      ? prev.allowedDays.filter((d) => d !== day)
      : [...prev.allowedDays, day],
  }));

  const save = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await parentAPI.updateChild(childId, {
        displayName: form.displayName.trim(),
        age: Number(form.age),
        avatarUrl: form.avatarUrl.trim() || null,
      });
      const saved = await parentAPI.setRestrictions(childId, {
        maxDailyMinutes: form.maxDailyMinutes === '' ? null : Number(form.maxDailyMinutes),
        allowedDays: form.allowedDays,
        contentFilters: form.contentFilters.split(',').map((s) => s.trim()).filter(Boolean),
        requireParentApproval: form.requireParentApproval,
      });
      setForm((prev) => ({ ...prev, ...saved.data.restrictions }));
      notify(t('parent.settingsSaved'), 'success');
      onChanged?.();
    } catch (err) {
      notify(err.response?.data?.error || t('adultUi.actionFailed'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const removeRestrictions = async () => {
    const ok = await confirm({
      title: t('parent.removeRestrictions'),
      message: t('parent.unlinkHelp'),
      confirmLabel: t('parent.removeRestrictions'),
      danger: true,
    });
    if (!ok) return;
    try {
      await parentAPI.deleteRestrictions(childId);
      await load();
      notify(t('parent.restrictionsRemoved'), 'success');
    } catch (err) {
      notify(err.response?.data?.error || t('adultUi.actionFailed'), 'error');
    }
  };

  const linkChild = async (e) => {
    e.preventDefault();
    try {
      await parentAPI.linkChild(linkCode.trim());
      setLinkCode('');
      notify(t('parent.linked'), 'success');
      onChanged?.();
    } catch (err) {
      notify(err.response?.data?.error || t('adultUi.actionFailed'), 'error');
    }
  };

  const unlinkChild = async () => {
    const ok = await confirm({
      title: t('parent.unlink'), message: t('parent.unlinkHelp'),
      confirmLabel: t('parent.unlink'), danger: true,
    });
    if (!ok) return;
    try {
      await parentAPI.unlinkChild(childId);
      notify(t('parent.unlinked'), 'success');
      onChanged?.();
      setChildId('');
    } catch (err) {
      notify(err.response?.data?.error || t('adultUi.actionFailed'), 'error');
    }
  };

  const downloadCsv = async () => {
    try {
      const res = await parentAPI.downloadReportCsv(childId);
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `child-${childId}-progress.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      notify(err.response?.data?.error || t('adultUi.actionFailed'), 'error');
    }
  };

  const child = children.find((c) => String(c.id) === String(childId));
  const moduleRows = report?.modules || [];

  return (
    <div className="space-y-6">
      {children.length === 0 && (
        <section className="card p-6 text-slate-600">{t('parent.noReport')}</section>
      )}

      {children.length > 0 && (
        <>
          <section className="card p-6">
            <h2 className="font-display text-2xl text-slate-800 mb-1">⚙️ {t('parent.childSettings')}</h2>
            <p className="text-slate-600 text-sm mb-5">{t('parent.childSettingsHelp')}</p>

            <label className="form-label" htmlFor="settings-child">{t('parent.childSelect')}</label>
            <select id="settings-child" className="form-input mb-5" value={childId} onChange={(e) => setChildId(e.target.value)}>
              {children.map((c) => (
                <option key={c.id} value={c.id}>{c.displayName || c.username}</option>
              ))}
            </select>

            <form onSubmit={save} className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="form-label" htmlFor="settings-name">{t('parent.displayName')}</label>
                <input id="settings-name" className="form-input" value={form.displayName} onChange={(e) => update('displayName', e.target.value)} required />
              </div>
              <div>
                <label className="form-label" htmlFor="settings-age">{t('parent.age')}</label>
                <input id="settings-age" type="number" min="4" max="17" className="form-input" value={form.age} onChange={(e) => update('age', e.target.value)} required />
              </div>
              <div className="md:col-span-2">
                <label className="form-label" htmlFor="settings-avatar">{t('parent.avatarUrl')}</label>
                <input id="settings-avatar" type="url" className="form-input" value={form.avatarUrl} onChange={(e) => update('avatarUrl', e.target.value)} />
              </div>
              <div>
                <label className="form-label" htmlFor="settings-limit">{t('parent.dailyLimit')}</label>
                <input id="settings-limit" type="number" min="0" max="1440" className="form-input" value={form.maxDailyMinutes} onChange={(e) => update('maxDailyMinutes', e.target.value)} />
                <p className="text-xs text-slate-500 mt-1">{t('parent.dailyLimitHelp')}</p>
              </div>
              <div>
                <label className="form-label" htmlFor="settings-filters">{t('parent.contentFilters')}</label>
                <input id="settings-filters" className="form-input" value={form.contentFilters} onChange={(e) => update('contentFilters', e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <span className="form-label">{t('parent.allowedDays')}</span>
                <div className="flex flex-wrap gap-2">
                  {DAY_KEYS.map((day) => (
                    <button key={day} type="button" onClick={() => toggleDay(day)}
                      className={`px-3 py-1 rounded-full text-sm font-bold ${form.allowedDays.includes(day) ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      {dayLabel(day)}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-1">{t('parent.allowedDaysHelp')}</p>
              </div>
              <label className="md:col-span-2 flex items-center gap-3 text-sm text-slate-700">
                <input type="checkbox" className="w-5 h-5" checked={form.requireParentApproval}
                  onChange={(e) => update('requireParentApproval', e.target.checked)} />
                {t('parent.requireApproval')}
              </label>
              <div className="md:col-span-2 flex flex-wrap gap-3">
                <button type="submit" disabled={loading} className="btn-primary">{t('parent.saveChildSettings')}</button>
                <button type="button" onClick={removeRestrictions} className="btn-secondary">{t('parent.removeRestrictions')}</button>
              </div>
            </form>
          </section>

          <section className="card p-6">
            <h2 className="font-display text-2xl text-slate-800 mb-1">📊 {t('parent.report')}</h2>
            <p className="text-slate-600 text-sm mb-4">{child ? (child.displayName || child.username) : ''}</p>
            {report && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                  <div className="stat-card"><div className="stat-value text-indigo-600">{report.summary.totalXP}</div><div className="text-xs font-bold text-slate-600">XP</div></div>
                  <div className="stat-card"><div className="stat-value text-green-600">{report.summary.completedLessons}</div><div className="text-xs font-bold text-slate-600">{t('parent.totalLessons')}</div></div>
                  <div className="stat-card"><div className="stat-value text-purple-600">{report.summary.averageScore}%</div><div className="text-xs font-bold text-slate-600">{t('parent.averageScore')}</div></div>
                  <div className="stat-card"><div className="stat-value text-sky-600">{report.summary.minutes}</div><div className="text-xs font-bold text-slate-600">{t('parent.timeSpent')}</div></div>
                </div>
                <h3 className="font-bold text-slate-800 mb-2">{t('parent.moduleProgress')}</h3>
                <div className="space-y-2 mb-5">
                  {moduleRows.map((m) => (
                    <div key={m.id}>
                      <div className="flex justify-between text-xs font-bold text-slate-600">
                        <span>{m.title}</span><span>{m.completed} ({m.averageScore}%)</span>
                      </div>
                      <div className="kid-bar"><div className="kid-bar-fill" style={{ width: `${m.total ? Math.round((m.completed / m.total) * 100) : 0}%` }} /></div>
                    </div>
                  ))}
                </div>
              </>
            )}
            <button type="button" onClick={downloadCsv} className="btn-primary">⬇️ {t('parent.downloadCsv')}</button>
          </section>

          <section className="card p-6">
            <h2 className="font-display text-2xl text-slate-800 mb-1">🏫 {t('parent.classroomCodeTitle')}</h2>
            <p className="text-slate-600 text-sm mb-4">{t('parent.classroomCodeHelp')}</p>
            <div className="flex flex-col sm:flex-row gap-3 items-stretch">
              <code className="form-input flex-1 text-lg font-bold tracking-widest text-indigo-700" aria-label={t('parent.classroomCode')}>
                {enrollmentCode || '—'}
              </code>
              <button
                type="button"
                className="btn-secondary"
                disabled={!enrollmentCode}
                onClick={() => {
                  if (!navigator.clipboard?.writeText) return;
                  navigator.clipboard.writeText(enrollmentCode)
                    .then(() => notify(t('parent.codeCopied'), 'success'))
                    .catch(() => notify(t('adultUi.actionFailed'), 'error'));
                }}
              >
                📋 {t('parent.copyCode')}
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-3">{t('parent.classroomCodeWarning')}</p>
          </section>

          <section className="card p-6">
            <h2 className="font-display text-2xl text-slate-800 mb-1">🔗 {t('parent.inviteLinking')}</h2>
            <p className="text-slate-600 text-sm mb-4">{t('parent.inviteHelp')}</p>
            <form onSubmit={linkChild} className="flex flex-col sm:flex-row gap-3 mb-5">
              <input className="form-input flex-1" value={linkCode} onChange={(e) => setLinkCode(e.target.value)} placeholder={t('parent.inviteCode')} aria-label={t('parent.inviteCode')} />
              <button type="submit" className="btn-primary">{t('parent.linkChild')}</button>
            </form>
            {child && (
              <button type="button" onClick={unlinkChild} className="btn-secondary text-red-600">{t('parent.unlink')}</button>
            )}
            <p className="text-xs text-slate-500 mt-3">{t('parent.unlinkHelp')}</p>
          </section>
        </>
      )}
    </div>
  );
};

export default ParentChildSettings;
