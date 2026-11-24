import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { adultAPI } from '../services/api';
import { getAdultUser } from '../utils/authStorage';
import { Page, Card, Bar, Loading, ErrorBox, studyTime, COURSES } from '../components/AdultUi';
import KenyanCertificate, { COURSE_BADGES } from '../components/KenyanCertificate';

/**
 * Certificates - one per course.
 *   - A row of the six courses, each showing whether its certificate is earned, ready to
 *     claim, or how far the learner has got. Choosing one opens it below (?course=N).
 *   - Earned: the printable Kenyan-style certificate with a share panel (verification link,
 *     copy, print/PDF) that employers can check without an account.
 *   - Not yet: that course's three requirements with what is left, a claim button once all
 *     are met, and a sample of the certificate.
 */
/** Translated wording printed on the certificate. */
const certLabels = (t) => ({
  certificate: t('cert.certificate'), ofCompletion: t('cert.ofCompletion'), presentedTo: t('cert.presentedTo'),
  forCompleting: t('cert.forCompleting'), certificateNo: t('cert.certificateNo'), duration: t('cert.duration'),
  hoursUnit: t('cert.hoursUnit'), curriculum: t('cert.curriculum'), issueDate: t('cert.issueDate'), scanToVerify: t('cert.scanToVerify'),
  modulesLessons: t('cert.modulesLessons'), overallScore: t('cert.overallScore'), verified: t('cert.verified'),
  sealText: t('cert.sealText'), motto: t('cert.motto'), hongera: t('cert.hongera'), sample: t('cert.sample'), org: t('cert.org'),
});

const statusOf = (c) => (c.certificate ? 'earned' : c.eligible ? 'ready' : c.started ? 'progress' : 'new');
const STATUS_STYLE = {
  earned: 'bg-emerald-100 text-emerald-800',
  ready: 'bg-amber-100 text-amber-900',
  progress: 'bg-indigo-100 text-indigo-800',
  new: 'bg-slate-100 text-slate-600',
};

const AdultCertificate = () => {
  const { t, i18n } = useTranslation();
  const [params, setParams] = useSearchParams();
  const [courses, setCourses] = useState(null);
  const [error, setError] = useState('');
  const [issueError, setIssueError] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const me = getAdultUser() || {};

  const load = useCallback(async () => {
    setError('');
    try {
      const r = await adultAPI.certificates();
      setCourses(r.data.courses);
    } catch (e) {
      setError(e.response?.data?.error || t('ad.loadFailed'));
    }
  }, [t]);
  useEffect(() => { load(); }, [load]);

  // The course shown below the picker: ?course=N, else an earned one, a ready one, one in progress, or the first.
  const selected = useMemo(() => {
    if (!courses) return null;
    const asked = courses.find((c) => c.id === Number(params.get('course')));
    return asked || courses.find((c) => c.certificate) || courses.find((c) => c.eligible) || courses.find((c) => c.started) || courses[0];
  }, [courses, params]);

  const choose = (id) => {
    setParams({ course: String(id) }, { replace: true });
    setIssueError('');
    setCopied(false);
  };

  const issue = async () => {
    setBusy(true);
    setIssueError('');
    try {
      const r = await adultAPI.issueCertificate(selected.id);
      setCourses((list) => list.map((c) => (c.id === selected.id ? { ...c, certificate: r.data.certificate } : c)));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      setIssueError(e.response?.data?.error || t('ad.somethingWrong'));
    } finally {
      setBusy(false);
    }
  };

  if (error) return <Page><ErrorBox message={error} onRetry={load} /></Page>;
  if (!courses || !selected) return <Page><Loading /></Page>;

  const earned = courses.filter((c) => c.certificate).length;
  const ready = courses.filter((c) => c.eligible && !c.certificate).length;
  const meta = COURSES.find((c) => c.id === selected.id) || COURSES[0];
  const courseName = t(`ad.stage.${selected.id}`);
  const dateText = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString(i18n.language, { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <Page wide>
      {/* ===== Hero ===== */}
      <section className="print:hidden relative overflow-hidden rounded-3xl p-6 md:p-8 mb-6 text-white shadow-lg"
        style={{ background: 'radial-gradient(circle at 85% 15%, rgba(251,191,36,0.4), transparent 45%), linear-gradient(135deg, #0f172a 0%, #312e81 60%, #065f46 100%)' }}
        aria-labelledby="cert-title">
        <div className="flex flex-wrap items-center gap-6">
          <span className="w-16 h-16 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center text-4xl" aria-hidden="true">🎓</span>
          <div className="flex-1 min-w-[14rem]">
            <h1 id="cert-title" className="text-2xl md:text-4xl font-bold">{t('ad.certsTitle')}</h1>
            <p className="text-indigo-100 mt-1 max-w-2xl">{t('ad.certsIntro')}</p>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold">{earned}<span className="text-indigo-300 text-2xl">/{courses.length}</span></div>
            <div className="text-xs text-indigo-200">{t('ad.certsEarnedLabel')}</div>
            {ready > 0 && <div className="mt-1 text-xs font-bold text-amber-300">🎉 {t('ad.certsReady', { count: ready })}</div>}
          </div>
        </div>
        <div className="flex gap-2 mt-6" aria-hidden="true">
          {courses.map((c) => <span key={c.id} className={`h-2 flex-1 rounded-full ${c.certificate ? 'bg-emerald-400' : c.eligible ? 'bg-amber-300' : 'bg-white/20'}`} />)}
        </div>
      </section>

      {/* ===== Course picker ===== */}
      <section className="print:hidden mb-6" aria-labelledby="pick-title">
        <h2 id="pick-title" className="sr-only">{t('ad.chooseCourse')}</h2>
        <div className="grid grid-cols-[minmax(0,1fr)] sm:grid-cols-2 xl:grid-cols-3 gap-3" role="tablist" aria-label={t('ad.chooseCourse')}>
          {courses.map((c) => {
            const m = COURSES.find((x) => x.id === c.id) || COURSES[0];
            const st = statusOf(c);
            const active = c.id === selected.id;
            const met = Object.values(c.requirements).filter((r) => r.met).length;
            return (
              <button key={c.id} type="button" role="tab" aria-selected={active} onClick={() => choose(c.id)}
                className={`relative text-left rounded-2xl border bg-white p-4 transition overflow-hidden min-w-0 ${active ? 'border-indigo-400 ring-4 ring-indigo-100 shadow-md' : 'border-slate-200 hover:border-indigo-200 hover:shadow-sm'}`}>
                <span className="absolute inset-x-0 top-0 h-1" style={{ background: m.color }} aria-hidden="true" />
                <span className="flex items-start gap-3">
                  <span className="w-11 h-11 shrink-0 rounded-xl flex items-center justify-center text-2xl" style={{ background: `${m.color}1f` }} aria-hidden="true">
                    {c.certificate ? '🏅' : m.icon}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-bold text-slate-900 leading-snug">{t(`ad.stage.${c.id}`)}</span>
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${STATUS_STYLE[st]}`}>
                      {st === 'earned' ? `✓ ${t('ad.certStatus.earned')}` : st === 'ready' ? t('ad.certStatus.ready') : st === 'progress' ? t('ad.certStatus.progress', { n: c.progressPercentage }) : t('ad.certStatus.new')}
                    </span>
                  </span>
                </span>
                <span className="flex gap-1 mt-3" aria-label={t('ad.requirementsMetOf', { n: met, total: 3 })}>
                  {Object.entries(c.requirements).map(([k, r]) => (
                    <span key={k} className={`h-1.5 flex-1 rounded-full ${r.met ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                  ))}
                </span>
                <span className="block text-[11px] text-slate-500 mt-1.5">
                  {c.certificate ? `${c.certificate.certificateNumber}` : t('ad.requirementsMetOf', { n: met, total: 3 })}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {selected.certificate ? (
        /* ===================== Earned ===================== */
        (() => {
          const c = selected.certificate;
          const verifyUrl = `${window.location.origin}/verify/${c.verificationCode}`;
          const copy = async () => {
            try { await navigator.clipboard.writeText(verifyUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* clipboard blocked */ }
          };
          return (
            <div className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_340px] gap-6 items-start">
              <div className="min-w-0">
                <h2 className="print:hidden text-lg font-bold text-slate-900 mb-3">🏅 {t('ad.certFor', { course: courseName })}</h2>
                <div id="certificate">
                  <KenyanCertificate
                    name={`${c.firstName} ${c.lastName}`} courseName={courseName} curriculumCode={c.curriculumCode}
                    certificateNumber={c.certificateNumber} verificationCode={c.verificationCode} verifyUrl={verifyUrl}
                    issueDate={dateText(c.issueDate)} hours={c.totalHours} score={c.overallScore}
                    modules={selected.modules} lessons={selected.totalLessons} badges={COURSE_BADGES[selected.id]} labels={certLabels(t)} />
                </div>
              </div>

              <aside className="space-y-4 lg:sticky lg:top-4 print:hidden">
                <Card className="p-5">
                  <h2 className="font-bold text-slate-900 mb-3">{t('ad.shareTitle')}</h2>
                  <button type="button" onClick={() => window.print()} className="w-full mb-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm">
                    🖨️ {t('ad.printOrPdf')}
                  </button>
                  <label className="block text-xs font-semibold text-slate-500 mt-4 mb-1" htmlFor="verify-link">{t('ad.verifyLinkLabel')}</label>
                  <div className="flex gap-2">
                    <input id="verify-link" readOnly value={verifyUrl} onFocus={(e) => e.target.select()}
                      className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs font-mono text-slate-700" />
                    <button type="button" onClick={copy} className={`px-3 py-2 rounded-xl text-sm font-semibold whitespace-nowrap ${copied ? 'bg-emerald-600 text-white' : 'border border-slate-300 text-slate-700 hover:bg-slate-50'}`}>
                      {copied ? `✓ ${t('ad.copied')}` : `🔗 ${t('ad.copy')}`}
                    </button>
                  </div>
                  <a href={verifyUrl} target="_blank" rel="noopener noreferrer" className="block mt-3 text-sm font-semibold text-indigo-700 hover:underline">{t('ad.openVerifyPage')} ↗</a>
                </Card>
                <Card className="p-5">
                  <h2 className="text-sm font-semibold text-slate-700 mb-1">🔒 {t('ad.employersTitle')}</h2>
                  <p className="text-sm text-slate-500">{t('ad.employersText')}</p>
                  <dl className="mt-3 text-xs space-y-1">
                    <div className="flex justify-between gap-2"><dt className="text-slate-500">{t('ad.certificateNo')}</dt><dd className="font-mono font-semibold text-slate-700">{c.certificateNumber}</dd></div>
                    <div className="flex justify-between gap-2"><dt className="text-slate-500">{t('ad.verificationCodeShort')}</dt><dd className="font-mono font-semibold text-slate-700">{c.verificationCode}</dd></div>
                    <div className="flex justify-between gap-2"><dt className="text-slate-500">{t('ad.issued')}</dt><dd className="font-semibold text-slate-700">{dateText(c.issueDate)}</dd></div>
                  </dl>
                </Card>
              </aside>
            </div>
          );
        })()
      ) : (
        /* ===================== Not earned yet ===================== */
        (() => {
          const req = selected.requirements;
          const lessonsLeft = Math.max(0, req.allLessonsCompleted.required - req.allLessonsCompleted.current);
          const minutesLeft = Math.max(0, Math.round((req.sufficientHours.required - req.sufficientHours.current) * 60));
          const cards = [
            { key: 'allLessonsCompleted', icon: '📚', title: t('ad.reqCourseLessons', { n: req.allLessonsCompleted.required }), value: `${req.allLessonsCompleted.current}/${req.allLessonsCompleted.required}`,
              left: lessonsLeft ? t('ad.lessonsLeft', { n: lessonsLeft }) : null, to: `/adult/course/${selected.id}/view`, action: t('ad.openCourse') },
            { key: 'passedAssessments', icon: '📝', title: t('ad.reqAverage', { n: req.passedAssessments.required }), value: req.allLessonsCompleted.current ? `${req.passedAssessments.current}%` : '—',
              left: req.passedAssessments.met ? null : (req.allLessonsCompleted.current ? t('ad.scoreLeft', { n: req.passedAssessments.required }) : t('ad.scoreAfterFirst')), to: '/adult/progress', action: t('ad.seeScores') },
            { key: 'sufficientHours', icon: '⏱️', title: t('ad.reqCourseHours', { n: req.sufficientHours.required }), value: studyTime(null, req.sufficientHours.current),
              left: minutesLeft ? `${t('ad.timeLeft', { time: studyTime(minutesLeft) })} ${t('ad.hoursInCourse')}` : null, to: `/adult/course/${selected.id}/view`, action: t('ad.openCourse') },
          ];
          return (
            <div className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_340px] gap-6 items-start">
              <div className="space-y-4 min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="w-10 h-10 rounded-xl flex items-center justify-center text-2xl" style={{ background: `${meta.color}1f` }} aria-hidden="true">{meta.icon}</span>
                  <h2 className="text-lg font-bold text-slate-900">{t('ad.certFor', { course: courseName })}</h2>
                </div>
                {cards.map((c, i) => {
                  const met = req[c.key].met;
                  return (
                    <Card key={c.key} className={`p-5 ${met ? 'border-emerald-200 bg-emerald-50/40' : ''}`}>
                      <div className="flex flex-wrap items-start gap-4">
                        <span className={`w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center text-2xl ${met ? 'bg-emerald-100' : 'bg-indigo-50'}`} aria-hidden="true">{met ? '✅' : c.icon}</span>
                        <div className="flex-1 min-w-[12rem]">
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{t('ad.requirementN', { n: i + 1 })}</p>
                          <h3 className={`font-bold text-lg ${met ? 'text-emerald-800' : 'text-slate-900'}`}>{c.title}</h3>
                          <div className="flex items-center gap-3 mt-2">
                            <span className="flex-1"><Bar value={req[c.key].current} max={req[c.key].required} color={met ? 'bg-emerald-500' : 'bg-indigo-600'} label={c.title} /></span>
                            <span className="text-sm font-bold text-slate-700 whitespace-nowrap">{c.value}</span>
                          </div>
                          <p className={`text-sm mt-2 ${met ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>{met ? `✓ ${t('ad.requirementDone')}` : c.left}</p>
                        </div>
                        {!met && (
                          <Link to={c.to} className="self-center px-4 py-2 rounded-xl border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap">
                            {c.action} →
                          </Link>
                        )}
                      </div>
                    </Card>
                  );
                })}

                <Card className={`p-5 flex flex-wrap items-center gap-4 ${selected.eligible ? 'border-emerald-300 bg-emerald-50' : ''}`}>
                  <span className="text-3xl" aria-hidden="true">{selected.eligible ? '🎉' : '🔒'}</span>
                  <p className={`flex-1 min-w-[12rem] text-sm ${selected.eligible ? 'text-emerald-900 font-semibold' : 'text-slate-600'}`}>
                    {selected.eligible ? t('ad.courseRequirementsMet', { course: courseName }) : t('ad.courseNotEligibleYet', { course: courseName })}
                  </p>
                  {selected.eligible && (
                    <button type="button" disabled={busy} onClick={issue} className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold shadow-sm">
                      {busy ? t('ad.issuing') : `🎓 ${t('ad.claimCertificate')}`}
                    </button>
                  )}
                  {issueError && <p className="w-full text-sm text-red-700" role="alert">{issueError}</p>}
                </Card>

                {/* What the learner is working towards */}
                <section aria-labelledby="preview-title">
                  <h2 id="preview-title" className="text-lg font-bold text-slate-900 mb-3">{t('ad.previewTitle')}</h2>
                  <div aria-hidden="true">
                    <KenyanCertificate sample
                      name={`${me.firstName || ''} ${me.lastName || ''}`.trim()} courseName={courseName} curriculumCode={selected.units[0]}
                      certificateNumber={`${meta.certPrefix || 'KC'}-0000-00000-XXXX`} issueDate={new Date().toLocaleDateString(i18n.language, { day: 'numeric', month: 'long', year: 'numeric' })}
                      hours={selected.requiredHours} score="—" modules={selected.modules} lessons={selected.totalLessons}
                      badges={COURSE_BADGES[selected.id]} labels={certLabels(t)} />
                  </div>
                </section>
              </div>

              <aside className="space-y-4 lg:sticky lg:top-4">
                <Card className="p-5">
                  <h2 className="text-sm font-semibold text-slate-700 mb-1">✍️ {t('ad.yourNameTitle')}</h2>
                  <p className="font-serif text-xl text-indigo-900">{me.firstName} {me.lastName}</p>
                  <p className="text-xs text-slate-500 mt-2">{t('ad.nameOnCertificate')} <Link to="/adult/profile" className="text-indigo-600 font-semibold">{t('ad.editName')}</Link></p>
                </Card>
                <Card className="p-5">
                  <h2 className="text-sm font-semibold text-slate-700 mb-1">📋 {t('ad.aboutThisCourse')}</h2>
                  <dl className="text-sm space-y-1.5 mt-2">
                    <div className="flex justify-between gap-2"><dt className="text-slate-500">{t('ad.modules')}</dt><dd className="font-semibold text-slate-800">{selected.modules}</dd></div>
                    <div className="flex justify-between gap-2"><dt className="text-slate-500">{t('ad.lessons')}</dt><dd className="font-semibold text-slate-800">{selected.totalLessons}</dd></div>
                    <div className="flex justify-between gap-2"><dt className="text-slate-500">{t('ad.studyTime')}</dt><dd className="font-semibold text-slate-800">{t('ad.hoursN', { n: selected.hours })}</dd></div>
                    <div className="flex justify-between gap-2"><dt className="text-slate-500">{t('cert.curriculum')}</dt><dd className="font-mono text-xs font-semibold text-slate-800 text-right">{selected.units.join(', ')}</dd></div>
                  </dl>
                </Card>
                <Card className="p-5">
                  <h2 className="text-sm font-semibold text-slate-700 mb-1">🔒 {t('ad.employersTitle')}</h2>
                  <p className="text-sm text-slate-500">{t('ad.employersText')}</p>
                </Card>
              </aside>
            </div>
          );
        })()
      )}
    </Page>
  );
};

export default AdultCertificate;
