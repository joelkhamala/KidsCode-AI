import React from 'react';
import { useTranslation } from 'react-i18next';

/**
 * The console under every code editor, the same for all languages:
 *   - program output in green
 *   - notes (warnings, translated MySQL keywords) in amber
 *   - errors in red, with the line, a tip and the full message
 *   - SQL results as tables
 *
 * Props:
 *   logs     web preview messages: [{ type: 'log'|'info'|'warn'|'error'|'success', text }]
 *   result   a server run: { ok, output, error, tables, notes, timeMs }
 *   running  true while a run is in progress
 *   runningText  what to say while running
 *   emptyText    what to say before the first run
 *   onClear, maxHeight
 */
const TYPE_STYLE = {
  log: 'text-emerald-300', success: 'text-emerald-300', info: 'text-sky-300', warn: 'text-amber-300', error: 'text-red-400',
};
const TYPE_MARK = { log: '› ', success: '✓ ', info: 'ℹ ', warn: '⚠ ', error: '✖ ' };

const Cell = ({ value }) => {
  if (value === null || value === undefined) return <span className="italic text-slate-500">NULL</span>;
  return <>{String(value)}</>;
};

export const ResultTable = ({ table, index, total }) => {
  const { t } = useTranslation();
  return (
    <figure className="my-2">
      {total > 1 && <figcaption className="text-[11px] text-slate-400 mb-1 truncate" title={table.statement}>{t('ws.statement', { n: index + 1 })} · {table.statement}</figcaption>}
      {table.columns.length === 0 ? (
        <p className="text-slate-400 italic">{t('ws.noRows')}</p>
      ) : (
        <div className="overflow-auto rounded-lg border border-slate-700 max-h-72">
          <table className="min-w-full text-left text-[12px] font-mono">
            <thead className="bg-slate-800 sticky top-0">
              <tr>{table.columns.map((c) => <th key={c} scope="col" className="px-3 py-1.5 font-bold text-purple-200 whitespace-nowrap border-b border-slate-700">{c}</th>)}</tr>
            </thead>
            <tbody>
              {table.rows.map((row, r) => (
                <tr key={r} className={r % 2 ? 'bg-slate-800/40' : ''}>
                  {row.map((v, c) => <td key={c} className="px-3 py-1 text-emerald-200 whitespace-nowrap border-b border-slate-800"><Cell value={v} /></td>)}
                </tr>
              ))}
              {table.rows.length === 0 && (
                <tr><td colSpan={table.columns.length} className="px-3 py-2 text-slate-400 italic">{t('ws.noRows')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {table.truncated && <p className="text-[11px] text-amber-300 mt-1">{t('ws.moreRows', { shown: table.rows.length, count: table.rowCount })}</p>}
    </figure>
  );
};

export const ErrorBlock = ({ error }) => {
  const { t } = useTranslation();
  return (
    <div className="mt-2 rounded-lg border border-red-500/40 bg-red-950/40 p-3 font-sans" role="alert">
      <p className="text-[11px] font-bold uppercase tracking-wider text-red-300">
        {t(`ws.err.${error.type}`, { defaultValue: t('ws.err.runtime') })}
        {error.line ? ` · ${t('ws.line', { n: error.line })}` : ''}
        {error.statement && !error.line ? ` · ${t('ws.statement', { n: error.statement })}` : ''}
      </p>
      <p className="text-red-300 font-mono text-[13px] mt-1 break-words">
        <span className="font-bold">{error.name}</span>{error.message && error.message !== error.name ? `: ${error.message}` : ''}
      </p>
      {error.hint && <p className="text-amber-200 text-xs mt-2">💡 {error.hint}</p>}
      {error.details && error.details !== error.message && (
        <details className="mt-2">
          <summary className="text-[11px] text-red-200/80 cursor-pointer select-none">{t('ws.details')}</summary>
          <pre className="mt-1 text-[11px] text-red-200 whitespace-pre-wrap break-words font-mono">{error.details}</pre>
        </details>
      )}
    </div>
  );
};

const RunConsole = ({ logs = [], result = null, running = false, runningText, emptyText, onClear, maxHeight = 160 }) => {
  const { t } = useTranslation();
  const empty = !running && !result && logs.length === 0;
  return (
    <div className="bg-slate-900 rounded-2xl overflow-hidden">
      <div className="px-3 py-1.5 flex items-center justify-between gap-2 border-b border-slate-700">
        <span className="text-xs font-bold text-slate-300">📟 {t('ad.console')}</span>
        <span className="flex items-center gap-3">
          {result && !running && typeof result.timeMs === 'number' && result.timeMs > 0 && (
            <span className="text-[11px] text-slate-500">{t('ws.ranIn', { ms: result.timeMs })}</span>
          )}
          {onClear && <button type="button" onClick={onClear} className="text-[11px] text-slate-400 hover:text-white">{t('ad.clear')}</button>}
        </span>
      </div>
      <div className="p-3 font-mono text-xs overflow-auto" style={{ maxHeight }} aria-live="polite" aria-busy={running}>
        {empty && <span className="text-slate-500">{`// ${emptyText || t('ad.consoleEmpty')}`}</span>}
        {running && (
          <div className="flex items-center gap-2 text-sky-300">
            <span className="w-3 h-3 rounded-full border-2 border-sky-300/40 border-t-sky-300 animate-spin" aria-hidden="true" />
            {runningText || t('ws.running')}
          </div>
        )}
        {!running && logs.map((item, index) => (
          <div key={`${index}-${item.type}`} className={`whitespace-pre-wrap break-words ${TYPE_STYLE[item.type] || TYPE_STYLE.log}`}>
            {TYPE_MARK[item.type] || TYPE_MARK.log}{item.text}
          </div>
        ))}
        {!running && result && (
          <>
            {(result.notes || []).map((n, i) => <div key={`n${i}`} className="text-amber-300 whitespace-pre-wrap break-words">⚠ {n}</div>)}
            {(result.output || []).map((line, i) => (
              <div key={`o${i}`} className={`whitespace-pre-wrap break-words ${result.language === 'sql' ? 'text-sky-300' : 'text-emerald-300'}`}>
                {result.language === 'sql' ? 'ℹ ' : ''}{line}
              </div>
            ))}
            {(result.tables || []).map((table, i) => <ResultTable key={`t${i}`} table={table} index={i} total={result.tables.length} />)}
            {result.ok && !(result.output || []).length && !(result.tables || []).length && (
              <div className="text-emerald-300">✓ {t('ws.noOutput')}</div>
            )}
            {result.ok && result.language !== 'sql' && (result.output || []).length > 0 && (
              <div className="text-emerald-500/80 mt-1">✓ {t('ws.finished')}</div>
            )}
            {result.error && <ErrorBlock error={result.error} />}
          </>
        )}
      </div>
    </div>
  );
};

export default RunConsole;
