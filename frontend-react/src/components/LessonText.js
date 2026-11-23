import React from 'react';

/**
 * Renders adult lesson text. Supported formatting:
 *   ## Heading       - bullet       ~~~ code block ~~~       {{inline code}}
 * Built from React elements only (never innerHTML), so lesson text cannot run code.
 */
const inline = (text, keyPrefix) => {
  const out = [];
  const re = /\{\{([\s\S]+?)\}\}(?!\})/g;
  let last = 0;
  let m;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(<code key={`${keyPrefix}-${i += 1}`} className="px-1.5 py-0.5 rounded bg-slate-100 text-pink-700 font-mono text-[0.9em]">{m[1]}</code>);
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
};

const LessonText = ({ text }) => {
  const blocks = [];
  const lines = String(text || '').split('\n');
  let i = 0;
  let para = [];
  let list = [];
  const flushPara = () => {
    if (para.length) blocks.push({ type: 'p', text: para.join(' ') });
    para = [];
  };
  const flushList = () => {
    if (list.length) blocks.push({ type: 'ul', items: list });
    list = [];
  };
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim().startsWith('~~~')) {
      flushPara(); flushList();
      const code = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith('~~~')) { code.push(lines[i]); i += 1; }
      blocks.push({ type: 'code', text: code.join('\n') });
    } else if (line.startsWith('## ')) {
      flushPara(); flushList();
      blocks.push({ type: 'h', text: line.slice(3) });
    } else if (/^\s*- /.test(line)) {
      flushPara();
      list.push(line.replace(/^\s*- /, ''));
    } else if (!line.trim()) {
      flushPara(); flushList();
    } else {
      flushList();
      para.push(line.trim());
    }
    i += 1;
  }
  flushPara(); flushList();

  return (
    <div className="space-y-3 text-slate-700 leading-relaxed">
      {blocks.map((b, k) => {
        if (b.type === 'h') return <h3 key={k} className="text-base font-bold text-slate-900 pt-2">{inline(b.text, k)}</h3>;
        if (b.type === 'ul') {
          return (
            <ul key={k} className="list-disc pl-5 space-y-1">
              {b.items.map((it, j) => <li key={j}>{inline(it, `${k}-${j}`)}</li>)}
            </ul>
          );
        }
        if (b.type === 'code') return <pre key={k} className="bg-slate-900 text-slate-100 text-[13px] rounded-xl p-4 overflow-x-auto"><code>{b.text}</code></pre>;
        return <p key={k}>{inline(b.text, k)}</p>;
      })}
    </div>
  );
};

export default LessonText;
