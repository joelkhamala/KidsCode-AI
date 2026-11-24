'use strict';
/**
 * Checks the Java, Python, SQL, Algorithms and Mathematics courses for real:
 *   - every lesson has content, a task, checks, hints, 3 quiz questions and an oral question
 *   - the model solution passes every check (its program is compiled and run)
 *   - the worked example runs without an error and is not the task's answer
 * Needs Java and Python installed. Usage: node tests/verify-adult-courses.js [moduleId ...]
 */
const course = require('../adultCourse');
const runners = {
  java: () => require('../sandbox/runJava').runJava,
  python: () => require('../sandbox/runPython').runPython,
  sql: () => require('../sandbox/runSQL').runSQL,
};

(async () => {
  const only = process.argv.slice(2).map(Number);
  let failures = 0;
  for (const m of course.MODULES) {
    const language = course.languageOf(m.id);
    if (language === 'web' || (only.length && !only.includes(m.id))) continue;
    for (const [i, l] of m.lessons.entries()) {
      const name = `${m.id}.${i + 1} ${l.title}`;
      const problems = [];
      if (!l.content || l.content.length < 600) problems.push('content too short');
      if (!l.challenge) problems.push('no challenge');
      if (!l.checks || l.checks.length < 2) problems.push('needs 2+ checks');
      if (!l.hints || !l.hints.length) problems.push('no hints');
      if (!l.quiz || l.quiz.length !== 3) problems.push('needs 3 quiz questions');
      (l.quiz || []).forEach((q) => { if (new Set(q.options).size !== q.options.length || q.options.length !== 4) problems.push(`quiz options: ${q.q}`); });
      if (!l.oral) problems.push('no oral question');
      if (!l.solution || !l.solution[language]) problems.push('no solution');
      if (!l.example || !l.example[language]) problems.push('no example');
      if (l.solution && l.solution[language]) {
        const r = await course.gradePractical(l, l.solution, language);
        if (r.score !== 100) problems.push(`solution scores ${r.score}%: ${r.results.filter((x) => !x.passed).map((x) => x.label).join('; ')}${r.runError ? ` (run error: ${r.runError})` : ''}`);
      }
      if (l.example && l.example[language]) {
        const ex = await runners[language]()(l.example[language]);
        if (!ex.ok) problems.push(`example fails: ${ex.error.name}: ${ex.error.message.slice(0, 160)}`);
        const exGrade = await course.gradePractical(l, l.example, language);
        if (exGrade.score === 100) problems.push('example already passes the task (gives the answer away)');
      }
      if (problems.length) { failures += 1; console.log(`FAIL ${name}\n   - ${problems.join('\n   - ')}`); } else console.log(`ok   ${name}`);
    }
  }
  console.log(failures ? `\n${failures} lesson(s) need fixing` : '\nAll lessons pass');
  process.exitCode = failures ? 1 : 0;
})();
