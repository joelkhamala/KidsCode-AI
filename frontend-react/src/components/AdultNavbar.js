import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getAdultUser, clearAdultAuth } from '../utils/authStorage';

const AdultNavbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getAdultUser();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = () => {
    clearAdultAuth();
    navigate('/adult/auth', { replace: true });
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  const navLinks = [
    { path: '/adult/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/adult/progress', label: 'Progress', icon: '📈' },
    { path: '/adult/playground', label: 'Playground', icon: '⚡' },
  ];

  return (
    <nav className="bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Brand */}
          <div className="flex items-center">
            <button
              onClick={() => navigate('/adult/dashboard')}
              className="flex items-center space-x-3 group"
            >
              <div className="text-3xl group-hover:scale-110 transition-transform">💼</div>
              <div>
                <div className="font-display text-xl text-white">KIDSCODE</div>
                <div className="text-xs text-indigo-400 font-semibold">Professional Development</div>
              </div>
            </button>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-1">
            {navLinks.map((link) => (
              <button
                key={link.path}
                onClick={() => navigate(link.path)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  isActive(link.path)
                    ? 'bg-indigo-600 text-white shadow-lg'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
              >
                <span className="mr-2">{link.icon}</span>
                {link.label}
              </button>
            ))}
          </div>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-3 px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors"
            >
              <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold">
                {user?.firstName?.charAt(0) || 'A'}
              </div>
              <div className="hidden md:block text-left">
                <div className="text-sm font-semibold text-white">
                  {user?.firstName} {user?.lastName}
                </div>
                <div className="text-xs text-slate-400">Adult Learner</div>
              </div>
              <svg
                className={`w-4 h-4 text-slate-400 transition-transform ${
                  showUserMenu ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {/* Dropdown Menu */}
            {showUserMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowUserMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-slate-200 py-2 z-20">
                  <div className="px-4 py-3 border-b border-slate-200">
                    <div className="text-sm font-semibold text-slate-800">
                      {user?.firstName} {user?.lastName}
                    </div>
                    <div className="text-xs text-slate-600">{user?.email}</div>
                  </div>
                  
                  <button
                    onClick={() => {
                      navigate('/adult/progress');
                      setShowUserMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 flex items-center space-x-2"
                  >
                    <span>📈</span>
                    <span>My Progress</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      navigate('/adult/certificate');
                      setShowUserMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 flex items-center space-x-2"
                  >
                    <span>📜</span>
                    <span>Certificate</span>
                  </button>
                  
                  <div className="border-t border-slate-200 my-2" />
                  
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                  >
                    <span>🚪</span>
                    <span>Sign Out</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden pb-3 space-y-1">
          {navLinks.map((link) => (
            <button
              key={link.path}
              onClick={() => navigate(link.path)}
              className={`w-full text-left px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                isActive(link.path)
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              <span className="mr-2">{link.icon}</span>
              {link.label}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default AdultNavbar;
