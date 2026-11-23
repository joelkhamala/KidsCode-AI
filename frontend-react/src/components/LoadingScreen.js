import React from 'react';

const LoadingScreen = ({ message = "Loading your adventure..." }) => {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <img 
          src="/kidscode_logo.png" 
          alt="KIDSCODE" 
          className="mx-auto w-48 md:w-56 mb-6 animate-pulse"
          onError={(e) => {
            // Fallback if logo image not found
            e.target.style.display = 'none';
            e.target.nextSibling.style.display = 'block';
          }}
        />
        <div className="hidden text-7xl mb-6 animate-bounce">🚀</div>
        <h1 className="font-display text-4xl text-indigo-600 mb-2">KIDSCODE</h1>
        <p className="text-slate-600 mb-6">{message}</p>
        <div className="loading-bar mx-auto"></div>
      </div>
    </div>
  );
};

export default LoadingScreen;
