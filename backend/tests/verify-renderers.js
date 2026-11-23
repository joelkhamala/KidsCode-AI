'use strict';
/**
 * Verifies that every practice scenario renders to code that really compiles
 * and prints exactly what the interpreter predicts, in every language we have a
 * toolchain for (python3, node, gcc, g++, javac/java). Missing toolchains are
 * reported and skipped. C# and the block languages are render-checked only.
 *
 * Run: node tests/verify-renderers.js
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');
const { scenarios, signatures } = require('../ai/concepts');
const { render } = require('../ai/program/render');
const { interpret } = require('../ai/program/interpret');
const { mulberry32 } = require('../ai/random');

const has = (cmd) => spawnSync('which', [cmd]).status === 0;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kc-verify-'));

const runners = {
  javascript: has('node') && ((code) => execFileSync('node', ['-e', code], { encoding: 'utf8', timeout: 10000, stdio: ['ignore', 'pipe', 'pipe'] })),
  python: has('python3') && ((code) => {
    const f = path.join(tmp, 'p.py'); fs.writeFileSync(f, code);
    return execFileSync('python3', ['-I', f], { encoding: 'utf8', timeout: 10000, stdio: ['ignore', 'pipe', 'pipe'] });
  }),
  c: has('gcc') && ((code) => {
    const f = path.join(tmp, 'p.c'); const out = path.join(tmp, 'pc'); fs.writeFileSync(f, code);
    execFileSync('gcc', ['-std=c99', '-Wall', '-Werror', '-o', out, f], { encoding: 'utf8', timeout: 30000, stdio: ['ignore', 'pipe', 'pipe'] });
    return execFileSync(out, { encoding: 'utf8', timeout: 10000, stdio: ['ignore', 'pipe', 'pipe'] });
  }),
  cpp: has('g++') && ((code) => {
    const f = path.join(tmp, 'p.cpp'); const out = path.join(tmp, 'pcpp'); fs.writeFileSync(f, code);
    execFileSync('g++', ['-std=c++17', '-Wall', '-Werror', '-o', out, f], { encoding: 'utf8', timeout: 60000, stdio: ['ignore', 'pipe', 'pipe'] });
    return execFileSync(out, { encoding: 'utf8', timeout: 10000, stdio: ['ignore', 'pipe', 'pipe'] });
  }),
  java: has('javac') && ((code) => {
    const dir = fs.mkdtempSync(path.join(tmp, 'j')); fs.writeFileSync(path.join(dir, 'Main.java'), code);
    execFileSync('javac', ['Main.java'], { cwd: dir, encoding: 'utf8', timeout: 60000, stdio: ['ignore', 'pipe', 'pipe'] });
    return execFileSync('java', ['-cp', dir, 'Main'], { encoding: 'utf8', timeout: 20000, stdio: ['ignore', 'pipe', 'pipe'] });
  }),
};

let pass = 0; let fail = 0;
const failures = [];
const langs = Object.keys(runners).filter((l) => runners[l]);
console.log('Toolchains:', langs.join(', '), '| render-only: csharp, blocks, scratch');

for (const [concept, list] of Object.entries(scenarios)) {
  list.forEach((build, si) => {
    for (const loc of ['en', 'sw']) {
      for (const seed of [1, 7]) {
        const sc = build(mulberry32(seed), loc);
        const expected = interpret(sc.program).join('\n');
        for (const lang of langs) {
          const { code } = render(sc.program, lang);
          try {
            const got = runners[lang](code).replace(/\r/g, '').replace(/\n$/, '');
            if (got === expected) pass += 1;
            else { fail += 1; failures.push({ concept, si, loc, lang, expected, got, code }); }
          } catch (e) { fail += 1; failures.push({ concept, si, loc, lang, error: String(e.stderr || e.message).slice(0, 400), code }); }
        }
        for (const lang of ['csharp', 'blocks', 'scratch']) {
          if (concept === 'parameters_return' && lang === 'scratch') continue;
          render(sc.program, lang); // must not throw
        }
      }
    }
  });
}
// Signature snippets must render in every language too.
for (const [concept, build] of Object.entries(signatures)) {
  for (const lang of ['javascript', 'python', 'java', 'c', 'cpp', 'csharp', 'blocks', 'scratch']) {
    if (concept === 'parameters_return' && lang === 'scratch') continue;
    render(build().program, lang);
  }
}

failures.slice(0, 6).forEach((f) => console.log('\nFAIL', f.concept, f.si, f.loc, f.lang, f.error || `\nexpected:\n${f.expected}\ngot:\n${f.got}`, '\n---code---\n' + f.code));
console.log(`\nRenderer verification: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
