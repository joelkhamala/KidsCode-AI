import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { aiAPI } from '../../services/api';

/**
 * Floating "Coach Kodi" tutor chat. Pass `context` ({ task, code, language })
 * so the coach can give hints about what the learner is working on.
 */
const CoachChat = ({ context }) => {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, sending]);

  const send = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    const history = messages.slice(-6);
    setMessages((m) => [...m, { role: 'user', content: text }]);
    setInput('');
    setSending(true);
    try {
      const res = await aiAPI.tutor(text, history, context || {}, i18n.language === 'sw' ? 'sw' : 'en');
      setMessages((m) => [...m, { role: 'assistant', content: res.data.reply }]);
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: t('coach.error') }]);
    } finally {
      setSending(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 sm:bottom-5 sm:right-5 z-40 btn-primary shadow-xl rounded-full px-4 py-3 sm:px-5"
        aria-label={t('coach.chatOpen')}
        title={t('coach.chatTitle')}
      >
        <span aria-hidden="true">🤖</span>
        <span className="hidden sm:inline">{t('coach.chatTitle')}</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 z-40 w-[min(380px,calc(100vw-2.5rem))] bg-white rounded-2xl shadow-2xl border-2 border-indigo-200 flex flex-col" style={{ maxHeight: '70vh' }} role="dialog" aria-label={t('coach.chatTitle')}>
      <div className="flex justify-between items-center px-4 py-3 bg-indigo-600 text-white rounded-t-2xl">
        <div className="font-display">🤖 {t('coach.chatTitle')}</div>
        <button type="button" onClick={() => setOpen(false)} aria-label={t('coach.chatClose')} className="text-xl leading-none">×</button>
      </div>
      <div ref={listRef} className="flex-1 overflow-y-auto p-3 space-y-2 text-sm" aria-live="polite">
        <div className="bg-indigo-50 rounded-xl p-3 text-slate-700">{t('coach.chatHello')}</div>
        {messages.map((m, i) => (
          <div key={i} className={`rounded-xl p-3 whitespace-pre-wrap ${m.role === 'user' ? 'bg-slate-100 ml-8' : 'bg-indigo-50 mr-8 text-slate-700'}`}>
            {m.content}
          </div>
        ))}
        {sending && <div className="text-slate-400 italic">…</div>}
      </div>
      <form onSubmit={send} className="p-3 border-t flex gap-2">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={500}
          className="flex-1 border-2 border-slate-200 rounded-xl px-3 py-2 focus:border-indigo-500 outline-none"
          placeholder={t('coach.chatPlaceholder')}
          aria-label={t('coach.chatPlaceholder')}
        />
        <button type="submit" className="btn-primary py-2 px-4" disabled={sending || !input.trim()}>{t('coach.chatSend')}</button>
      </form>
      <p className="px-3 pb-3 text-[11px] text-slate-500">🛡️ {t('coach.chatSafety')}</p>
    </div>
  );
};

export default CoachChat;
