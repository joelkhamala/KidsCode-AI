import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { adultAPI } from '../services/api';
import { Page, Card, Bar, Loading, ErrorBox, studyTime, Ring, stageOf, PASS_MARK } from '../components/AdultUi';

/**
 * Progress report: a hero with the overall picture, study time for the last 8 weeks (with
 * the pace towards 170 hours), each module, results per kind of assessment, recent
 * results, and the certificate requirements.
 */
const WEEKS = 8;
const TYPE_META = {
  practical: { icon: '💻', tint: 'bg-indigo-100 text-indigo-700' },
  written: { icon: '📝', tint: 'bg-violet-100 text-violet-700' },
  oral: { icon: '🎤', tint: 'bg-amber-100 text-amber-700' },
};

/** Compact time for chart labels: "45 min", "2.2 h". */
const shortTime = (m) => (m < 60 ? `${m} min` : `${Math.round(m / 6) / 10} h`);

/** Monday (local) of the week a date falls in, as yyyy-mm-dd. */
const mondayOf = (d) => {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};

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

  const toDate = (s) => new Date(String(s).replace(' ', 'T') + (/[zZ]|[+-]\d\d:?\d\d$/.test(String(s)) || String(s).length <= 10 ? '' : 'Z'));
  const fmtDate = (s, opts = { day: 'numeric', month: 'short' }) => (s ? toDate(s).toLocaleDateString(i18n.language, opts) : '');

  // Last 8 weeks, oldest first, including weeks with no study.
  const byWeek = {};
  p.weeklyHours.forEach((w) => { const k = mondayOf(toDate(w.start)); byWeek[k] = (byWeek[k] || 0) + (w.minutes || 0); });
  const weeks = [];
  for (let i = WEEKS - 1; i >= 0; i -= 1) {
    const d = new Date(); d.setDate(d.getDate() - 7 * i);
    const k = mondayOf(d);
    weeks.push({ key: k, minutes: byWeek[k] || 0, current: i === 0 });
  }
  const maxMin = Math.max(60, ...weeks.map((w) => w.minutes));
  const thisWeek = weeks[weeks.length - 1].minutes;
  const activeWeeks = weeks.filter((w) => w.minutes > 0);
  const avgWeek = activeWeeks.length ? Math.round(weeks.reduce((s, w) => s + w.minutes, 0) / WEEKS) : 0;
  const minutesLeft = Math.max(0, p.requiredHours * 60 - (p.minutesLogged || Math.round(p.hoursLogged * 60)));
  const weeksToGo = avgWeek > 0 && minutesLeft > 0 ? Math.ceil(minutesLeft / avgWeek) : null;

  // One certificate per course.
  const certs = p.courses || [];
  const earnedCount = certs.filter((c) => c.certificate).length;
  const summary = Object.fromEntries((p.assessmentSummary || []).map((s) => [s.type, s]));

  return (
    <Page wide>
      {/* ===== Hero ===== */}
      <section className="relative overflow-hidden rounded-3xl p-6 md:p-8 mb-6 text-white shadow-lg"
        style={{ background: 'radial-gradient(circle at 85% 15%, rgba(52,211,153,0.35), transparent 45%), linear-gradient(135deg, #0f172a 0%, #1e3a8a 55%, #312e81 100%)' }}
        aria-labelledby="progress-title">
        <div className="relative grid lg:grid-cols-[1fr_auto] gap-8 items-center">
          <div className="min-w-0">
            <p className="text-indigo-200 text-sm font-semibold">{t('ad.courseName')}</p>
            <h1 id="progress-title" className="text-2xl md:text-4xl font-bold mt-1">📈 {t('ad.myProgress')}</h1>
            <p className="text-indigo-100 mt-2 max-w-2xl">{t('ad.progressSubtitle')}</p>
            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
              {[
                ['📚', t('ad.lessons'), `${p.completedLessons}/${p.totalLessons}`],
                ['🧩', t('ad.modules'), `${p.completedModules}/${p.totalModules}`],
                ['⏱️', t('ad.studyTime'), studyTime(p.minutesLogged, p.hoursLogged)],
                ['🎯', t('ad.averageScore'), p.completedLessons ? `${p.averageScore}%` : '—'],
              ].map(([icon, label, value]) => (
                <div key={label} className="rounded-2xl bg-white/10 border border-white/15 px-4 py-3">
                  <dt className="text-xs text-indigo-200">{label}</dt>
                  <dd className="text-xl font-bold mt-0.5"><span aria-hidden="true">{icon} </span>{value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="flex lg:flex-col items-center gap-3 justify-center">
            <Ring pct={p.progressPercentage} label={t('ad.courseProgress')} />
          </div>
        </div>
      </section>

      <div className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_340px] gap-6 items-start">
        <div className="space-y-6 min-w-0">
          {/* ===== Study time ===== */}
          <Card className="p-5 md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-1">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{t('ad.weeklyStudy')}</h2>
                <p className="text-xs text-slate-500">{t('ad.weeklyStudyHelp')}</p>
              </div>
              <div className="flex gap-2">
                <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-semibold">{t('ad.thisWeek')}: {studyTime(thisWeek)}</span>
                <span className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold">{t('ad.weeklyAverage')}: {studyTime(avgWeek)}</span>
              </div>
            </div>
            {/* Each column: value on top, a fixed-height track for the bar, the week below - so labels always line up. */}
            <div className="flex gap-2 md:gap-3 mt-5" role="img" aria-label={t('ad.weeklyStudy')}>
              {weeks.map((w) => (
                <div key={w.key} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                  <span className={`h-4 text-[10px] md:text-[11px] font-semibold whitespace-nowrap ${w.minutes ? 'text-slate-600' : 'text-slate-300'}`}>{w.minutes ? shortTime(w.minutes) : '0'}</span>
                  <div className="relative w-full max-w-[44px] h-32 flex items-end">
                    <div className={`w-full rounded-t-lg transition-all duration-700 ${!w.minutes ? 'bg-slate-100' : w.current ? 'bg-gradient-to-t from-emerald-600 to-emerald-400' : 'bg-emerald-300'}`}
                      style={{ height: `${Math.max(w.minutes ? 6 : 3, (100 * w.minutes) / maxMin)}%` }} />
                  </div>
                  <span className={`text-[10px] truncate w-full text-center ${w.current ? 'font-bold text-emerald-700' : 'text-slate-400'}`}>{w.current ? t('ad.thisWeekShort') : fmtDate(w.key)}</span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm text-slate-600 rounded-xl bg-slate-50 px-4 py-3">
              {minutesLeft === 0 ? `✅ ${t('ad.hoursReached', { n: p.requiredHours })}`
                : weeksToGo ? `🧭 ${t('ad.paceEstimate', { left: studyTime(minutesLeft), weeks: weeksToGo })}`
                  : `💡 ${t('ad.paceStart', { n: p.requiredHours })}`}
            </p>
          </Card>

          {/* ===== Modules ===== */}
          <Card className="p-5 md:p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">{t('ad.byModule')}</h2>
            <ul className="divide-y divide-slate-100">
              {p.modules.map((m, i) => {
                const complete = m.total && m.completed === m.total;
                const stage = stageOf(m.id);
                return (
                  <li key={m.id}>
                    <Link to={`/adult/module/${m.id}`} className="group flex items-center gap-3 md:gap-4 py-3 -mx-2 px-2 rounded-xl hover:bg-slate-50 transition">
                      <span className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-sm font-bold ${complete ? 'bg-emerald-500 text-white' : m.completed ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`} aria-hidden="true">
                        {complete ? '✓' : i + 1}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-slate-800 group-hover:text-indigo-700">{m.icon} {m.title}</span>
                          <span className={`hidden sm:inline px-2 py-0.5 rounded-full text-[10px] font-bold ${stage.chip}`}>{t(`ad.stage.${stage.id}`).split(' - ')[0]}</span>
                        </span>
                        <span className="flex items-center gap-3 mt-1.5">
                          <span className="flex-1 max-w-xs"><Bar value={m.completed} max={m.total} color={complete ? 'bg-emerald-500' : 'bg-indigo-600'} label={m.title} /></span>
                          <span className="text-xs text-slate-500 whitespace-nowrap">{m.completed}/{m.total}</span>
                        </span>
                      </span>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap ${!m.completed ? 'bg-slate-100 text-slate-400' : m.averageScore >= PASS_MARK ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                        {m.completed ? `${m.averageScore}%` : '—'}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Card>

          {/* ===== Results ===== */}
          <Card className="p-5 md:p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">{t('ad.resultsTitle')}</h2>
            <div className="grid sm:grid-cols-3 gap-3 mb-6">
              {['practical', 'written', 'oral'].map((type) => {
                const s = summary[type];
                return (
                  <div key={type} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${TYPE_META[type].tint}`} aria-hidden="true">{TYPE_META[type].icon}</span>
                      <span className="text-sm font-semibold text-slate-700">{t(`ad.assess.${type}`)}</span>
                    </div>
                    <div className="text-2xl font-bold text-slate-900">{s ? `${s.average}%` : '—'}</div>
                    <div className="text-xs text-slate-500">{s ? t('ad.attemptsBest', { n: s.attempts, best: s.best }) : t('ad.noAttempts')}</div>
                  </div>
                );
              })}
            </div>

            <h3 className="text-sm font-semibold text-slate-700 mb-2">{t('ad.recentAssessments')}</h3>
            {p.recentAssessments.length === 0 ? <p className="text-sm text-slate-500">{t('ad.noAssessments')}</p> : (
              <ul className="space-y-2">
                {p.recentAssessments.map((a) => (
                  <li key={a.id}>
                    <Link to={`/adult/lesson/${a.lessonId}`} className="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-2.5 hover:border-indigo-200 hover:bg-slate-50 transition">
                      <span className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center ${TYPE_META[a.type]?.tint || 'bg-slate-100'}`} aria-hidden="true">{TYPE_META[a.type]?.icon || '•'}</span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-semibold text-slate-800 truncate">{a.lessonTitle}</span>
                        <span className="block text-xs text-slate-500">{t(`ad.assess.${a.type}`)} · {fmtDate(a.at)}</span>
                      </span>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${a.passed ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{a.percentage}%</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* ===== Certificate requirements ===== */}
        <aside className="lg:sticky lg:top-4">
          <Card className="p-5">
            <div className="flex items-center justify-between gap-2 mb-1">
              <h2 className="font-bold text-slate-900">🎓 {t('ad.certsTitle')}</h2>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${earnedCount ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{earnedCount}/{certs.length}</span>
            </div>
            <p className="text-xs text-slate-500 mb-4">{t('ad.certsProgressHelp')}</p>
            <ul className="space-y-4">
              {certs.map((c) => {
                const r = c.requirements;
                return (
                  <li key={c.id}>
                    <Link to={`/adult/certificate?course=${c.id}`} className="block group">
                      <div className="flex justify-between gap-2 text-sm mb-1.5">
                        <span className={`font-medium group-hover:text-indigo-700 ${c.certificate ? 'text-emerald-700' : 'text-slate-700'}`}>{c.certificate ? '🏅' : c.eligible ? '🎉' : '📘'} {t(`ad.stage.${c.id}`)}</span>
                        <span className={`whitespace-nowrap text-xs font-semibold ${c.certificate ? 'text-emerald-700' : c.eligible ? 'text-amber-700' : 'text-slate-500'}`}>
                          {c.certificate ? `✓ ${t('ad.certStatus.earned')}` : c.eligible ? t('ad.certStatus.ready') : `${r.allLessonsCompleted.current}/${r.allLessonsCompleted.required} · ${studyTime(null, r.sufficientHours.current)}/${r.sufficientHours.required} h`}
                        </span>
                      </div>
                      <span className="flex gap-1" aria-hidden="true">
                        {Object.entries(r).map(([k, x]) => <span key={k} className={`h-1.5 flex-1 rounded-full ${x.met ? 'bg-emerald-500' : 'bg-slate-200'}`} />)}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <Link to="/adult/certificate" className="mt-5 block text-center px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold transition">
              {t('ad.aboutCertificate')} →
            </Link>
          </Card>
        </aside>
      </div>
    </Page>
  );
};

export default AdultProgress;
