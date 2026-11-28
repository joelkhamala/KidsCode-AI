import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { curriculumAPI, progressAPI } from '../services/api';

const ProgressDebug = () => {
  const { currentUser, userProgress } = useAuth();
  const [rawProgress, setRawProgress] = useState(null);
  const [lessons, setLessons] = useState([]);

  useEffect(() => {
    loadData();
  }, [currentUser]);

  const loadData = async () => {
    if (!currentUser) return;

    try {
      // Get raw progress from API
      const progressRes = await progressAPI.getProgress();
      setRawProgress(progressRes.data);

      // Get curriculum to see all lessons
      const currRes = await curriculumAPI.getCurriculum();
      const allLessons = [];
      currRes.data.curriculum.forEach(module => {
        module.lessons.forEach(lesson => {
          allLessons.push({
            ...lesson,
            moduleId: module.id,
            moduleName: module.title
          });
        });
      });
      setLessons(allLessons);
    } catch (err) {
      console.error('Failed to load debug data:', err);
    }
  };

  if (!currentUser) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="card p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Please Log In</h1>
          <p>You need to be logged in to view progress data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Progress Debug Tool</h1>

      {/* Raw API Response */}
      <div className="card p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">Raw API Response</h2>
        <pre className="bg-slate-900 text-green-400 p-4 rounded overflow-auto text-xs">
          {JSON.stringify(rawProgress, null, 2)}
        </pre>
      </div>

      {/* Processed Progress (from Context) */}
      <div className="card p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">Processed Progress (from AuthContext)</h2>
        <pre className="bg-slate-900 text-green-400 p-4 rounded overflow-auto text-xs">
          {JSON.stringify(userProgress, null, 2)}
        </pre>
      </div>

      {/* Progress Table */}
      <div className="card p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">Progress Table</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-slate-300">
                <th className="text-left p-2">Lesson ID</th>
                <th className="text-left p-2">Module</th>
                <th className="text-left p-2">Lesson Title</th>
                <th className="text-left p-2">Completed</th>
                <th className="text-left p-2">Score</th>
                <th className="text-left p-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {lessons.map(lesson => {
                const progress = userProgress[lesson.id];
                const completed = progress?.completed === 1;
                return (
                  <tr key={lesson.id} className={`border-b ${completed ? 'bg-green-50' : ''}`}>
                    <td className="p-2 font-mono">{lesson.id}</td>
                    <td className="p-2">{lesson.moduleName}</td>
                    <td className="p-2">{lesson.title}</td>
                    <td className="p-2">
                      <span className={`font-bold ${completed ? 'text-green-600' : 'text-red-600'}`}>
                        {progress?.completed !== undefined ? progress.completed : 'N/A'}
                      </span>
                    </td>
                    <td className="p-2">{progress?.score || 0}</td>
                    <td className="p-2">
                      {completed ? (
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-bold">
                          ✅ Complete
                        </span>
                      ) : progress ? (
                        <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-bold">
                          📝 In Progress
                        </span>
                      ) : (
                        <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold">
                          ⭕ Not Started
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Unlock Status */}
      <div className="card p-6">
        <h2 className="text-xl font-bold mb-4">Lesson Unlock Status</h2>
        <div className="space-y-2">
          {lessons.map((lesson, index) => {
            const progress = userProgress[lesson.id];
            const completed = progress?.completed === 1;
            
            // Check if previous lesson is complete
            let unlocked = true;
            let reason = 'First lesson';
            
            if (index > 0) {
              const prevLesson = lessons[index - 1];
              const prevProgress = userProgress[prevLesson.id];
              const prevCompleted = prevProgress?.completed === 1;
              
              unlocked = prevCompleted;
              reason = prevCompleted 
                ? `Previous lesson (${prevLesson.title}) complete` 
                : `Waiting for lesson ${prevLesson.id} (${prevLesson.title})`;
            }
            
            return (
              <div key={lesson.id} className={`p-3 rounded border-2 ${unlocked ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold">Lesson {lesson.id}:</span> {lesson.title}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-600">{reason}</span>
                    {unlocked ? (
                      <span className="bg-green-500 text-white px-3 py-1 rounded font-bold text-xs">
                        🔓 UNLOCKED
                      </span>
                    ) : (
                      <span className="bg-red-500 text-white px-3 py-1 rounded font-bold text-xs">
                        🔒 LOCKED
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6 text-center">
        <button 
          onClick={loadData}
          className="btn-primary"
        >
          🔄 Refresh Data
        </button>
      </div>
    </div>
  );
};

export default ProgressDebug;
