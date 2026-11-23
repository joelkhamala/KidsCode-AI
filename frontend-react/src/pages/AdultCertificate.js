import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { adultAPI } from '../services/api';
import { getAdultUser } from '../utils/authStorage';
import { Page, Card, Bar, Loading, ErrorBox, studyTime } from '../components/AdultUi';
import KenyanCertificate from '../components/KenyanCertificate';

/**
 * Certificate. While studying: a hero showing how close the learner is, one card per
 * requirement (what is left and where to work on it) and a sample of their certificate.
 * Once earned: the printable Kenyan-style certificate (A4 landscape) with a share panel
 * (verification link, copy, print/PDF) that employers can check without an account.
 */
/** Translated wording printed on the certificate. */
const certLabels = (t) => ({
  certificate: t('cert.certificate'), ofCompletion: t('cert.ofCompletion'), presentedTo: t('cert.presentedTo'),
  forCompleting: t('cert.forCompleting'), certificateNo: t('cert.certificateNo'), duration: t('cert.duration'),
  hoursUnit: t('cert.hoursUnit'), curriculum: t('cert.curriculum'), issueDate: t('cert.issueDate'), scanToVerify: t('cert.scanToVerify'),
  modulesLessons: t('cert.modulesLessons'), overallScore: t('cert.overallScore'), verified: t('cert.verified'),
  sealText: t('cert.sealText'), motto: t('cert.motto'), hongera: t('cert.hongera'), sample: t('cert.sample'), org: t('cert.org'),
});

const AdultCertificate = () => {
  const { t, i18n } = useTranslation();
  const [state, setState] = useState(null); // { certificate } | { eligibility }
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const c = await adultAPI.certificate();
      setState({ certificate: c.data.certificate });
    } catch (e) {
      if (e.response?.status !== 404) { setError(e.response?.data?.error || t('ad.loadFailed')); return; }
      try {
        const el = await adultAPI.eligibility();
        setState({ eligibility: el.data });
      } catch (e2) {
        setError(e2.response?.data?.error || t('ad.loadFailed'));
      }
    }
  }, [t]);
  useEffect(() => { load(); }, [load]);

  const issue = async () => {
    setBusy(true);
    try {
      const r = await adultAPI.issueCertificate();
      setState({ certificate: r.data.certificate });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      setError(e.response?.data?.error || t('ad.somethingWrong'));
    } finally {
      setBusy(false);
    }
  };

  if (error) return <Page><ErrorBox message={error} onRetry={load} /></Page>;
  if (!state) return <Page><Loading /></Page>;

  /* ===================== Earned ===================== */
  if (state.certificate) {
    const c = state.certificate;
    const verifyUrl = `${window.location.origin}/verify/${c.verificationCode}`;
    const date = new Date(`${c.issueDate}T00:00:00`).toLocaleDateString(i18n.language, { day: 'numeric', month: 'long', year: 'numeric' });
    const copy = async () => {
      try { await navigator.clipboard.writeText(verifyUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* clipboard blocked */ }
    };
    return (
      <Page wide>
        <section className="print:hidden relative overflow-hidden rounded-3xl p-6 md:p-8 mb-6 text-white shadow-lg"
          style={{ background: 'radial-gradient(circle at 85% 15%, rgba(251,191,36,0.4), transparent 45%), linear-gradient(135deg, #0f172a 0%, #312e81 60%, #065f46 100%)' }}>
          <div className="flex flex-wrap items-center gap-6">
            <span className="w-16 h-16 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center text-4xl" aria-hidden="true">🏆</span>
            <div className="flex-1 min-w-[14rem]">
              <h1 className="text-2xl md:text-4xl font-bold">{t('ad.yourCertificate')}</h1>
              <p className="text-indigo-100 mt-1">{t('ad.certificateEarned')}</p>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_340px] gap-6 items-start">
          <div id="certificate" className="min-w-0">
            <KenyanCertificate
              name={`${c.firstName} ${c.lastName}`} courseName={t('ad.courseName')} curriculumCode={c.curriculumCode}
              certificateNumber={c.certificateNumber} verificationCode={c.verificationCode} verifyUrl={verifyUrl}
              issueDate={date} hours={c.totalHours} score={c.overallScore} labels={certLabels(t)} />
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
              </dl>
            </Card>
          </aside>
        </div>
      </Page>
    );
  }

  /* ===================== Still studying ===================== */
  const { eligible, requirements: req } = state.eligibility;
  const me = getAdultUser() || {};
  const lessonsLeft = Math.max(0, req.allLessonsCompleted.required - req.allLessonsCompleted.current);
  const minutesLeft = Math.max(0, Math.round((req.sufficientHours.required - req.sufficientHours.current) * 60));
  const cards = [
    { key: 'allLessonsCompleted', icon: '📚', title: t('ad.reqAllLessons'), value: `${req.allLessonsCompleted.current}/${req.allLessonsCompleted.required}`,
      left: lessonsLeft ? t('ad.lessonsLeft', { n: lessonsLeft }) : null, to: '/adult/dashboard', action: t('ad.continueLearning') },
    { key: 'passedAssessments', icon: '📝', title: t('ad.reqAverage', { n: req.passedAssessments.required }), value: req.allLessonsCompleted.current ? `${req.passedAssessments.current}%` : '—',
      left: req.passedAssessments.met ? null : (req.allLessonsCompleted.current ? t('ad.scoreLeft', { n: req.passedAssessments.required }) : t('ad.scoreAfterFirst')), to: '/adult/progress', action: t('ad.seeScores') },
    { key: 'sufficientHours', icon: '⏱️', title: t('ad.reqHours', { n: req.sufficientHours.required }), value: studyTime(null, req.sufficientHours.current),
      left: minutesLeft ? t('ad.timeLeft', { time: studyTime(minutesLeft) }) : null, to: '/adult/playground', action: t('ad.practiseMore') },
  ];
  const metCount = cards.filter((c) => req[c.key].met).length;

  return (
    <Page wide>
      <section className="relative overflow-hidden rounded-3xl p-6 md:p-8 mb-6 text-white shadow-lg"
        style={{ background: 'radial-gradient(circle at 85% 15%, rgba(251,191,36,0.35), transparent 45%), linear-gradient(135deg, #0f172a 0%, #312e81 60%, #4c1d95 100%)' }}
        aria-labelledby="cert-title">
        <div className="flex flex-wrap items-center gap-6">
          <span className="w-16 h-16 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center text-4xl" aria-hidden="true">🎓</span>
          <div className="flex-1 min-w-[14rem]">
            <h1 id="cert-title" className="text-2xl md:text-4xl font-bold">{t('ad.certificate')}</h1>
            <p className="text-indigo-100 mt-1 max-w-2xl">{t('ad.certificateIntro')}</p>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold">{metCount}<span className="text-indigo-300 text-2xl">/3</span></div>
            <div className="text-xs text-indigo-200">{t('ad.requirementsMet')}</div>
          </div>
        </div>
        <div className="flex gap-2 mt-6" aria-hidden="true">
          {cards.map((c) => <span key={c.key} className={`h-2 flex-1 rounded-full ${req[c.key].met ? 'bg-emerald-400' : 'bg-white/20'}`} />)}
        </div>
      </section>

      <div className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_340px] gap-6 items-start">
        <div className="space-y-4 min-w-0">
          {cards.map((c, i) => {
            const met = req[c.key].met;
            return (
              <Card key={c.key} className={`p-5 ${met ? 'border-emerald-200 bg-emerald-50/40' : ''}`}>
                <div className="flex flex-wrap items-start gap-4">
                  <span className={`w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center text-2xl ${met ? 'bg-emerald-100' : 'bg-indigo-50'}`} aria-hidden="true">{met ? '✅' : c.icon}</span>
                  <div className="flex-1 min-w-[12rem]">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{t('ad.requirementN', { n: i + 1 })}</p>
                    <h2 className={`font-bold text-lg ${met ? 'text-emerald-800' : 'text-slate-900'}`}>{c.title}</h2>
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

          <Card className={`p-5 flex flex-wrap items-center gap-4 ${eligible ? 'border-emerald-300 bg-emerald-50' : ''}`}>
            <span className="text-3xl" aria-hidden="true">{eligible ? '🎉' : '🔒'}</span>
            <p className={`flex-1 min-w-[12rem] text-sm ${eligible ? 'text-emerald-900 font-semibold' : 'text-slate-600'}`}>{eligible ? t('ad.allRequirementsMet') : t('ad.notEligibleYet')}</p>
            {eligible && (
              <button type="button" disabled={busy} onClick={issue} className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold shadow-sm">
                {busy ? t('ad.issuing') : `🎓 ${t('ad.issueCertificate')}`}
              </button>
            )}
          </Card>

          {/* What the learner is working towards */}
          <section aria-labelledby="preview-title">
            <h2 id="preview-title" className="text-lg font-bold text-slate-900 mb-3">{t('ad.previewTitle')}</h2>
            <div aria-hidden="true">
              <KenyanCertificate sample
                name={`${me.firstName || ''} ${me.lastName || ''}`.trim()} courseName={t('ad.courseName')}
                certificateNumber="KCWEB-0000-00000-XXXX" issueDate={new Date().toLocaleDateString(i18n.language, { day: 'numeric', month: 'long', year: 'numeric' })}
                hours={req.sufficientHours.required} score="—" labels={certLabels(t)} />
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
            <h2 className="text-sm font-semibold text-slate-700 mb-1">🔒 {t('ad.employersTitle')}</h2>
            <p className="text-sm text-slate-500">{t('ad.employersText')}</p>
          </Card>
        </aside>
      </div>
    </Page>
  );
};

export default AdultCertificate;
