import React from 'react';
import { useAuth } from '../context/AuthContext';

const BlockedAccess = ({ reason }) => {
  const { logout } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 p-4">
      <div className="max-w-md w-full">
        <div className="card p-8 text-center">
          <div className="text-8xl mb-6">🔒</div>
          <h1 className="font-display text-3xl text-slate-800 mb-4">Access Restricted</h1>
          <p className="text-lg text-slate-600 mb-6">{reason}</p>
          
          <div className="space-y-3">
            <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-xl text-left">
              <h3 className="font-bold text-blue-800 mb-2">💡 What can you do?</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Ask your parent to adjust your settings</li>
                <li>• Come back during your allowed time</li>
                <li>• Take a break and do other activities!</li>
              </ul>
            </div>

            <button
              onClick={logout}
              className="w-full py-3 px-4 bg-slate-600 text-white rounded-xl font-bold hover:bg-slate-700 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>

        <div className="mt-6 text-center text-slate-600 text-sm">
          <p>These restrictions are set by your parent to help you</p>
          <p>balance screen time with other activities. 🌟</p>
        </div>
      </div>
    </div>
  );
};

export default BlockedAccess;
