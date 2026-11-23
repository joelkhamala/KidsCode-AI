import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { adultAPI } from '../services/api';
import { Page, PageHeader, Card, Bar, Stat, Loading, ErrorBox, studyTime } from '../components/AdultUi';

/** Progress report: totals, each module, study time per week, recent assessments, certificate requirements. */
const AdultProgress = () => {
  const { t, i18n } = useTranslation();
  const [p, setP] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setError('');
    adultAPI.progress().then((r) => setP(r.data.progress)).catch((e) => setError(e.response?.data?.error || t('ad.loadFailed')));
  }, [t]);
  useEffect(() => { load(); }, [load]);

  if (error) return <Page><ErrorBox message={error} onRetry={load} /></Page>;
  if (!p) return <Page><Loading /></Page>;

  const maxWeek = Math.max(1, ...p.weeklyHours.map((w) => w.hours));
  const req = p.requirements;
  const fmtDate = (s) => (s ? new Date(String(s).replace(' ', 'T') + (String(s).includes('Z') ? '' : 'Z')).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' }) : '');

  return (
    <Page>
      <PageHeader title={t('ad.myProgress')} subtitle={t('ad.progressSubtitle')} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat label={t('ad.lessons')} value={`${p.completedLessons}/${p.totalLessons}`} sub={`${p.progressPercentage}%`} bar={{ value: p.completedLessons, max: p.totalLessons }} />
        <Stat label={t('ad.modules')} value={`${p.completedModules}/${p.totalModules}`} sub={t('ad.completed')} color="text-sky-600" />
        <Stat label={t('ad.studyTime')} value={studyTime(p.minutesLogged, p.hoursLogged)} sub={t('ad.ofHours', { n: p.requiredHours })} color="text-emerald-600" barColor="bg-emerald-500" bar={{ value: p.hoursLogged, max: p.requiredHours }} />
        <Stat label={t('ad.averageScore')} value={`${p.averageScore}%`} sub={t('ad.passMarkNote', { n: 70 })} color="text-violet-600" />
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_360px] gap-6">
        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="font-bold text-slate-900 mb-4">{t('ad.byModule')}</h2>
            <ul className="space-y-4">
              {p.modules.map((m) => (
                <li key={m.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <Link to={`/adult/module/${m.id}`} className="font-semibold text-slate-800 hover:text-indigo-600">{m.icon} {m.title}</Link>
                    <span className="text-slate-500">{m.completed}/{m.total}{m.completed ? ` · ${m.averageScore}%` : ''}</span>
                  </div>
                  <Bar value={m.completed} max={m.total} color={m.total && m.completed === m.total ? 'bg-emerald-500' : 'bg-indigo-600'} label={m.title} />
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-5">
            <h2 className="font-bold text-slate-900 mb-1">{t('ad.weeklyStudy')}</h2>
            <p className="text-xs text-slate-500 mb-4">{t('ad.weeklyStudyHelp')}</p>
            {p.weeklyHours.length === 0 ? <p className="text-sm text-slate-500">{t('ad.noStudyYet')}</p> : (
              <div className="flex items-end gap-2 h-40" role="img" aria-label={t('ad.weeklyStudy')}>
                {p.weeklyHours.map((w) => (
                  <div key={w.start} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                    <span className="text-[11px] font-semibold text-slate-600">{studyTime(w.minutes, w.hours)}</span>
                    <div className="w-full bg-emerald-500 rounded-t-md" style={{ height: `${Math.max(4, (100 * w.hours) / maxWeek)}%` }} />
                    <span className="text-[10px] text-slate-400 truncate w-full text-center">{fmtDate(w.start)}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="font-bold text-slate-900 mb-4">{t('ad.recentAssessments')}</h2>
            {p.recentAssessments.length === 0 ? <p className="text-sm text-slate-500">{t('ad.noAssessments')}</p> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500 border-b border-slate-200">
                      <th scope="col" className="py-2 pr-3 font-semibold">{t('ad.lesson')}</th>
                      <th scope="col" className="py-2 pr-3 font-semibold">{t('ad.type')}</th>
                      <th scope="col" className="py-2 pr-3 font-semibold">{t('ad.score')}</th>
                      <th scope="col" className="py-2 font-semibold">{t('ad.date')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {p.recentAssessments.map((a) => (
                      <tr key={a.id} className="border-b border-slate-100">
                        <td className="py-2 pr-3"><Link to={`/adult/lesson/${a.lessonId}`} className="text-indigo-700 hover:underline">{a.lessonTitle}</Link></td>
                        <td className="py-2 pr-3">{t(`ad.assess.${a.type}`)}</td>
                        <td className={`py-2 pr-3 font-semibold ${a.passed ? 'text-emerald-700' : 'text-amber-700'}`}>{a.percentage}%</td>
                        <td className="py-2 text-slate-500">{fmtDate(a.at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        <aside>
          <Card className="p-5 lg:sticky lg:top-4">
            <h2 className="font-bold text-slate-900 mb-1">🎓 {t('ad.certificateRequirements')}</h2>
            <p className="text-xs text-slate-500 mb-4">{t('ad.certificateRequirementsHelp')}</p>
            <ul className="space-y-4">
              {[
                ['allLessonsCompleted', t('ad.reqAllLessons'), `${req.allLessonsCompleted.current}/${req.allLessonsCompleted.required}`],
                ['passedAssessments', t('ad.reqAverage', { n: req.passedAssessments.required }), `${req.passedAssessments.current}%`],
                ['sufficientHours', t('ad.reqHours', { n: req.sufficientHours.required }), studyTime(null, req.sufficientHours.current)],
              ].map(([key, label, value]) => (
                <li key={key}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className={`font-semibold ${req[key].met ? 'text-emerald-700' : 'text-slate-700'}`}>{req[key].met ? '✅' : '⏳'} {label}</span>
                    <span className="text-slate-500">{value}</span>
                  </div>
                  <Bar value={req[key].current} max={req[key].required} color={req[key].met ? 'bg-emerald-500' : 'bg-indigo-600'} label={label} />
                </li>
              ))}
            </ul>
            <Link to="/adult/certificate" className={`mt-5 block text-center px-4 py-2 rounded-xl font-semibold ${p.eligible || p.certificateNumber ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
              {p.certificateNumber ? t('ad.viewCertificate') : p.eligible ? t('ad.getCertificateNow') : t('ad.aboutCertificate')}
            </Link>
          </Card>
        </aside>
      </div>
    </Page>
  );
};

export default AdultProgress;
