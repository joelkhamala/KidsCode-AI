
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useTranslation } from 'react-i18next';
import CodeEditor from './CodeEditor';
import AdultBlocklyEditor from './AdultBlocklyEditor';
import { adultAPI } from '../services/api';

const JQUERY = 'https://code.jquery.com/jquery-3.7.1.min.js';

function buildDoc(html, css, js, usesJquery) {
  const safeJs = String(js || '').replace(/<\/script/gi, '<\\/script');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <style>
    body {
      margin: 0;
      padding: 16px;
      font-family: system-ui, -apple-system, Segoe UI, sans-serif;
      line-height: 1.5;
    }
    ${css || ''}
  </style>

  <script>
    (function () {
      function send(type, message) {
        try {
          parent.postMessage({
            __workbench: true,
            type: type,
            message: String(message)
          }, '*');
        } catch (e) {}
      }

      ['log', 'info', 'warn', 'error'].forEach(function (k) {
        var orig = console[k];

        console[k] = function () {
          var parts = [].map.call(arguments, function (a) {
            try {
              return typeof a === 'object'
                ? JSON.stringify(a)
                : String(a);
            } catch (e) {
              return String(a);
            }
          });

          send(
            k === 'log' || k === 'info' ? 'log' : k,
            parts.join(' ')
          );

          if (orig) orig.apply(console, arguments);
        };
      });

      window.addEventListener('error', function (e) {
        if (
          e.error instanceof DOMException &&
          e.error.name === 'SecurityError'
        ) {
          e.preventDefault();
          return;
        }

        send(
          'error',
          e.message + (e.lineno ? ' (line ' + e.lineno + ')' : '')
        );
      });
    })();
  </script>

  ${usesJquery ? `<script src="${JQUERY}"></script>` : ''}

</head>
<body>

  ${html || ''}

  <script>
    try {
      ${safeJs}
    } catch (e) {
      console.error(e.message);
    }
  </script>

</body>
</html>`;
}

const TAB_STYLE = {
  html: 'bg-orange-500 text-white',
  css: 'bg-sky-600 text-white',
  js: 'bg-yellow-400 text-slate-900',
  java: 'bg-red-600 text-white',
};

const WebWorkbench = ({
  value,
  onChange,
  mode = 'code',
  onModeChange,
  blocksXml,
  onBlocksXml,
  usesJquery = false,
  editorHeight = 300,
  toolbarExtra = null,
  initialTab = null,
  language = 'web',
}) => {
  const { t } = useTranslation();

  // Determine available tabs.
  const tabs = useMemo(
    () =>
      language === 'java'
        ? [['java', 'Java']]
        : [
            ['html', 'HTML'],
            ['css', 'CSS'],
            ['js', 'JavaScript'],
          ],
    [language]
  );

  // Initialize the correct editor tab.
  const [tab, setTab] = useState(() => {
    if (language === 'java') return 'java';

    return initialTab || (value.html || !value.js ? 'html' : 'js');
  });

  const [generatedJs, setGeneratedJs] = useState('');
  const [logs, setLogs] = useState([]);
  const [javaRunning, setJavaRunning] = useState(false);

  const iframeRef = useRef(null);
  const valueRef = useRef(value);

  valueRef.current = value;

  // Prevent invalid tabs when the language changes.
  useEffect(() => {
    if (!tabs.some(([id]) => id === tab)) {
      setTab(tabs[0][0]);
    }
  }, [tabs, tab]);

  // Select the correct JavaScript source.
  const effectiveJs =
    mode === 'blocks' ? generatedJs : value.js;

  // Build the preview document from the latest editor contents.
  const doc = useMemo(
    () =>
      buildDoc(
        value.html,
        value.css,
        effectiveJs,
        usesJquery
      ),
    [value.html, value.css, effectiveJs, usesJquery]
  );

  // Always keep the latest document available to the Run button.
  const docRef = useRef(doc);
  docRef.current = doc;

  // INITIAL PREVIEW:
  // Load only once when the component mounts.
  // Editing code does not automatically reload the iframe.
  useEffect(() => {
    if (iframeRef.current) {
      iframeRef.current.srcdoc = docRef.current;
    }
  }, []);

  // Listen for console messages and preview exports.
  useEffect(() => {
    const onMessage = (e) => {
      if (
        !iframeRef.current ||
        e.source !== iframeRef.current.contentWindow
      ) {
        return;
      }

      const d = e.data || {};

      if (d.__workbench) {
        setLogs((previous) => [
          ...previous.slice(-199),
          {
            type: d.type,
            text: d.message,
          },
        ]);
      } else if (
        d.type === 'html_export' &&
        typeof d.html === 'string'
      ) {
        if (d.html !== valueRef.current.html) {
          onChange({
            ...valueRef.current,
            html: d.html,
          });
        }
      } else if (
        d.type === 'css_export' &&
        typeof d.css === 'string'
      ) {
        if (d.css !== valueRef.current.css) {
          onChange({
            ...valueRef.current,
            css: d.css,
          });
        }
      }
    };

    window.addEventListener('message', onMessage);

    return () => {
      window.removeEventListener('message', onMessage);
    };
  }, [onChange]);

  // Update editor values.
  const set = (key) => (text) => {
    onChange({
      ...valueRef.current,
      [key]: text,
    });
  };

  // Execute Java code through the backend.
  const runJava = async () => {
    setJavaRunning(true);
    setLogs([]);

    try {
      const response = await adultAPI.executeJava(
        valueRef.current.java || ''
      );

      const { output, error } = response.data;

      if (output && output.length > 0) {
        setLogs(
          output.map((line) => ({
            type: 'log',
            text: line,
          }))
        );
      }

      if (error) {
        setLogs([
          {
            type: 'error',
            text: `${error.name}: ${error.message}`,
          },
        ]);
      }
    } catch (err) {
      setLogs([
        {
          type: 'error',
          text:
            err.response?.data?.message ||
            err.message ||
            'Java execution failed.',
        },
      ]);
    } finally {
      setJavaRunning(false);
    }
  };

  // RUN:
  // Preview refreshes only when the learner clicks Run.
  const run = () => {
    if (language === 'java') {
      runJava();
      return;
    }

    if (iframeRef.current) {
      setLogs([]);
      iframeRef.current.srcdoc = docRef.current;
    }
  };

  // Switch between JavaScript Code and Blocks.
  const switchMode = (next) => {
    if (next === mode) return;

    // Preserve generated JavaScript when switching to Code.
    if (
      next === 'code' &&
      generatedJs &&
      !String(valueRef.current.js || '').trim()
    ) {
      onChange({
        ...valueRef.current,
        js: generatedJs,
      });
    }

    if (onModeChange) {
      onModeChange(next);
    }
  };

  // Receive generated JavaScript from Blockly.
  const onBlocksCode = useCallback((code) => {
    setGeneratedJs(code);
  }, []);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-4">

      {/* EDITOR */}
      <section
        className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col"
        aria-label={t('ad.editor')}
      >

        {/* TOOLBAR */}
        <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b border-slate-200 bg-slate-50">

          {/* LANGUAGE TABS */}
          <div
            className="flex gap-1"
            role="tablist"
            aria-label={t('ad.editor')}
          >
            {tabs.map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  tab === id
                    ? TAB_STYLE[id]
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* JAVASCRIPT MODE SWITCH */}
          {tab === 'js' && onModeChange && (
            <div
              className="flex gap-1 ml-1 bg-white border border-slate-200 rounded-lg p-0.5"
              role="radiogroup"
              aria-label={t('ad.jsMode')}
            >
              {[
                ['code', `⌨️ ${t('ad.typeCode')}`],
                ['blocks', `🧩 ${t('ad.blocks')}`],
              ].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={mode === id}
                  onClick={() => switchMode(id)}
                  className={`px-2 py-1 rounded-md text-xs font-bold ${
                    mode === id
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* RUN BUTTON */}
          <div className="ml-auto flex items-center gap-2">
            {toolbarExtra}

            <button
              type="button"
              onClick={run}
              disabled={javaRunning}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-bold"
            >
              ▶ {javaRunning ? t('ad.checking') : t('ad.run')}
            </button>
          </div>
        </div>

        {/* EDITOR CONTENT */}
        <div className="p-2">

          {/* HTML EDITOR */}
          {tab === 'html' && (
            <CodeEditor
              value={value.html || ''}
              onChange={set('html')}
              language="html"
              height={editorHeight}
              placeholder="<h1>Hello</h1>"
              ariaLabel="HTML"
            />
          )}

          {/* CSS EDITOR */}
          {tab === 'css' && (
            <CodeEditor
              value={value.css || ''}
              onChange={set('css')}
              language="css"
              height={editorHeight}
              placeholder="h1 { color: navy; }"
              ariaLabel="CSS"
              showSwitches={false}
            />
          )}

          {/* JAVASCRIPT CODE EDITOR */}
          {tab === 'js' && mode === 'code' && (
            <CodeEditor
              value={value.js || ''}
              onChange={set('js')}
              language="javascript"
              height={editorHeight}
              placeholder="console.log('Hello');"
              ariaLabel="JavaScript"
              showSwitches={false}
            />
          )}

          {/* BLOCKS WORKSPACE - ONLY WHEN SELECTED */}
          {tab === 'js' && mode === 'blocks' && (
            <div className="grid grid-cols-[minmax(0,1fr)] md:grid-cols-[minmax(0,1fr)_38%] gap-2">

              {/* BLOCKLY EDITOR */}
              <div className="min-w-0 rounded-xl overflow-hidden border border-indigo-100">
                <AdultBlocklyEditor
                  height={`${Math.max(editorHeight, 340)}px`}
                  initialXml={blocksXml || ''}
                  onCodeChange={onBlocksCode}
                  onXmlChange={onBlocksXml || (() => {})}
                />
              </div>

              {/* GENERATED JAVASCRIPT */}
              <pre
                className="rounded-xl bg-slate-900 text-yellow-300 text-[11px] p-3 overflow-auto whitespace-pre-wrap m-0"
                style={{
                  maxHeight: Math.max(editorHeight, 340),
                }}
                aria-label={t('ad.generatedJs')}
              >
                {generatedJs || `// ${t('ad.blocksHint')}`}
              </pre>

            </div>
          )}

          {/* JAVA EDITOR */}
          {tab === 'java' && (
            <CodeEditor
              value={value.java || ''}
              onChange={set('java')}
              language="java"
              height={editorHeight}
              placeholder='System.out.println("Hello");'
              ariaLabel="Java"
              showSwitches={false}
            />
          )}

        </div>
      </section>

      {/* PREVIEW AND CONSOLE */}
      <section
        className="flex flex-col gap-3"
        aria-label={t('ad.preview')}
      >

        {/* LIVE PREVIEW */}
        {language === 'web' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

            <div className="px-3 py-2 border-b border-slate-200 bg-slate-50 flex items-center justify-between">

              <span className="text-xs font-bold text-slate-600">
                🌐 {t('ad.preview')}
              </span>

              <span className="text-[11px] text-slate-400">
                {t('ad.livePreview')}
              </span>

            </div>

            <iframe
              ref={iframeRef}
              title={t('ad.preview')}
              sandbox="allow-scripts allow-modals"
              className="w-full bg-white border-0"
              style={{
                height: Math.max(editorHeight, 260),
              }}
            />

          </div>
        )}

        {/* CONSOLE */}
        <div className="bg-slate-900 rounded-2xl overflow-hidden">

          <div className="px-3 py-1.5 flex items-center justify-between border-b border-slate-700">

            <span className="text-xs font-bold text-slate-300">
              📟 {t('ad.console')}
            </span>

            <button
              type="button"
              onClick={() => setLogs([])}
              className="text-[11px] text-slate-400 hover:text-white"
            >
              {t('ad.clear')}
            </button>

          </div>

          <div
            className="p-3 font-mono text-xs max-h-40 overflow-auto"
            aria-live="polite"
          >
            {logs.length === 0 ? (
              <span className="text-slate-500">
                {`// ${t('ad.consoleEmpty')}`}
              </span>
            ) : (
              logs.map((l, i) => (
                <div
                  key={i}
                  className={
                    l.type === 'error'
                      ? 'text-red-400'
                      : l.type === 'warn'
                      ? 'text-amber-300'
                      : 'text-emerald-300'
                  }
                >
                  {l.type === 'error'
                    ? '✖ '
                    : l.type === 'warn'
                    ? '⚠ '
                    : '› '}

                  {l.text}
                </div>
              ))
            )}
          </div>

        </div>
      </section>
    </div>
  );
};

export default WebWorkbench;
