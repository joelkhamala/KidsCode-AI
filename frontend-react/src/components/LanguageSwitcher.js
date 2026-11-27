import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'feather-icons-react';

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('kidscode_language', lng);
  };

  const currentLanguage = i18n.language || 'en';

  // Screen readers and translation tools read <html lang>/dir, not i18n state.
  useEffect(() => {
    const language = currentLanguage === 'sw' ? 'sw' : 'en';
    document.documentElement.lang = language;
    document.documentElement.dir = 'ltr';
  }, [currentLanguage]);

  return (
    <div className="relative inline-block">
      <button
        type="button"
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white text-slate-900 border border-slate-200 hover:bg-slate-50 transition-colors shadow-sm"
        onClick={() => changeLanguage(currentLanguage === 'en' ? 'sw' : 'en')}
        aria-label={currentLanguage === 'en' ? 'English - switch to Kiswahili' : 'Kiswahili - badilisha kwenda English'}
      >
        <Globe size={18} className="text-indigo-600" />
        <span className="font-semibold text-sm text-slate-900">
          {currentLanguage === 'en' ? 'English' : 'Kiswahili'}
        </span>
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
          {currentLanguage === 'en' ? 'GB' : 'KE'}
        </span>
      </button>
    </div>
  );
};

export default LanguageSwitcher;
