import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import WebWorkbench from '../components/WebWorkbench';
import { Page, PageHeader, Button } from '../components/AdultUi';
import useStudyTimer from '../utils/useStudyTimer';

/** Free practice: HTML, CSS and JavaScript (typed or with blocks), saved in this browser. Practice time counts towards study hours. */
const KEY = 'adult_playground_state';
const STARTER = {
  html: '<h1>Hello!</h1>\n<p>Edit the HTML, CSS and JavaScript tabs and watch the preview update.</p>\n<button id="hi">Click me</button>',
  css: 'body {\n  font-family: Arial, sans-serif;\n}\nh1 {\n  color: #4f46e5;\n}',
  js: 'document.getElementById("hi").addEventListener("click", function () {\n  console.log("Button clicked!");\n});',
};
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };

const AdultPlayground = () => {
  const { t } = useTranslation();
  const saved = load();
  const [code, setCode] = useState(saved.code || STARTER);
  const [mode, setMode] = useState(saved.mode || 'code');
  const [blocksXml, setBlocksXml] = useState(saved.blocksXml || '');
  const [jquery, setJquery] = useState(Boolean(saved.jquery));
  useStudyTimer({ kind: 'practice' });

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify({ code, mode, blocksXml, jquery })); } catch { /* storage blocked */ }
  }, [code, mode, blocksXml, jquery]);

  const download = () => {
    const doc = `<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<title>My page</title>\n<style>\n${code.css}\n</style>\n</head>\n<body>\n${code.html}\n${jquery ? '<script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>\n' : ''}<script>\n${code.js}\n</script>\n</body>\n</html>\n`;
    const url = URL.createObjectURL(new Blob([doc], { type: 'text/html' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'index.html';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const reset = () => {
    if (window.confirm(t('ad.resetConfirm'))) { setCode(STARTER); setBlocksXml(''); setMode('code'); }
  };

  return (
    <Page wide>
      <PageHeader title={`💻 ${t('ad.playground')}`} subtitle={t('ad.playgroundIntro')}
        actions={<>
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl px-3 py-2">
            <input type="checkbox" checked={jquery} onChange={(e) => setJquery(e.target.checked)} /> jQuery
          </label>
          <Button variant="secondary" onClick={download}>⬇️ {t('ad.downloadHtml')}</Button>
          <Button variant="secondary" onClick={reset}>↺ {t('ad.reset')}</Button>
        </>} />
      <WebWorkbench value={code} onChange={setCode} mode={mode} onModeChange={setMode} blocksXml={blocksXml} onBlocksXml={setBlocksXml} usesJquery={jquery} editorHeight={420} />
    </Page>
  );
};

export default AdultPlayground;
