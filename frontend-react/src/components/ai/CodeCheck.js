import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { aiAPI } from '../../services/api';

/** "Check my code" button + feedback panel for lesson pages. */
const CodeCheck = ({ code, language = 'javascript', task }) => {
  const { t, i18n } = useTranslation();
  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const check = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await aiAPI.reviewCode(code, language, task, i18n.language === 'sw' ? 'sw' : 'en');
      setReview(res.data);
    } catch (err) {
      setError(err.response?.data?.error || t('coach.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card p-6">
      <button type="button" className="btn-secondary w-full justify-center" onClick={check} disabled={loading || !code?.trim()}>
        {loading ? t('coach.checking') : t('coach.checkMyCode')}
      </button>
      {error && <p className="text-red-600 text-sm mt-2" role="alert">{error}</p>}
      {review && (
        <div className="mt-4 space-y-2 text-sm" aria-live="polite">
          <div className="font-bold text-slate-800">{t('coach.reviewTitle')}</div>
          {review.error && <p className="text-orange-700">⚠️ {review.error}</p>}
          {review.ai && (
            <div className="bg-indigo-50 rounded-lg p-3">
              <p>{review.ai.summary}</p>
              {review.ai.strengths?.length > 0 && <p className="text-green-700 mt-1">✅ {review.ai.strengths.join(' • ')}</p>}
              {review.ai.improvements?.length > 0 && <p className="text-orange-700 mt-1">🔧 {review.ai.improvements.join(' • ')}</p>}
              {review.ai.nextStep && <p className="mt-1">👉 {review.ai.nextStep}</p>}
            </div>
          )}
          {review.tips?.length > 0 && <ul className="list-disc pl-5">{review.tips.map((tip, i) => <li key={i}>{tip}</li>)}</ul>}
          {!review.ai && !review.tips?.length && !review.error && <p>✅ {t('coach.noProblems')}</p>}
        </div>
      )}
    </div>
  );
};

export default CodeCheck;
