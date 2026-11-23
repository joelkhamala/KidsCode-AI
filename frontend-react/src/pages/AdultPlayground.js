import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AdultBlocklyEditor from '../components/AdultBlocklyEditor';
import CodeEditor from '../components/CodeEditor';

const PG_KEY = 'adult_playground_state';
const loadPgState = () => {
  try { return JSON.parse(localStorage.getItem(PG_KEY)) || {}; } catch { return {}; }
};

const AdultPlayground = () => {
  const navigate = useNavigate();

  // Load persisted state once on mount
  const saved = loadPgState();

  // Editor mode: 'blocks' | 'code' | 'split'
  const [editorMode, setEditorMode] = useState(saved.editorMode ?? 'split');

  // Code state — restored from localStorage or defaulted
  const [htmlCode, setHtmlCode] = useState(saved.htmlCode ?? '<h1>Hello World!</h1>\n<p>Start coding here...</p>');
  const [cssCode, setCssCode]   = useState(saved.cssCode   ?? 'h1 {\n  color: #2563eb;\n  font-family: Arial, sans-serif;\n}');
  const [jsCode, setJsCode]     = useState(saved.jsCode    ?? 'console.log("Welcome to the playground!");');
  const [blocksXml, setBlocksXml]   = useState(saved.blocksXml   ?? '');
  const [generatedJs, setGeneratedJs] = useState(saved.generatedJs ?? '');

  // Preview / console
  const [output, setOutput] = useState('');
  const iframeRef = useRef(null);

  // Active code tab inside 'code' mode
  const [codeTab, setCodeTab] = useState('js');
  // Live-sync indicator
  const [syncing, setSyncing] = useState(false);
  const syncTimerRef = useRef(null);
  // Prevent auto-preview infinite loop after html_export sets htmlCode
  const justExportedRef  = useRef('');   // stores the last html value set via html_export
  const htmlExportTimer  = useRef(null);
  const pendingHtmlRef   = useRef('');
  const previewDebounce  = useRef(null); // debounce timer — stops cursor flicker on every keystroke
  // Keeps fresh state for async callbacks — avoids stale closures in useEffect([], [])
  const stateRef = useRef({ cssCode, jsCode, generatedJs, editorMode, htmlCode });

  // ── Keep stateRef in sync with current state ──────────────────────────────
  useEffect(() => {
    stateRef.current = { cssCode, jsCode, generatedJs, editorMode, htmlCode };
  }, [cssCode, jsCode, generatedJs, editorMode, htmlCode]);

  // ── Persist state to localStorage whenever it changes ──────────────────────
  useEffect(() => {
    try {
      localStorage.setItem(PG_KEY, JSON.stringify({
        editorMode, htmlCode, cssCode, jsCode, blocksXml, generatedJs,
      }));
    } catch (_) {}
  }, [editorMode, htmlCode, cssCode, jsCode, blocksXml, generatedJs]);

  /* ── Build srcdoc ─────────────────────────────────────────────────────── */
  const buildSrcdoc = useCallback((html, css, js) => `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script>
      window.addEventListener('error',function(e){
        if(e.error instanceof DOMException&&e.error.name==='SecurityError'&&e.message&&e.message.includes('cookie')){e.preventDefault();e.stopImmediatePropagation();return true;}
      },true);
      window.addEventListener('unhandledrejection',function(e){
        if(e.reason instanceof DOMException&&e.reason.name==='SecurityError'&&e.reason.message&&e.reason.message.includes('cookie')){e.preventDefault();e.stopImmediatePropagation();}
      },true);
    <\/script>
    <style>
      body{margin:0;padding:20px;font-family:system-ui,-apple-system,sans-serif;}
      ${css}
    </style>
  </head>
  <body>
    ${html}
    <script>
      (function(){
        var ol=console.log;
        console.log=function(){var m=[].join.call(arguments,' ');window.parent.postMessage({type:'console',message:m},'*');ol.apply(console,arguments);};
        window.onerror=function(msg,url,line){window.parent.postMessage({type:'error',message:msg+' (Line '+line+')'},'*');return false;};
      })();
      try{${js}}catch(e){window.parent.postMessage({type:'error',message:e.message},'*');}
    <\/script>
  </body>
</html>`, []);

  /* ── writeSrcdoc: safely reload iframe without key remount ─────────────── */
  const writeSrcdoc = useCallback((html, css, js) => {
    if (!iframeRef.current) return;
    const doc = buildSrcdoc(html, css, js);
    // Blank first → browser flushes iframe, then new doc loads cleanly
    iframeRef.current.srcdoc = '';
    setTimeout(() => { if (iframeRef.current) iframeRef.current.srcdoc = doc; }, 0);
  }, [buildSrcdoc]);

  /* ── Auto-preview on code change (debounced 300ms to stop cursor flicker) ── */
  useEffect(() => {
    if (!iframeRef.current) return;
    // Skip exactly one cycle when htmlCode was just set by html_export
    if (justExportedRef.current && htmlCode === justExportedRef.current) {
      justExportedRef.current = '';
      return;
    }
    // Debounce: only reload the iframe after typing pauses for 300ms
    clearTimeout(previewDebounce.current);
    previewDebounce.current = setTimeout(() => {
      if (!iframeRef.current) return;
      const { cssCode: css, generatedJs: gjs, jsCode: js, editorMode: mode } = stateRef.current;
      const effectiveJs = mode === 'code' ? js : (gjs || js);
      iframeRef.current.srcdoc = buildSrcdoc(htmlCode, css, effectiveJs);
    }, 300);
    return () => clearTimeout(previewDebounce.current);
  }, [htmlCode, cssCode, jsCode, generatedJs, editorMode, buildSrcdoc]);

  /* ── Message handler ─────────────────────────────────────────────────── */
  useEffect(() => {
    const handler = (e) => {
      if (e.data?.type === 'console')     setOutput(p => p + '\n' + e.data.message);
      if (e.data?.type === 'error')       setOutput(p => p + '\n❌ ' + e.data.message);
      if (e.data?.type === 'html_export') {
        const html = e.data.html;
        justExportedRef.current = html;
        setHtmlCode(html);
        setCodeTab('html'); // show HTML tab when html_export blocks run
        pendingHtmlRef.current = html;
        clearTimeout(htmlExportTimer.current);
        htmlExportTimer.current = setTimeout(() => {
          const { cssCode: css, generatedJs: gjs, jsCode: js } = stateRef.current;
          if (iframeRef.current && pendingHtmlRef.current) {
            iframeRef.current.srcdoc = buildSrcdoc(pendingHtmlRef.current, css, gjs || js);
          }
          pendingHtmlRef.current = '';
        }, 80);
      }
      if (e.data?.type === 'css_export') { setCssCode(e.data.css); setCodeTab('css'); }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  /* ── Actions ─────────────────────────────────────────────────────────── */
  const runCode = () => {
    setOutput('Running...\n');
    const effectiveJs = editorMode === 'code' ? jsCode : (generatedJs || jsCode);
    writeSrcdoc(htmlCode, cssCode, effectiveJs);
  };

  const clearAll = () => { setHtmlCode(''); setCssCode(''); setJsCode(''); setGeneratedJs(''); setOutput(''); };

  const switchMode = (mode) => {
    // When switching from blocks → code, sync generated JS into JS editor
    if (mode === 'code' && editorMode === 'blocks') {
      setJsCode(generatedJs || jsCode);
    }
    setEditorMode(mode);
  };

  /* ── Blockly callbacks ───────────────────────────────────────────────── */
  const handleBlocksCode = useCallback((code) => {
    setGeneratedJs(code);
    setSyncing(true);
    // Auto-select the correct editor tab based on which export blocks are used:
    // html_export_to_editor generates window.__blk_html__
    // css_export_to_editor generates type:'css_export'
    if (code.includes('__blk_html__')) {
      setCodeTab('html');
    } else if (code.includes("type:'css_export'")) {
      setCodeTab('css');
    } else {
      setCodeTab('js');
    }
    clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => setSyncing(false), 600);
  }, []);
  const handleBlocksXml  = useCallback((xml)  => setBlocksXml(xml), []);

  /* ── Mode button helper ──────────────────────────────────────────────── */
  const modeBtn = (id, label) => (
    <button
      onClick={() => switchMode(id)}
      className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
        editorMode === id
          ? 'bg-blue-600 text-white shadow'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
    >
      {label}
    </button>
  );

  /* ── Code tab helper ─────────────────────────────────────────────────── */
  const tabBtn = (id, label, color) => (
    <button
      onClick={() => setCodeTab(id)}
      className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
        codeTab === id ? `${color} text-white` : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
      }`}
    >
      {label}
    </button>
  );

  /* ────────────────────────────────────────────────────────────────────── */
  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* ── Header ── */}
      <header className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/adult/dashboard')}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            ← Dashboard
          </button>
          <div className="border-l border-gray-300 pl-3">
            <h1 className="text-base font-bold text-gray-900">💻 Code Playground</h1>
            <p className="text-[11px] text-gray-400">Experiment and practice</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Mode switcher */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {modeBtn('blocks', '🧩 Blocks')}
            {modeBtn('split',  '⚡ Split')}
            {modeBtn('code',   '📝 Code')}
          </div>

          <button
            onClick={clearAll}
            className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            🗑️ Clear
          </button>
          <button
            onClick={runCode}
            className="px-4 py-1.5 text-xs font-semibold bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            ▶ Run
          </button>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* LEFT PANEL — Blocks or Code editor */}
        {(editorMode === 'blocks' || editorMode === 'split') && (
          <div
            className="flex flex-col border-r border-gray-200 overflow-hidden"
            style={{ width: editorMode === 'split' ? '50%' : '100%' }}
          >
            {editorMode === 'blocks' ? (
              /* ── Full Blocks mode: blocks left, live code right ── */
              <div className="flex h-full">
                {/* Blockly workspace — takes ~60% */}
                <div className="flex flex-col" style={{ width: '60%', borderRight: '1px solid #e0e7ff' }}>
                  <div className="bg-indigo-50 border-b border-indigo-100 px-3 py-1.5 flex items-center justify-between shrink-0">
                    <span className="text-xs font-bold text-indigo-700">🧩 Block Editor</span>
                    <span className="text-[10px] text-indigo-400">Drag blocks to build code</span>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <AdultBlocklyEditor
                      height="100%"
                      initialXml={blocksXml}
                      onCodeChange={handleBlocksCode}
                      onXmlChange={handleBlocksXml}
                    />
                  </div>
                </div>
                {/* Live code panel — takes ~40% */}
                <div className="flex flex-col" style={{ width: '40%', background: '#0f172a' }}>
                  <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-700 shrink-0">
                    <span className="text-[11px] font-bold text-yellow-400">⚡ Generated JavaScript</span>
                    {syncing && (
                      <span className="text-[9px] bg-green-500 text-white px-1.5 py-0.5 rounded-full animate-pulse">syncing...</span>
                    )}
                  </div>
                  <pre
                    className="flex-1 p-3 font-mono text-[11px] text-yellow-300 overflow-auto whitespace-pre-wrap"
                    style={{ transition: 'opacity 0.15s', opacity: syncing ? 0.6 : 1 }}
                  >
                    {generatedJs || '// Drag blocks from the left panel\n// to see generated code here...'}
                  </pre>
                </div>
              </div>
            ) : (
              /* ── Split: Blocks on left ── */
              <div className="flex flex-col h-full">
                <div className="bg-indigo-50 border-b border-indigo-100 px-3 py-1 shrink-0">
                  <span className="text-xs font-bold text-indigo-700">🧩 Blocks</span>
                </div>
                <div className="flex-1 overflow-hidden">
                  <AdultBlocklyEditor
                    height="100%"
                    initialXml={blocksXml}
                    onCodeChange={handleBlocksCode}
                    onXmlChange={handleBlocksXml}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* RIGHT / MAIN PANEL */}
        <div
          className="flex flex-col overflow-hidden"
          style={{ width: editorMode === 'split' ? '50%' : editorMode === 'code' ? '100%' : '0%' }}
        >
          {/* ── Code editor panel (code mode only) ── */}
          {editorMode === 'code' && (
            <div className="flex flex-col" style={{ height: '55%', borderBottom: '1px solid #e5e7eb' }}>
              {/* Tab strip */}
              <div className="flex items-center gap-1 px-3 py-2 bg-gray-50 border-b border-gray-200 shrink-0">
                {tabBtn('html', 'HTML', 'bg-green-600')}
                {tabBtn('css',  'CSS',  'bg-blue-600')}
                {tabBtn('js',   'JS',   'bg-yellow-500')}
              </div>
              <div className="flex-1 overflow-hidden">
                {codeTab === 'html' && (
                  <div className="h-full p-2">
                    <CodeEditor value={htmlCode} onChange={setHtmlCode} language="html" height="calc(100% - 32px)" placeholder="<h1>Hello World</h1>" ariaLabel="HTML" />
                  </div>
                )}
                {codeTab === 'css' && (
                  <div className="h-full p-2">
                    <CodeEditor value={cssCode} onChange={setCssCode} language="css" height="calc(100% - 32px)" placeholder="h1 { color: blue; }" ariaLabel="CSS" />
                  </div>
                )}
                {codeTab === 'js' && (
                  <div className="h-full p-2">
                    <CodeEditor value={jsCode} onChange={setJsCode} language="javascript" height="calc(100% - 32px)" placeholder="console.log('Hello!');" ariaLabel="JavaScript" />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── In Split mode, show code tabs on the right too ── */}
          {editorMode === 'split' && (
            <div className="flex flex-col" style={{ height: '45%', borderBottom: '1px solid #e5e7eb' }}>
              <div className="flex items-center gap-1 px-3 py-2 bg-gray-50 border-b border-gray-200 shrink-0">
                {tabBtn('html', 'HTML', 'bg-green-600')}
                {tabBtn('css',  'CSS',  'bg-blue-600')}
                {tabBtn('js',   'JS',   'bg-yellow-500')}
                {codeTab === 'js' && generatedJs && (
                  <span
                    className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full font-bold text-white"
                    style={{
                      background: syncing ? '#22c55e' : '#6366f1',
                      transition: 'background 0.3s',
                    }}
                  >
                    {syncing ? '⚡ syncing' : '🧩 from blocks'}
                  </span>
                )}
              </div>
              <div className="flex-1 overflow-hidden">
                {codeTab === 'html' && (
                  <div className="h-full p-2">
                    <CodeEditor value={htmlCode} onChange={setHtmlCode} language="html" height="calc(100% - 32px)" ariaLabel="HTML" />
                  </div>
                )}
                {codeTab === 'css' && (
                  <div className="h-full p-2">
                    <CodeEditor value={cssCode} onChange={setCssCode} language="css" height="calc(100% - 32px)" ariaLabel="CSS" />
                  </div>
                )}
                {codeTab === 'js' && (
                  <div className="relative w-full h-full">
                    <pre
                      className="w-full h-full p-3 font-mono text-xs bg-gray-900 text-yellow-400 overflow-auto whitespace-pre-wrap m-0"
                      style={{ transition: 'opacity 0.15s', opacity: syncing ? 0.6 : 1 }}
                    >
                      {generatedJs || jsCode || '// JS will appear here from blocks...'}
                    </pre>
                    <div className="absolute top-2 right-2 flex items-center gap-1">
                      {syncing ? (
                        <span className="text-[9px] bg-green-500 text-white px-1.5 py-0.5 rounded-full animate-pulse">⚡ syncing</span>
                      ) : generatedJs ? (
                        <span className="text-[9px] bg-indigo-600 text-white px-1.5 py-0.5 rounded">🧩 from blocks</span>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Preview ── */}
          <div className="flex flex-col" style={{ height: editorMode === 'code' ? '35%' : '35%', borderBottom: '1px solid #e5e7eb' }}>
            <div className="flex items-center justify-between px-3 py-1.5 bg-gray-50 border-b border-gray-200 shrink-0">
              <span className="text-xs font-medium text-gray-700">🌐 Preview</span>
              <button
                onClick={() => {
                  const effectiveJs = editorMode === 'blocks' ? generatedJs : jsCode;
                  writeSrcdoc(htmlCode, cssCode, effectiveJs);
                }}
                className="text-[10px] px-2 py-0.5 bg-gray-200 hover:bg-gray-300 rounded"
              >
                Refresh
              </button>
            </div>
            <div className="flex-1 bg-white overflow-hidden">
              <iframe ref={iframeRef} title="preview" sandbox="allow-scripts"
                className="w-full h-full border-0" />
            </div>
          </div>

          {/* ── Console ── */}
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="flex items-center justify-between px-3 py-1.5 bg-gray-50 border-b border-gray-200 shrink-0">
              <span className="text-xs font-medium text-gray-700">📟 Console</span>
              <button onClick={() => setOutput('')} className="text-[10px] px-2 py-0.5 bg-gray-200 hover:bg-gray-300 rounded">
                Clear
              </button>
            </div>
            <pre className="flex-1 p-3 font-mono text-xs bg-gray-900 text-green-400 overflow-auto">
              {output || '// Output will appear here...'}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdultPlayground;
