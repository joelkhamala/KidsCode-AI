import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { aiAPI } from '../../services/api';

/**
 * Floating "Coach Kodi" tutor chat. Pass `context` ({ task, code, language })
 * so the coach can give hints about what the learner is working on.
 * `client` picks the login (children's by default, adultAiAPI for adults); `adult` gives
 * grown-up styling and greeting.
 */
const CoachChat = ({ context, client = aiAPI, adult = false }) => {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [lastQuestion, setLastQuestion] = useState('');
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const dialogRef = useRef(null);
  const triggerRef = useRef(null);

  const closeChat = useCallback(() => {
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, sending]);

  // Escape closes the panel; Tab is kept inside it until it is closed.
  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeChat();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, closeChat]);

  const ask = async (text, appendUser) => {
    if (!text || sending) return;
    if (appendUser) setMessages((m) => [...m, { role: 'user', content: text }]);
    setLastQuestion(text);
    setSending(true);
    try {
      const res = await client.tutor(text, messages.slice(-6), context || {}, i18n.language === 'sw' ? 'sw' : 'en');
      setMessages((m) => [...m, { role: 'assistant', content: res.data.reply }]);
    } catch {
      // A delivery failure is an error state with retry, never a tutor answer.
      setMessages((m) => [...m, { role: 'error', content: t('coach.error') }]);
    } finally {
      setSending(false);
    }
  };

  const send = (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    ask(text, true);
  };

  const retry = () => {
    if (!lastQuestion || sending) return;
    setMessages((m) => (m.length && m[m.length - 1].role === 'error' ? m.slice(0, -1) : m));
    ask(lastQuestion, false);
  };

  if (!open) {
    return (
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        className={adult ? 'fixed bottom-4 right-4 sm:bottom-5 sm:right-5 z-40 flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xl rounded-full px-4 py-3 sm:px-5' : 'fixed bottom-4 right-4 sm:bottom-5 sm:right-5 z-40 btn-primary shadow-xl rounded-full px-4 py-3 sm:px-5'}
        aria-label={t('coach.chatOpen')}
        title={t('coach.chatTitle')}
      >
        <span aria-hidden="true">🤖</span>
        <span className="hidden sm:inline">{t('coach.chatTitle')}</span>
      </button>
    );
  }

  return (
    <div
      ref={dialogRef}
      className="fixed bottom-5 right-5 z-40 w-[min(380px,calc(100vw-2.5rem))] bg-white rounded-2xl shadow-2xl border-2 border-indigo-200 flex flex-col"
      style={{ maxHeight: '70vh' }}
      role="dialog"
      aria-modal="true"
      aria-label={t('coach.chatTitle')}
    >
      <div className="flex justify-between items-center px-4 py-3 bg-indigo-600 text-white rounded-t-2xl">
        <div className={adult ? 'font-semibold' : 'font-display'}>🤖 {t('coach.chatTitle')}</div>
        <button type="button" onClick={closeChat} aria-label={t('coach.chatClose')} className="text-xl leading-none">×</button>
      </div>
      <div ref={listRef} className="flex-1 overflow-y-auto p-3 space-y-2 text-sm" aria-live="polite">
        <div className="bg-indigo-50 rounded-xl p-3 text-slate-700">
          <div className="text-[11px] font-bold text-indigo-800 mb-1">{t('coach.coachName')}</div>
          {t(adult ? 'adc.chatHello' : 'coach.chatHello')}
        </div>
        {messages.map((m, i) => (
          m.role === 'error' ? (
            <div key={i} role="alert" className="bg-red-50 border-2 border-red-300 rounded-xl p-3 text-red-800">
              <div className="font-bold mb-1">{t('coach.coachName')}</div>
              <div>{m.content}</div>
              <button
                type="button"
                onClick={retry}
                className="mt-2 text-sm font-bold text-red-800 underline focus:outline-none"
              >
                🔄 {t('coach.retry')}
              </button>
            </div>
          ) : (
            <div
              key={i}
              aria-label={m.role === 'user' ? t('coach.you') : t('coach.coachName')}
              className={`rounded-xl p-3 whitespace-pre-wrap ${m.role === 'user' ? 'bg-slate-100 ml-8' : 'bg-indigo-50 mr-8 text-slate-700'}`}
            >
              <div className={`text-[11px] font-bold mb-1 ${m.role === 'user' ? 'text-slate-700' : 'text-indigo-800'}`}>
                {m.role === 'user' ? t('coach.you') : t('coach.coachName')}
              </div>
              {m.content}
            </div>
          )
        ))}
        {sending && <div className="text-slate-700 italic" role="status">{t('coach.thinking')}</div>}
      </div>
      <form onSubmit={send} className="p-3 border-t flex gap-2">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={500}
          className="chat-input flex-1 border-2 border-slate-200 rounded-xl px-3 py-2"
          placeholder={t('coach.chatPlaceholder')}
          aria-label={t('coach.chatPlaceholder')}
        />
        <button type="submit" className={adult ? 'px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold' : 'btn-primary py-2 px-4'} disabled={sending || !input.trim()}>{t('coach.chatSend')}</button>
      </form>
      <p className="px-3 pb-3 text-[11px] font-semibold text-slate-700">🛡️ {t(adult ? 'adc.chatSafety' : 'coach.chatSafety')}</p>
    </div>
  );
};

export default CoachChat;
