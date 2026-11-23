import { useEffect, useState } from 'react';

// Learner preferences for the code editors, shared by every editor on the site and
// remembered on this device:
//   smart - auto-indent, auto-close brackets/quotes, bracket matching
//   emmet - Emmet abbreviations in HTML/CSS (e.g. ul>li*3 then Tab)
const KEY = 'kidscode_editor_prefs';
const EVENT = 'kidscode-editor-prefs';
const DEFAULTS = { smart: true, emmet: true };

export function getEditorPrefs() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    return { ...DEFAULTS };
  }
}

export function setEditorPref(name, value) {
  const next = { ...getEditorPrefs(), [name]: value };
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* private mode: keep for this page only */ }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: next }));
  return next;
}

/** React hook: current prefs, updated live when any editor's switch changes. */
export function useEditorPrefs() {
  const [prefs, setPrefs] = useState(getEditorPrefs);
  useEffect(() => {
    const onChange = (e) => setPrefs(e.detail || getEditorPrefs());
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, []);
  return prefs;
}
