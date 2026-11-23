import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { progressAPI, curriculumAPI } from '../services/api';
import { getTranslatedLesson } from '../translations/lessons';
import { isDone } from '../utils/learningPath';

// How to earn each badge (keyed by the badge's condition) and where to go to do it.
const BADGE_HOW = {
  complete_first_lesson: { tip: 'profileUi.howFirst', to: '/', go: 'profileUi.goLesson' },
  complete_5_lessons: { tip: 'profileUi.howFive', to: '/curriculum', go: 'profileUi.goMap' },
  use_turtle: { tip: 'profileUi.howTurtle', to: '/playground', go: 'profileUi.goPlayground' },
  use_loop: { tip: 'profileUi.howLoop', to: '/playground', go: 'profileUi.goPlayground' },
  complete_module: { tip: 'profileUi.howModule', to: '/curriculum', go: 'profileUi.goMap' },
  earn_1000_xp: { tip: 'profileUi.howXp', to: '/coach', go: 'profileUi.goCoach' },
  try_all_modules: { tip: 'profileUi.howExplorer', to: '/curriculum', go: 'profileUi.goMap' },
  streak_3: { tip: 'profileUi.howStreak' },
};

const AVATARS =['🦊', '🐼', '🦁', '🐸', '🐵', '🦄', '🐯', '🐙', '🐧', '🐨'];

const Profile = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { currentUser, userXP, userStreak, userProgress, logout } = useAuth();
  const [achievements, setAchievements] = useState([]);
  const [lessonsById, setLessonsById] = useState({});

  useEffect(() => {
    progressAPI.getAchievements()
      .then(res => setAchievements(res.data.achievements || []))
      .catch(err => console.error('Failed to load achievements:', err));
    curriculumAPI.getCurriculum()
      .then(res => {
        const map = {};
        (res.data.curriculum || []).forEach(m => m.lessons.forEach(l => { map[l.id] = { ...l, moduleIcon: m.icon }; }));
        setLessonsById(map);
      })
      .catch(() => {});
  }, [userProgress]);

  const name = (currentUser?.username?.split('_')[0] || 'Coder');
  const displayName = name.charAt(0).toUpperCase() + name.slice(1);
  const avatar = AVATARS[(currentUser?.id || 0) % AVATARS.length];

  const xp = userXP || 0;
  const level = Math.floor(xp / 200) + 1;
  const xpInLevel = xp % 200;

  const completed = useMemo(
    () => Object.values(userProgress).filter(isDone)
      .sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0)),
    [userProgress]
  );

  const sortedBadges = useMemo(
    () => [...achievements].sort((a, b) => Number(!!b.unlocked) - Number(!!a.unlocked)),
    [achievements]
  );
  const unlockedCount = achievements.filter(a => a.unlocked).length;

  const lessonTitle = (id) => getTranslatedLesson(Number(id), i18n.language)?.title || lessonsById[id]?.title || t('profileUi.lessonN', { n: id });

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 md:py-8">
      <h1 className="page-title mb-6">🏆 {t('profileUi.title')}</h1>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: who am I */}
        <aside className="space-y-6">
          <section className="card p-6 text-center">
            <div className="kid-mascot mx-auto mb-3" style={{ background: '#eef2ff', borderColor: '#c7d2fe' }} aria-hidden="true">
              {avatar}
            </div>
            <h2 className="font-display text-3xl text-slate-800">{displayName}</h2>
            <p className="text-indigo-600 font-extrabold mb-4">{t('profileUi.levelCoder', { level })}</p>

            <div className="text-left mb-1 flex justify-between text-sm font-bold text-slate-600">
              <span>{t('profileUi.toNextLevel', { level: level + 1 })}</span>
              <span>{xpInLevel}/200</span>
            </div>
            <div className="kid-bar mb-5"><div className="kid-bar-fill" style={{ width: `${(xpInLevel / 200) * 100}%` }} /></div>

            <div className="grid grid-cols-3 gap-2 mb-5">
              <div className="rounded-2xl bg-amber-50 p-3">
                <div className="font-display text-2xl text-amber-500">{xp}</div>
                <div className="text-xs font-bold text-slate-600">⭐ XP</div>
              </div>
              <div className="rounded-2xl bg-green-50 p-3">
                <div className="font-display text-2xl text-green-600">{completed.length}</div>
                <div className="text-xs font-bold text-slate-600">✅ {t('profileUi.lessons')}</div>
              </div>
              <div className="rounded-2xl bg-orange-50 p-3">
                <div className="font-display text-2xl text-orange-500">{userStreak || 0}</div>
                <div className="text-xs font-bold text-slate-600">🔥 {t('profileUi.days')}</div>
              </div>
            </div>

            <dl className="text-sm text-left space-y-2 bg-slate-50 rounded-2xl p-4 mb-4">
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500 font-semibold">{t('profile.username')}</dt>
                <dd className="font-bold text-slate-800 truncate">{currentUser?.username}</dd>
              </div>
              {currentUser?.age && (
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500 font-semibold">{t('auth.age')}</dt>
                  <dd className="font-bold text-slate-800">{currentUser.age}</dd>
                </div>
              )}
              <p className="text-xs text-slate-500 pt-1">🔐 {t('profileUi.askGrownUp')}</p>
            </dl>

            <button type="button" onClick={handleLogout} className="btn-secondary w-full justify-center text-sm">
              🚪 {t('nav.signOut')}
            </button>
          </section>
        </aside>

        {/* Right: badges + history */}
        <div className="lg:col-span-2 space-y-6">
          <section className="card p-6" aria-labelledby="badges-title">
            <div className="flex items-baseline justify-between mb-4 gap-2">
              <h2 id="badges-title" className="font-display text-2xl text-slate-800">🏅 {t('kidHome.tileBadges')}</h2>
              {achievements.length > 0 && (
                <span className="text-sm font-extrabold text-slate-500">
                  {t('profileUi.badgeCount', { got: unlockedCount, total: achievements.length })}
                </span>
              )}
            </div>

            {achievements.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-5xl mb-2" aria-hidden="true">🏅</div>
                <p className="text-slate-600 font-semibold mb-4">{t('profileUi.noBadges')}</p>
                <Link to="/" className="btn-primary">▶ {t('kidHome.keepGoing')}</Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {sortedBadges.map(a => {
                  const how = BADGE_HOW[a.condition];
                  const p = a.progress;
                  const pct = p && p.target ? Math.round((p.current / p.target) * 100) : 0;
                  return (
                    <div key={a.id} className={`badge-tile ${a.unlocked ? 'unlocked' : 'locked'} flex flex-col`}>
                      <div className="badge-icon text-4xl mb-1" aria-hidden="true">{a.icon}</div>
                      <div className="font-extrabold text-slate-800 text-sm">{a.name}</div>
                      <div className="text-xs text-slate-600 font-semibold mt-1">{a.description}</div>
                      {a.unlocked ? (
                        <div className="text-xs font-extrabold mt-2 text-green-600">✓ {t('profileUi.earned')}</div>
                      ) : (
                        <div className="mt-2 flex-1 flex flex-col justify-end gap-2">
                          {how && <div className="text-xs text-slate-500 font-semibold">💡 {t(how.tip)}</div>}
                          {p && p.target > 1 && (
                            <div>
                              <div className="kid-bar" style={{ height: 6 }} role="progressbar" aria-valuenow={p.current} aria-valuemin={0} aria-valuemax={p.target}>
                                <div className="kid-bar-fill" style={{ width: `${pct}%` }} />
                              </div>
                              <div className="text-xs font-bold text-slate-500 mt-1">{t('profileUi.progressOf', { current: p.current, target: p.target })}</div>
                            </div>
                          )}
                          {how && how.to && (
                            <Link to={how.to} className="btn-secondary text-xs py-1 px-2 justify-center">{t(how.go)} →</Link>
                          )}
                          <div className="text-xs font-extrabold text-slate-400">🔒 +{a.xp_reward} XP</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="card p-6" aria-labelledby="recent-title">
            <h2 id="recent-title" className="font-display text-2xl text-slate-800 mb-4">📈 {t('profileUi.recent')}</h2>
            {completed.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-600 font-semibold mb-4">{t('profileUi.noRecent')}</p>
                <Link to="/" className="btn-primary">▶ {t('kidHome.startFirstLesson')}</Link>
              </div>
            ) : (
              <ul className="space-y-2">
                {completed.slice(0, 6).map(p => (
                  <li key={p.lesson_id} className="lesson-row is-done">
                    <span className="text-2xl" aria-hidden="true">{lessonsById[p.lesson_id]?.moduleIcon || '✅'}</span>
                    <span className="flex-1 min-w-0">
                      <span className="block font-extrabold text-slate-800 truncate">{lessonTitle(p.lesson_id)}</span>
                      {p.updated_at && (
                        <span className="block text-xs font-semibold text-slate-500">
                          {new Date(p.updated_at).toLocaleDateString(i18n.language)}
                        </span>
                      )}
                    </span>
                    {p.score > 0 && <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-1 rounded-full">⭐ {p.score}</span>}
                  </li>
                ))}
              </ul>
            )}
            <Link to="/code-history" className="btn-secondary w-full justify-center mt-4 text-sm">
              💾 {t('profileUi.myCode')}
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Profile;
