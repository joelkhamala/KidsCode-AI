import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAdultUser } from '../utils/authStorage';

const AdultDashboard = () => {
  const navigate = useNavigate();

  // Read user from the isolated adult_user key
  const user = getAdultUser();

  const [curriculum, setCurriculum] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const token = localStorage.getItem('adult_token');
      const response = await fetch('/api/adult/curriculum', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load curriculum');
      }

      const data = await response.json();
      setCurriculum(data.curriculum);
      setStats(data.stats);
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
          <div className="text-gray-600">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Professional Web Development
          </h1>
          <p className="text-gray-600">ICT/CU/CP/CR/08/6/A • Welcome, {user?.firstName}!</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Stats Overview */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="text-sm font-medium text-gray-600 mb-1">Progress</div>
            <div className="text-3xl font-bold text-blue-600">
              {stats?.completedLessons || 0}/{stats?.totalLessons || 0}
            </div>
            <div className="text-xs text-gray-500 mt-1">Lessons Completed</div>
            <div className="mt-3 bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${stats?.progressPercentage || 0}%` }}
              />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="text-sm font-medium text-gray-600 mb-1">Hours Logged</div>
            <div className="text-3xl font-bold text-green-600">
              {stats?.hoursLogged || 0}/170
            </div>
            <div className="text-xs text-gray-500 mt-1">Total Hours</div>
            <div className="mt-3 bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full transition-all"
                style={{ width: `${Math.min(((stats?.hoursLogged || 0) / 170) * 100, 100)}%` }}
              />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="text-sm font-medium text-gray-600 mb-1">Average Score</div>
            <div className="text-3xl font-bold text-purple-600">
              {stats?.averageScore || 0}%
            </div>
            <div className="text-xs text-gray-500 mt-1">Assessment Average</div>
            <div className="mt-3">
              {(stats?.averageScore || 0) >= 70 ? (
                <span className="text-xs text-green-600 font-medium">✓ Passing</span>
              ) : (
                <span className="text-xs text-orange-600 font-medium">Keep improving</span>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="text-sm font-medium text-gray-600 mb-1">Certification</div>
            <div className="text-3xl font-bold text-indigo-600">
              {stats?.progressPercentage || 0}%
            </div>
            <div className="text-xs text-gray-500 mt-1">Completion</div>
            <div className="mt-3">
              {stats?.progressPercentage >= 100 && stats?.hoursLogged >= 170 && stats?.averageScore >= 70 ? (
                <button
                  onClick={() => navigate('/adult/certificate')}
                  className="text-xs bg-indigo-600 text-white px-3 py-1 rounded-full hover:bg-indigo-700"
                >
                  Get Certificate
                </button>
              ) : (
                <span className="text-xs text-gray-500">In Progress</span>
              )}
            </div>
          </div>
        </div>

        {/* Curriculum Modules */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Curriculum Modules</h2>
          
          {curriculum.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-8 text-center border border-gray-200">
              <div className="text-4xl mb-4">📚</div>
              <p className="text-gray-600">No modules available yet.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {curriculum.map((module) => {
                const completedLessons = module.lessons.filter(l => l.completed).length;
                const totalLessons = module.lessons.length;
                const progress = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

                return (
                  <div
                    key={module.id}
                    className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition overflow-hidden"
                  >
                    <div className="p-6">
                      <div className="flex items-start gap-4 mb-4">
                        <div className="text-4xl">{module.icon}</div>
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-gray-900 mb-1">
                            {module.title}
                          </h3>
                          <p className="text-sm text-gray-600 mb-3">
                            {module.description}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>📊 {completedLessons}/{totalLessons} lessons</span>
                            <span>⏱️ {module.estimated_hours || 0} hours</span>
                            <span className={`font-medium ${
                              module.difficulty === 'beginner' ? 'text-green-600' :
                              module.difficulty === 'intermediate' ? 'text-yellow-600' :
                              'text-red-600'
                            }`}>
                              {module.difficulty}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mb-4">
                        <div className="flex justify-between text-xs text-gray-600 mb-1">
                          <span>Progress</span>
                          <span>{Math.round(progress)}%</span>
                        </div>
                        <div className="bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>

                      {/* Action Button */}
                      <button
                        onClick={() => navigate(`/adult/module/${module.id}`)}
                        className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition"
                      >
                        {completedLessons > 0 ? 'Continue Learning' : 'Start Module'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Links */}
        <div className="mt-8 grid md:grid-cols-3 gap-6">
          <button
            onClick={() => navigate('/adult/progress')}
            className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:shadow-md transition text-left"
          >
            <div className="text-2xl mb-2">📈</div>
            <h3 className="font-bold text-gray-900 mb-1">View Progress</h3>
            <p className="text-sm text-gray-600">Track your learning journey</p>
          </button>

          <button
            onClick={() => navigate('/adult/playground')}
            className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:shadow-md transition text-left"
          >
            <div className="text-2xl mb-2">💻</div>
            <h3 className="font-bold text-gray-900 mb-1">Playground</h3>
            <p className="text-sm text-gray-600">Practice and experiment</p>
          </button>

          <button
            onClick={() => navigate('/adult/certificate')}
            className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:shadow-md transition text-left"
          >
            <div className="text-2xl mb-2">🎓</div>
            <h3 className="font-bold text-gray-900 mb-1">Certificate</h3>
            <p className="text-sm text-gray-600">View certification status</p>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdultDashboard;
