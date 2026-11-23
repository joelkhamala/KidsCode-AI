import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { adultAPI } from '../services/api';
import { getAdultUser } from '../utils/authStorage';
import { Page, PageHeader, Card, Bar, Loading, ErrorBox, Button, studyTime } from '../components/AdultUi';

/**
 * Certificate: requirements while studying; once earned, a printable certificate with a
 * verification link that employers can open without an account.
 */
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
    } catch (e) {
      setError(e.response?.data?.error || t('ad.somethingWrong'));
    } finally {
      setBusy(false);
    }
  };

  if (error) return <Page><ErrorBox message={error} onRetry={load} /></Page>;
  if (!state) return <Page><Loading /></Page>;

  if (state.certificate) {
    const c = state.certificate;
    const verifyUrl = `${window.location.origin}/verify/${c.verificationCode}`;
    const date = new Date(`${c.issueDate}T00:00:00`).toLocaleDateString(i18n.language, { day: 'numeric', month: 'long', year: 'numeric' });
    const copy = async () => { try { await navigator.clipboard.writeText(verifyUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* ignore */ } };
    return (
      <Page>
        <div className="print:hidden">
          <PageHeader title={`🎓 ${t('ad.yourCertificate')}`} subtitle={t('ad.certificateEarned')}
            actions={<><Button onClick={() => window.print()}>🖨️ {t('ad.printOrPdf')}</Button><Button variant="secondary" onClick={copy}>🔗 {copied ? t('ad.copied') : t('ad.copyVerifyLink')}</Button></>} />
        </div>
        <div id="certificate" className="bg-white mx-auto max-w-4xl border-[10px] border-double border-indigo-800 rounded-lg p-8 md:p-14 text-center shadow-xl print:shadow-none print:border-indigo-800">
          <p className="tracking-[0.3em] text-xs font-semibold text-indigo-700 uppercase">KidsCode · {t('ad.professionalDevelopment')}</p>
          <h2 className="text-3xl md:text-5xl font-serif font-bold text-slate-900 mt-4">{t('ad.certOfCompletion')}</h2>
          <p className="text-slate-600 mt-6">{t('ad.certifiesThat')}</p>
          <p className="text-3xl md:text-4xl font-serif text-indigo-900 mt-2 border-b-2 border-indigo-200 inline-block px-6 pb-2">{c.firstName} {c.lastName}</p>
          <p className="text-slate-600 mt-6">{t('ad.hasCompleted')}</p>
          <p className="text-xl md:text-2xl font-bold text-slate-900 mt-1">{t('ad.courseName')}</p>
          <p className="text-slate-500 text-sm mt-1">{t('ad.curriculumCode')}: {c.curriculumCode}</p>
          <div className="grid grid-cols-3 gap-4 mt-10 text-sm">
            <div><div className="font-bold text-slate-900">{c.totalHours} h</div><div className="text-slate-500">{t('ad.studyTime')}</div></div>
            <div><div className="font-bold text-slate-900">{c.overallScore}%</div><div className="text-slate-500">{t('ad.overallScore')}</div></div>
            <div><div className="font-bold text-slate-900">{date}</div><div className="text-slate-500">{t('ad.issued')}</div></div>
          </div>
          <div className="mt-10 pt-4 border-t border-slate-200 text-xs text-slate-500">
            <div>{t('ad.certificateNo')}: <span className="font-mono font-semibold text-slate-700">{c.certificateNumber}</span></div>
            <div className="mt-1">{t('ad.verifyAt')}: <span className="font-mono break-all">{verifyUrl}</span></div>
          </div>
        </div>
      </Page>
    );
  }

  const { eligible, requirements: req } = state.eligibility;
  const rows = [
    ['allLessonsCompleted', '📚', t('ad.reqAllLessons'), `${req.allLessonsCompleted.current}/${req.allLessonsCompleted.required}`, '/adult/dashboard'],
    ['passedAssessments', '📝', t('ad.reqAverage', { n: req.passedAssessments.required }), `${req.passedAssessments.current}%`, '/adult/progress'],
    ['sufficientHours', '⏱️', t('ad.reqHours', { n: req.sufficientHours.required }), studyTime(null, req.sufficientHours.current), '/adult/dashboard'],
  ];
  const me = getAdultUser() || {};
  return (
    <Page>
      <PageHeader title={`🎓 ${t('ad.certificate')}`} subtitle={t('ad.certificateIntro')} />
      <div className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_360px] gap-6 items-start">
      <Card className="p-6">
        <ul className="space-y-5">
          {rows.map(([key, icon, label, value, to]) => (
            <li key={key}>
              <div className="flex flex-wrap justify-between gap-2 mb-1">
                <span className={`font-semibold ${req[key].met ? 'text-emerald-700' : 'text-slate-800'}`}>{req[key].met ? '✅' : icon} {label}</span>
                <span className="text-slate-500 text-sm">{value}{!req[key].met && <Link to={to} className="ml-3 text-indigo-600 font-semibold">{t('ad.workOnIt')} →</Link>}</span>
              </div>
              <Bar value={req[key].current} max={req[key].required} color={req[key].met ? 'bg-emerald-500' : 'bg-indigo-600'} label={label} />
            </li>
          ))}
        </ul>
        <div className="mt-6 pt-5 border-t border-slate-200 flex flex-wrap items-center gap-3">
          {eligible
            ? <><p className="flex-1 text-emerald-800 font-semibold">🎉 {t('ad.allRequirementsMet')}</p><Button variant="success" disabled={busy} onClick={issue}>{busy ? t('ad.issuing') : t('ad.issueCertificate')}</Button></>
            : <p className="text-slate-600 text-sm">{t('ad.notEligibleYet')}</p>}
        </div>
      </Card>

      {/* What the learner is working towards */}
      <aside className="space-y-4">
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">{t('ad.previewTitle')}</h2>
          <div className="relative border-4 border-double border-indigo-300 rounded-md p-5 text-center bg-white" aria-hidden="true">
            <span className="absolute top-2 right-2 text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">{t('ad.previewBadge')}</span>
            <p className="tracking-[0.25em] text-[9px] font-semibold text-indigo-600 uppercase">KidsCode</p>
            <p className="font-serif font-bold text-slate-800 text-lg mt-1">{t('ad.certOfCompletion')}</p>
            <p className="text-[11px] text-slate-500 mt-2">{t('ad.certifiesThat')}</p>
            <p className="font-serif text-indigo-900 text-base border-b border-indigo-200 inline-block px-3">{me.firstName} {me.lastName}</p>
            <p className="text-[11px] text-slate-500 mt-2">{t('ad.hasCompleted')}</p>
            <p className="text-xs font-bold text-slate-800">{t('ad.courseName')}</p>
            <p className="text-[10px] text-slate-400 mt-1">ICT/CU/CP/CR/08/6/A</p>
          </div>
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
