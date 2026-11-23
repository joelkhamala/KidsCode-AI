import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'feather-icons-react';

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('kidscode_language', lng);
  };

  const currentLanguage = i18n.language || 'en';

  return (
    <div className="relative inline-block">
      <button
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border-2 border-slate-200 hover:border-indigo-300 transition-colors"
        onClick={() => changeLanguage(currentLanguage === 'en' ? 'sw' : 'en')}
      >
        <Globe size={16} className="text-indigo-600" />
        <span className="font-bold text-sm text-slate-700">
          {currentLanguage === 'en' ? 'English' : 'Kiswahili'}
        </span>
        <span className="text-xs text-slate-500">
          {currentLanguage === 'en' ? '🇬🇧' : '🇰🇪'}
        </span>
      </button>
    </div>
  );
};

export default LanguageSwitcher;
