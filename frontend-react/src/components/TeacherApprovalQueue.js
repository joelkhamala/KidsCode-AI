import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle, Clock, XCircle } from 'feather-icons-react';
import { teacherAPI } from '../services/api';
import { useToast } from '../context/ToastContext';

/** Lesson requests routed to this teacher. Only their own students appear. */
const TeacherApprovalQueue = ({ onChange }) => {
  const { t } = useTranslation();
  const { notify } = useToast();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [responding, setResponding] = useState(null);
  const [responseNote, setResponseNote] = useState('');
  const [showNoteFor, setShowNoteFor] = useState(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await teacherAPI.getApprovalRequests('all');
      setRequests(res.data.requests || []);
    } catch (err) {
      setError(err.response?.data?.error || t('adultUi.actionFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { load(); }, [load]);

  const respond = async (requestId, status) => {
    setResponding(requestId);
    try {
      await teacherAPI.respondToApproval(requestId, status, responseNote);
      await load();
      setResponseNote('');
      setShowNoteFor(null);
      notify(status === 'approved' ? t('adultUi.approved') : t('adultUi.denied'), 'success');
      onChange?.();
    } catch (err) {
      notify(err.response?.data?.error || t('adultUi.actionFailed'), 'error');
    } finally {
      setResponding(null);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-4" aria-hidden="true">⏳</div>
        <p className="text-slate-600">{t('parent.approval.loading')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-6 text-center" role="alert">
        <p className="text-red-600 font-semibold">{error}</p>
        <button type="button" className="btn-secondary text-sm mt-4" onClick={load}>
          {t('adultUi.retry')}
        </button>
      </div>
    );
  }

  const pending = requests.filter((r) => r.status === 'pending');
  const recent = requests.filter((r) => r.status !== 'pending');

  return (
    <div className="space-y-6">
      <section aria-labelledby="teacher-pending-title">
        <h2 id="teacher-pending-title" className="font-display text-2xl text-slate-800 mb-4">
          📬 {t('parent.approval.pending', { n: pending.length })}
        </h2>
        {pending.length === 0 ? (
          <div className="card p-8 text-center">
            <div className="text-6xl mb-4" aria-hidden="true">✅</div>
            <p className="text-slate-600">{t('parent.approval.empty')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pending.map((request) => (
              <div key={request.id} className="card p-6 border-2 border-yellow-200 bg-yellow-50">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock size={20} className="text-yellow-600 flex-shrink-0" />
                      <h3 className="font-bold text-lg text-slate-800 truncate">{request.childName}</h3>
                    </div>
                    {request.className && (
                      <p className="text-xs font-bold text-indigo-600 mb-2">{request.className}</p>
                    )}
                    <p className="text-slate-700 mb-1">
                      <span className="font-semibold">{t('parent.approval.module')}</span> {request.moduleTitle}
                    </p>
                    <p className="text-slate-700 mb-2">
                      <span className="font-semibold">{t('parent.approval.lesson')}</span> {request.lessonTitle}
                    </p>
                    <p className="text-xs text-slate-500">
                      {t('parent.approval.requested')} {new Date(request.requestedAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                {showNoteFor === request.id && (
                  <div className="mb-4">
                    <label className="form-label" htmlFor={`note-${request.id}`}>
                      {t('parent.approval.noteLabel')}
                    </label>
                    <textarea
                      id={`note-${request.id}`}
                      value={responseNote}
                      onChange={(e) => setResponseNote(e.target.value)}
                      className="w-full p-3 border-2 border-slate-300 rounded-lg focus:border-indigo-500 outline-none"
                      rows="2"
                      placeholder={t('parent.approval.notePlaceholder')}
                    />
                  </div>
                )}

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => respond(request.id, 'approved')}
                    disabled={responding === request.id}
                    className="flex-1 btn-primary justify-center py-3"
                  >
                    <CheckCircle size={18} />
                    {responding === request.id ? t('parent.approval.approving') : t('parent.approval.approve')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (showNoteFor === request.id) respond(request.id, 'denied');
                      else setShowNoteFor(request.id);
                    }}
                    disabled={responding === request.id}
                    className="flex-1 btn-secondary justify-center py-3 bg-red-100 hover:bg-red-200 text-red-700"
                  >
                    <XCircle size={18} />
                    {showNoteFor === request.id ? t('parent.approval.confirmDeny') : t('parent.approval.deny')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {recent.length > 0 && (
        <section aria-labelledby="teacher-recent-title">
          <h2 id="teacher-recent-title" className="font-display text-2xl text-slate-800 mb-4">
            📋 {t('parent.approval.recent')}
          </h2>
          <div className="space-y-3">
            {recent.slice(0, 5).map((request) => (
              <div key={request.id} className={`card p-4 ${
                request.status === 'approved' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {request.status === 'approved'
                        ? <CheckCircle size={18} className="text-green-600 flex-shrink-0" />
                        : <XCircle size={18} className="text-red-600 flex-shrink-0" />}
                      <span className="font-bold text-slate-800 truncate">{request.childName}</span>
                      <span className="text-slate-600">•</span>
                      <span className="text-sm text-slate-600 truncate">{request.lessonTitle}</span>
                    </div>
                    {request.responseNote && (
                      <p className="text-xs text-slate-600 ml-6">{t('parent.approval.note')} {request.responseNote}</p>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 flex-shrink-0">
                    {request.respondedAt ? new Date(request.respondedAt).toLocaleDateString() : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default TeacherApprovalQueue;
