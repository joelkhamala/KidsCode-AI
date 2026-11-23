'use strict';
/**
 * Renders neutral programs (ast.js) into real source code for each language.
 *
 *   render(program, 'python') -> { code, lines: [{ text, stmtId, header }] }
 *
 * Options
 *   blankId: id of a statement whose header line is replaced by "______"
 *            (used for "complete the code" activities)
 *
 * Every line produced by a statement header is tagged with that statement's id
 * so activities can ask "which line has the bug?" with exact line numbers.
 *
 * Supported: javascript, python, java, c, cpp, csharp, blocks (Blockly-style
 * text), scratch (Scratch-style text).
 */

const BLANK = '______';

const OPS = {
  default: { '==': '==', '!=': '!=', and: '&&', or: '||' },
  javascript: { '==': '===', '!=': '!==', and: '&&', or: '||' },
  python: { '==': '==', '!=': '!=', and: 'and', or: 'or' },
  blocks: { '==': '=', '!=': '≠', and: 'and', or: 'or', '<=': '≤', '>=': '≥' },
};

const jsonStr = (s) => JSON.stringify(s);
const cEscape = (s) => JSON.stringify(s).slice(1, -1).replace(/%/g, '%%');

class Renderer {
  constructor(language, opts = {}) {
    this.lang = language;
    this.opts = opts;
    this.lines = [];
    this.types = [{}]; // scope stack: name -> 'int' | 'str' | 'list:int' | 'list:str'
    this.funcTypes = {};
    this.paramTypes = {};
  }

  // ---------- helpers ----------
  emit(text, depth, stmtId = null, header = false) {
    const unit = this.lang === 'python' ? '    ' : this.lang === 'blocks' || this.lang === 'scratch' ? '  ' : '    ';
    this.lines.push({ text: unit.repeat(depth) + text, stmtId, header });
  }

  emitHeader(texts, depth, s) {
    const arr = Array.isArray(texts) ? texts : [texts];
    if (this.opts.blankId === s.id) {
      this.emit(BLANK, depth, s.id, true);
      return;
    }
    arr.forEach((t) => this.emit(t, depth, s.id, true));
  }

  declare(name, type) { this.types[this.types.length - 1][name] = type; }

  typeOfVar(name) {
    for (let i = this.types.length - 1; i >= 0; i -= 1) {
      if (this.types[i][name]) return this.types[i][name];
    }
    return 'int';
  }

  typeOf(e) {
    switch (e.k) {
      case 'num': return 'int';
      case 'str': return 'str';
      case 'var': return this.typeOfVar(e.name);
      case 'idx': return (this.typeOfVar(e.list) || 'list:int').split(':')[1] || 'int';
      case 'len': return 'int';
      case 'call': return this.funcTypes[e.name] || 'int';
      case 'bin': return ['+', '-', '*', '%'].includes(e.op) ? 'int' : 'bool';
      default: return 'int';
    }
  }

  withScope(fn) {
    this.types.push({});
    fn();
    this.types.pop();
  }

  op(o) {
    const table = OPS[this.lang] || OPS.default;
    return table[o] || o;
  }

  // ---------- expressions ----------
  expr(e, nested = false) {
    const L = this.lang;
    switch (e.k) {
      case 'num': return String(e.value);
      case 'str': return jsonStr(e.value);
      case 'var': return e.name;
      case 'len':
        if (L === 'python') return `len(${e.list})`;
        if (L === 'javascript' || L === 'java') return `${e.list}.length`;
        if (L === 'csharp') return `${e.list}.Length`;
        if (L === 'cpp') return `(int)${e.list}.size()`;
        if (L === 'c') return `(int)(sizeof(${e.list}) / sizeof(${e.list}[0]))`;
        if (L === 'blocks') return `length of ${e.list}`;
        return `(length of [${e.list}])`;
      case 'idx': {
        if (L === 'blocks' || L === 'scratch') {
          // Block languages count list items from 1.
          const pos = e.index.k === 'num' ? String(e.index.value + 1) : `${this.expr(e.index, true)} + 1`;
          return L === 'blocks' ? `in list ${e.list} get # ${pos}` : `(item (${pos}) of [${e.list}])`;
        }
        return `${e.list}[${this.expr(e.index)}]`;
      }
      case 'call': {
        const args = e.args.map((a) => this.expr(a)).join(', ');
        return L === 'scratch' ? `(${e.name} ${args})` : `${e.name}(${args})`;
      }
      case 'bin': {
        if (L === 'scratch') return this.scratchExpr(e);
        const text = `${this.expr(e.left, true)} ${this.op(e.op)} ${this.expr(e.right, true)}`;
        return nested ? `(${text})` : text;
      }
      default: throw new Error(`Cannot render expression ${e.k}`);
    }
  }

  scratchExpr(e) {
    const a = (x) => (x.k === 'str' ? `[${x.value}]` : x.k === 'bin' ? this.scratchExpr(x) : x.k === 'idx' || x.k === 'len' || x.k === 'call' ? this.expr(x) : `(${this.expr(x)})`);
    switch (e.op) {
      case '+': case '-': case '*': return `(${a(e.left)} ${e.op} ${a(e.right)})`;
      case '%': return `(${a(e.left)} mod ${a(e.right)})`;
      case '<': case '>': return `<${a(e.left)} ${e.op} ${a(e.right)}>`;
      case '==': return `<${a(e.left)} = ${a(e.right)}>`;
      case '!=': return `<not <${a(e.left)} = ${a(e.right)}>>`;
      case '<=': return `<not <${a(e.left)} > ${a(e.right)}>>`;
      case '>=': return `<not <${a(e.left)} < ${a(e.right)}>>`;
      case 'and': case 'or': return `<${this.scratchExpr(e.left)} ${e.op} ${this.scratchExpr(e.right)}>`;
      default: throw new Error(`Cannot render ${e.op} for Scratch`);
    }
  }

  cond(e) {
    if (this.lang === 'scratch') return e.k === 'bin' ? this.scratchExpr(e) : `<${this.expr(e)}>`;
    return this.expr(e);
  }

  typeName(t) {
    const L = this.lang;
    if (t === 'void' || t == null) return 'void';
    if (L === 'java') return t === 'str' ? 'String' : 'int';
    if (L === 'csharp') return t === 'str' ? 'string' : 'int';
    if (L === 'cpp') return t === 'str' ? 'std::string' : 'int';
    if (L === 'c') return t === 'str' ? 'const char *' : 'int';
    return t;
  }

  decl(t, name) {
    const tn = this.typeName(t);
    return tn.endsWith('*') ? `${tn}${name}` : `${tn} ${name}`;
  }

  printText(s) {
    const L = this.lang;
    const noQuotes = s.bug === 'noQuotes';
    const parts = s.parts;
    const lit = (p) => (noQuotes ? p.value : jsonStr(p.value));

    if (L === 'c') {
      let fmt = '';
      const args = [];
      parts.forEach((p) => {
        if (p.k === 'str') fmt += noQuotes ? p.value : cEscape(p.value);
        else {
          fmt += this.typeOf(p) === 'str' ? '%s' : '%d';
          args.push(this.expr(p));
        }
      });
      const f = noQuotes ? fmt + '\\n' : `"${fmt}\\n"`;
      return `printf(${[f, ...args].join(', ')});`;
    }
    if (L === 'cpp') {
      return `std::cout << ${parts.map((p) => (p.k === 'str' ? lit(p) : this.expr(p, true))).join(' << ')} << std::endl;`;
    }
    if (L === 'python') {
      if (parts.length === 1 && parts[0].k !== 'str') return `print(${this.expr(parts[0])})`;
      const pieces = parts.map((p) => (p.k === 'str' ? lit(p) : this.typeOf(p) === 'str' ? this.expr(p, true) : `str(${this.expr(p)})`));
      return `print(${pieces.join(' + ')})`;
    }
    if (L === 'blocks') {
      const pieces = parts.map((p) => (p.k === 'str' ? lit(p) : this.expr(p, true)));
      return pieces.length === 1 ? `print ${pieces[0]}` : `print join(${pieces.join(', ')})`;
    }
    if (L === 'scratch') {
      const pieces = parts.map((p) => (p.k === 'str' ? (noQuotes ? p.value : `[${p.value}]`) : p.k === 'bin' ? this.scratchExpr(p) : p.k === 'var' ? `(${p.name})` : this.expr(p)));
      return pieces.length === 1 ? `say ${pieces[0]}` : `say (join ${pieces.join(' ')})`;
    }
    // javascript / java / csharp: string concatenation
    let pieces = parts.map((p) => (p.k === 'str' ? lit(p) : this.expr(p, true)));
    if (parts.length > 1 && parts[0].k !== 'str' && parts[1].k !== 'str') pieces = ['""', ...pieces];
    const body = pieces.join(' + ');
    if (L === 'java') return `System.out.println(${body});`;
    if (L === 'csharp') return `Console.WriteLine(${body});`;
    return `console.log(${body});`;
  }

  // ---------- statements ----------
  stmt(s, d) {
    const L = this.lang;
    const semi = ['javascript', 'java', 'c', 'cpp', 'csharp'].includes(L) ? ';' : '';
    const braces = ['javascript', 'java', 'c', 'cpp', 'csharp'].includes(L);
    const close = () => {
      if (braces) this.emit('}', d);
      else if (L === 'blocks' || L === 'scratch') this.emit('end', d);
    };
    const block = (body) => this.withScope(() => body.forEach((b) => this.stmt(b, d + 1)));

    switch (s.op) {
      case 'print':
        this.emitHeader(this.printText(s), d, s);
        break;

      case 'set': {
        this.declare(s.name, s.type);
        const v = this.expr(s.value);
        if (L === 'python') this.emitHeader(`${s.name} = ${v}`, d, s);
        else if (L === 'javascript') this.emitHeader(`let ${s.name} = ${v};`, d, s);
        else if (L === 'blocks') this.emitHeader(`set ${s.name} to ${v}`, d, s);
        else if (L === 'scratch') this.emitHeader(`set [${s.name}] to ${s.value.k === 'str' ? `[${s.value.value}]` : s.value.k === 'bin' ? this.scratchExpr(s.value) : `(${v})`}`, d, s);
        else this.emitHeader(`${this.decl(s.type, s.name)} = ${v};`, d, s);
        break;
      }

      case 'assign': {
        // x = x + n  ->  "change [x] by (n)" in Scratch, "x += n" style elsewhere stays explicit.
        const v = s.value;
        if (L === 'scratch') {
          if (v.k === 'bin' && v.op === '+' && v.left.k === 'var' && v.left.name === s.name && v.right.k !== 'str') {
            this.emitHeader(`change [${s.name}] by ${v.right.k === 'num' ? `(${v.right.value})` : this.expr(v.right).startsWith('(') ? this.expr(v.right) : `(${this.expr(v.right)})`}`, d, s);
          } else {
            this.emitHeader(`set [${s.name}] to ${v.k === 'bin' ? this.scratchExpr(v) : `(${this.expr(v)})`}`, d, s);
          }
        } else if (L === 'blocks') {
          this.emitHeader(`set ${s.name} to ${this.expr(v)}`, d, s);
        } else {
          this.emitHeader(`${s.name} = ${this.expr(v)}${semi}`, d, s);
        }
        break;
      }

      case 'list': {
        this.declare(s.name, `list:${s.type}`);
        const items = s.items.map((i) => this.expr(i));
        if (L === 'python') this.emitHeader(`${s.name} = [${items.join(', ')}]`, d, s);
        else if (L === 'javascript') this.emitHeader(`let ${s.name} = [${items.join(', ')}];`, d, s);
        else if (L === 'java' || L === 'csharp') this.emitHeader(`${this.typeName(s.type)}[] ${s.name} = {${items.join(', ')}};`, d, s);
        else if (L === 'c') this.emitHeader(`${this.decl(s.type, s.name)}[] = {${items.join(', ')}};`, d, s);
        else if (L === 'cpp') this.emitHeader(`std::vector<${this.typeName(s.type)}> ${s.name} = {${items.join(', ')}};`, d, s);
        else if (L === 'blocks') this.emitHeader(`set ${s.name} to create list with [${items.join(', ')}]`, d, s);
        else this.emitHeader([`delete all of [${s.name}]`, ...s.items.map((i) => `add ${i.k === 'str' ? `[${i.value}]` : `(${i.value})`} to [${s.name}]`)], d, s);
        break;
      }

      case 'if': {
        const c = this.cond(s.cond);
        if (L === 'python') this.emitHeader(`if ${c}:`, d, s);
        else if (L === 'blocks') this.emitHeader(`if ${c} do`, d, s);
        else if (L === 'scratch') this.emitHeader(`if ${c} then`, d, s);
        else this.emitHeader(`if (${c}) {`, d, s);
        block(s.then);
        if (s.else && s.else.length) {
          if (L === 'python') this.emit('else:', d);
          else if (L === 'blocks' || L === 'scratch') this.emit('else', d);
          else this.emit('} else {', d);
          block(s.else);
        }
        if (L !== 'python') close();
        break;
      }

      case 'for': {
        const from = this.expr(s.from);
        const to = this.expr(s.to);
        this.withScope(() => {
          this.declare(s.var, 'int');
          if (L === 'python') {
            this.emitHeader(s.from.k === 'num' && s.from.value === 0 ? `for ${s.var} in range(${to}):` : `for ${s.var} in range(${from}, ${to}):`, d, s);
          } else if (L === 'javascript') {
            this.emitHeader(`for (let ${s.var} = ${from}; ${s.var} < ${to}; ${s.var}++) {`, d, s);
          } else if (L === 'blocks') {
            const last = s.to.k === 'num' ? String(s.to.value - 1) : `${to} - 1`;
            this.emitHeader(`count with ${s.var} from ${from} to ${last} by 1 do`, d, s);
          } else if (L === 'scratch') {
            const times = s.from.k === 'num' && s.to.k === 'num' ? `(${s.to.value - s.from.value})` : `((${to}) - (${from}))`;
            this.emitHeader([`set [${s.var}] to (${from})`, `repeat ${times}`], d, s);
          } else {
            this.emitHeader(`for (int ${s.var} = ${from}; ${s.var} < ${to}; ${s.var}++) {`, d, s);
          }
          s.body.forEach((b) => this.stmt(b, d + 1));
          if (L === 'scratch') this.emit(`change [${s.var}] by (1)`, d + 1);
        });
        if (L !== 'python') close();
        break;
      }

      case 'while': {
        const c = this.cond(s.cond);
        if (L === 'python') this.emitHeader(`while ${c}:`, d, s);
        else if (L === 'blocks') this.emitHeader(`repeat while ${c} do`, d, s);
        else if (L === 'scratch') this.emitHeader(`repeat until <not ${c}>`, d, s);
        else this.emitHeader(`while (${c}) {`, d, s);
        block(s.body);
        if (L !== 'python') close();
        break;
      }

      case 'foreach': {
        const itemType = (this.typeOfVar(s.list) || 'list:int').split(':')[1] || 'int';
        this.withScope(() => {
          this.declare(s.var, itemType);
          const tn = this.typeName(itemType);
          if (L === 'python') this.emitHeader(`for ${s.var} in ${s.list}:`, d, s);
          else if (L === 'javascript') this.emitHeader(`for (const ${s.var} of ${s.list}) {`, d, s);
          else if (L === 'java' || L === 'cpp') this.emitHeader(`for (${tn} ${s.var} : ${s.list}) {`, d, s);
          else if (L === 'csharp') this.emitHeader(`foreach (${tn} ${s.var} in ${s.list}) {`, d, s);
          else if (L === 'c') {
            const k = `k_${s.var}`;
            this.emitHeader([
              `for (int ${k} = 0; ${k} < (int)(sizeof(${s.list}) / sizeof(${s.list}[0])); ${k}++) {`,
              `    ${this.decl(itemType, s.var)} = ${s.list}[${k}];`,
            ], d, s);
          } else if (L === 'blocks') this.emitHeader(`for each item ${s.var} in list ${s.list} do`, d, s);
          else {
            const k = `k_${s.var}`;
            this.emitHeader([`set [${k}] to (1)`, `repeat (length of [${s.list}])`, `  set [${s.var}] to (item (${k}) of [${s.list}])`], d, s);
          }
          s.body.forEach((b) => this.stmt(b, d + 1));
          if (L === 'scratch') this.emit(`change [k_${s.var}] by (1)`, d + 1);
        });
        if (L !== 'python') close();
        break;
      }

      case 'func': {
        this.funcTypes[s.name] = s.returns || 'void';
        const params = s.params;
        this.withScope(() => {
          params.forEach(([n, t]) => this.declare(n, t));
          const rt = this.typeName(s.returns || 'void');
          if (L === 'python') this.emitHeader(`def ${s.name}(${params.map((p) => p[0]).join(', ')}):`, d, s);
          else if (L === 'javascript') this.emitHeader(`function ${s.name}(${params.map((p) => p[0]).join(', ')}) {`, d, s);
          else if (L === 'java' || L === 'csharp') this.emitHeader(`static ${rt} ${s.name}(${params.map(([n, t]) => this.decl(t, n)).join(', ')}) {`, d, s);
          else if (L === 'c' || L === 'cpp') this.emitHeader(`${rt === 'const char *' ? 'const char *' : rt + ' '}${s.name}(${params.length ? params.map(([n, t]) => this.decl(t, n)).join(', ') : L === 'c' ? 'void' : ''}) {`, d, s);
          else if (L === 'blocks') this.emitHeader(`to ${s.name}${params.length ? ' with: ' + params.map((p) => p[0]).join(', ') : ''}`, d, s);
          else this.emitHeader(`define ${s.name}${params.length ? ' ' + params.map((p) => `(${p[0]})`).join(' ') : ''}`, d, s);
          s.body.forEach((b) => this.stmt(b, d + 1));
        });
        if (L === 'blocks') this.emit('end', d);
        else if (braces) this.emit('}', d);
        break;
      }

      case 'return':
        if (L === 'blocks') this.emitHeader(`return ${this.expr(s.value)}`, d, s);
        else this.emitHeader(`return ${this.expr(s.value)}${semi}`, d, s);
        break;

      case 'callstmt': {
        const args = s.args.map((a) => this.expr(a));
        if (L === 'scratch') this.emitHeader(`${s.name}${args.length ? ' ' + s.args.map((a) => (a.k === 'str' ? `[${a.value}]` : `(${this.expr(a)})`)).join(' ') : ''}`, d, s);
        else this.emitHeader(`${s.name}(${args.join(', ')})${semi}`, d, s);
        break;
      }

      default:
        throw new Error(`Cannot render statement ${s.op}`);
    }
  }

  // ---------- whole program ----------
  program(prog) {
    const L = this.lang;
    const funcs = prog.filter((s) => s.op === 'func');
    const main = prog.filter((s) => s.op !== 'func');
    funcs.forEach((f) => { this.funcTypes[f.name] = f.returns || 'void'; });

    if (L === 'python' || L === 'javascript' || L === 'blocks') {
      prog.forEach((s) => this.stmt(s, 0));
    } else if (L === 'scratch') {
      funcs.forEach((f) => { this.stmt(f, 0); this.emit('', 0); });
      this.emit('when green flag clicked', 0);
      main.forEach((s) => this.stmt(s, 0));
    } else if (L === 'java') {
      this.emit('public class Main {', 0);
      funcs.forEach((f) => { this.stmt(f, 1); this.emit('', 0); });
      this.emit('public static void main(String[] args) {', 1);
      main.forEach((s) => this.stmt(s, 2));
      this.emit('}', 1);
      this.emit('}', 0);
    } else if (L === 'csharp') {
      this.emit('using System;', 0);
      this.emit('', 0);
      this.emit('class Program {', 0);
      funcs.forEach((f) => { this.stmt(f, 1); this.emit('', 0); });
      this.emit('static void Main() {', 1);
      main.forEach((s) => this.stmt(s, 2));
      this.emit('}', 1);
      this.emit('}', 0);
    } else if (L === 'c' || L === 'cpp') {
      if (L === 'c') this.emit('#include <stdio.h>', 0);
      else ['#include <iostream>', '#include <string>', '#include <vector>'].forEach((h) => this.emit(h, 0));
      this.emit('', 0);
      funcs.forEach((f) => { this.stmt(f, 0); this.emit('', 0); });
      this.emit(L === 'c' ? 'int main(void) {' : 'int main() {', 0);
      main.forEach((s) => this.stmt(s, 1));
      this.emit('return 0;', 1);
      this.emit('}', 0);
    } else {
      throw new Error(`Unsupported language ${L}`);
    }
    return { code: this.lines.map((l) => l.text).join('\n'), lines: this.lines };
  }
}

const RENDERABLE = ['javascript', 'python', 'java', 'c', 'cpp', 'csharp', 'blocks', 'scratch'];

function render(program, language, opts = {}) {
  if (!RENDERABLE.includes(language)) throw new Error(`No renderer for ${language}`);
  return new Renderer(language, opts).program(program);
}

/** Render just one statement header (used for "complete the code" options). */
function renderStmtHeader(program, stmtId, language) {
  const { lines } = render(program, language);
  return lines.filter((l) => l.stmtId === stmtId && l.header).map((l) => l.text.trim()).join(' ⏎ ');
}

module.exports = { render, renderStmtHeader, RENDERABLE, BLANK };
