import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { codeAPI, codeHistoryAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import {
  CODE_LANGUAGES, availableLanguages, defineTurtleBlocks, getToolbox, workspaceToCode, xmlToCode,
} from '../playground/blocks';
import { TEMPLATES, GUIDED_CHALLENGES } from '../playground/templates';
import { createTurtle } from '../playground/turtle';

const STORAGE = { code: 'playground_code', blocks: 'playground_blocks', mode: 'playground_mode', visited: 'playground_visited', lang: 'playground_view_lang' };
const store = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* ignore */ } },
};

// Code that draws with the browser canvas API directly runs in the page; everything else
// (including all turtle code) runs in the server sandbox.
const usesCanvasApi = (code) => /document\.getElementById|getContext\(|ctx\.(arc|fillRect|stroke)/.test(code);

const Playground = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { notify, confirm } = useToast();

  const [code, setCode] = useState(() => store.get(STORAGE.code) || '');
  const [output, setOutput] = useState('');
  const [hasError, setHasError] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [editorMode, setEditorMode] = useState(() => (store.get(STORAGE.mode) === 'code' ? 'code' : 'blocks'));
  const [viewLang, setViewLang] = useState(() => store.get(STORAGE.lang) || 'javascript');
  const [blocksVersion, setBlocksVersion] = useState(0);
  const [blocklyState, setBlocklyState] = useState('loading'); // loading | ready | unavailable
  const [panel, setPanel] = useState(null); // 'templates' | 'guided' | null
  const [guided, setGuided] = useState(null);
  const [guidedStep, setGuidedStep] = useState(0);
  const [showTutorial, setShowTutorial] = useState(() => !store.get(STORAGE.visited));

  const canvasRef = useRef(null);
  const overlayRef = useRef(null);
  const turtleRef = useRef(null);
  const blocklyDivRef = useRef(null);
  const workspaceRef = useRef(null);
  const savedXmlRef = useRef(store.get(STORAGE.blocks));
  const lastGeneratedRef = useRef(null); // JS last produced from blocks

  // ---------- Turtle canvas ----------
  useEffect(() => {
    if (canvasRef.current) turtleRef.current = createTurtle(canvasRef.current, overlayRef.current);
  }, []);

  // ---------- Blockly ----------
  const saveWorkspaceXml = useCallback(() => {
    const B = window.Blockly;
    const ws = workspaceRef.current;
    if (!B || !ws) return;
    const xml = B.Xml.domToText(B.Xml.workspaceToDom(ws));
    savedXmlRef.current = xml;
    store.set(STORAGE.blocks, xml);
  }, []);

  const syncFromBlocks = useCallback(() => {
    const ws = workspaceRef.current;
    if (!ws) return;
    const js = workspaceToCode(ws, 'javascript');
    lastGeneratedRef.current = js;
    setCode(js);
    store.set(STORAGE.code, js);
    saveWorkspaceXml();
    setBlocksVersion(v => v + 1);
  }, [saveWorkspaceXml]);

  const injectBlockly = useCallback(() => {
    const B = window.Blockly;
    if (!B || !blocklyDivRef.current || workspaceRef.current) return;
    defineTurtleBlocks();

    // Blockly may try to write a cookie; in sandboxed previews that throws. Ignore it.
    const cookieDesc = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie');
    try {
      Object.defineProperty(document, 'cookie', {
        configurable: true,
        get: cookieDesc?.get,
        set(v) { try { cookieDesc?.set?.call(document, v); } catch (e) { if (e?.name !== 'SecurityError') throw e; } },
      });
    } catch { /* ignore */ }

    try {
      const ws = B.inject(blocklyDivRef.current, {
        toolbox: getToolbox(),
        renderer: 'zelos',
        trashcan: true,
        sounds: false,
        scrollbars: true,
        move: { scrollbars: true, drag: true, wheel: false },
        zoom: { controls: true, wheel: true, startScale: 0.75, maxScale: 1.5, minScale: 0.4 },
        grid: { spacing: 24, length: 2, colour: '#e2e8f0', snap: true },
      });
      workspaceRef.current = ws;
      if (savedXmlRef.current) {
        try { B.Xml.domToWorkspace(B.utils.xml.textToDom(savedXmlRef.current), ws); } catch (e) { console.error('Could not restore blocks:', e); }
      }
      ws.addChangeListener((e) => {
        if (e.isUiEvent || ws.isDragging()) return;
        syncFromBlocks();
      });
      syncFromBlocks();
      setBlocklyState('ready');
    } catch (e) {
      console.error('Blockly init error:', e);
      setBlocklyState('unavailable');
    } finally {
      try { if (cookieDesc) delete document.cookie; } catch { /* ignore */ }
    }
  }, [syncFromBlocks]);

  // Wait for the Blockly CDN script, then inject when in blocks mode.
  useEffect(() => {
    if (editorMode !== 'blocks') return undefined;
    let tries = 0;
    const timer = setInterval(() => {
      if (window.Blockly && blocklyDivRef.current) {
        clearInterval(timer);
        injectBlockly();
      } else if (++tries > 40) {
        clearInterval(timer);
        setBlocklyState('unavailable');
      }
    }, 150);
    return () => clearInterval(timer);
  }, [editorMode, injectBlockly]);

  // Dispose the workspace when leaving blocks mode or the page.
  useEffect(() => {
    if (editorMode === 'blocks') return undefined;
    if (workspaceRef.current) {
      saveWorkspaceXml();
      workspaceRef.current.dispose();
      workspaceRef.current = null;
    }
    return undefined;
  }, [editorMode, saveWorkspaceXml]);

  useEffect(() => () => {
    if (workspaceRef.current) { workspaceRef.current.dispose(); workspaceRef.current = null; }
  }, []);

  useEffect(() => { store.set(STORAGE.mode, editorMode); }, [editorMode]);
  useEffect(() => { store.set(STORAGE.lang, viewLang); }, [viewLang]);

  // ---------- Running ----------
  const runCodeString = useCallback(async (source) => {
    const turtle = turtleRef.current;
    setIsRunning(true);
    setHasError(false);
    setOutput(t('pg.running'));
    turtle?.reset();
    try {
      if (!source.trim()) {
        setOutput(t('pg.nothingToRun'));
        return;
      }
      if (usesCanvasApi(source)) {
        const lines = [];
        const originalLog = console.log;
        console.log = (...args) => lines.push(args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '));
        try {
          // eslint-disable-next-line no-new-func
          new Function(source)();
          setOutput(lines.join('\n') || t('pg.ranOk'));
        } catch (err) {
          setOutput('❌ ' + err.message);
          setHasError(true);
        } finally {
          console.log = originalLog;
        }
        return;
      }
      const res = await codeAPI.runCode(source, 'javascript');
      const out = Array.isArray(res.data.output) ? res.data.output.join('\n') : res.data.output;
      setOutput(out || (res.data.turtleCommands?.length ? t('pg.drawingDone') : t('pg.ranOk')));
      setHasError(!!res.data.error);
      if (res.data.turtleCommands?.length) await turtle?.run(res.data.turtleCommands, { animate: true });
    } catch (err) {
      setOutput('❌ ' + t('pg.runFailed') + '\n' + (err.response?.data?.error || err.message));
      setHasError(true);
    } finally {
      setIsRunning(false);
      store.set(STORAGE.code, source);
    }
  }, [t]);

  const runCode = useCallback(() => runCodeString(code), [runCodeString, code]);

  // ---------- Editor modes ----------
  const typedCodeDiffers = () => code.trim() && code !== lastGeneratedRef.current;

  const switchEditorMode = async (mode) => {
    if (mode === editorMode) return;
    if (mode === 'blocks' && typedCodeDiffers()) {
      const ok = await confirm({
        title: t('pg.switchTitle'),
        message: t('pg.switchText'),
        confirmLabel: t('pg.switchYes'),
        icon: '🧩',
      });
      if (!ok) return;
    }
    if (mode === 'blocks') setBlocklyState('loading');
    setEditorMode(mode);
  };

  // ---------- Templates ----------
  const loadTemplate = (tpl) => {
    const B = window.Blockly;
    if (!B) {
      notify(t('pg.blocksUnavailable'), 'error');
      return;
    }
    const js = xmlToCode(tpl.blocks, 'javascript');
    savedXmlRef.current = tpl.blocks;
    store.set(STORAGE.blocks, tpl.blocks);
    lastGeneratedRef.current = js;
    setCode(js);
    const ws = workspaceRef.current;
    if (editorMode === 'blocks' && ws) {
      B.Events.disable();
      try {
        ws.clear();
        B.Xml.domToWorkspace(B.utils.xml.textToDom(tpl.blocks), ws);
      } finally {
        B.Events.enable();
      }
      ws.scrollCenter();
      setBlocksVersion(v => v + 1);
    }
    setPanel(null);
    exitGuided(true);
    runCodeString(js);
  };

  // ---------- Guided challenges ----------
  const startGuided = (challenge) => {
    setGuided(challenge);
    setGuidedStep(0);
    setPanel(null);
    if (editorMode !== 'code') setEditorMode('code');
  };

  const exitGuided = (silent) => {
    setGuided(null);
    setGuidedStep(0);
    if (!silent) setOutput('');
  };

  const checkGuidedStep = () => {
    if (!guided) return;
    const step = guided.steps[guidedStep];
    if (!step.check(code)) {
      setHasError(true);
      setOutput('💡 ' + step.hint);
      return;
    }
    setHasError(false);
    if (guidedStep < guided.steps.length - 1) {
      setGuidedStep(guidedStep + 1);
      notify(t('pg.stepDone'), 'success');
    } else {
      notify(t('pg.challengeDone', { name: guided.title }), 'success');
      runCodeString(code);
      exitGuided(true);
    }
  };

  // ---------- Save / clear ----------
  const saveCode = useCallback(async () => {
    try {
      store.set(STORAGE.code, code);
      if (workspaceRef.current) saveWorkspaceXml();
      await codeHistoryAPI.saveCode({
        title: `${t('pg.title')} – ${new Date().toLocaleString()}`,
        code,
        blocks_xml: editorMode === 'blocks' || !typedCodeDiffers() ? savedXmlRef.current : null,
        language: 'javascript',
        source: 'playground',
      });
      notify(t('pg.saved'), 'success');
    } catch (error) {
      console.error('Error saving code:', error);
      notify(t('pg.savedLocally'), 'warning');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, editorMode, notify, saveWorkspaceXml, t]);

  const clearAll = async () => {
    const ok = await confirm({ title: t('pg.clearTitle'), message: t('pg.clearText'), confirmLabel: t('pg.clearYes'), danger: true, icon: '🧹' });
    if (!ok) return;
    setCode('');
    lastGeneratedRef.current = '';
    savedXmlRef.current = null;
    store.set(STORAGE.code, null);
    store.set(STORAGE.blocks, null);
    workspaceRef.current?.clear();
    turtleRef.current?.reset();
    setOutput('');
    setHasError(false);
  };

  // ---------- Keyboard shortcuts ----------
  const shortcutsRef = useRef({});
  shortcutsRef.current = { runCode, saveCode };
  useEffect(() => {
    const onKey = (e) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key === 'Enter') { e.preventDefault(); shortcutsRef.current.runCode(); }
      if (e.key === 's' || e.key === 'S') { e.preventDefault(); shortcutsRef.current.saveCode(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ---------- Code in other languages ----------
  const langs = blocklyState === 'unavailable' ? [] : (window.Blockly ? availableLanguages() : CODE_LANGUAGES);
  const blocksBacked = editorMode === 'blocks' || (code === lastGeneratedRef.current && !!savedXmlRef.current);
  const translated = useMemo(() => {
    if (!window.Blockly || !blocksBacked) return '';
    if (editorMode === 'blocks' && workspaceRef.current) return workspaceToCode(workspaceRef.current, viewLang);
    return xmlToCode(savedXmlRef.current, viewLang);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocksVersion, viewLang, editorMode, blocksBacked, code]);

  const copyTranslated = async () => {
    try {
      await navigator.clipboard.writeText(translated);
      notify(t('pg.copied'), 'success');
    } catch {
      notify(t('socialUi.somethingWrong'), 'error');
    }
  };

  const closeTutorial = (showTemplates) => {
    setShowTutorial(false);
    store.set(STORAGE.visited, 'true');
    if (showTemplates) setPanel('templates');
  };

  const step = guided?.steps[guidedStep];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 md:py-8">
      {/* ===== First-visit tutorial ===== */}
      {showTutorial && (
        <div className="modal-backdrop">
          <div className="modal-card animate-pop" style={{ maxWidth: 560, textAlign: 'left' }} role="dialog" aria-modal="true" aria-labelledby="pg-tut-title">
            <div className="text-center mb-4">
              <div className="text-5xl mb-2" aria-hidden="true">🎨</div>
              <h2 id="pg-tut-title" className="font-display text-3xl text-slate-800">{t('pg.tutTitle')}</h2>
            </div>
            <ol className="space-y-3 mb-6">
              {[
                ['🧩', t('pg.tut1Title'), t('pg.tut1Text')],
                ['▶️', t('pg.tut2Title'), t('pg.tut2Text')],
                ['🌍', t('pg.tut3Title'), t('pg.tut3Text')],
                ['📋', t('pg.tut4Title'), t('pg.tut4Text')],
              ].map(([icon, title, text]) => (
                <li key={title} className="flex gap-3 items-start bg-slate-50 rounded-2xl p-3">
                  <span className="text-2xl" aria-hidden="true">{icon}</span>
                  <span>
                    <span className="block font-extrabold text-slate-800">{title}</span>
                    <span className="block text-sm text-slate-600">{text}</span>
                  </span>
                </li>
              ))}
            </ol>
            <div className="flex flex-col sm:flex-row gap-3">
              <button type="button" className="kid-go-btn flex-1" onClick={() => closeTutorial(true)} autoFocus>📋 {t('pg.tutTemplates')}</button>
              <button type="button" className="btn-secondary flex-1 justify-center" onClick={() => closeTutorial(false)}>{t('pg.tutStart')}</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Header ===== */}
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-5">
        <div>
          <h1 className="page-title mb-1">🎨 {t('pg.title')}</h1>
          <p className="text-slate-600 font-semibold">{t('pg.subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setPanel(panel === 'templates' ? null : 'templates')} className={`tab-btn ${panel === 'templates' ? 'active' : ''}`}>📋 {t('pg.templates')}</button>
          <button type="button" onClick={() => setPanel(panel === 'guided' ? null : 'guided')} className={`tab-btn ${panel === 'guided' ? 'active' : ''}`}>🎯 {t('pg.challenges')}</button>
          <button type="button" onClick={saveCode} className="tab-btn">💾 {t('pg.save')}</button>
          <button type="button" onClick={() => navigate('/code-history')} className="tab-btn">📜 {t('pg.myCode')}</button>
          <button type="button" onClick={clearAll} className="tab-btn">🧹 {t('pg.clear')}</button>
          <button type="button" onClick={() => setShowTutorial(true)} className="tab-btn" aria-label={t('pg.help')}>❓</button>
        </div>
      </header>

      {/* ===== Templates ===== */}
      {panel === 'templates' && (
        <section className="card p-5 mb-6" aria-labelledby="tpl-title">
          <h2 id="tpl-title" className="font-display text-xl text-slate-800 mb-1">📋 {t('pg.templates')}</h2>
          <p className="text-sm text-slate-600 mb-4">{t('pg.templatesHelp')}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {TEMPLATES.map(tpl => (
              <button key={tpl.id} type="button" onClick={() => loadTemplate(tpl)} className="kid-tile kid-tile-purple" style={{ minHeight: 96 }}>
                <span className="text-4xl" aria-hidden="true">{tpl.icon}</span>
                <span className="text-sm">{t(tpl.nameKey)}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ===== Guided challenge picker ===== */}
      {panel === 'guided' && (
        <section className="card p-5 mb-6" aria-labelledby="guided-title">
          <h2 id="guided-title" className="font-display text-xl text-slate-800 mb-1">🎯 {t('pg.challenges')}</h2>
          <p className="text-sm text-slate-600 mb-4">{t('pg.challengesHelp')}</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {GUIDED_CHALLENGES.map(ch => (
              <button key={ch.id} type="button" onClick={() => startGuided(ch)} className="lesson-row" style={{ alignItems: 'flex-start', flexDirection: 'column', gap: 4 }}>
                <span className="font-extrabold text-slate-800">{ch.title}</span>
                <span className="text-sm text-slate-600">{ch.description}</span>
                <span className="text-xs font-extrabold text-indigo-600">{t('pg.steps', { n: ch.steps.length })}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ===== Active guided challenge ===== */}
      {guided && step && (
        <section className="card p-5 mb-6" style={{ borderColor: '#fcd34d', boxShadow: '0 8px 0 #fcd34d' }} aria-labelledby="guided-step-title">
          <div className="flex justify-between items-start gap-3 mb-3">
            <div>
              <div className="text-xs font-extrabold uppercase tracking-wide text-amber-600">🎯 {guided.title}</div>
              <h2 id="guided-step-title" className="font-display text-xl text-slate-800">
                {t('pg.stepOf', { n: guidedStep + 1, total: guided.steps.length })}: {step.title}
              </h2>
            </div>
            <button type="button" onClick={() => exitGuided(false)} className="btn-secondary text-sm py-1 px-3">✕ {t('ui.close')}</button>
          </div>
          <div className="flex gap-1 mb-3" aria-hidden="true">
            {guided.steps.map((_, i) => (
              <div key={i} className={`flex-1 h-2 rounded-full ${i < guidedStep ? 'bg-green-500' : i === guidedStep ? 'bg-amber-400' : 'bg-slate-200'}`} />
            ))}
          </div>
          <div className="text-slate-700 font-semibold mb-4 leading-relaxed" dangerouslySetInnerHTML={{ __html: step.instruction }} />
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={checkGuidedStep} className="btn-primary text-sm py-2">
              {guidedStep === guided.steps.length - 1 ? `🎉 ${t('pg.finish')}` : `✓ ${t('pg.checkStep')}`}
            </button>
            <button type="button" onClick={() => setCode(step.example)} className="btn-secondary text-sm py-2">💡 {t('pg.showMe')}</button>
          </div>
        </section>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* ===== Left: editor ===== */}
        <div className="space-y-4 min-w-0">
          <section className="card p-4 md:p-5" aria-label={t('pg.editor')}>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div className="tab-bar" style={{ marginBottom: 0 }} role="tablist" aria-label={t('pg.editor')}>
                <button type="button" role="tab" aria-selected={editorMode === 'blocks'} onClick={() => switchEditorMode('blocks')} className={`tab-btn ${editorMode === 'blocks' ? 'active' : ''}`}>🧩 {t('pg.blocks')}</button>
                <button type="button" role="tab" aria-selected={editorMode === 'code'} onClick={() => switchEditorMode('code')} className={`tab-btn ${editorMode === 'code' ? 'active' : ''}`}>⌨️ {t('pg.typeCode')}</button>
              </div>
              <button type="button" onClick={runCode} disabled={isRunning} className="kid-go-btn" style={{ minHeight: 48, fontSize: '1.2rem', padding: '8px 24px' }}>
                ▶ {isRunning ? t('pg.running') : t('pg.run')}
              </button>
            </div>

            {editorMode === 'blocks' ? (
              <div className="relative">
                <div ref={blocklyDivRef} className="rounded-2xl overflow-hidden border-2 border-slate-200" style={{ width: '100%', height: 480 }} />
                {blocklyState !== 'ready' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 rounded-2xl text-center p-6">
                    {blocklyState === 'loading' ? (
                      <p className="font-bold text-slate-600">🧩 {t('pg.loadingBlocks')}</p>
                    ) : (
                      <>
                        <p className="font-bold text-slate-700 mb-3">😕 {t('pg.blocksUnavailable')}</p>
                        <button type="button" className="btn-secondary text-sm" onClick={() => setEditorMode('code')}>⌨️ {t('pg.typeCode')}</button>
                      </>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <>
                <label htmlFor="pg-code" className="sr-only">{t('pg.typeCode')}</label>
                <textarea
                  id="pg-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full p-4 font-code text-sm bg-slate-900 text-green-300 rounded-2xl border-2 border-slate-700 focus:border-indigo-400 outline-none resize-y"
                  style={{ height: 480 }}
                  spellCheck="false"
                  placeholder={t('pg.codePlaceholder')}
                />
                <p className="text-xs text-slate-500 font-semibold mt-2">⌨️ {t('pg.codeModeHint')}</p>
              </>
            )}
          </section>

          {/* ===== Your program in other languages ===== */}
          <section className="card p-4 md:p-5" aria-labelledby="langs-title">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h2 id="langs-title" className="font-display text-xl text-slate-800">🌍 {t('pg.inLanguages')}</h2>
              {translated && (
                <button type="button" onClick={copyTranslated} className="btn-secondary text-xs py-1 px-3">📋 {t('pg.copy')}</button>
              )}
            </div>
            {blocksBacked && langs.length > 0 ? (
              <>
                <div className="flex flex-wrap gap-2 mb-3" role="tablist" aria-label={t('pg.inLanguages')}>
                  {langs.map(l => (
                    <button key={l.id} type="button" role="tab" aria-selected={viewLang === l.id} onClick={() => setViewLang(l.id)} className={`tab-btn text-sm ${viewLang === l.id ? 'active' : ''}`} style={{ padding: '6px 12px' }}>
                      {l.label}
                    </button>
                  ))}
                </div>
                <pre className="text-xs md:text-sm" style={{ maxHeight: 320, overflow: 'auto', margin: 0 }}>
                  {translated || t('pg.emptyProgram')}
                </pre>
                <p className="text-xs text-slate-500 font-semibold mt-2">{t(`pg.langNote.${viewLang}`)}</p>
              </>
            ) : (
              <p className="text-slate-600 font-semibold">{t('pg.langsNeedBlocks')}</p>
            )}
          </section>
        </div>

        {/* ===== Right: drawing + output ===== */}
        <div className="space-y-4 min-w-0">
          <section className="card p-4 md:p-5" aria-labelledby="canvas-title">
            <div className="flex justify-between items-center mb-3">
              <h2 id="canvas-title" className="font-display text-xl text-slate-800">🐢 {t('pg.drawing')}</h2>
              <button type="button" onClick={() => turtleRef.current?.reset()} className="btn-secondary text-xs py-1 px-3">↺ {t('pg.resetTurtle')}</button>
            </div>
            <div className="relative w-full" style={{ aspectRatio: '4 / 3' }}>
              <canvas ref={canvasRef} id="turtleCanvas" width={400} height={300} className="absolute inset-0 w-full h-full" aria-label={t('pg.drawing')} role="img" />
              <canvas ref={overlayRef} width={400} height={300} className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true" />
            </div>
          </section>

          <section className="card p-4 md:p-5" aria-labelledby="out-title">
            <h2 id="out-title" className="font-display text-xl text-slate-800 mb-3">📤 {t('pg.output')}</h2>
            <div className={`output-panel ${hasError ? 'has-error' : ''}`} role="status" aria-live="polite">
              {output || t('pg.outputPlaceholder')}
            </div>
          </section>

          <section className="card p-4 md:p-5 bg-green-50" aria-labelledby="ref-title">
            <h2 id="ref-title" className="font-extrabold text-slate-800 mb-2">🐢 {t('pg.commands')}</h2>
            <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1 text-sm text-slate-700">
              <div><code>forward(100)</code> {t('pg.cmdForward')}</div>
              <div><code>backward(50)</code> {t('pg.cmdBackward')}</div>
              <div><code>right(90)</code> {t('pg.cmdRight')}</div>
              <div><code>left(90)</code> {t('pg.cmdLeft')}</div>
              <div><code>arc(50, 180)</code> {t('pg.cmdArc')}</div>
              <div><code>color("red")</code> {t('pg.cmdColor')}</div>
              <div><code>penUp()</code> {t('pg.cmdPenUp')}</div>
              <div><code>penDown()</code> {t('pg.cmdPenDown')}</div>
            </div>
            <p className="text-xs text-slate-500 font-semibold mt-3">⌨️ {t('pg.shortcuts')}</p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Playground;
