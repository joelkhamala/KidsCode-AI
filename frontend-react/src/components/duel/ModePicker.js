import React from 'react';
import { useTranslation } from 'react-i18next';

const FALLBACK = [
  { id: 'code_race', name: 'Code Race', icon: '🏁', blurb: 'Solve the same coding puzzle first.' },
  { id: 'bug_busters', name: 'Bug Busters', icon: '🐞', blurb: 'Find and fix the broken program.' },
  { id: 'code_maze', name: 'Code Maze', icon: '🤖', blurb: 'Guide your robot to the treasure.' },
  { id: 'code_quiz', name: 'Code Quiz', icon: '🧠', blurb: 'Answer coding questions head to head.' },
];

const ModePicker = ({ modes, selected, onSelect, difficulty, onDifficulty, onStart, busy }) => {
  const { t } = useTranslation();
  const list = modes?.length ? modes : FALLBACK;
  return (
    <section className="card p-5 sm:p-7" aria-labelledby="arena-modes-title">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
        <div>
          <h2 id="arena-modes-title" className="font-display text-2xl sm:text-3xl text-slate-800">{t('duel.pickMode')}</h2>
          <p className="text-sm font-semibold text-slate-500">{t('duel.subtitle')}</p>
        </div>
        <fieldset className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
          <legend className="sr-only">{t('duel.pickLevel')}</legend>
          {['easy', 'medium', 'hard'].map((level) => (
            <button
              key={level}
              type="button"
              aria-pressed={difficulty === level}
              onClick={() => onDifficulty(level)}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition ${difficulty === level ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-white'}`}
            >
              {t(`duel.${level}`)}
            </button>
          ))}
        </fieldset>
      </div>

      <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label={t('duel.pickMode')}>
        {list.map((mode) => (
          <button
            key={mode.id}
            type="button"
            role="radio"
            aria-checked={selected === mode.id}
            onClick={() => onSelect(mode.id)}
            className={`text-left rounded-2xl border-2 p-4 transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200 ${
              selected === mode.id ? 'border-indigo-500 bg-indigo-50 shadow-sm' : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
            }`}
          >
            <span className="flex items-start gap-3">
              <span className="text-3xl" aria-hidden="true">{mode.icon}</span>
              <span>
                <span className="block font-extrabold text-slate-800">{mode.name}</span>
                <span className="block text-sm font-semibold text-slate-500 mt-0.5">{mode.blurb}</span>
              </span>
            </span>
          </button>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button type="button" className="btn-primary text-base px-6 py-3" disabled={busy} onClick={onStart}>
          ⚡ {busy ? t('duel.searching') : t('duel.quick')}
        </button>
        <span className="text-xs font-semibold text-slate-500">{t('duel.searchingHelp')}</span>
      </div>
    </section>
  );
};

export default ModePicker;
