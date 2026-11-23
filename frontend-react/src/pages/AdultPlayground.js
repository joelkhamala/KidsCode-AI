import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import WebWorkbench from '../components/WebWorkbench';
import { SERVER_LANGUAGES } from '../components/codeLanguages';
import { Page, PageHeader, Button } from '../components/AdultUi';
import useStudyTimer from '../utils/useStudyTimer';

/**
 * Free practice in any course language: the web (HTML, CSS and JavaScript, typed or with
 * blocks) or Java, Python and SQL, which run on the server. Saved in this browser; practice
 * time counts towards study hours.
 */
const KEY = 'adult_playground_state';
const STARTER = {
  html: '<h1>Hello!</h1>\n<p>Edit the HTML, CSS and JavaScript tabs and watch the preview update.</p>\n<button id="hi">Click me</button>',
  css: 'body {\n  font-family: Arial, sans-serif;\n}\nh1 {\n  color: #4f46e5;\n}',
  js: 'document.getElementById("hi").addEventListener("click", function () {\n  console.log("Button clicked!");\n});',
  java: 'public class Main {\n    public static void main(String[] args) {\n        String city = "Nairobi";\n        for (int i = 1; i <= 3; i++) {\n            System.out.println("Habari " + city + " #" + i);\n        }\n    }\n}',
  python: 'prices = {"maize flour": 210, "sugar": 165, "tea": 295}\n\nfor item, price in prices.items():\n    print(f"{item}: KES {price}")\n\nprint("Total:", sum(prices.values()))',
  sql: '-- The practice database has Customers, Orders, Products, Employees, Students and more.\nSELECT city, COUNT(*) AS customers\nFROM Customers\nGROUP BY city\nORDER BY customers DESC;',
};
const LANGUAGES = [
  { id: 'web', label: 'HTML · CSS · JS', icon: '🌐', tab: 'bg-orange-500 text-white' },
  ...Object.values(SERVER_LANGUAGES).map((l) => ({ id: l.id, label: l.label, icon: l.icon, tab: l.tab })),
];
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };

const AdultPlayground = () => {
  const { t } = useTranslation();
  const saved = load();
  const [code, setCode] = useState({ ...STARTER, ...(saved.code || {}) });
  const [language, setLanguage] = useState(saved.language || 'web');
  const [mode, setMode] = useState(saved.mode || 'code');
  const [blocksXml, setBlocksXml] = useState(saved.blocksXml || '');
  const [jquery, setJquery] = useState(Boolean(saved.jquery));
  useStudyTimer({ kind: 'practice' });

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify({ code, language, mode, blocksXml, jquery })); } catch { /* storage blocked */ }
  }, [code, language, mode, blocksXml, jquery]);

  const isWeb = language === 'web';

  const download = () => {
    const files = {
      java: ['Main.java', 'text/x-java', code.java],
      python: ['main.py', 'text/x-python', code.python],
      sql: ['queries.sql', 'application/sql', code.sql],
    };
    const [name, type, text] = isWeb
      ? ['index.html', 'text/html', `<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<title>My page</title>\n<style>\n${code.css}\n</style>\n</head>\n<body>\n${code.html}\n${jquery ? '<script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>\n' : ''}<script>\n${code.js}\n</script>\n</body>\n</html>\n`]
      : files[language];
    const url = URL.createObjectURL(new Blob([text || ''], { type }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const reset = () => {
    if (!window.confirm(t('ad.resetConfirm'))) return;
    if (isWeb) {
      setCode((c) => ({ ...c, html: STARTER.html, css: STARTER.css, js: STARTER.js }));
      setBlocksXml('');
      setMode('code');
    } else {
      setCode((c) => ({ ...c, [language]: STARTER[language] }));
    }
  };

  return (
    <Page wide>
      <PageHeader title={`💻 ${t('ad.playground')}`} subtitle={t('ad.playgroundIntro')}
        actions={<>
          {isWeb && (
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl px-3 py-2">
              <input type="checkbox" checked={jquery} onChange={(e) => setJquery(e.target.checked)} /> jQuery
            </label>
          )}
          <Button variant="secondary" onClick={download}>⬇️ {isWeb ? t('ad.downloadHtml') : t('ws.downloadFile')}</Button>
          <Button variant="secondary" onClick={reset}>↺ {t('ad.reset')}</Button>
        </>} />
      <div className="flex flex-wrap items-center gap-2 mb-4" role="radiogroup" aria-label={t('ws.language')}>
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 mr-1">{t('ws.language')}</span>
        {LANGUAGES.map((l) => (
          <button key={l.id} type="button" role="radio" aria-checked={language === l.id} onClick={() => setLanguage(l.id)}
            className={`px-3 py-1.5 rounded-xl text-sm font-semibold border transition ${language === l.id ? `${l.tab} border-transparent shadow-sm` : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'}`}>
            <span aria-hidden="true">{l.icon}</span> {l.label}
          </button>
        ))}
      </div>
      <WebWorkbench key={language} language={language} value={code} onChange={setCode} mode={mode} onModeChange={setMode}
        blocksXml={blocksXml} onBlocksXml={setBlocksXml} usesJquery={jquery} editorHeight={420} />
    </Page>
  );
};

export default AdultPlayground;
