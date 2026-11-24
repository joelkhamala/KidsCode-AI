'use strict';
/**
 * Provider-agnostic client for large language models.
 *
 * Providers (choose with AI_PROVIDER, or it is detected from the keys present):
 *   anthropic - Claude via the Messages API (ANTHROPIC_API_KEY; default model claude-haiku-5-5)
 *   openai    - any OpenAI-compatible /v1/chat/completions endpoint, e.g. a school
 *               server running Ollama or LM Studio (OPENAI_BASE_URL, AI_MODEL, OPENAI_API_KEY optional)
 *   offline   - no model; the engine uses its built-in content bank and heuristics
 *
 * Every call has a timeout, one retry on rate-limit/server errors, and a
 * per-learner hourly budget so costs stay predictable.
 */

const DEFAULT_ANTHROPIC_MODEL = 'claude-haiku-5-5';

function detectProvider(env) {
  const explicit = (env.AI_PROVIDER || '').toLowerCase();
  if (['anthropic', 'openai', 'offline'].includes(explicit)) return explicit;
  if (env.ANTHROPIC_API_KEY) return 'anthropic';
  if (env.OPENAI_BASE_URL || env.OPENAI_API_KEY) return 'openai';
  return 'offline';
}

/** Pull the first complete JSON object/array out of model text (handles ```json fences). */
function extractJson(text) {
  if (typeof text !== 'string') throw new Error('No text to parse');
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.search(/[[{]/);
  if (start === -1) throw new Error('No JSON found in model reply');
  const open = candidate[start];
  const close = open === '{' ? '}' : ']';
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < candidate.length; i += 1) {
    const ch = candidate[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
    } else if (ch === '"') inString = true;
    else if (ch === open) depth += 1;
    else if (ch === close) {
      depth -= 1;
      if (depth === 0) return JSON.parse(candidate.slice(start, i + 1));
    }
  }
  throw new Error('Unterminated JSON in model reply');
}

class LLMClient {
  constructor(env = process.env, fetchImpl = globalThis.fetch) {
    this.env = env;
    this.fetch = fetchImpl;
    this.provider = detectProvider(env);
    this.timeoutMs = Number(env.AI_TIMEOUT_MS || 20000);
    this.maxCallsPerHour = Number(env.AI_MAX_CALLS_PER_LEARNER_PER_HOUR || 60);
    this.usage = new Map(); // userId -> { windowStart, count }
    // After the provider cannot be reached (no internet, timeout), skip it for a while so learners
    // get offline content at once instead of waiting for every request to time out.
    this.cooldownMs = Number(env.AI_COOLDOWN_MS || 60000);
    this.unreachableUntil = 0;

    if (this.provider === 'anthropic') {
      this.model = env.AI_MODEL || DEFAULT_ANTHROPIC_MODEL;
      this.baseUrl = (env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com').replace(/\/$/, '');
      if (!env.ANTHROPIC_API_KEY) this.disable('ANTHROPIC_API_KEY is not set');
    } else if (this.provider === 'openai') {
      this.model = env.AI_MODEL;
      this.baseUrl = (env.OPENAI_BASE_URL || 'https://api.openai.com').replace(/\/$/, '').replace(/\/v1$/, '');
      if (!this.model) this.disable('AI_MODEL must be set for the openai-compatible provider');
      // A hosted service (not a local/school server) always needs a key: without one, stay offline
      // instead of failing on every request.
      const local = /^https?:\/\/(localhost|127\.|0\.0\.0\.0|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|[\w-]+\.local\b)/i.test(this.baseUrl);
      if (this.enabled && !local && !env.OPENAI_API_KEY) this.disable('OPENAI_API_KEY is not set for the hosted AI service');
    }
    if (typeof this.fetch !== 'function' && this.provider !== 'offline') this.disable('fetch() is unavailable (Node 18+ required)');
  }

  disable(reason) {
    console.warn(`🤖 AI provider disabled: ${reason}. Falling back to offline mode.`);
    this.provider = 'offline';
    this.disabledReason = reason;
  }

  get enabled() { return this.provider !== 'offline'; }

  describe() {
    return this.enabled ? `${this.provider} (${this.model})` : `offline${this.disabledReason ? ` - ${this.disabledReason}` : ' (no AI key configured)'}`;
  }

  /** Per-learner hourly budget. Returns false when the learner should use offline content. */
  allow(userId) {
    if (!this.enabled) return false;
    if (Date.now() < this.unreachableUntil) return false; // provider recently unreachable: use offline content
    const key = String(userId || 'anon');
    const now = Date.now();
    const u = this.usage.get(key);
    if (!u || now - u.windowStart > 3600000) {
      this.usage.set(key, { windowStart: now, count: 1 });
      return true;
    }
    if (u.count >= this.maxCallsPerHour) return false;
    u.count += 1;
    return true;
  }

  async request(url, init) {
    let lastErr;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const res = await this.fetch(url, { ...init, signal: controller.signal });
        if (res.ok) return await res.json();
        const body = await res.text().catch(() => '');
        lastErr = new Error(`AI provider HTTP ${res.status}: ${body.slice(0, 300)}`);
        if (res.status !== 429 && res.status < 500) throw lastErr; // do not retry client errors
      } catch (err) {
        lastErr = err.name === 'AbortError' ? new Error('AI provider timed out') : err;
        if (/HTTP 4\d\d/.test(lastErr.message) && !/HTTP 429/.test(lastErr.message)) throw lastErr;
      } finally {
        clearTimeout(timer);
      }
      await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
    }
    // Network errors and timeouts (not HTTP errors): pause AI calls for a while.
    if (!/AI provider HTTP/.test(lastErr && lastErr.message)) this.unreachableUntil = Date.now() + this.cooldownMs;
    throw lastErr;
  }

  /** True while the provider is being skipped after a network failure. */
  get coolingDown() { return Date.now() < this.unreachableUntil; }

  /**
   * @param {{system: string, messages: {role: 'user'|'assistant', content: string}[], maxTokens?: number}} req
   * @returns {Promise<string>}
   */
  async complete({ system, messages, maxTokens = 900 }) {
    if (!this.enabled) throw new Error('AI is offline');

    if (this.provider === 'anthropic') {
      const body = { model: this.model, max_tokens: maxTokens, system, messages };
      if (this.env.AI_TEMPERATURE) body.temperature = Number(this.env.AI_TEMPERATURE);
      const data = await this.request(`${this.baseUrl}/v1/messages`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': this.env.ANTHROPIC_API_KEY,
          'anthropic-version': this.env.ANTHROPIC_VERSION || '2023-06-01',
        },
        body: JSON.stringify(body),
      });
      const text = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
      if (!text) throw new Error('Empty reply from AI provider');
      return text;
    }

    const headers = { 'content-type': 'application/json' };
    if (this.env.OPENAI_API_KEY) headers.authorization = `Bearer ${this.env.OPENAI_API_KEY}`;
    const body = { model: this.model, max_tokens: maxTokens, messages: [{ role: 'system', content: system }, ...messages] };
    if (this.env.AI_TEMPERATURE) body.temperature = Number(this.env.AI_TEMPERATURE);
    const data = await this.request(`${this.baseUrl}/v1/chat/completions`, { method: 'POST', headers, body: JSON.stringify(body) });
    const text = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (!text) throw new Error('Empty reply from AI provider');
    return text;
  }

  async completeJson(req) {
    const text = await this.complete(req);
    return extractJson(text);
  }
}

module.exports = { LLMClient, extractJson, detectProvider, DEFAULT_ANTHROPIC_MODEL };
