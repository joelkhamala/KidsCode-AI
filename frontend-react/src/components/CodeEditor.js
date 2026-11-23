import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { EditorState, Compartment } from '@codemirror/state';
import {
  EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter,
  drawSelection, placeholder as placeholderExt,
} from '@codemirror/view';
import {
  defaultKeymap, history, historyKeymap, indentWithTab, insertNewline, insertNewlineAndIndent, insertTab,
} from '@codemirror/commands';
import { indentOnInput, bracketMatching, indentUnit } from '@codemirror/language';
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { java } from '@codemirror/lang-java';
import { sql, SQLite } from '@codemirror/lang-sql';
import { oneDark } from '@codemirror/theme-one-dark';
import { abbreviationTracker, expandAbbreviation } from '@emmetio/codemirror6-plugin';
import { useEditorPrefs, setEditorPref, getEditorPrefs } from '../utils/editorPrefs';

const EMMET_LANGS = ['html', 'css'];

// Python uses 4-space indents (as in real Python); everything else uses 2.
// Smart typing also controls HTML tag auto-closing (<p> -> <p></p>).
const languageExtension = (lang, smart = true) => [indentUnit.of(lang === 'python' || lang === 'java' ? '    ' : '  '), languageMode(lang, smart)];

const languageMode = (lang, smart) => {
  switch (lang) {
    case 'python': return python();
    case 'html': return html({ autoCloseTags: smart });
    case 'css': return css();
    case 'javascript': return javascript();
    case 'java': return java();
    case 'sql': return sql({ dialect: SQLite, upperCaseKeywords: true });
    default: return [];
  }
};

// Smart typing ON: keep indentation on Enter, re-indent closing brackets, close ( [ { " ' automatically.
// Smart typing OFF: Enter just starts a new line and nothing is added for you.
const smartExtensions = (on) => (on
  ? [indentOnInput(), closeBrackets(), bracketMatching(), keymap.of([...closeBracketsKeymap, { key: 'Enter', run: insertNewlineAndIndent }, indentWithTab])]
  : [keymap.of([{ key: 'Enter', run: insertNewline }, { key: 'Tab', run: insertTab }])]);

const emmetExtensions = (on, lang) => (on && EMMET_LANGS.includes(lang)
  ? [abbreviationTracker(), keymap.of([{ key: 'Tab', run: expandAbbreviation }])]
  : []);

const Switch = ({ checked, onChange, label, help }) => (
  <label className="inline-flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-slate-600" title={help}>
    <input type="checkbox" className="sr-only peer" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    <span
      aria-hidden="true"
      className={`relative inline-block w-9 h-5 rounded-full transition-colors ${checked ? 'bg-green-500' : 'bg-slate-300'} peer-focus-visible:ring-4 peer-focus-visible:ring-indigo-300`}
    >
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-4' : ''}`} />
    </span>
    {label}
  </label>
);

/**
 * Code editor for learners (CodeMirror 6) with switchable helpers.
 * Props: value, onChange(text), language ('javascript' | 'python' | 'java' | 'sql' | 'html' | 'css' | 'text'),
 *        height (px), readOnly, placeholder, ariaLabel, onRun (Ctrl/Cmd+Enter), showSwitches.
 */
const CodeEditor = ({
  value, onChange, language = 'javascript', height = 300, readOnly = false, placeholder = '', ariaLabel, onRun, showSwitches = true,
}) => {
  const { t } = useTranslation();
  const prefs = useEditorPrefs();
  const hostRef = useRef(null);
  const viewRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const onRunRef = useRef(onRun);
  const compartments = useRef({ lang: new Compartment(), smart: new Compartment(), emmet: new Compartment(), ro: new Compartment(), ph: new Compartment() });
  onChangeRef.current = onChange;
  onRunRef.current = onRun;

  // Create the editor once.
  useEffect(() => {
    const c = compartments.current;
    const view = new EditorView({
      parent: hostRef.current,
      state: EditorState.create({
        doc: value || '',
        extensions: [
          lineNumbers(), highlightActiveLineGutter(), highlightActiveLine(), drawSelection(), history(),
          EditorState.tabSize.of(4),
          oneDark,
          EditorView.lineWrapping,
          EditorView.theme({ '&': { height: '100%', fontSize: '14px' }, '.cm-scroller': { fontFamily: "'Fira Code', monospace" } }),
          c.emmet.of(emmetExtensions(getEditorPrefs().emmet, language)),
          c.smart.of(smartExtensions(getEditorPrefs().smart)),
          keymap.of([{ key: 'Mod-Enter', run: () => { if (onRunRef.current) { onRunRef.current(); return true; } return false; } }]),
          keymap.of([...defaultKeymap, ...historyKeymap]),
          c.lang.of(languageExtension(language, getEditorPrefs().smart)),
          c.ro.of([EditorState.readOnly.of(readOnly), EditorView.editable.of(!readOnly)]),
          c.ph.of(placeholder ? placeholderExt(placeholder) : []),
          EditorView.contentAttributes.of({ 'aria-label': ariaLabel || t('editor.label'), spellcheck: 'false', autocapitalize: 'off', autocorrect: 'off' }),
          EditorView.updateListener.of((u) => { if (u.docChanged && onChangeRef.current) onChangeRef.current(u.state.doc.toString()); }),
        ],
      }),
    });
    viewRef.current = view;
    return () => { view.destroy(); viewRef.current = null; };
    // The editor is created once; later prop changes are applied by the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the editor in sync when the code is changed from outside (load example, templates...).
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if ((value || '') !== current) view.dispatch({ changes: { from: 0, to: current.length, insert: value || '' } });
  }, [value]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const c = compartments.current;
    view.dispatch({
      effects: [
        c.lang.reconfigure(languageExtension(language, prefs.smart)),
        c.smart.reconfigure(smartExtensions(prefs.smart)),
        c.emmet.reconfigure(emmetExtensions(prefs.emmet, language)),
        c.ro.reconfigure([EditorState.readOnly.of(readOnly), EditorView.editable.of(!readOnly)]),
        c.ph.reconfigure(placeholder ? placeholderExt(placeholder) : []),
      ],
    });
  }, [language, prefs.smart, prefs.emmet, readOnly, placeholder]);

  return (
    <div>
      {showSwitches && !readOnly && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-2">
          <Switch checked={prefs.smart} onChange={(v) => setEditorPref('smart', v)} label={`🪄 ${t('editor.smart')}`} help={t('editor.smartHelp')} />
          {EMMET_LANGS.includes(language) && (
            <Switch checked={prefs.emmet} onChange={(v) => setEditorPref('emmet', v)} label={`⚡ ${t('editor.emmet')}`} help={t('editor.emmetHelp')} />
          )}
          {EMMET_LANGS.includes(language) && prefs.emmet && (
            <span className="text-xs text-slate-500 font-semibold">{t('editor.emmetTry')}</span>
          )}
        </div>
      )}
      <div
        ref={hostRef}
        className="rounded-2xl overflow-hidden border-2 border-slate-700 focus-within:border-indigo-400"
        style={{ height, opacity: readOnly ? 0.75 : 1 }}
        data-testid="code-editor"
      />
    </div>
  );
};


export default CodeEditor;
