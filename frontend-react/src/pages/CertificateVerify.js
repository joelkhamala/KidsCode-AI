import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { adultAPI } from '../services/api';
import LanguageSwitcher from '../components/LanguageSwitcher';

/** Public page (no sign-in): anyone, e.g. an employer, can check a KidsCode certificate. */
const CertificateVerify = () => {
  const { code } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [input, setInput] = useState(code || '');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!code) { setResult(null); return; }
    setBusy(true);
    adultAPI.verifyCertificate(code)
      .then((r) => setResult(r.data))
      .catch((e) => setResult(e.response?.status === 404 ? { valid: false } : { error: true }))
      .finally(() => setBusy(false));
  }, [code]);

  const submit = (e) => {
    e.preventDefault();
    if (input.trim()) navigate(`/verify/${encodeURIComponent(input.trim())}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <Link to="/" className="font-bold text-slate-900">KidsCode</Link>
          <LanguageSwitcher />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">🔎 {t('ad.verifyTitle')}</h1>
        <p className="text-slate-600 mb-6">{t('ad.verifyIntro')}</p>
        <form onSubmit={submit} className="flex gap-2 mb-6">
          <label htmlFor="cert-code" className="sr-only">{t('ad.verifyCode')}</label>
          <input id="cert-code" value={input} onChange={(e) => setInput(e.target.value)} placeholder={t('ad.verifyCode')}
            className="flex-1 px-4 py-3 rounded-xl border border-slate-300 font-mono focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none" />
          <button type="submit" className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">{t('ad.check')}</button>
        </form>
        {busy && <p className="text-slate-500" role="status">{t('ad.loading')}</p>}
        {!busy && result && result.valid && (
          <div className="bg-white rounded-2xl border-2 border-emerald-300 p-6" role="status">
            <p className="text-emerald-700 font-bold text-lg mb-4">✅ {t('ad.validCertificate')}</p>
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
              <dt className="text-slate-500">{t('ad.holder')}</dt><dd className="font-semibold text-slate-900">{result.name}</dd>
              <dt className="text-slate-500">{t('ad.courseLabel')}</dt><dd className="text-slate-900">{result.course} ({result.curriculumCode})</dd>
              <dt className="text-slate-500">{t('ad.certificateNo')}</dt><dd className="font-mono text-slate-900">{result.certificateNumber}</dd>
              <dt className="text-slate-500">{t('ad.issued')}</dt><dd className="text-slate-900">{new Date(`${result.issueDate}T00:00:00`).toLocaleDateString(i18n.language, { day: 'numeric', month: 'long', year: 'numeric' })}</dd>
              <dt className="text-slate-500">{t('ad.studyTime')}</dt><dd className="text-slate-900">{result.totalHours} h</dd>
              <dt className="text-slate-500">{t('ad.overallScore')}</dt><dd className="text-slate-900">{result.overallScore}%</dd>
            </dl>
          </div>
        )}
        {!busy && result && result.valid === false && (
          <div className="bg-white rounded-2xl border-2 border-red-200 p-6 text-red-700 font-semibold" role="alert">❌ {t('ad.invalidCertificate')}</div>
        )}
        {!busy && result && result.error && <div className="bg-white rounded-2xl border-2 border-amber-200 p-6 text-amber-800" role="alert">{t('ad.loadFailed')}</div>}
      </div>
    </div>
  );
};

export default CertificateVerify;
