import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';

const AdultModule = () => {
  const { moduleId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [module, setModule] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  // Refetch every time this page is visited (navigating back from a lesson)
  useEffect(() => {
    loadModuleData();
  }, [moduleId, location.key]);

  const loadModuleData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      const token = localStorage.getItem('adult_token');
      // Add cache-busting timestamp so browser never serves stale data
      const response = await fetch(`/api/adult/curriculum?t=${Date.now()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        }
      });

      if (!response.ok) throw new Error('Failed to load module');

      const data = await response.json();
      const foundModule = data.curriculum.find(m => m.id === parseInt(moduleId));

      if (foundModule) {
        setModule(foundModule);
        setLessons(foundModule.lessons || []);
        setLastRefreshed(new Date());
      } else {
        navigate('/adult/dashboard');
      }
    } catch (err) {
      console.error('Failed to load module:', err);
      if (!module) navigate('/adult/dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getStats = () => {
    const total = lessons.length;
    const completed = lessons.filter(l => l.completed).length;
    const inProgress = lessons.filter(l => l.in_progress).length;
    const averageScore = lessons.reduce((acc, l) => acc + (l.score || 0), 0) / total || 0;
    return { total, completed, inProgress, averageScore, remaining: total - completed };
  };

  const getDifficultyInfo = (difficulty) => {
    const map = {
      beginner: { label: 'Beginner', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', icon: '🌱' },
      intermediate: { label: 'Intermediate', color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200', icon: '⚡' },
      advanced: { label: 'Advanced', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', icon: '🚀' }
    };
    return map[difficulty] || map.beginner;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-500">Loading module...</p>
        </div>
      </div>
    );
  }

  if (!module) return null;

  const stats = getStats();
  const difficultyInfo = getDifficultyInfo(module.difficulty);
  const progressPercentage = (stats.completed / stats.total) * 100 || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Compact */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <button
              onClick={() => navigate('/adult/dashboard')}
              className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              ← Back to Dashboard
            </button>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{module.icon}</span>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{module.title}</h1>
                <p className="text-xs text-gray-500">{module.description}</p>
              </div>
            </div>
            <button
              onClick={() => loadModuleData(true)}
              disabled={refreshing}
              className="text-xs text-gray-500 hover:text-blue-600 flex items-center gap-1 disabled:opacity-50"
              title="Refresh progress"
            >
              <span className={refreshing ? 'animate-spin' : ''}>🔄</span>
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content - Lessons Grid (2/3 width) */}
          <div className="lg:col-span-2">
            {/* View Toggle */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                All Lessons
                <span className="ml-2 text-sm font-normal text-gray-500">{stats.total} total</span>
              </h2>
              <div className="flex items-center gap-3">
                {lastRefreshed && (
                  <span className="text-xs text-gray-400">
                    Updated {lastRefreshed.toLocaleTimeString()}
                  </span>
                )}
              </div>
            </div>

            {/* Masonry Grid */}
            <div className="grid sm:grid-cols-2 gap-4">
              {lessons.map((lesson, idx) => (
                <div
                  key={lesson.id}
                  className={`bg-white rounded-lg border transition-all duration-200 overflow-hidden ${lesson.completed
                      ? 'border-green-300 shadow-sm'
                      : selectedLesson === lesson.id
                        ? 'border-blue-400 shadow-md ring-2 ring-blue-100'
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                    }`}
                >
                  {/* Completion banner */}
                  {lesson.completed && (
                    <div className="bg-green-50 border-b border-green-100 px-4 py-1 flex items-center gap-1">
                      <span className="text-green-600 text-xs font-semibold">✓ Completed</span>
                      {lesson.score > 0 && (
                        <span className="ml-auto text-xs text-green-700 font-medium">{lesson.score}%</span>
                      )}
                    </div>
                  )}
                  {lesson.in_progress && !lesson.completed && (
                    <div className="bg-yellow-50 border-b border-yellow-100 px-4 py-1">
                      <span className="text-yellow-600 text-xs font-semibold">⏳ In Progress</span>
                    </div>
                  )}

                  <div className="p-4">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-medium ${lesson.completed
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                          }`}>
                          {lesson.completed ? '✓' : idx + 1}
                        </div>
                        <span className="text-xs text-gray-400">Lesson {idx + 1}</span>
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className="font-semibold text-gray-900 mb-1 line-clamp-1">
                      {lesson.title}
                    </h3>

                    {/* Description */}
                    <p className="text-xs text-gray-500 mb-3 line-clamp-2">
                      {lesson.content?.substring(0, 80)}...
                    </p>

                    {/* Assessment Icons */}
                    <div className="flex gap-2 mb-3 text-xs text-gray-400">
                      {lesson.has_written_test && <span title="Written Test">📝</span>}
                      {lesson.has_practical_test && <span title="Practical Test">✏️</span>}
                      {lesson.has_oral_test && <span title="Oral Test">🎤</span>}
                    </div>

                    {/* CTA */}
                    <div className="flex items-center justify-between">
                      <div className={`w-1.5 h-1.5 rounded-full ${lesson.completed ? 'bg-green-500' : lesson.in_progress ? 'bg-yellow-500' : 'bg-gray-300'
                        }`} />
                      <button
                        onClick={() => navigate(`/adult/lesson/${lesson.id}`)}
                        className={`text-sm font-medium ${lesson.completed
                            ? 'text-green-600 hover:text-green-700'
                            : 'text-blue-600 hover:text-blue-700'
                          }`}
                      >
                        {lesson.completed ? 'Review →' : lesson.in_progress ? 'Continue →' : 'Start →'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Completion Message */}
            {stats.completed === stats.total && stats.total > 0 && (
              <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <div className="text-2xl mb-1">🎉</div>
                <p className="text-sm font-medium text-green-800">Module completed!</p>
                <button className="mt-2 text-xs text-green-700 underline hover:text-green-800">
                  Download certificate
                </button>
              </div>
            )}
          </div>

          {/* Sidebar - Stats Panel (1/3 width) */}
          <div className="lg:col-span-1">
            {/* Module Info Card */}
            <div className="bg-white rounded-lg border border-gray-200 p-5 mb-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="text-4xl">{module.icon}</div>
                <div>
                  <h2 className="font-semibold text-gray-900">{module.title}</h2>
                  <span className={`inline-flex items-center gap-1 text-xs ${difficultyInfo.color}`}>
                    <span>{difficultyInfo.icon}</span>
                    {difficultyInfo.label}
                  </span>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-3">{module.description}</p>
              <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-100">
                <span>⏱️ {module.estimated_hours || 0} hours</span>
                <span>📚 {stats.total} lessons</span>
              </div>
            </div>

            {/* Progress Card */}
            <div className="bg-white rounded-lg border border-gray-200 p-5 mb-5">
              <h3 className="font-medium text-gray-900 mb-3 text-sm">Your Progress</h3>

              {/* Big Progress Ring */}
              <div className="flex justify-center mb-4">
                <div className="relative w-28 h-28">
                  <svg className="w-28 h-28 transform -rotate-90">
                    <circle cx="56" cy="56" r="50" stroke="#e5e7eb" strokeWidth="6" fill="none" />
                    <circle
                      cx="56" cy="56" r="50"
                      stroke="#2563eb"
                      strokeWidth="6"
                      fill="none"
                      strokeDasharray="314"
                      strokeDashoffset={314 - (314 * progressPercentage / 100)}
                      className="transition-all duration-500"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold text-gray-900">{Math.round(progressPercentage)}%</span>
                    <span className="text-xs text-gray-500">complete</span>
                  </div>
                </div>
              </div>

              {/* Stats Breakdown */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Completed</span>
                  <span className="font-semibold text-gray-900">{stats.completed}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">In Progress</span>
                  <span className="font-semibold text-gray-900">{stats.inProgress || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Remaining</span>
                  <span className="font-semibold text-gray-900">{stats.remaining}</span>
                </div>
                {stats.averageScore > 0 && (
                  <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                    <span className="text-gray-600">Avg. Score</span>
                    <span className="font-semibold text-blue-600">{Math.round(stats.averageScore)}%</span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Stats Card */}
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <h3 className="font-medium text-gray-900 mb-3 text-sm">Assessment Types</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">📝 Written Tests</span>
                  <span className="font-medium text-gray-900">
                    {lessons.filter(l => l.has_written_test).length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">✏️ Practical Tests</span>
                  <span className="font-medium text-gray-900">
                    {lessons.filter(l => l.has_practical_test).length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">🎤 Oral Tests</span>
                  <span className="font-medium text-gray-900">
                    {lessons.filter(l => l.has_oral_test).length}
                  </span>
                </div>
              </div>

              {/* Next Lesson Suggestion */}
              {stats.completed < stats.total && (
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-500 mb-2">Next up</p>
                  <div className="text-sm">
                    <p className="font-medium text-gray-800 truncate">
                      {lessons.find(l => !l.completed)?.title || 'All completed!'}
                    </p>
                    <button
                      onClick={() => {
                        const nextLesson = lessons.find(l => !l.completed);
                        if (nextLesson) navigate(`/adult/lesson/${nextLesson.id}`);
                      }}
                      className="mt-2 text-xs text-blue-600 hover:text-blue-700"
                    >
                      Continue learning →
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdultModule;