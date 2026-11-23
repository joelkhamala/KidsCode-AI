'use strict';
/** Small seeded random helpers so generated activities are reproducible. */

function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const randInt = (rng, min, max) => min + Math.floor(rng() * (max - min + 1));
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];

function shuffle(rng, arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Shuffle options and return the new index of the correct answer. */
function shuffleOptions(rng, correct, distractors) {
  const unique = [];
  [correct, ...distractors].forEach((o) => {
    if (o != null && !unique.includes(o)) unique.push(o);
  });
  const options = shuffle(rng, unique);
  return { options, answerIndex: options.indexOf(correct) };
}

function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

module.exports = { mulberry32, randInt, pick, shuffle, shuffleOptions, hashString };
