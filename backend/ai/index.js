'use strict';
/**
 * KidsCode AI learning engine - public entry point used by server.js.
 *
 *   const aiEngine = require('./ai');
 *   await aiEngine.initialize(db);                 // creates tables
 *   app.use('/api/ai', aiEngine.createRouter({ authenticateToken, getDb }));
 */
const { Store } = require('./store');
const { LLMClient } = require('./llmClient');
const { ContentGenerator } = require('./contentGenerator');
const { LearningEngine } = require('./engine');
const { createRoutes } = require('./routes');
const { runJavaScript } = require('../sandbox/runJs');

let engine = null;
let llm = null;

function build(db, options = {}) {
  llm = options.llm || new LLMClient(process.env);
  const store = new Store(db);
  const runJs = options.runJs || runJavaScript;
  const generator = new ContentGenerator({ store, llm, runJs });
  engine = new LearningEngine({ store, generator, llm, runJs });
  return engine;
}

async function initialize(db, options = {}) {
  const e = build(db, options);
  await e.store.migrate();
  return e;
}

/** The router resolves the engine lazily, so it can be mounted before initialize() runs. */
function createRouter({ authenticateToken, getDb }) {
  const proxy = new Proxy({}, {
    get(_, prop) {
      if (!engine) build(getDb());
      const value = engine[prop];
      return typeof value === 'function' ? value.bind(engine) : value;
    },
  });
  return createRoutes(proxy, { authenticateToken });
}

async function recordLessonCompletion(userId, lessonId, metrics) {
  if (!engine) return;
  await engine.recordLessonCompletion(userId, lessonId, metrics);
}

function describeProvider() {
  return llm ? llm.describe() : 'not initialised';
}

module.exports = { initialize, createRouter, recordLessonCompletion, describeProvider, getEngine: () => engine };
