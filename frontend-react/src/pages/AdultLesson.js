import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdultBlocklyEditor from '../components/AdultBlocklyEditor';

const loadLessonState = (lessonId) => {
  try { return JSON.parse(localStorage.getItem(`adult_lesson_state_${lessonId}`)) || {}; } catch { return {}; }
};

const AdultLesson = () => {
  const { lessonId } = useParams();
  const navigate = useNavigate();

  // Load persisted state for this specific lesson
  const saved = loadLessonState(lessonId);

  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Code states — restored from localStorage or defaulted to empty
  const [htmlCode, setHtmlCode] = useState(saved.htmlCode ?? '');
  const [cssCode, setCssCode]   = useState(saved.cssCode   ?? '');
  const [jsCode, setJsCode]     = useState(saved.jsCode    ?? '');
  const [editorMode, setEditorMode] = useState(saved.editorMode ?? 'blocks'); // 'blocks' | 'code'
  // Blocks state
  const [generatedJs, setGeneratedJs] = useState(saved.generatedJs ?? '');
  const [blocksXml,   setBlocksXml]   = useState(saved.blocksXml   ?? '');
  // Live sync indicator
  const [syncing, setSyncing]   = useState(false);
  const syncTimerRef            = useRef(null);
  // Right-panel view in blocks mode: 'js' | 'html' | 'css'
  const [codeView, setCodeView] = useState('js');

  // Preview and execution
  const [output, setOutput] = useState('');
  const iframeRef = useRef(null);

  // Toast notification
  const [toast, setToast] = useState(null); // { type: 'success'|'error', msg }
  const showToast = useCallback((type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // ── Persist editor state to localStorage whenever it changes ────────────────
  useEffect(() => {
    try {
      localStorage.setItem(`adult_lesson_state_${lessonId}`, JSON.stringify({
        htmlCode, cssCode, jsCode, editorMode, generatedJs, blocksXml,
      }));
    } catch (_) {}
  }, [lessonId, htmlCode, cssCode, jsCode, editorMode, generatedJs, blocksXml]);

  // Session tracking
  const [sessionStart] = useState(new Date().toISOString());
  const [timeSpent, setTimeSpent] = useState(0);

  useEffect(() => {
    loadLesson();
    
    // Track time spent
    const timer = setInterval(() => {
      setTimeSpent(prev => prev + 1);
    }, 1000);
    
    return () => clearInterval(timer);
  }, [lessonId]);

  useEffect(() => {
    updatePreview();
  }, [htmlCode, cssCode, jsCode]);

  const loadLesson = async () => {
    try {
      const token = localStorage.getItem('adult_token');
      const response = await fetch(`/api/adult/lesson/${lessonId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load lesson');
      }

      const data = await response.json();
      setLesson(data.lesson);
      
      // Load saved code or starter code
      if (data.lesson.last_code) {
        try {
          const savedCode = JSON.parse(data.lesson.last_code);
          setHtmlCode(savedCode.html || '');
          setCssCode(savedCode.css || '');
          setJsCode(savedCode.js || '');
        } catch (e) {
          // If not JSON, treat as plain code
          setHtmlCode(data.lesson.last_code || '');
        }
      } else if (data.lesson.example_code) {
        setHtmlCode(data.lesson.example_code);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updatePreview = () => {
    if (!iframeRef.current) return;
    // Code mode uses typed JS; Blocks mode prefers block-generated JS
    const effectiveJs = editorMode === 'code' ? jsCode : (generatedJs || jsCode);

    const previewDocument = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <script>
            // Suppress SecurityError from browser extensions trying to set cookies
            // inside this sandboxed iframe (harmless — sandbox is working correctly).
            window.addEventListener('error', function(e) {
              if (e.error instanceof DOMException && e.error.name === 'SecurityError' && e.message && e.message.includes('cookie')) {
                e.preventDefault(); e.stopImmediatePropagation(); return true;
              }
            }, true);
            window.addEventListener('unhandledrejection', function(e) {
              if (e.reason instanceof DOMException && e.reason.name === 'SecurityError' && e.reason.message && e.reason.message.includes('cookie')) {
                e.preventDefault(); e.stopImmediatePropagation();
              }
            }, true);
          <\/script>
          <style>
            body {
              margin: 0;
              padding: 20px;
              font-family: system-ui, -apple-system, sans-serif;
            }
            ${cssCode}
          </style>
        </head>
        <body>
          ${htmlCode}
          <script>
            (function() {
              const oldLog = console.log;
              console.log = function(...args) {
                window.parent.postMessage({
                  type: 'console',
                  message: args.join(' ')
                }, '*');
                oldLog.apply(console, args);
              };
              
              // Capture errors
              window.onerror = function(msg, url, line, col, error) {
                window.parent.postMessage({
                  type: 'error',
                  message: msg + ' (Line ' + line + ')'
                }, '*');
                return false;
              };
            })();
            
            try {
              ${effectiveJs}
            } catch (e) {
              window.parent.postMessage({
                type: 'error',
                message: e.message
              }, '*');
            }
          <\/script>
        </body>
      </html>
    `;

    // Blank first, then set new doc in next task — forces clean iframe reload
    iframeRef.current.srcdoc = '';
    setTimeout(() => { if (iframeRef.current) iframeRef.current.srcdoc = previewDocument; }, 0);
  };

  // Listen for console messages and editor exports from iframe
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data?.type === 'console') {
        setOutput(prev => prev + '\n' + event.data.message);
      } else if (event.data?.type === 'error') {
        setOutput(prev => prev + '\n❌ Error: ' + event.data.message);
      } else if (event.data?.type === 'html_export') {
        // REPLACE with the running total accumulated via window.__blk_html__ in the iframe
        // (prevents keystroke-per-character history build-up)
        setHtmlCode(event.data.html);
      } else if (event.data?.type === 'css_export') {
        setCssCode(event.data.css);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const runCode = () => {
    setOutput('Running...\n');
    // Clear html_export accumulation so each Run starts fresh
    setHtmlCode('');
    updatePreview();
  };

  // When switching modes, sync generated JS → JS editor
  const switchEditorMode = (mode) => {
    if (mode === 'code' && editorMode === 'blocks' && generatedJs) {
      setJsCode(generatedJs);
    }
    setEditorMode(mode);
  };

  // Blockly callbacks — flash syncing indicator and auto-switch code view
  const handleBlocksCode = useCallback((code) => {
    setGeneratedJs(code);
    setSyncing(true);
    // Auto-select the code view panel based on which export blocks are used
    if (code.includes('__blk_html__')) {
      setCodeView('html');
    } else if (code.includes("type:'css_export'")) {
      setCodeView('css');
    } else {
      setCodeView('js');
    }
    clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => setSyncing(false), 600);
  }, []);
  const handleBlocksXml = useCallback((xml) => setBlocksXml(xml), []);

  const clearOutput = () => {
    setOutput('');
  };

  const saveProgress = async (completed = false) => {
    try {
      const token = localStorage.getItem('adult_token');

      // Save code — use correct field names that match the DB schema
      const codeData = JSON.stringify({ html: htmlCode, css: cssCode, js: jsCode });

      const progressRes = await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module_id: lesson.module_id,
          lesson_id: parseInt(lessonId),
          completed: completed ? 1 : 0,
          last_code: codeData,
          score: completed ? 100 : 0
        })
      });

      if (!progressRes.ok) throw new Error('Failed to save progress');

      // Log learning hours for adult learners
      const durationMinutes = Math.max(1, Math.floor(timeSpent / 60));
      await fetch('/api/adult/hours', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moduleId: lesson.module_id,
          lessonId: parseInt(lessonId),
          sessionStart,
          sessionEnd: new Date().toISOString(),
          durationMinutes,
          activityType: 'lesson'
        })
      }).catch(() => {}); // Hours logging is best-effort

      if (completed) {
        showToast('success', '✅ Lesson completed! Great work!');
        setTimeout(() => navigate(`/adult/module/${lesson.module_id}`), 1200);
      } else {
        showToast('success', '💾 Progress saved!');
      }
    } catch (err) {
      showToast('error', '❌ Failed to save progress. Please try again.');
      console.error(err);
    }
  };

  const loadExample = () => {
    if (lesson?.example_code) {
      setHtmlCode(lesson.example_code);
      setCssCode('');
      setJsCode('');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <div className="text-gray-600">Loading lesson...</div>
        </div>
      </div>
    );
  }

  if (error || !lesson) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">❌</div>
          <div className="text-gray-600">{error || 'Lesson not found'}</div>
          <button
            onClick={() => navigate('/adult/dashboard')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-lg shadow-lg text-sm font-medium transition-all
          ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.msg}
        </div>
      )}
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(`/adult/module/${lesson.module_id}`)}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                ← Back to Module
              </button>
              <div className="border-l border-gray-300 pl-4">
                <h1 className="text-xl font-bold text-gray-900">
                  {lesson.title}
                </h1>
                <p className="text-xs text-gray-500">
                  {lesson.module_title} • {Math.floor(timeSpent / 60)}m {timeSpent % 60}s
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => saveProgress(false)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                💾 Save
              </button>
              <button
                onClick={() => saveProgress(true)}
                className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                ✓ Complete
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left: Instructions */}
          <div className="space-y-6">
            {/* Lesson Content */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-3">📚 Lesson Content</h2>
              <div className="prose prose-sm max-w-none">
                <p className="text-gray-700 whitespace-pre-wrap">{lesson.content}</p>
              </div>
            </div>

            {/* Challenge */}
            <div className="bg-blue-50 rounded-xl border-2 border-blue-200 p-6">
              <h2 className="text-lg font-bold text-blue-900 mb-3">🎯 Challenge</h2>
              <div className="prose prose-sm max-w-none">
                <p className="text-blue-800 whitespace-pre-wrap">{lesson.challenge}</p>
              </div>
            </div>

            {/* Hints */}
            {lesson.hints && (
              <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-6">
                <h2 className="text-lg font-bold text-yellow-900 mb-3">💡 Hints</h2>
                <div className="text-sm text-yellow-800">
                  {JSON.parse(lesson.hints).map((hint, index) => (
                    <div key={index} className="mb-2">
                      • {hint}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Example Code */}
            {lesson.example_code && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex justify-between items-center mb-3">
                  <h2 className="text-lg font-bold text-gray-900">📝 Example Code</h2>
                  <button
                    onClick={loadExample}
                    className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
                  >
                    Load Example
                  </button>
                </div>
                <pre className="text-xs bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto">
                  {lesson.example_code}
                </pre>
              </div>
            )}
          </div>

          {/* Right: Code Editor & Preview */}
          <div className="space-y-6">
            {/* Editor Mode Toggle */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <button
                    onClick={() => switchEditorMode('blocks')}
                    className={`px-4 py-2 rounded-lg font-medium transition ${
                      editorMode === 'blocks'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    🧩 Blocks
                  </button>
                  <button
                    onClick={() => switchEditorMode('code')}
                    className={`px-4 py-2 rounded-lg font-medium transition ${
                      editorMode === 'code'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    💻 Code
                  </button>
                </div>
                <button
                  onClick={runCode}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                >
                  ▶ Run
                </button>
              </div>
            </div>

            {/* Code Editors */}
            {editorMode === 'code' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* HTML Editor */}
                <div className="border-b border-gray-200">
                  <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                    <span className="text-sm font-medium text-gray-700">HTML</span>
                  </div>
                  <textarea
                    value={htmlCode}
                    onChange={(e) => setHtmlCode(e.target.value)}
                    className="w-full h-32 p-4 font-mono text-sm bg-gray-900 text-green-400 resize-none focus:outline-none"
                    placeholder="<h1>Hello World</h1>"
                    spellCheck="false"
                  />
                </div>

                {/* CSS Editor */}
                <div className="border-b border-gray-200">
                  <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                    <span className="text-sm font-medium text-gray-700">CSS</span>
                  </div>
                  <textarea
                    value={cssCode}
                    onChange={(e) => setCssCode(e.target.value)}
                    className="w-full h-32 p-4 font-mono text-sm bg-gray-900 text-blue-400 resize-none focus:outline-none"
                    placeholder="h1 { color: blue; }"
                    spellCheck="false"
                  />
                </div>

                {/* JavaScript Editor */}
                <div>
                  <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                    <span className="text-sm font-medium text-gray-700">JavaScript</span>
                  </div>
                  <textarea
                    value={jsCode}
                    onChange={(e) => setJsCode(e.target.value)}
                    className="w-full h-32 p-4 font-mono text-sm bg-gray-900 text-yellow-400 resize-none focus:outline-none"
                    placeholder="console.log('Hello!');"
                    spellCheck="false"
                  />
                </div>
              </div>
            )}

            {/* Blocks Editor — two-column: workspace left, live code right */}
            {editorMode === 'blocks' && (
              <div className="bg-white rounded-xl shadow-sm border border-indigo-200 overflow-hidden">
                {/* Header */}
                <div className="bg-indigo-50 px-4 py-2 border-b border-indigo-100 flex items-center justify-between">
                  <span className="text-sm font-bold text-indigo-700">🧩 Block Editor</span>
                  <div className="flex items-center gap-2">
                    {syncing && (
                      <span className="text-[10px] bg-green-500 text-white px-2 py-0.5 rounded-full animate-pulse">⚡ syncing...</span>
                    )}
                    {generatedJs && !syncing && (
                      <button
                        onClick={() => switchEditorMode('code')}
                        className="text-xs px-2 py-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded"
                      >
                        Edit as Code →
                      </button>
                    )}
                  </div>
                </div>
                {/* Two-column body */}
                <div className="flex" style={{ minHeight: '380px' }}>
                  {/* Left: Blockly workspace */}
                  <div className="flex-1 overflow-hidden" style={{ borderRight: '1px solid #e0e7ff' }}>
                    <AdultBlocklyEditor
                      height="380px"
                      initialXml={blocksXml}
                      onCodeChange={handleBlocksCode}
                      onXmlChange={handleBlocksXml}
                    />
                  </div>
                  {/* Right: live code panel with auto-switching view */}
                  <div
                    className="flex flex-col shrink-0"
                    style={{ width: '38%', background: '#0f172a', minHeight: '380px' }}
                  >
                    {/* Tab bar */}
                    <div className="flex items-center gap-1 px-2 py-1.5 border-b border-gray-700 shrink-0">
                      {[['js', '⚡ JS', 'text-yellow-400'], ['html', '🏗 HTML', 'text-orange-400'], ['css', '🎨 CSS', 'text-blue-400']].map(([id, label, activeColor]) => (
                        <button
                          key={id}
                          onClick={() => setCodeView(id)}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded transition-all ${
                            codeView === id
                              ? `bg-gray-700 ${activeColor}`
                              : 'text-gray-500 hover:text-gray-300'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                      <div className="ml-auto">
                        {syncing && (
                          <span className="w-2 h-2 rounded-full bg-green-400 animate-ping inline-block" />
                        )}
                      </div>
                    </div>
                    {/* Content */}
                    <pre
                      className={`flex-1 p-3 font-mono text-[11px] overflow-auto whitespace-pre-wrap ${
                        codeView === 'html' ? 'text-orange-300'
                        : codeView === 'css'  ? 'text-blue-300'
                        : 'text-yellow-300'
                      }`}
                      style={{ transition: 'opacity 0.15s', opacity: syncing ? 0.55 : 1 }}
                    >
                      {codeView === 'html'
                        ? (htmlCode  || '<!-- HTML will appear here after Run -->')
                        : codeView === 'css'
                        ? (cssCode   || '/* CSS will appear here after Run */')
                        : (generatedJs || '// Drag blocks from the left\n// — generated JS appears here')}
                    </pre>
                  </div>
                </div>
              </div>
            )}

            {/* Live Preview */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">🌐 Live Preview</span>
                <button
                  onClick={updatePreview}
                  className="text-xs px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded"
                >
                  Refresh
                </button>
              </div>
              <div className="bg-white" style={{ height: '300px' }}>
                <iframe
                  ref={iframeRef}
                  title="preview"
                  sandbox="allow-scripts"
                  className="w-full h-full border-0"
                />
              </div>
            </div>

            {/* Console Output */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">📟 Console</span>
                <button
                  onClick={clearOutput}
                  className="text-xs px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded"
                >
                  Clear
                </button>
              </div>
              <pre className="p-4 font-mono text-xs bg-gray-900 text-green-400 h-32 overflow-auto">
                {output || '// Console output will appear here...'}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdultLesson;
