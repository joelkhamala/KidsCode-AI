import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AdultProgress = () => {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadProgress();
  }, []);

  const loadProgress = async () => {
    try {
      const token = localStorage.getItem('adult_token');
      const response = await fetch('http://localhost:3000/api/adult/progress', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load progress');
      }

      const data = await response.json();
      setProgress(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <div className="text-gray-600">Loading progress...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/adult/dashboard')}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              ← Back to Dashboard
            </button>
            <div className="border-l border-gray-300 pl-4">
              <h1 className="text-2xl font-bold text-gray-900">
                📈 Your Progress
              </h1>
              <p className="text-sm text-gray-600">
                Track your learning journey
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Overall Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="text-sm font-medium text-gray-600 mb-1">Completion</div>
            <div className="text-3xl font-bold text-blue-600">
              {progress?.stats?.progressPercentage || 0}%
            </div>
            <div className="mt-3 bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full"
                style={{ width: `${progress?.stats?.progressPercentage || 0}%` }}
              />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="text-sm font-medium text-gray-600 mb-1">Lessons</div>
            <div className="text-3xl font-bold text-green-600">
              {progress?.stats?.completedLessons || 0}/{progress?.stats?.totalLessons || 0}
            </div>
            <div className="text-xs text-gray-500 mt-1">Completed</div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="text-sm font-medium text-gray-600 mb-1">Hours</div>
            <div className="text-3xl font-bold text-purple-600">
              {progress?.stats?.hoursLogged || 0}
            </div>
            <div className="text-xs text-gray-500 mt-1">of 170 required</div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="text-sm font-medium text-gray-600 mb-1">Average</div>
            <div className="text-3xl font-bold text-indigo-600">
              {progress?.stats?.averageScore || 0}%
            </div>
            <div className="text-xs text-gray-500 mt-1">Assessment Score</div>
          </div>
        </div>

        {/* Module Progress */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Module Progress</h2>
          
          {progress?.modules && progress.modules.length > 0 ? (
            <div className="space-y-4">
              {progress.modules.map((module) => {
                const completedLessons = module.lessons.filter(l => l.completed).length;
                const totalLessons = module.lessons.length;
                const moduleProgress = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

                return (
                  <div key={module.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-gray-900">{module.title}</h3>
                        <p className="text-sm text-gray-600">
                          {completedLessons}/{totalLessons} lessons • {module.estimated_hours || 0} hours
                        </p>
                      </div>
                      <span className="text-sm font-bold text-blue-600">
                        {Math.round(moduleProgress)}%
                      </span>
                    </div>
                    
                    <div className="bg-gray-200 rounded-full h-2 mb-3">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${moduleProgress}%` }}
                      />
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {module.lessons.map((lesson) => (
                        <div
                          key={lesson.id}
                          className={`text-xs p-2 rounded border ${
                            lesson.completed
                              ? 'bg-green-50 border-green-200 text-green-700'
                              : 'bg-gray-50 border-gray-200 text-gray-600'
                          }`}
                        >
                          {lesson.completed ? '✓' : '○'} {lesson.title}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No progress data available yet. Start learning!
            </div>
          )}
        </div>

        {/* Recent Activity */}
        {progress?.recentActivity && progress.recentActivity.length > 0 && (
          <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Recent Activity</h2>
            <div className="space-y-3">
              {progress.recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl">{activity.type === 'lesson' ? '📚' : '⏱️'}</div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{activity.title}</div>
                    <div className="text-xs text-gray-500">{activity.date}</div>
                  </div>
                  {activity.duration && (
                    <div className="text-sm text-gray-600">{activity.duration} min</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdultProgress;
