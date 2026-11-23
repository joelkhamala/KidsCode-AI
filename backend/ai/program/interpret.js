'use strict';
/**
 * Interpreter for the neutral program format (see ast.js).
 * Produces the exact output lines every rendered language will print.
 */

const MAX_STEPS = 10000;

class ReturnSignal {
  constructor(value) { this.value = value; }
}

function interpret(program) {
  const output = [];
  const funcs = {};
  let steps = 0;

  const tick = () => {
    steps += 1;
    if (steps > MAX_STEPS) throw new Error('Program runs too long (possible infinite loop)');
  };

  const lookup = (scopes, name) => {
    for (let i = scopes.length - 1; i >= 0; i -= 1) {
      if (Object.prototype.hasOwnProperty.call(scopes[i], name)) return scopes[i];
    }
    throw new Error(`Unknown variable ${name}`);
  };

  const evalExpr = (e, scopes) => {
    switch (e.k) {
      case 'num': return e.value;
      case 'str': return e.value;
      case 'var': return lookup(scopes, e.name)[e.name];
      case 'idx': {
        const arr = lookup(scopes, e.list)[e.list];
        const i = evalExpr(e.index, scopes);
        if (i < 0 || i >= arr.length) throw new Error('List index out of range');
        return arr[i];
      }
      case 'len': return lookup(scopes, e.list)[e.list].length;
      case 'call': return callFunc(e.name, e.args.map((a) => evalExpr(a, scopes)));
      case 'bin': {
        const l = evalExpr(e.left, scopes);
        const r = evalExpr(e.right, scopes);
        switch (e.op) {
          case '+': return l + r;
          case '-': return l - r;
          case '*': return l * r;
          case '%': return l % r;
          case '==': return l === r;
          case '!=': return l !== r;
          case '<': return l < r;
          case '>': return l > r;
          case '<=': return l <= r;
          case '>=': return l >= r;
          case 'and': return Boolean(l && r);
          case 'or': return Boolean(l || r);
          default: throw new Error(`Unknown operator ${e.op}`);
        }
      }
      default: throw new Error(`Unknown expression ${e.k}`);
    }
  };

  const callFunc = (name, args) => {
    const f = funcs[name];
    if (!f) throw new Error(`Unknown function ${name}`);
    const frame = {};
    f.params.forEach(([p], i) => { frame[p] = args[i]; });
    try {
      execBlock(f.body, [globals, frame]);
    } catch (sig) {
      if (sig instanceof ReturnSignal) return sig.value;
      throw sig;
    }
    return undefined;
  };

  const execBlock = (stmts, scopes) => {
    for (const s of stmts) exec(s, scopes);
  };

  const exec = (s, scopes) => {
    tick();
    const top = scopes[scopes.length - 1];
    switch (s.op) {
      case 'print':
        output.push(s.parts.map((p) => String(evalExpr(p, scopes))).join(''));
        break;
      case 'set':
        top[s.name] = evalExpr(s.value, scopes);
        break;
      case 'assign':
        lookup(scopes, s.name)[s.name] = evalExpr(s.value, scopes);
        break;
      case 'list':
        top[s.name] = s.items.map((i) => evalExpr(i, scopes));
        break;
      case 'if':
        if (evalExpr(s.cond, scopes)) execBlock(s.then, [...scopes, {}]);
        else execBlock(s.else, [...scopes, {}]);
        break;
      case 'for': {
        const from = evalExpr(s.from, scopes);
        const to = evalExpr(s.to, scopes);
        for (let i = from; i < to; i += 1) {
          tick();
          execBlock(s.body, [...scopes, { [s.var]: i }]);
        }
        break;
      }
      case 'while':
        while (evalExpr(s.cond, scopes)) {
          tick();
          execBlock(s.body, [...scopes, {}]);
        }
        break;
      case 'foreach': {
        const arr = lookup(scopes, s.list)[s.list];
        for (const item of arr) {
          tick();
          execBlock(s.body, [...scopes, { [s.var]: item }]);
        }
        break;
      }
      case 'func':
        funcs[s.name] = s;
        break;
      case 'return':
        throw new ReturnSignal(evalExpr(s.value, scopes));
      case 'callstmt':
        callFunc(s.name, s.args.map((a) => evalExpr(a, scopes)));
        break;
      default:
        throw new Error(`Unknown statement ${s.op}`);
    }
  };

  const globals = {};
  // Hoist function definitions (matches C/Java/Python-at-call-time behaviour for our programs).
  program.filter((s) => s.op === 'func').forEach((f) => { funcs[f.name] = f; });
  execBlock(program.filter((s) => s.op !== 'func'), [globals]);
  return output;
}

module.exports = { interpret };
