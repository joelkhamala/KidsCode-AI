'use strict';
/**
 * Language-neutral mini program representation.
 *
 * Practice programs are written ONCE with these builders and then rendered
 * into every supported language (render.js). Their expected output is
 * computed by interpret.js, so predict-the-output answers are always correct.
 *
 * Statements
 *   print(parts...)                 parts: 'text' | V('name') | expression
 *   set(name, expr, type)           declare/assign ('int' | 'str')
 *   assign(name, expr)              re-assign an existing variable
 *   ifElse(cond, then[], else[])
 *   forRange(var, from, to, body[]) counts from..to-1
 *   whileLoop(cond, body[])
 *   list(name, items[], type)       declare a list/array
 *   forEach(var, listName, body[])
 *   func(name, params[[n,t]], returnType|null, body[])
 *   ret(expr)
 *   callStmt(name, args[])
 *
 * Expressions
 *   N(5)  S('hi')  V('x')  op('+', a, b)  call('f', [args])  idx('list', expr)  len('list')
 *
 * Only integer arithmetic (+ - * %) on non-negative values is used, so every
 * language produces identical output.
 */

let nextId = 1;
const withId = (node) => ({ id: nextId++, ...node });

const N = (value) => ({ k: 'num', value });
const S = (value) => ({ k: 'str', value });
const V = (name) => ({ k: 'var', name });
const op = (operator, left, right) => ({ k: 'bin', op: operator, left, right });
const call = (name, args = []) => ({ k: 'call', name, args });
const idx = (list, index) => ({ k: 'idx', list, index: typeof index === 'number' ? N(index) : index });
const len = (list) => ({ k: 'len', list });

const toPart = (p) => (typeof p === 'string' ? S(p) : p);

const print = (...parts) => withId({ op: 'print', parts: parts.map(toPart) });
const set = (name, value, type = 'int') => withId({ op: 'set', name, value: typeof value === 'number' ? N(value) : typeof value === 'string' ? S(value) : value, type });
const assign = (name, value) => withId({ op: 'assign', name, value: typeof value === 'number' ? N(value) : value });
const ifElse = (cond, then, otherwise = []) => withId({ op: 'if', cond, then, else: otherwise });
const forRange = (variable, from, to, body) => withId({ op: 'for', var: variable, from: typeof from === 'number' ? N(from) : from, to: typeof to === 'number' ? N(to) : to, body });
const whileLoop = (cond, body) => withId({ op: 'while', cond, body });
const list = (name, items, type = 'int') => withId({ op: 'list', name, items: items.map((v) => (type === 'str' ? S(v) : N(v))), type });
const forEach = (variable, listName, body) => withId({ op: 'foreach', var: variable, list: listName, body });
const func = (name, params, returns, body) => withId({ op: 'func', name, params, returns, body });
const ret = (value) => withId({ op: 'return', value });
const callStmt = (name, args = []) => withId({ op: 'callstmt', name, args });

/** Deep clone so mutations never touch the original scenario. */
const clone = (x) => JSON.parse(JSON.stringify(x));

/** Find a statement anywhere in a program by id. */
function findStmt(program, id) {
  for (const s of program) {
    if (s.id === id) return s;
    for (const key of ['then', 'else', 'body']) {
      if (Array.isArray(s[key])) {
        const found = findStmt(s[key], id);
        if (found) return found;
      }
    }
  }
  return null;
}

/** Replace a statement (by id) with the result of fn(stmt). Returns a new program. */
function mapStmt(program, id, fn) {
  return program.map((s) => {
    if (s.id === id) return fn(clone(s));
    const copy = { ...s };
    for (const key of ['then', 'else', 'body']) {
      if (Array.isArray(s[key])) copy[key] = mapStmt(s[key], id, fn);
    }
    return copy;
  });
}

module.exports = {
  N, S, V, op, call, idx, len,
  print, set, assign, ifElse, forRange, whileLoop, list, forEach, func, ret, callStmt,
  clone, findStmt, mapStmt,
};
