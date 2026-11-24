import axios from 'axios';

// Relative URL works both in development (CRA proxies /api to the backend, see
// "proxy" in package.json) and in production (Express serves the built app).
// Set REACT_APP_API_URL to point at a backend on another domain.
const API_BASE = process.env.REACT_APP_API_URL || '/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('codequest_token');
  if (token) {
    // Check if token is too large (might cause 431 error)
    if (token.length > 8000) {
      console.error('Token too large, clearing localStorage');
      localStorage.clear();
      window.location.href = '/auth';
      return Promise.reject(new Error('Token too large'));
    }
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 431 errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 431) {
      console.error('431 Error: Request headers too large. Clearing localStorage...');
      localStorage.clear();
      window.location.href = '/auth';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (email, password) => api.post('/login', { email, password }),
  register: (userData) => api.post('/register', userData),
  parentLogin: (email, password) => api.post('/parent/login', { email, password }),
  parentRegister: (parentData) => api.post('/parent/register', parentData),
  teacherLogin: (email, password) => api.post('/teacher/login', { email, password }),
  teacherRegister: (teacherData) => api.post('/teacher/register', teacherData),
};

// Curriculum API
export const curriculumAPI = {
  getCurriculum: () => api.get('/curriculum'),
  getLesson: (id) => api.get(`/lesson/${id}`),
};

// Lesson challenge checklist + scoring (a lesson needs 50% to be completed)
export const lessonAPI = {
  getChallenge: (lessonId, locale) => api.get(`/lessons/${lessonId}/challenge`, { params: { locale } }),
  check: (lessonId, code, locale) => api.post(`/lessons/${lessonId}/check`, { code, locale }),
};

// Progress API
export const progressAPI = {
  getProgress: () => api.get('/progress'),
  saveProgress: (data) => api.post('/progress', data),
  getAchievements: () => api.get('/achievements'),
};

// Achievements API
export const achievementsAPI = {
  getAchievements: () => api.get('/achievements'),
};

// Social API - Friends
export const socialAPI = {
  // Search users
  searchUsers: (query) => api.get('/social/search', { params: { query } }),
  
  // Friend requests
  sendFriendRequest: (friendId) => api.post('/social/friends/request', { friendId }),
  getFriendRequests: () => api.get('/social/friends/requests'),
  acceptFriendRequest: (requestId) => api.post(`/social/friends/accept/${requestId}`),
  rejectFriendRequest: (requestId) => api.post(`/social/friends/reject/${requestId}`),
  
  // Friends management
  getFriends: () => api.get('/social/friends'),
  removeFriend: (friendId) => api.delete(`/social/friends/${friendId}`),
  getFriendActivity: (friendId) => api.get(`/social/friends/${friendId}/activity`),
  
  // Leaderboard
  getLeaderboard: (timeframe = 'all', limit = 50) => 
    api.get('/social/leaderboard', { params: { timeframe, limit } }),
  getFriendsLeaderboard: (timeframe = 'all') => api.get('/social/leaderboard/friends', { params: { timeframe } }),
  getUserRank: () => api.get('/social/rank'),

  // Activity feed
  getActivityFeed: (limit = 20) => api.get('/social/feed', { params: { limit } }),

  // Things friends do together
  getSettings: () => api.get('/social/settings'),
  getTeam: () => api.get('/social/team'),
  getProfile: (friendId, locale) => api.get(`/social/friends/${friendId}/profile`, { params: { locale } }),
  cheer: ({ to, sticker, eventId, projectId }) => api.post('/social/cheers', { to, sticker, eventId, projectId }),
  getInbox: (locale) => api.get('/social/inbox', { params: { locale } }),
  markInboxSeen: () => api.post('/social/inbox/seen'),
  getDuels: (locale) => api.get('/social/duels', { params: { locale } }),
  startDuel: ({ to, language, concept }) => api.post('/social/duels', { to, language, concept }),
  getDuel: (id, locale) => api.get(`/social/duels/${id}`, { params: { locale } }),
  answerDuel: (id, answers, locale) => api.post(`/social/duels/${id}/answers`, { answers, locale }),
  declineDuel: (id) => api.post(`/social/duels/${id}/decline`),
  getProjects: () => api.get('/social/projects'),
  getProject: (id) => api.get(`/social/projects/${id}`),
  shareProject: (data) => api.post('/social/projects', data),
  unshareProject: (id) => api.delete(`/social/projects/${id}`),
};

// ---------------------------------------------------------------------------
// Adult learners - a separate client that uses the adult login (adult_token), so an
// adult session and a children's session can be open in the same browser.
// ---------------------------------------------------------------------------
const adultHttp = axios.create({ baseURL: API_BASE, headers: { 'Content-Type': 'application/json' } });
adultHttp.interceptors.request.use((config) => {
  const token = localStorage.getItem('adult_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
adultHttp.interceptors.response.use((r) => r, (error) => {
  const url = error.config?.url || '';
  // Expired or invalid login: go back to the adult sign-in page.
  if (error.response?.status === 401 && !/\/adult\/(login|register)$/.test(url)) {
    localStorage.removeItem('adult_token');
    localStorage.removeItem('adult_user');
    if (!window.location.pathname.startsWith('/adult/auth')) window.location.href = '/adult/auth';
  }
  return Promise.reject(error);
});

export const adultAPI = {
  register: (data) => adultHttp.post('/adult/register', data),
  login: (email, password) => adultHttp.post('/adult/login', { email, password }),
  me: () => adultHttp.get('/adult/me'),
  overview: () => adultHttp.get('/adult/overview'),
  updateProfile: (data) => adultHttp.put('/adult/profile', data),
  changePassword: (currentPassword, newPassword) => adultHttp.put('/adult/password', { currentPassword, newPassword }),
  curriculum: () => adultHttp.get('/adult/curriculum'),
  lesson: (id) => adultHttp.get(`/adult/lesson/${id}`),
  saveLesson: (id, code) => adultHttp.post(`/adult/lesson/${id}/save`, { code }),
  checkLesson: (id, code) => adultHttp.post(`/adult/lesson/${id}/check`, { code }),
  quiz: (id, answers) => adultHttp.post(`/adult/lesson/${id}/quiz`, { answers }),
  oral: (id, text) => adultHttp.post(`/adult/lesson/${id}/oral`, { text }),
  complete: (id, code) => adultHttp.post(`/adult/lesson/${id}/complete`, { code }),
  activity: (data) => adultHttp.post('/adult/activity', data),
  progress: () => adultHttp.get('/adult/progress'),
  // One certificate per course: every course with its requirements, and issuing one.
  certificates: () => adultHttp.get('/adult/certificates'),
  issueCertificate: (courseId) => adultHttp.post(`/adult/certificates/${courseId}`),
  verifyCertificate: (code) => adultHttp.get(`/certificates/verify/${encodeURIComponent(code)}`),
  // Run code on the server. Every language answers { ok, language, output, error, tables, notes, timeMs }.
  executeCode: (language, code, input = '') => adultHttp.post(`/adult/code/execute/${language}`, { code, input }),
  executeJava: (code, input = '') => adultHttp.post('/adult/code/execute/java', { code, input }),
  executePython: (code, input = '') => adultHttp.post('/adult/code/execute/python', { code, input }),
  executeSQL: (query) => adultHttp.post('/adult/code/execute/sql', { code: query }),
  sqlTables: () => adultHttp.get('/adult/code/sql/tables'),
  codeStatus: () => adultHttp.get('/adult/code/status'),
};

// Parents: their child's friends and sharing settings
export const parentSocialAPI = {
  get: (childId) => api.get(`/parent/social/${childId}`),
  update: (childId, settings) => api.put(`/parent/social/${childId}`, settings),
  removeFriend: (childId, friendId) => api.delete(`/parent/social/${childId}/friends/${friendId}`),
  removeProject: (childId, projectId) => api.delete(`/parent/social/${childId}/projects/${projectId}`),
};

// Code execution API
export const codeAPI = {
  runCode: (code, mode) => api.post('/run-code', { code, mode }),
};

// Code history API
export const codeHistoryAPI = {
  saveCode: (data) => api.post('/code-history', data),
  getHistory: (limit, offset) => api.get('/code-history', { params: { limit, offset } }),
  getCode: (id) => api.get(`/code-history/${id}`),
  deleteCode: (id) => api.delete(`/code-history/${id}`),
};

// Parent API
export const parentAPI = {
  getChildren: () => api.get('/parent/children'),
  createChild: (childData) => api.post('/parent/children', childData),
  getChild: (childId) => api.get(`/parent/children/${childId}`),
  updateChild: (childId, updates) => api.put(`/parent/children/${childId}`, updates),
  deleteChild: (childId) => api.delete(`/parent/children/${childId}`),
  getChildProgress: (childId) => api.get(`/parent/children/${childId}/progress`),
  setRestrictions: (childId, restrictions) => api.post(`/parent/children/${childId}/restrictions`, restrictions),
  getDashboard: () => api.get('/parent/dashboard'),
  switchToChild: (childId) => api.post(`/parent/switch-child/${childId}`),
};

// Leaderboard API
export const leaderboardAPI = {
  getLeaderboard: () => api.get('/leaderboard'),
};

// Teacher API
export const teacherAPI = {
  getStudents: () => api.get('/teacher/students'),
  getStudent: (studentId) => api.get(`/teacher/students/${studentId}`),
  getStudentProgress: (studentId) => api.get(`/teacher/students/${studentId}/progress`),
  getDashboard: () => api.get('/teacher/dashboard'),
  enrollStudent: (studentEmail, className) => api.post('/teacher/students/enroll', { studentEmail, className }),
  removeStudent: (studentId) => api.delete(`/teacher/students/${studentId}`),
};

// Lesson Approval API
export const approvalAPI = {
  requestApproval: (lessonId, moduleId) => api.post('/lesson-approval/request', { lessonId, moduleId }),
  checkApproval: (lessonId) => api.get(`/lesson-approval/check/${lessonId}`),
  getParentRequests: () => api.get('/parent/approval-requests'),
  respondToRequest: (requestId, status, note) => api.post(`/parent/approval-requests/${requestId}/respond`, { status, note }),
};

// AI Coach API (adaptive learning engine)
/** The AI Coach endpoints, for whichever login (children or adult) the client carries. */
const makeAiAPI = (api) => ({
  status: () => api.get('/ai/status'),
  catalog: (locale) => api.get('/ai/catalog', { params: { locale } }),
  profile: (language, locale) => api.get('/ai/profile', { params: { language, locale } }),
  savePreferences: (prefs) => api.put('/ai/preferences', prefs),
  journey: (language, locale) => api.get('/ai/journey', { params: { language, locale } }),
  next: ({ language, locale, concept, fresh } = {}) =>
    api.get('/ai/next', { params: { language, locale, concept, fresh: fresh ? 1 : undefined } }),
  hint: (activityId, hintNumber, learnerAnswer) =>
    api.post(`/ai/activities/${activityId}/hint`, { hintNumber, learnerAnswer }),
  submit: (activityId, submission) => api.post(`/ai/activities/${activityId}/submit`, submission),
  explain: (payload) => api.post('/ai/explain', payload),
  reviewCode: (code, language, task, locale) => api.post('/ai/review-code', { code, language, task, locale }),
  tutor: (message, history, context, locale) => api.post('/ai/tutor', { message, history, context, locale }),
  moderate: (text) => api.post('/ai/moderate', { text }),
  learnerInsights: (learnerId, { narrative, locale } = {}) =>
    api.get(`/ai/insights/learner/${learnerId}`, { params: { narrative: narrative ? 1 : undefined, locale } }),
  classInsights: () => api.get('/ai/insights/class'),
});

export const aiAPI = makeAiAPI(api);
// Adult learners use the same Coach through their own (adult) login.
export const adultAiAPI = makeAiAPI(adultHttp);

export default api;
