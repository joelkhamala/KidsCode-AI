/**
 * authStorage.js — Isolated auth storage per account type.
 *
 * KIDS / PARENT / TEACHER accounts  →  codequest_token / codequest_user
 * ADULT LEARNER accounts            →  adult_token      / adult_user
 *
 * Keys are never shared between account types, so two sessions can coexist
 * in the same browser (e.g. kids in one tab, adult in another).
 */

// ─── Key constants ────────────────────────────────────────────────────────────
export const KIDS_TOKEN_KEY  = 'codequest_token';
export const KIDS_USER_KEY   = 'codequest_user';
export const ADULT_TOKEN_KEY = 'adult_token';
export const ADULT_USER_KEY  = 'adult_user';

// Legacy keys written by old AdultAuth — cleared on every adult login/logout
const LEGACY_KEYS = ['token', 'user'];

// ─── Kids / Parent / Teacher ──────────────────────────────────────────────────
export const getKidsToken = () => localStorage.getItem(KIDS_TOKEN_KEY);
export const getKidsUser  = () => {
  try { return JSON.parse(localStorage.getItem(KIDS_USER_KEY)); } catch { return null; }
};
export const setKidsAuth = (token, user) => {
  localStorage.setItem(KIDS_TOKEN_KEY, token);
  localStorage.setItem(KIDS_USER_KEY, JSON.stringify(user));
};
export const clearKidsAuth = () => {
  localStorage.removeItem(KIDS_TOKEN_KEY);
  localStorage.removeItem(KIDS_USER_KEY);
};

// ─── Adult Learner ────────────────────────────────────────────────────────────
export const getAdultToken = () => localStorage.getItem(ADULT_TOKEN_KEY);
export const getAdultUser  = () => {
  try { return JSON.parse(localStorage.getItem(ADULT_USER_KEY)); } catch { return null; }
};
export const setAdultAuth = (token, user) => {
  localStorage.setItem(ADULT_TOKEN_KEY, token);
  localStorage.setItem(ADULT_USER_KEY, JSON.stringify(user));
  // Clear legacy keys that caused cross-contamination
  LEGACY_KEYS.forEach(k => localStorage.removeItem(k));
};
export const clearAdultAuth = () => {
  localStorage.removeItem(ADULT_TOKEN_KEY);
  localStorage.removeItem(ADULT_USER_KEY);
  // Also clean up any legacy keys
  LEGACY_KEYS.forEach(k => localStorage.removeItem(k));
};

// ─── Safety: check account type ───────────────────────────────────────────────
export const isAdultUser = (user) =>
  user?.accountType === 'adult_learner';

export const isKidsUser = (user) =>
  !user || ['child', 'parent', 'teacher'].includes(user?.accountType);
