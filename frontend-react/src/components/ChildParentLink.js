import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { childAPI } from '../services/api';

const ChildParentLink = () => {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    childAPI.parentInviteCode()
      .then((res) => setData(res.data))
      .catch(() => setData({ inviteCode: null, linkedParents: [] }));
  }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(data.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* clipboard may be unavailable; the code stays visible */ }
  };

  return (
    <section className="card p-6 text-left">
      <h2 className="font-display text-xl text-slate-800 mb-1">🔗 {t('parent.child.parentLink')}</h2>
      <p className="text-xs text-slate-600 mb-3">{t('parent.child.inviteHelp')}</p>
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 flex items-center justify-between gap-2 mb-4">
        <code className="font-mono text-lg font-bold text-indigo-700 break-all">{data?.inviteCode || '—'}</code>
        {data?.inviteCode && (
          <button type="button" onClick={copy} className="btn-secondary text-xs whitespace-nowrap">
            {copied ? '✓' : '📋'}
          </button>
        )}
      </div>
      <h3 className="font-bold text-sm text-slate-700 mb-2">{t('parent.child.linkedParents')}</h3>
      {data?.linkedParents?.length ? (
        <ul className="space-y-1 text-sm text-slate-700">
          {data.linkedParents.map((p) => (
            <li key={p.id}>• {p.displayName} <span className="text-xs text-slate-500">({p.relationshipType})</span></li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-slate-500">{t('parent.child.noParents')}</p>
      )}
    </section>
  );
};

export default ChildParentLink;
