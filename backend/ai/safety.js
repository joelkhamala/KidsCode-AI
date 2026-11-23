'use strict';
/**
 * Child-safety layer for every AI interaction (proposal §3.6: COPPA principles,
 * Kenya Data Protection Act 2019, AI moderation of community content).
 *
 *  - redactPII:   removes e-mails, phone numbers and long ID-like numbers from
 *                 learner text BEFORE it is sent to an AI provider.
 *  - checkText:   flags unsafe content (self-harm, sexual, violence, contact
 *                 requests, bullying/profanity) in learner input or AI output.
 *  - cleanOutput: removes links from AI replies and blocks unsafe replies.
 *
 * Word lists are deliberately small and conservative; they are a first filter,
 * not a substitute for human moderation. Flagged items are logged (without the
 * full text) for a teacher/admin to review.
 */

const PII_PATTERNS = [
  { type: 'email', re: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi },
  // Kenyan mobile numbers: +254 7xx / 1xx, 07xx, 01xx (spaces or dashes allowed)
  { type: 'phone', re: /(?:\+?254|0)[\s-]?[17]\d{2}[\s-]?\d{3}[\s-]?\d{3}\b/g },
  // Generic international phone numbers
  { type: 'phone', re: /\+\d{1,3}[\s-]?\d{2,4}[\s-]?\d{3,4}[\s-]?\d{3,4}\b/g },
];
// Only applied to natural-language text, never to code (code often has big numbers).
const ID_NUMBER = { type: 'id_number', re: /\b\d{7,10}\b/g };

const LOCATION_SHARING = /\b(i live (at|in|near)|my (home )?address is|my school is|ninaishi|nyumbani kwetu ni|shule yangu ni)\b/i;

const CATEGORIES = {
  self_harm: [
    /\b(kill|hurt|harm|cut)\s+my\s?self\b/i, /\bsuicid/i, /\bwant to die\b/i, /\bend my life\b/i,
    /\bkujiua\b/i, /\bnataka kufa\b/i, /\bkujidhuru\b/i,
  ],
  sexual: [/\bsex(ual|y)?\b/i, /\bporn/i, /\bnude/i, /\bnaked\b/i, /\bngono\b/i, /\buchi\b/i],
  violence: [/\b(kill|shoot|stab)\s+(you|him|her|them|everyone)\b/i, /\bbomb\b/i, /\bgun(s)?\b/i, /\bnitakuua\b/i],
  contact: [
    /\b(whatsapp|text|call|dm|snap|message)\s+me\b/i, /\bsend (me )?(your|a) (photo|pic|picture|number)\b/i,
    /\bmeet (me|up) (at|in|after)\b/i, /\bwhat('?s| is) your (address|number|school)\b/i, /\bnitumie picha\b/i,
  ],
  bullying: [/\b(stupid|idiot|dumb|loser|ugly|fat)\b/i, /\bshut up\b/i, /\bmjinga\b/i, /\bpumbavu\b/i, /\bmshenzi\b/i],
  profanity: [/\bf+u+c+k/i, /\bs+h+i+t+\b/i, /\bbitch/i, /\bbastard/i, /\bmalaya\b/i, /\bkuma\b/i],
};

// Bullying words are allowed in AI *input* (e.g. "my code is stupid") but are logged;
// everything else blocks community posts.
const BLOCKING = new Set(['self_harm', 'sexual', 'violence', 'contact', 'profanity']);

function redactPII(text, { isCode = false } = {}) {
  if (typeof text !== 'string' || !text) return { text: text || '', found: [] };
  const found = new Set();
  let out = text;
  const patterns = isCode ? PII_PATTERNS : [...PII_PATTERNS, ID_NUMBER];
  for (const { type, re } of patterns) {
    out = out.replace(re, () => { found.add(type); return `[${type} removed]`; });
  }
  if (!isCode && LOCATION_SHARING.test(text)) found.add('location');
  return { text: out, found: [...found] };
}

function checkText(text) {
  const reasons = [];
  if (typeof text === 'string' && text) {
    for (const [category, patterns] of Object.entries(CATEGORIES)) {
      if (patterns.some((re) => re.test(text))) reasons.push(category);
    }
  }
  return {
    ok: !reasons.some((r) => BLOCKING.has(r)),
    reasons,
    selfHarm: reasons.includes('self_harm'),
  };
}

const URL_RE = /\b(?:https?:\/\/|www\.)\S+/gi;

/** Make an AI reply safe to show a child. Returns null if it must not be shown. */
function cleanOutput(text) {
  if (typeof text !== 'string') return null;
  const stripped = text.replace(URL_RE, '').trim();
  const check = checkText(stripped);
  if (!check.ok || check.reasons.includes('bullying')) return null;
  return stripped.slice(0, 2500);
}

const SUPPORT_MESSAGE = {
  en: 'It sounds like something might be really hard right now. You are not alone. Please talk to an adult you trust - a parent, guardian or teacher. In Kenya you can call the free Child Helpline on 116 at any time, day or night.',
  sw: 'Inaonekana kuna jambo zito sana kwako sasa hivi. Hauko peke yako. Tafadhali zungumza na mtu mzima unayemwamini - mzazi, mlezi au mwalimu. Nchini Kenya unaweza kupiga simu ya bure ya Msaada kwa Watoto 116 wakati wowote, mchana au usiku.',
};

const PRIVACY_REMINDER = {
  en: 'Remember to keep personal things private - like your phone number, home address or school. I removed it to keep you safe. 🛡️',
  sw: 'Kumbuka kuweka mambo yako binafsi kuwa siri - kama namba ya simu, anwani ya nyumbani au shule yako. Nimeiondoa ili kukulinda. 🛡️',
};

const OFF_LIMITS_REPLY = {
  en: 'Let\'s keep our chat kind and about coding. 😊 What are you working on right now?',
  sw: 'Tuweke mazungumzo yetu kuwa ya upole na kuhusu msimbo. 😊 Unafanyia kazi nini sasa hivi?',
};

module.exports = { redactPII, checkText, cleanOutput, SUPPORT_MESSAGE, PRIVACY_REMINDER, OFF_LIMITS_REPLY };
