import React from 'react';
import { useTranslation } from 'react-i18next';

/** Small shared pieces for the adult pages (consistent look). */

/** The course in three stages (module ids), with their colours. */
export const STAGES = [
  { id: 'html', modules: [101, 102, 103], dot: 'bg-orange-500', chip: 'bg-orange-100 text-orange-800' },
  { id: 'css', modules: [104], dot: 'bg-sky-500', chip: 'bg-sky-100 text-sky-800' },
  { id: 'js', modules: [105, 106, 107, 108], dot: 'bg-yellow-400', chip: 'bg-yellow-100 text-yellow-800' },
];
export const PASS_MARK = 70;
/** Which stage a module belongs to. */
export const stageOf = (moduleId) => STAGES.find((s) => s.modules.includes(Number(moduleId))) || STAGES[0];

/** Circular progress ring. */
export const Ring = ({ pct, size = 132, stroke = 12, label }) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="url(#ringGrad)" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(100, pct) / 100)} style={{ transition: 'stroke-dashoffset 1s ease-out' }} />
        <defs>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#a5b4fc" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
        <span className="text-3xl font-bold leading-none">{pct}%</span>
        <span className="text-[11px] text-indigo-200 mt-1">{label}</span>
      </div>
    </div>
  );
};


/** Study time as people say it: "12 min", "3 h 05 min", "170 h". */
export const studyTime = (minutes, hours) => {
  const m = Number.isFinite(minutes) ? Math.round(minutes) : Math.round((hours || 0) * 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return h >= 10 || !rest ? `${h} h` : `${h} h ${String(rest).padStart(2, '0')} min`;
};
export const Page = ({ children, wide = false }) => (
  <div className={`${wide ? 'max-w-7xl' : 'max-w-6xl'} mx-auto px-4 py-6 md:py-8`}>{children}</div>
);

export const PageHeader = ({ title, subtitle, actions }) => (
  <header className="flex flex-wrap items-end justify-between gap-3 mb-6">
    <div>
      <h1 className="text-2xl md:text-3xl font-bold text-slate-900">{title}</h1>
      {subtitle && <p className="text-slate-500 mt-1">{subtitle}</p>}
    </div>
    {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
  </header>
);

export const Card = ({ children, className = '', ...rest }) => (
  <section className={`bg-white rounded-2xl border border-slate-200 shadow-sm ${className}`} {...rest}>{children}</section>
);

export const Bar = ({ value, max = 100, color = 'bg-indigo-600', label }) => {
  const pct = Math.max(0, Math.min(100, max ? (100 * value) / max : 0));
  return (
    <div className="h-2 bg-slate-100 rounded-full overflow-hidden" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
    </div>
  );
};

export const Stat = ({ label, value, sub, bar, color = 'text-indigo-600', barColor }) => (
  <Card className="p-5">
    <div className="text-sm font-medium text-slate-500">{label}</div>
    <div className={`text-3xl font-bold mt-1 ${color}`}>{value}</div>
    {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
    {bar && <div className="mt-3"><Bar {...bar} color={barColor} label={label} /></div>}
  </Card>
);

export const Loading = () => {
  const { t } = useTranslation();
  return (
    <div className="py-20 text-center text-slate-500" role="status">
      <div className="inline-block w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-3" aria-hidden="true" />
      <div className="font-semibold">{t('ad.loading')}</div>
    </div>
  );
};

export const ErrorBox = ({ message, onRetry }) => {
  const { t } = useTranslation();
  return (
    <Card className="p-6 text-center border-red-200 bg-red-50" role="alert">
      <p className="text-red-700 font-semibold mb-3">{message || t('ad.loadFailed')}</p>
      {onRetry && <button type="button" onClick={onRetry} className="px-4 py-2 rounded-xl bg-red-600 text-white font-semibold">{t('ad.tryAgain')}</button>}
    </Card>
  );
};

export const Button = ({ variant = 'primary', className = '', ...rest }) => {
  const styles = {
    primary: 'bg-indigo-600 hover:bg-indigo-700 text-white',
    success: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    secondary: 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
  };
  return <button type="button" className={`px-4 py-2 rounded-xl font-semibold disabled:opacity-50 transition ${styles[variant]} ${className}`} {...rest} />;
};
