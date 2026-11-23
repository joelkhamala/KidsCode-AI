// Shared helpers for walking the kids' curriculum in order.
// Modules with no lessons yet are skipped so they never block progress.

export const isDone = (p) => !!(p && (p.completed === 1 || p.completed === true));

export const playableModules = (curriculum = []) =>
  curriculum.filter(m => Array.isArray(m.lessons) && m.lessons.length > 0);

// Lessons finished vs lessons on the child's map. Both numbers come from the same map,
// so the count can never say e.g. "15 of 14" (progress from lessons not on the map is ignored).
export const mapProgress = (curriculum = [], userProgress = {}) => {
  const lessons = playableModules(curriculum).flatMap(m => m.lessons);
  return { done: lessons.filter(l => isDone(userProgress[l.id])).length, total: lessons.length };
};

// Where to go after finishing a lesson: the next lesson in the module, otherwise the module quiz.
export const nextAfterLesson = (curriculum, moduleId, lessonId) => {
  const module = curriculum.find(m => m.id === Number(moduleId));
  if (!module) return null;
  const idx = module.lessons.findIndex(l => l.id === Number(lessonId));
  const nextLesson = module.lessons[idx + 1];
  if (nextLesson) {
    return { type: 'lesson', module, lesson: nextLesson, path: `/lesson/${module.id}/${nextLesson.id}` };
  }
  return { type: 'quiz', module, path: `/quiz/${module.id}` };
};

// Where to go after passing a module quiz: the first lesson of the next playable module.
export const nextAfterQuiz = (curriculum, moduleId) => {
  const mods = playableModules(curriculum);
  const idx = mods.findIndex(m => m.id === Number(moduleId));
  const nextModule = mods[idx + 1];
  if (!nextModule) return null;
  const lesson = nextModule.lessons[0];
  return { type: 'lesson', module: nextModule, lesson, path: `/lesson/${nextModule.id}/${lesson.id}` };
};

export const lessonPosition = (curriculum, moduleId, lessonId) => {
  const module = curriculum.find(m => m.id === Number(moduleId));
  if (!module) return null;
  const idx = module.lessons.findIndex(l => l.id === Number(lessonId));
  return idx === -1 ? null : { n: idx + 1, total: module.lessons.length };
};
