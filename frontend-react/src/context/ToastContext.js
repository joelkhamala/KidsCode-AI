import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

// Friendly, in-page replacements for window.alert / window.confirm.
//   const { notify, confirm } = useToast();
//   notify('Saved!', 'success');
//   if (await confirm({ title, message, confirmLabel, danger: true })) { ... }

const ToastContext = createContext(null);

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};

const ICONS = { success: '🎉', error: '😕', info: '💡', warning: '🔒' };

export const ToastProvider = ({ children }) => {
  const { t } = useTranslation();
  const [toasts, setToasts] = useState([]);
  const [dialog, setDialog] = useState(null);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => setToasts(list => list.filter(x => x.id !== id)), []);

  const notify = useCallback((message, type = 'info', ms = 3500) => {
    const id = ++idRef.current;
    setToasts(list => [...list.slice(-2), { id, message, type }]);
    setTimeout(() => dismiss(id), ms);
  }, [dismiss]);

  const confirm = useCallback((opts) => new Promise(resolve => {
    setDialog({ ...opts, resolve });
  }), []);

  const closeDialog = (answer) => {
    dialog?.resolve(answer);
    setDialog(null);
  };

  return (
    <ToastContext.Provider value={{ notify, confirm }}>
      {children}

      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map(x => (
          <div key={x.id} className={`toast toast-${x.type}`}>
            <span className="text-2xl" aria-hidden="true">{ICONS[x.type] || ICONS.info}</span>
            <span className="flex-1">{x.message}</span>
            <button type="button" onClick={() => dismiss(x.id)} className="toast-close" aria-label={t('ui.close')}>✕</button>
          </div>
        ))}
      </div>

      {dialog && (
        <div className="modal-backdrop" onClick={() => closeDialog(false)}>
          <div
            className="modal-card animate-pop"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            onClick={e => e.stopPropagation()}
          >
            <div className="text-5xl mb-3" aria-hidden="true">{dialog.icon || (dialog.danger ? '⚠️' : '🤔')}</div>
            <h2 id="confirm-title" className="font-display text-2xl text-slate-800 mb-2">{dialog.title}</h2>
            {dialog.message && <p className="text-slate-600 mb-6">{dialog.message}</p>}
            <div className="flex flex-col-reverse sm:flex-row gap-3 justify-center">
              <button type="button" className="btn-secondary justify-center" onClick={() => closeDialog(false)} autoFocus>
                {dialog.cancelLabel || t('ui.cancel')}
              </button>
              <button
                type="button"
                className={`${dialog.danger ? 'btn-danger' : 'btn-primary'} justify-center`}
                onClick={() => closeDialog(true)}
              >
                {dialog.confirmLabel || t('ui.ok')}
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
};
