'use strict';
/**
 * Offline "code coach": spots the most common beginner mistakes without an AI
 * model, and explains them in kid-friendly English/Kiswahili.
 */

const t = (en, sw) => ({ en, sw });

function stripStringsAndComments(code, language) {
  let out = code.replace(/"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`/g, '""');
  if (language === 'python') out = out.replace(/#.*$/gm, '');
  else out = out.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
  return out;
}

function checkBrackets(code) {
  const pairs = { ')': '(', ']': '[', '}': '{' };
  const stack = [];
  const lines = code.split('\n');
  for (let ln = 0; ln < lines.length; ln += 1) {
    for (const ch of lines[ln]) {
      if ('([{'.includes(ch)) stack.push({ ch, line: ln + 1 });
      else if (pairs[ch]) {
        if (!stack.length || stack[stack.length - 1].ch !== pairs[ch]) return { problem: 'extra', ch, line: ln + 1 };
        stack.pop();
      }
    }
  }
  if (stack.length) return { problem: 'unclosed', ch: stack[stack.length - 1].ch, line: stack[stack.length - 1].line };
  return null;
}

/**
 * @returns {Array<{line: number|null, message: {en: string, sw: string}}>}
 */
function analyseCode(code, language) {
  const tips = [];
  if (typeof code !== 'string' || !code.trim()) {
    return [{ line: null, message: t('Your code is empty. Start with one line that prints something!', 'Msimbo wako hauna kitu. Anza na mstari mmoja unaoonyesha kitu!') }];
  }
  const lines = code.split('\n');

  // Unclosed quotes (per line, ignoring escaped quotes and Python triple quotes)
  lines.forEach((l, i) => {
    if (language === 'html_css' || /"""|'''/.test(l)) return;
    const noEsc = l.replace(/\\["'`]/g, '');
    const codePart = language === 'python' ? noEsc.split('#')[0] : noEsc.split('//')[0];
    const dq = (codePart.match(/"/g) || []).length;
    if (dq % 2 === 1) tips.push({ line: i + 1, message: t(`Line ${i + 1}: a quote mark " is missing. Text needs a quote at the start AND the end.`, `Mstari ${i + 1}: alama ya nukuu " inakosekana. Maandishi yanahitaji nukuu mwanzoni NA mwishoni.`) });
  });

  if (['javascript', 'python', 'java', 'c', 'cpp', 'csharp'].includes(language)) {
    const b = checkBrackets(stripStringsAndComments(code, language));
    if (b && b.problem === 'unclosed') tips.push({ line: b.line, message: t(`Line ${b.line}: the bracket ${b.ch} is opened but never closed.`, `Mstari ${b.line}: mabano ${b.ch} yamefunguliwa lakini hayajafungwa.`) });
    if (b && b.problem === 'extra') tips.push({ line: b.line, message: t(`Line ${b.line}: there is an extra ${b.ch} that does not match an opening bracket.`, `Mstari ${b.line}: kuna ${b.ch} ya ziada isiyolingana na mabano ya kufungua.`) });
  }

  lines.forEach((raw, i) => {
    const n = i + 1;
    const l = raw.trim();
    if (!l) return;
    if (language === 'python') {
      if (/^(if|elif|else|for|while|def|class)\b/.test(l) && !l.endsWith(':')) tips.push({ line: n, message: t(`Line ${n}: in Python, lines starting with "${l.split(/\s|\(/)[0]}" must end with a colon :`, `Mstari ${n}: katika Python, mistari inayoanza na "${l.split(/\s|\(/)[0]}" lazima iishie na nukta-pacha :`) });
      if (/^print\s+["'\w]/.test(l)) tips.push({ line: n, message: t(`Line ${n}: print needs brackets, like print("Hello").`, `Mstari ${n}: print inahitaji mabano, kama print("Habari").`) });
      if (/^Print\s*\(/.test(l)) tips.push({ line: n, message: t(`Line ${n}: Python is case-sensitive - use print with a small p.`, `Mstari ${n}: Python inajali herufi kubwa na ndogo - tumia print kwa p ndogo.`) });
      if (/^(if|elif|while)\b[^=!<>]*[^=!<>]=[^=]/.test(l)) tips.push({ line: n, message: t(`Line ${n}: to compare, use == (two equals). One = stores a value.`, `Mstari ${n}: kulinganisha, tumia == (alama mbili za usawa). = moja huhifadhi thamani.`) });
      if (i > 0 && /:\s*$/.test(lines[i - 1].trim()) && raw.search(/\S/) <= lines[i - 1].search(/\S/)) tips.push({ line: n, message: t(`Line ${n}: this line should be indented (moved right) because the line above ends with :`, `Mstari ${n}: mstari huu unapaswa kusogezwa kulia kwa sababu mstari wa juu unaishia na :`) });
    }
    if (language === 'javascript') {
      if (/\b(Console\.log|console\.Log|consol\.log|console\.lg)\s*\(/.test(l)) tips.push({ line: n, message: t(`Line ${n}: check the spelling - it is console.log (all small letters).`, `Mstari ${n}: angalia tahajia - ni console.log (herufi zote ndogo).`) });
      if (/^(if|while)\s*\([^=!<>]*[^=!<>]=[^=]/.test(l)) tips.push({ line: n, message: t(`Line ${n}: to compare, use === . A single = changes the variable instead.`, `Mstari ${n}: kulinganisha, tumia === . = moja hubadilisha kigeu badala yake.`) });
      if (/^print\s*\(/.test(l)) tips.push({ line: n, message: t(`Line ${n}: print() is Python. In JavaScript use console.log().`, `Mstari ${n}: print() ni ya Python. Katika JavaScript tumia console.log().`) });
    }
    if (['java', 'c', 'cpp', 'csharp'].includes(language)) {
      const needsSemicolon = /^(int|double|float|char|bool|boolean|string|String|std::|auto|return\b|printf|System\.out|Console\.|cout|std::cout)/.test(l) || /^[A-Za-z_]\w*\s*(=|\+=|-=|\+\+|--)/.test(l);
      if (needsSemicolon && !/[;{}]\s*$/.test(l) && !/^(if|for|while|else)\b/.test(l)) tips.push({ line: n, message: t(`Line ${n}: this statement needs a semicolon ; at the end.`, `Mstari ${n}: kauli hii inahitaji nukta-mkato ; mwishoni.`) });
    }
  });

  if (language === 'html_css') {
    const opened = (code.match(/<(h[1-6]|p|li|ul|ol|div|body|html|title)\b[^>]*>/gi) || []).map((x) => x.match(/<(\w+)/)[1].toLowerCase());
    const closed = (code.match(/<\/(h[1-6]|p|li|ul|ol|div|body|html|title)>/gi) || []).map((x) => x.match(/<\/(\w+)/)[1].toLowerCase());
    const count = (arr) => arr.reduce((m, x) => ({ ...m, [x]: (m[x] || 0) + 1 }), {});
    const o = count(opened); const c = count(closed);
    Object.keys(o).forEach((tag) => {
      if ((c[tag] || 0) < o[tag] && tag !== 'li' && tag !== 'p') tips.push({ line: null, message: t(`A <${tag}> tag is not closed. Add </${tag}>.`, `Lebo <${tag}> haijafungwa. Ongeza </${tag}>.`) });
    });
    if (/\{[^}]*\b[a-z-]+\s+[^:;{}]+;/.test(code)) tips.push({ line: null, message: t('A CSS property is missing its colon : between the name and the value.', 'Sifa ya CSS inakosa nukta-pacha : kati ya jina na thamani.') });
  }

  // De-duplicate, keep the first 4 most useful tips
  const seen = new Set();
  return tips.filter((tip) => {
    const k = tip.message.en;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  }).slice(0, 4);
}

module.exports = { analyseCode };
