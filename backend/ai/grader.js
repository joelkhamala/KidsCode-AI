'use strict';
/**
 * Grades learner submissions for every activity type.
 * Objective types are graded exactly; code is executed (JavaScript) or checked
 * by structure, with optional AI rubric feedback for creative work.
 */
const { analyseCode } = require('./codeHeuristics');
const { constructPattern } = require('./languages');

const PRAISE = {
  en: ['Brilliant! 🌟', 'Well done! 🎉', 'You got it! 💪', 'Excellent thinking! 🧠', 'Correct - great job! ✅'],
  sw: ['Hongera sana! 🌟', 'Umefanya vizuri! 🎉', 'Umepata! 💪', 'Fikra nzuri sana! 🧠', 'Sahihi - kazi nzuri! ✅'],
};
const NOT_YET = {
  en: 'Not quite yet - mistakes help your brain grow! 🌱',
  sw: 'Bado kidogo - makosa yanasaidia ubongo wako kukua! 🌱',
};

const pickPraise = (loc) => PRAISE[loc][Math.floor(Math.random() * PRAISE[loc].length)];
const normLine = (s) => String(s).replace(/\s+/g, ' ').trim().toLowerCase();

function outputLines(textOrLines) {
  const lines = Array.isArray(textOrLines) ? textOrLines : String(textOrLines || '').replace(/\r/g, '').split('\n');
  const cleaned = lines.map((l) => String(l));
  while (cleaned.length && !cleaned[cleaned.length - 1].trim()) cleaned.pop();
  while (cleaned.length && !cleaned[0].trim()) cleaned.shift();
  return cleaned;
}

/** Lenient comparison: ignores case, extra spaces and blank lines at the ends. */
function compareOutput(expected, got) {
  const e = outputLines(expected).map(normLine);
  const g = outputLines(got).map(normLine);
  for (let i = 0; i < Math.max(e.length, g.length); i += 1) {
    if (e[i] !== g[i]) return { match: false, firstDiffLine: i + 1, expectedLine: outputLines(expected)[i], gotLine: outputLines(got)[i] };
  }
  return { match: true };
}

const L = (loc, en, sw) => (loc === 'sw' ? sw : en);

/**
 * @param {object} activity full activity (with answers)
 * @param {{answerIndex?: number, text?: string, code?: string}} submission
 * @param {{runJs: Function, review?: Function}} deps review(code, activity) -> AI review or null
 */
async function grade(activity, submission, deps) {
  const loc = activity.locale === 'sw' ? 'sw' : 'en';
  const result = { correct: false, score: 0, feedback: '', details: {} };

  switch (activity.type) {
    case 'mcq':
    case 'complete_code':
    case 'find_bug': {
      const chosen = Number(submission.answerIndex);
      result.correct = Number.isInteger(chosen) && chosen === activity.answerIndex;
      result.details.correctIndex = activity.answerIndex;
      break;
    }

    case 'predict_output': {
      const cmp = compareOutput(activity.expectedOutput, submission.text || '');
      result.correct = cmp.match;
      result.details = { expectedOutput: activity.expectedOutput, ...(cmp.match ? {} : { firstDiffLine: cmp.firstDiffLine }) };
      break;
    }

    case 'write_code': {
      const code = String(submission.code || '');
      const tests = activity.tests || {};
      if (Array.isArray(tests.requiredPatterns)) {
        const missing = tests.requiredPatterns.filter((p) => !new RegExp(p, 'i').test(code));
        result.correct = missing.length === 0 && code.trim().length > 0;
        result.details.missingParts = missing.length;
      } else if (tests.expectedOutput) {
        const run = await deps.runJs(code);
        const got = run.output || [];
        const cmp = compareOutput(tests.expectedOutput, got);
        const usesConcept = tests.requiredPattern ? new RegExp(tests.requiredPattern, 'm').test(code) : true;
        result.correct = !run.error && cmp.match && usesConcept;
        result.details = {
          output: got, expectedOutput: tests.expectedOutput, error: run.error ? `${run.error.name}: ${run.error.message}` : null,
          usesConcept, ...(cmp.match ? {} : { firstDiffLine: cmp.firstDiffLine }),
        };
        if (!usesConcept && cmp.match) {
          result.feedback = L(loc, 'The output is right, but try solving it with the new idea from this lesson!', 'Matokeo ni sahihi, lakini jaribu kutatua kwa kutumia wazo jipya la somo hili!');
        }
      }
      if (!result.correct) result.details.tips = analyseCode(code, activity.language).map((t) => t.message[loc]);
      break;
    }

    case 'create': {
      const code = String(submission.code || '');
      const nonEmpty = code.split('\n').filter((l) => l.trim() && !/^\s*(\/\/|#|💬|<!--)/.test(l)).length;
      const pattern = activity.tests && activity.tests.requiredPattern;
      const usesConcept = pattern ? new RegExp(pattern, 'im').test(code) : true;
      let runOk = true;
      let run = null;
      if (activity.tests && activity.tests.mustRun) {
        run = await deps.runJs(code);
        runOk = !run.error && ((run.output && run.output.length) || (run.turtleCommands && run.turtleCommands.length));
      }
      const staticOk = usesConcept && nonEmpty >= 2 && runOk;
      let review = null;
      if (deps.review && code.trim()) review = await deps.review(code, activity, run).catch(() => null);
      const scores = review && review.scores;
      const total = scores ? Object.values(scores).reduce((a, b) => a + (Number(b) || 0), 0) : null;
      result.correct = staticOk && (total === null || total >= 3);
      result.details = {
        usesConcept, lines: nonEmpty, runOk, output: run ? run.output : undefined,
        error: run && run.error ? `${run.error.name}: ${run.error.message}` : null, review, rubricScores: scores || null,
      };
      if (!usesConcept) result.feedback = L(loc, 'Great start! Your project needs to use this lesson\'s idea - check the hint.', 'Mwanzo mzuri! Mradi wako unahitaji kutumia wazo la somo hili - angalia kidokezo.');
      else if (nonEmpty < 2) result.feedback = L(loc, 'Add a bit more to your project - at least a few lines of your own.', 'Ongeza zaidi kwenye mradi wako - angalau mistari michache yako mwenyewe.');
      if (!result.correct) result.details.tips = analyseCode(code, activity.language).map((t) => t.message[loc]);
      break;
    }

    default:
      throw new Error(`Cannot grade activity type ${activity.type}`);
  }

  result.score = result.correct ? 1 : 0;
  if (!result.feedback) result.feedback = result.correct ? pickPraise(loc) : NOT_YET[loc];
  result.explanation = activity.explanation || '';
  return result;
}

/** Feedback for any code (lesson "check my code" button). */
async function reviewCode({ code, language, task, locale }, { runJs, aiReview }) {
  const loc = locale === 'sw' ? 'sw' : 'en';
  const run = language === 'javascript' ? await runJs(code) : null;
  const tips = analyseCode(code, language).map((t) => t.message[loc]);
  let ai = null;
  if (aiReview) ai = await aiReview({ code, language, task, run }).catch(() => null);
  return {
    ran: Boolean(run),
    output: run ? run.output : null,
    error: run && run.error ? `${run.error.name}: ${run.error.message}` : null,
    tips,
    ai,
    source: ai ? 'ai' : 'offline',
  };
}

module.exports = { grade, reviewCode, compareOutput, outputLines, constructPattern };
