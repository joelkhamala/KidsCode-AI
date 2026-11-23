import React, { useState, useEffect } from 'react';
import { approvalAPI } from '../services/api';
import { useTranslation } from 'react-i18next';
import { useToast } from '../context/ToastContext';
import { CheckCircle, XCircle, Clock } from 'feather-icons-react';

const ApprovalQueue = ({ onChange }) => {
  const { t } = useTranslation();
  const { notify } = useToast();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState(null);
  const [responseNote, setResponseNote] = useState('');
  const [showNoteFor, setShowNoteFor] = useState(null);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      const res = await approvalAPI.getParentRequests();
      setRequests(res.data.requests);
    } catch (err) {
      console.error('Failed to load approval requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async (requestId, status) => {
    setResponding(requestId);
    try {
      await approvalAPI.respondToRequest(requestId, status, responseNote);
      await loadRequests();
      setResponseNote('');
      setShowNoteFor(null);
      notify(status === 'approved' ? t('adultUi.approved') : t('adultUi.denied'), 'success');
      onChange?.();
    } catch (err) {
      console.error('Failed to respond:', err);
      notify(t('adultUi.actionFailed'), 'error');
    } finally {
      setResponding(null);
    }
  };

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const respondedRequests = requests.filter(r => r.status !== 'pending');

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-4">⏳</div>
        <p className="text-slate-600">Loading approval requests...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending Requests */}
      <div>
        <h2 className="font-display text-2xl text-slate-800 mb-4">
          📬 Pending Requests ({pendingRequests.length})
        </h2>
        
        {pendingRequests.length === 0 ? (
          <div className="card p-8 text-center">
            <div className="text-6xl mb-4">✅</div>
            <p className="text-slate-600">No pending approval requests</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingRequests.map(request => (
              <div key={request.id} className="card p-6 border-2 border-yellow-200 bg-yellow-50">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock size={20} className="text-yellow-600" />
                      <h3 className="font-bold text-lg text-slate-800">
                        {request.childName}
                      </h3>
                    </div>
                    <p className="text-slate-700 mb-1">
                      <span className="font-semibold">Module:</span> {request.moduleTitle}
                    </p>
                    <p className="text-slate-700 mb-2">
                      <span className="font-semibold">Lesson:</span> {request.lessonTitle}
                    </p>
                    <p className="text-xs text-slate-500">
                      Requested: {new Date(request.requestedAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                {showNoteFor === request.id && (
                  <div className="mb-4">
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Add a note (optional):
                    </label>
                    <textarea
                      value={responseNote}
                      onChange={(e) => setResponseNote(e.target.value)}
                      className="w-full p-3 border-2 border-slate-300 rounded-lg focus:border-indigo-500 outline-none"
                      rows="2"
                      placeholder="Add a message for your child..."
                    />
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => handleRespond(request.id, 'approved')}
                    disabled={responding === request.id}
                    className="flex-1 btn-primary justify-center py-3"
                  >
                    <CheckCircle size={18} />
                    {responding === request.id ? 'Approving...' : 'Approve'}
                  </button>
                  <button
                    onClick={() => {
                      if (showNoteFor === request.id) {
                        handleRespond(request.id, 'denied');
                      } else {
                        setShowNoteFor(request.id);
                      }
                    }}
                    disabled={responding === request.id}
                    className="flex-1 btn-secondary justify-center py-3 bg-red-100 hover:bg-red-200 text-red-700"
                  >
                    <XCircle size={18} />
                    {showNoteFor === request.id ? 'Confirm Deny' : 'Deny'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Responded Requests */}
      {respondedRequests.length > 0 && (
        <div>
          <h2 className="font-display text-2xl text-slate-800 mb-4">
            📋 Recent Responses
          </h2>
          <div className="space-y-3">
            {respondedRequests.slice(0, 5).map(request => (
              <div key={request.id} className={`card p-4 ${
                request.status === 'approved' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {request.status === 'approved' ? (
                        <CheckCircle size={18} className="text-green-600" />
                      ) : (
                        <XCircle size={18} className="text-red-600" />
                      )}
                      <span className="font-bold text-slate-800">{request.childName}</span>
                      <span className="text-slate-600">•</span>
                      <span className="text-sm text-slate-600">{request.lessonTitle}</span>
                    </div>
                    {request.responseNote && (
                      <p className="text-xs text-slate-600 ml-6">Note: {request.responseNote}</p>
                    )}
                  </div>
                  <div className="text-xs text-slate-500">
                    {new Date(request.respondedAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovalQueue;
