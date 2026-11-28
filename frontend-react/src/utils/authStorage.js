/**
 * authStorage.js — non-secret user caches only.
 *
 * JWTs are held by the server in HttpOnly cookies (kids_session/adult_session).
 * Older builds wrote them to localStorage; those keys are cleared as a
 * one-time migration. The adult user cache is separate so an adult session can
 * coexist with a children's session in the same browser.
 */

const ADULT_USER_KEY = 'adult_user';
const LEGACY_KEYS = ['token', 'user', 'adult_token', 'codequest_token', 'codequest_parent_session'];

const clearLegacyTokens = () => LEGACY_KEYS.forEach((key) => localStorage.removeItem(key));

export const getAdultUser = () => {
  try { return JSON.parse(localStorage.getItem(ADULT_USER_KEY)); } catch { return null; }
};

// Kept as (token, user) so existing call sites don't need to change; the token
// argument is ignored now that auth lives in a cookie.
export const setAdultAuth = (_token, user) => {
  localStorage.setItem(ADULT_USER_KEY, JSON.stringify(user));
  clearLegacyTokens();
};

export const clearAdultAuth = () => {
  localStorage.removeItem(ADULT_USER_KEY);
  clearLegacyTokens();
};

export const isAdultUser = (user) => user?.accountType === 'adult_learner';
export const isAdultSignedIn = () => isAdultUser(getAdultUser());
