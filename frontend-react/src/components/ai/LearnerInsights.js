import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { aiAPI } from '../../services/api';

/** AI learning insights for one learner (used in parent and teacher dashboards). */
export const LearnerInsights = ({ learnerId }) => {
  const { t, i18n } = useTranslation();
  const loc = i18n.language === 'sw' ? 'sw' : 'en';
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [writing, setWriting] = useState(false);

  useEffect(() => {
    if (!learnerId) return;
    setData(null);
    setError(null);
    aiAPI.learnerInsights(learnerId, { locale: loc })
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.error || t('coach.error')));
  }, [learnerId, loc, t]);

  const writeSummary = async () => {
    setWriting(true);
    try {
      const res = await aiAPI.learnerInsights(learnerId, { narrative: true, locale: loc });
      setData(res.data);
    } finally {
      setWriting(false);
    }
  };

  if (error) return <div className="text-sm text-red-600 mt-4">{error}</div>;
  if (!data) return <div className="text-sm text-slate-500 mt-4">{t('coach.loading')}</div>;

  const empty = data.perLanguage.length === 0;
  return (
    <div className="mt-6 border-t pt-6">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-display text-xl text-slate-800">🤖 {t('coach.insightsTitle')}</h3>
        {!empty && (
          <button type="button" className="btn-secondary text-sm py-2" onClick={writeSummary} disabled={writing}>
            {writing ? t('coach.checking') : t('coach.writeSummary')}
          </button>
        )}
      </div>

      {empty ? <p className="text-slate-500 text-sm">{t('coach.noData')}</p> : (
        <div className="space-y-4">
          {data.narrative && <p className="bg-purple-50 rounded-lg p-3 text-slate-700 whitespace-pre-wrap">✨ {data.narrative}</p>}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
            <div className="bg-slate-50 rounded-lg p-3"><div className="text-xl font-bold">{data.activity.activitiesLast7Days}</div><div className="text-xs text-slate-500">{t('coach.activity7')}</div></div>
            <div className="bg-slate-50 rounded-lg p-3"><div className="text-xl font-bold">{data.activity.accuracyLast7Days ?? '–'}{data.activity.accuracyLast7Days != null ? '%' : ''}</div><div className="text-xs text-slate-500">{t('coach.accuracy7')}</div></div>
            <div className="bg-slate-50 rounded-lg p-3"><div className="text-xl font-bold">{data.activity.hintsPerActivity ?? '–'}</div><div className="text-xs text-slate-500">{t('coach.hintsPer')}</div></div>
            <div className="bg-slate-50 rounded-lg p-3"><div className="text-xl font-bold">{data.activity.minutesLast7Days}</div><div className="text-xs text-slate-500">{t('coach.minutes7')}</div></div>
          </div>

          <div>
            <div className="text-sm font-bold text-slate-700 mb-2">{t('coach.bloomProfile')}</div>
            <div className="space-y-1">
              {data.bloomProfile.map((b) => (
                <div key={b.level} className="flex items-center gap-2 text-sm">
                  <span className="w-28 shrink-0">{b.name[loc]}</span>
                  <div className="flex-1 h-2 bg-slate-200 rounded" role="progressbar" aria-valuenow={b.avgMastery || 0} aria-valuemin={0} aria-valuemax={100} aria-label={b.name[loc]}>
                    <div className="h-2 bg-indigo-500 rounded" style={{ width: `${b.avgMastery || 0}%` }} />
                  </div>
                  <span className="w-20 text-right text-xs text-slate-500">{b.avgMastery == null ? t('coach.notPractised') : `${b.avgMastery}%`}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-bold text-green-700 mb-1">✅ {t('coach.strengthsTitle')}</div>
              <ul className="text-sm list-disc pl-5">{data.strengths.length ? data.strengths.map((s, i) => <li key={i}>{s.conceptName[loc]} ({s.language}, {s.level})</li>) : <li className="text-slate-400">–</li>}</ul>
            </div>
            <div>
              <div className="text-sm font-bold text-orange-700 mb-1">⚠️ {t('coach.needsTitle')}</div>
              <ul className="text-sm list-disc pl-5">{data.struggling.length ? data.struggling.map((s, i) => <li key={i}>{s.conceptName[loc]} ({s.language}, {s.level}) - {s.accuracy}%</li>) : <li className="text-slate-400">–</li>}</ul>
            </div>
          </div>

          <div>
            <div className="text-sm font-bold text-slate-700 mb-1">🎯 {t('coach.actionsTitle')}</div>
            <ul className="space-y-1">{data.actions.map((a, i) => <li key={i} className="text-sm bg-indigo-50 rounded p-2">{a.text[loc]}</li>)}</ul>
          </div>
        </div>
      )}
    </div>
  );
};

/** Whole-class overview for teachers. */
export const ClassInsights = () => {
  const { t, i18n } = useTranslation();
  const loc = i18n.language === 'sw' ? 'sw' : 'en';
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    aiAPI.classInsights()
      .then((res) => { if (active) setData(res.data); })
      .catch((err) => { if (active) setError(err.response?.data?.error || t('coach.error')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [t]);

  if (loading) {
    return <div className="card p-6 text-center text-slate-600">⏳ {t('parent.approval.loading')}</div>;
  }
  if (error) {
    return (
      <div className="card p-6 text-center" role="alert">
        <p className="text-red-600 font-semibold">{error}</p>
      </div>
    );
  }
  if (!data) return null;

  return (
    <div className="card p-6 mb-8">
      <h2 className="font-display text-2xl text-slate-800 mb-4">🤖 {t('coach.classTitle')}</h2>
      {data.reteach.length > 0 && (
        <div className="mb-4">
          <div className="text-sm font-bold text-orange-700 mb-2">📌 {t('coach.reteach')}</div>
          <div className="grid md:grid-cols-3 gap-3">
            {data.reteach.map((c) => (
              <div key={c.concept} className="bg-orange-50 rounded-lg p-3 text-sm">
                <div className="font-bold">{c.name[loc]}</div>
                <div>{c.avgMastery}%</div>
                {c.strugglingLearners.length > 0 && <div className="text-xs text-slate-600">{c.strugglingLearners.join(', ')}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">{t('coach.students')}</caption>
          <thead><tr className="text-left text-slate-500"><th className="py-1">{t('coach.students')}</th><th>{t('coach.progress')}</th><th>{t('coach.highestLevel')}</th><th>{t('coach.struggling')}</th></tr></thead>
          <tbody>
            {data.students.map((s) => (
              <tr key={s.id} className="border-t">
                <td className="py-1">{s.name}{s.className ? <span className="text-xs text-slate-400"> · {s.className}</span> : null}</td>
                <td>{s.active ? `${s.percent}%` : <span className="text-slate-400">{t('coach.inactive')}</span>}</td>
                <td>{s.active ? s.highestLevel : '–'}</td>
                <td>{s.struggling > 0 ? `⚠️ ${s.struggling}` : '–'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LearnerInsights;
