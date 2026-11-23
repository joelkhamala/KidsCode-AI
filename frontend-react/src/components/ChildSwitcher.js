import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ChildSwitcher = ({ children, onClose }) => {
  const navigate = useNavigate();
  const { switchToChild } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSwitchToChild = async (childId) => {
    setLoading(true);
    setError('');

    try {
      const result = await switchToChild(childId);
      if (result.success) {
        onClose();
        navigate('/');
      } else {
        setError(result.error || 'Failed to switch to child account');
      }
    } catch (err) {
      setError('Failed to switch to child account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="font-display text-3xl text-slate-800 mb-2">Switch to Child View 🔄</h2>
              <p className="text-slate-600">Select a child to view their account</p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 text-3xl leading-none"
            >
              ×
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border-2 border-red-300 rounded-xl text-red-700 text-sm">
              {error}
            </div>
          )}

          {children.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">👶</div>
              <h3 className="font-display text-xl text-slate-800 mb-2">No children yet!</h3>
              <p className="text-slate-600 mb-6">Create a child account first to switch views.</p>
              <button
                onClick={onClose}
                className="btn-primary"
              >
                Close
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {children.map(child => (
                <button
                  key={child.id}
                  onClick={() => handleSwitchToChild(child.id)}
                  disabled={loading}
                  className="w-full p-4 bg-slate-50 hover:bg-slate-100 rounded-xl border-2 border-slate-200 hover:border-indigo-300 transition-all text-left disabled:opacity-50"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center text-3xl flex-shrink-0">
                      {child.avatarUrl ? (
                        <img 
                          src={child.avatarUrl} 
                          alt={child.displayName} 
                          className="w-full h-full rounded-full object-cover" 
                        />
                      ) : (
                        '👦'
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg text-slate-800 truncate">
                        {child.displayName}
                      </h3>
                      <p className="text-sm text-slate-600">@{child.username} • Age {child.age}</p>
                      <div className="flex gap-3 mt-2 text-xs">
                        <span className="text-indigo-600 font-bold">
                          Level {Math.floor(child.xp / 200) + 1}
                        </span>
                        <span className="text-slate-500">•</span>
                        <span className="text-green-600 font-bold">{child.xp} XP</span>
                        <span className="text-slate-500">•</span>
                        <span className="text-orange-600 font-bold">🔥 {child.streak}</span>
                      </div>
                    </div>
                    <div className="text-indigo-600 text-2xl">→</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-slate-200">
            <button
              onClick={onClose}
              className="w-full py-3 px-4 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChildSwitcher;
