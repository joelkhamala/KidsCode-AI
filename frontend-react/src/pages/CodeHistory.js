import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { codeHistoryAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import { Trash2, Eye, Calendar, Code as CodeIcon } from 'feather-icons-react';

const CodeHistory = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { notify, confirm } = useToast();
  const [history, setHistory] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedCode, setSelectedCode] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const res = await codeHistoryAPI.getHistory(50, 0);
      setHistory(res.data.history || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error('Failed to load code history:', err);
    } finally {
      setLoading(false);
    }
  };

  const viewCode = async (id) => {
    try {
      const res = await codeHistoryAPI.getCode(id);
      setSelectedCode(res.data.code);
      setShowModal(true);
    } catch (err) {
      console.error('Failed to load code:', err);
    }
  };

  const deleteCode = async (id) => {
    const ok = await confirm({ title: t('historyUi.deleteTitle'), message: t('historyUi.deleteText'), confirmLabel: t('historyUi.deleteYes'), danger: true, icon: '🗑️' });
    if (!ok) return;
    
    try {
      await codeHistoryAPI.deleteCode(id);
      setHistory(history.filter(h => h.id !== id));
      setTotal(total - 1);
      notify(t('historyUi.deleted'), 'success');
    } catch (err) {
      console.error('Failed to delete code:', err);
      notify(t('socialUi.somethingWrong'), 'error');
    }
  };

  const loadCodeToPlayground = () => {
    if (!selectedCode) return;
    
    // Save to localStorage for playground to load
    localStorage.setItem('playground_code', selectedCode.code);
    if (selectedCode.blocks_xml) {
      localStorage.setItem('playground_blocks', selectedCode.blocks_xml);
    }
    
    setShowModal(false);
    navigate('/playground');
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getSourceIcon = (source) => {
    switch (source) {
      case 'playground': return '🎮';
      case 'lesson': return '📚';
      default: return '💻';
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <button onClick={() => navigate('/profile')} className="text-slate-600 font-bold hover:text-indigo-600 mb-2">
          ← {t('profileUi.title')}
        </button>
        <h1 className="page-title mb-2">{t('history.title')} 📜</h1>
        <p className="text-slate-600">{t('history.saved')}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="stat-card">
          <div className="stat-value text-indigo-600">{total}</div>
          <div className="text-slate-600 text-xs font-bold uppercase tracking-wide mt-1">{t('history.saved')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value text-green-600">{history.filter(h => h.source === 'playground').length}</div>
          <div className="text-slate-600 text-xs font-bold uppercase tracking-wide mt-1">{t('playground.title')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value text-purple-600">{history.filter(h => h.source === 'lesson').length}</div>
          <div className="text-slate-600 text-xs font-bold uppercase tracking-wide mt-1">{t('curriculum.title')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value text-orange-600">{history.filter(h => h.blocks_xml).length}</div>
          <div className="text-slate-600 text-xs font-bold uppercase tracking-wide mt-1">{t('playground.blocks')}</div>
        </div>
      </div>

      {/* History List */}
      <div className="card p-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4 animate-bounce">⏳</div>
            <p className="text-slate-600">{t('common.loading')}</p>
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📝</div>
            <h3 className="font-bold text-slate-800 mb-2">{t('history.noHistory')}</h3>
            <p className="text-slate-600 mb-6">{t('playground.title')}</p>
            <button onClick={() => navigate('/playground')} className="btn-primary">
              {t('playground.title')} 🚀
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((item) => (
              <div key={item.id} className="lesson-item group">
                <span className="text-2xl">{getSourceIcon(item.source)}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm text-slate-800 truncate">{item.title}</div>
                  <div className="flex items-center gap-3 text-xs text-slate-600">
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      {formatDate(item.created_at)}
                    </span>
                    <span className="flex items-center gap-1">
                      <CodeIcon size={12} />
                      {item.language}
                    </span>
                    {item.blocks_xml && (
                      <span className="text-purple-600 font-medium">🧩 {t('playground.blocks')}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => viewCode(item.id)}
                    className="p-2 hover:bg-indigo-100 rounded-lg transition-colors"
                    title={t('history.view')}
                  >
                    <Eye size={16} className="text-indigo-600" />
                  </button>
                  <button
                    onClick={() => deleteCode(item.id)}
                    className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                    title={t('history.delete')}
                  >
                    <Trash2 size={16} className="text-red-600" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* View Code Modal */}
      {showModal && selectedCode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="font-display text-2xl text-slate-800 mb-1">{selectedCode.title}</h2>
                  <div className="flex items-center gap-3 text-sm text-slate-600">
                    <span>{getSourceIcon(selectedCode.source)} {selectedCode.source}</span>
                    <span>•</span>
                    <span>{formatDate(selectedCode.created_at)}</span>
                    {selectedCode.blocks_xml && (
                      <>
                        <span>•</span>
                        <span className="text-purple-600 font-medium">🧩 {t('playground.blocks')}</span>
                      </>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-2xl"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="bg-slate-900 rounded-xl p-4 overflow-x-auto">
                <pre className="text-green-400 font-code text-sm">
                  <code>{selectedCode.code}</code>
                </pre>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-200 flex gap-3">
              <button
                onClick={loadCodeToPlayground}
                className="btn-primary flex-1 justify-center"
              >
                {t('playground.loadTemplate')} 🚀
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="btn-secondary"
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CodeHistory;
