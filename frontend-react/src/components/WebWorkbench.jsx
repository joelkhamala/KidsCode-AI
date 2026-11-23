import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import CodeEditor from './CodeEditor';
import AdultBlocklyEditor from './AdultBlocklyEditor';
import RunConsole from './RunConsole';
import { SERVER_LANGUAGES, isServerLanguage } from './codeLanguages';
import { adultAPI } from '../services/api';

const JQUERY = 'https://code.jquery.com/jquery-3.7.1.min.js';

function buildDoc(html, css, js, usesJquery) {
  // Prevent user code from prematurely closing the generated script element.
  const safeJs = String(js || '').replace(/<\/script/gi, '<\\/script');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 16px; font-family: system-ui, -apple-system, Segoe UI, sans-serif; line-height: 1.5; }
    ${css || ''}
  </style>
  <script>
    (function () {
      function send(type, message) {
        try { parent.postMessage({ __workbench: true, type: type, message: String(message) }, '*'); } catch (_) {}
      }
      ['log', 'info', 'warn', 'error'].forEach(function (kind) {
        var original = console[kind];
        console[kind] = function () {
          var parts = Array.prototype.map.call(arguments, function (item) {
            try { return typeof item === 'object' ? JSON.stringify(item) : String(item); }
            catch (_) { return String(item); }
          });
          send(kind === 'log' || kind === 'info' ? 'log' : kind, parts.join(' '));
          if (original) original.apply(console, arguments);
        };
      });
      window.addEventListener('error', function (event) {
        if (event.error instanceof DOMException && event.error.name === 'SecurityError') {
          event.preventDefault();
          return;
        }
        send('error', event.message + (event.lineno ? ' (line ' + event.lineno + ')' : ''));
      });
      window.addEventListener('unhandledrejection', function (event) {
        var reason = event.reason;
        send('error', reason && reason.message ? reason.message : String(reason));
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
    } catch (error) {
      console.error(error && error.message ? error.message : error);
    }
  </script>
</body>
</html>`;
}

const TAB_STYLE = {
  html: 'bg-orange-500 text-white',
  css: 'bg-sky-600 text-white',
  js: 'bg-yellow-400 text-slate-900',
  java: SERVER_LANGUAGES.java.tab,
  python: SERVER_LANGUAGES.python.tab,
  sql: SERVER_LANGUAGES.sql.tab,
};

// The SQL practice tables are the same for everyone, so fetch them once per visit.
let sqlTablesCache = null;

/** Tables in the SQL practice database, with a button to start a query on each. */
const SqlTables = ({ onUse }) => {
  const { t } = useTranslation();
  const [tables, setTables] = useState(sqlTablesCache);
  useEffect(() => {
    if (sqlTablesCache) return undefined;
    let alive = true;
    adultAPI.sqlTables().then((r) => { sqlTablesCache = r.data.tables || []; if (alive) setTables(sqlTablesCache); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  return (
    <details className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden" open>
      <summary className="px-3 py-2 bg-purple-50 border-b border-purple-100 cursor-pointer select-none text-xs font-bold text-purple-900">
        🗄️ {t('ws.database')} <span className="font-normal text-purple-700">- {t('ws.databaseHelp')}</span>
      </summary>
      <ul className="p-2 grid grid-cols-[minmax(0,1fr)] sm:grid-cols-2 gap-1.5 max-h-56 overflow-auto">
        {(tables || []).map((tb) => (
          <li key={tb.name} className="rounded-lg border border-slate-200 px-2.5 py-1.5 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs font-bold text-slate-800">{tb.name}</span>
              <button type="button" onClick={() => onUse(`SELECT * FROM ${tb.name} LIMIT 10;`)} title={t('ws.tryTable')}
                className="text-[11px] font-semibold text-purple-700 hover:text-purple-900 shrink-0">{t('ws.rows', { count: tb.rows })} ＋</button>
            </div>
            <p className="font-mono text-[10.5px] text-slate-500 break-words leading-snug">{tb.columns.join(', ')}</p>
          </li>
        ))}
        {!tables && <li className="text-xs text-slate-400 px-2 py-1">…</li>}
      </ul>
    </details>
  );
};

const WebWorkbench = ({
  value = {},
  onChange,
  mode = 'code',
  onModeChange,
  blocksXml = '',
  onBlocksXml,
  usesJquery = false,
  editorHeight = 300,
  toolbarExtra = null,
  initialTab = null,
  language = 'web',
}) => {
  const { t } = useTranslation();
  const [tab, setTab] = useState(() => initialTab || (value.html || !value.js ? 'html' : 'js'));
  const [generatedJs, setGeneratedJs] = useState('');
  const [localBlocksXml, setLocalBlocksXml] = useState(blocksXml || '');
  const [blocksChanged, setBlocksChanged] = useState(false);
  const [logs, setLogs] = useState([]);
  const [serverResult, setServerResult] = useState(null);
  const [serverRunning, setServerRunning] = useState(false);
  const [stdin, setStdin] = useState('');
  const [previewStatus, setPreviewStatus] = useState('idle');
  const iframeRef = useRef(null);
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  const onBlocksXmlRef = useRef(onBlocksXml);
  const docRef = useRef('');
  const runSequenceRef = useRef(0);
  const stdinRef = useRef('');
  stdinRef.current = stdin;

  // Parent callbacks and values can change identity on every render.
  valueRef.current = value;
  onChangeRef.current = onChange;
  onBlocksXmlRef.current = onBlocksXml;

  // Each lesson shows only its own language: Java, Python or SQL alone, or the three web tabs.
  const server = isServerLanguage(language) ? SERVER_LANGUAGES[language] : null;
  const tabs = server
    ? [[server.id, server.label]]
    : [['html', 'HTML'], ['css', 'CSS'], ['js', 'JavaScript']];

  // Blocks are the source of truth for JavaScript only after the learner edits
  // the workspace. Merely opening an empty/new workspace must not erase code.
  const effectiveJs = mode === 'blocks'
    ? (blocksChanged ? generatedJs : (generatedJs || value.js || ''))
    : (value.js || '');

  const doc = useMemo(
    () => buildDoc(value.html || '', value.css || '', effectiveJs, usesJquery),
    [value.html, value.css, effectiveJs, usesJquery]
  );
  docRef.current = doc;

  const updateValue = useCallback((patch) => {
    const current = valueRef.current || {};
    const next = { ...current, ...patch };
    // Update synchronously so two rapid editor/workspace events cannot spread
    // an outdated parent value and overwrite one another.
    valueRef.current = next;
    onChangeRef.current?.(next);
  }, []);

  const set = useCallback((key) => (text) => updateValue({ [key]: text }), [updateValue]);

  /** Add a starter query (from the practice-database panel) below the learner's SQL. */
  const addQuery = useCallback((query) => {
    const current = (valueRef.current.sql || '').trimEnd();
    updateValue({ sql: current ? `${current}\n${query}` : query });
  }, [updateValue]);

  // Accept messages only from this workbench's iframe.
  useEffect(() => {
    const handleMessage = (event) => {
      const frame = iframeRef.current;
      if (!frame || event.source !== frame.contentWindow) return;
      const data = event.data || {};

      if (data.__workbench) {
        setLogs((current) => [...current.slice(-199), {
          type: data.type || 'log',
          text: String(data.message ?? ''),
        }]);
        if (data.type === 'error') setPreviewStatus('error');
        return;
      }

      // These messages are generated by the Blockly HTML/CSS export blocks.
      if (data.type === 'html_export' && typeof data.html === 'string') {
        if (data.html !== (valueRef.current.html || '')) updateValue({ html: data.html });
      } else if (data.type === 'css_export' && typeof data.css === 'string') {
        if (data.css !== (valueRef.current.css || '')) updateValue({ css: data.css });
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [updateValue]);

  /** Java, Python and SQL run on the server; the answer has the same shape for all three. */
  const runServer = useCallback(async () => {
    if (!server) return;
    setServerRunning(true);
    try {
      const response = await adultAPI.executeCode(server.id, valueRef.current[server.id] || '', stdinRef.current);
      setServerResult(response.data);
    } catch (error) {
      const data = error?.response?.data;
      setServerResult({
        ok: false, language: server.id, output: [], tables: [], notes: [],
        error: { type: error?.response?.status === 429 ? 'busy' : 'unavailable', name: 'Error', message: data?.error || data?.message || t('ws.serverError') },
      });
    } finally {
      setServerRunning(false);
    }
  }, [server, t]);

  const run = useCallback(() => {
    if (server) {
      runServer();
      return;
    }
    const frame = iframeRef.current;
    if (!frame) return;

    runSequenceRef.current += 1;
    setLogs([{ type: 'info', text: `Running preview #${runSequenceRef.current}…` }]);
    setPreviewStatus('running');
    // The iframe is reloaded only on an explicit Run click, never while typing.
    frame.srcdoc = docRef.current;
  }, [server, runServer]);

  const switchMode = useCallback((nextMode) => {
    if (nextMode === mode) return;
    if (nextMode === 'code' && blocksChanged) {
      updateValue({ js: generatedJs });
    }
    onModeChange?.(nextMode);
  }, [mode, blocksChanged, generatedJs, updateValue, onModeChange]);

  const handleBlocksCode = useCallback((code, meta = {}) => {
    const nextCode = String(code || '');
    setGeneratedJs(nextCode);
    if (!meta.isInitial) {
      setBlocksChanged(true);
      if (nextCode !== (valueRef.current.js || '')) updateValue({ js: nextCode });
    }
  }, [updateValue]);

  const handleBlocksXml = useCallback((xml) => {
    // Keep a local fallback so switching tabs does not discard the workspace
    // even when the parent has not wired a persistence callback.
    setLocalBlocksXml(xml);
    onBlocksXmlRef.current?.(xml);
  }, []);

  const workspaceXml = onBlocksXml ? (blocksXml || '') : (blocksXml || localBlocksXml || '');

  const handleFrameLoad = useCallback(() => {
    // Ignore the initial blank iframe load; only report completion after Run.
    setPreviewStatus((current) => current === 'running' ? 'completed' : current);
    setLogs((current) => current.map((item) => (
      item.type === 'info' && item.text.startsWith('Running preview')
        ? { type: 'success', text: 'Preview execution completed.' }
        : item
    )));
  }, []);

  const visibleTab = tabs.some(([id]) => id === tab) ? tab : tabs[0][0];

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-4">
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col" aria-label={t('ad.editor')}>
        <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b border-slate-200 bg-slate-50">
          <div className="flex gap-1" role="tablist" aria-label={t('ad.editor')}>
            {tabs.map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={visibleTab === id}
                onClick={() => setTab(id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${visibleTab === id ? TAB_STYLE[id] : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}`}
              >
                {label}
              </button>
            ))}
          </div>

          {visibleTab === 'js' && onModeChange && (
            <div className="flex gap-1 ml-1 bg-white border border-slate-200 rounded-lg p-0.5" role="radiogroup" aria-label={t('ad.jsMode')}>
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
                  className={`px-2 py-1 rounded-md text-xs font-bold ${mode === id ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          <div className="ml-auto flex items-center gap-2">
            {toolbarExtra}
            <button
              type="button"
              onClick={run}
              disabled={serverRunning || previewStatus === 'running'}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-bold"
            >
              {server
                ? (serverRunning ? `⏳ ${t('ws.running')}` : serverResult ? `↻ ${t('ws.runAgain')}` : `▶ ${t('ad.run')}`)
                : previewStatus === 'running'
                  ? `⏳ ${t('ws.running')}`
                  : previewStatus === 'completed' || previewStatus === 'error'
                    ? `↻ ${t('ws.runAgain')}`
                    : `▶ ${t('ad.run')}`}
            </button>
          </div>
        </div>

        <div className="p-2 min-w-0">
          {visibleTab === 'html' && (
            <CodeEditor value={value.html || ''} onChange={set('html')} language="html" height={editorHeight} placeholder="<h1>Hello</h1>" ariaLabel="HTML" />
          )}
          {visibleTab === 'css' && (
            <CodeEditor value={value.css || ''} onChange={set('css')} language="css" height={editorHeight} placeholder="h1 { color: navy; }" ariaLabel="CSS" showSwitches={false} />
          )}
          {visibleTab === 'js' && mode === 'code' && (
            <CodeEditor value={value.js || ''} onChange={set('js')} language="javascript" height={editorHeight} placeholder="console.log('Hello');" ariaLabel="JavaScript" showSwitches={false} />
          )}
          {visibleTab === 'js' && mode === 'blocks' && (
            <div className="grid grid-cols-[minmax(0,1fr)] md:grid-cols-[minmax(0,1fr)_38%] gap-2">
              <div className="min-w-0 rounded-xl overflow-hidden border border-indigo-100">
                <AdultBlocklyEditor
                  key="adult-blockly-workspace"
                  height={`${Math.max(editorHeight, 340)}px`}
                  initialXml={workspaceXml}
                  onCodeChange={handleBlocksCode}
                  onXmlChange={handleBlocksXml}
                />
              </div>
              <pre
                className="rounded-xl bg-slate-900 text-yellow-300 text-[11px] p-3 overflow-auto whitespace-pre-wrap m-0"
                style={{ maxHeight: Math.max(editorHeight, 340) }}
                aria-label={t('ad.generatedJs')}
              >
                {generatedJs || `// ${t('ad.blocksHint')}`}
              </pre>
            </div>
          )}
          {server && visibleTab === server.id && (
            <CodeEditor key={server.id} value={value[server.id] || ''} onChange={set(server.id)} language={server.editor} height={editorHeight}
              placeholder={server.placeholder} ariaLabel={server.label} showSwitches={false} onRun={run} />
          )}
        </div>
      </section>

      <section className="flex flex-col gap-3 min-w-0" aria-label={server ? t('ad.console') : t('ad.preview')}>
        {!server && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-3 py-2 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600">🌐 {t('ad.preview')}</span>
              <span className="text-[11px] text-slate-400">
                {previewStatus === 'running' ? t('ws.running') : previewStatus === 'completed' ? t('ws.lastRunOk') : previewStatus === 'error' ? t('ws.err.runtime') : t('ad.livePreview')}
              </span>
            </div>
            <iframe
              ref={iframeRef}
              title={t('ad.preview')}
              sandbox="allow-scripts allow-modals"
              onLoad={handleFrameLoad}
              className="w-full bg-white border-0"
              style={{ height: Math.max(editorHeight, 260) }}
            />
          </div>
        )}

        {server ? (
          <>
            <RunConsole
              result={serverResult}
              running={serverRunning}
              runningText={t(`ws.running_${server.id}`)}
              emptyText={t(server.id === 'sql' ? 'ws.emptySql' : 'ws.emptyServer')}
              onClear={() => setServerResult(null)}
              maxHeight={Math.max(editorHeight + 40, 300)}
            />
            {server.id === 'sql' ? (
              <SqlTables onUse={addQuery} />
            ) : (
              <details className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden" open={Boolean(stdin)}>
                <summary className="px-3 py-2 bg-slate-50 cursor-pointer select-none text-xs font-bold text-slate-700">
                  ⌨️ {t('ws.input')} <span className="font-normal text-slate-500">- {t('ws.inputHelp')}</span>
                </summary>
                <textarea value={stdin} onChange={(e) => setStdin(e.target.value)} rows={3} maxLength={10000} spellCheck={false}
                  aria-label={t('ws.input')} placeholder={server.id === 'java' ? '85' : 'Wanjiru'}
                  className="w-full border-0 border-t border-slate-200 px-3 py-2 font-mono text-sm outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-400 resize-y" />
              </details>
            )}
          </>
        ) : (
          <RunConsole logs={logs} onClear={() => setLogs([])} />
        )}
      </section>
    </div>
  );
};

export default WebWorkbench;
