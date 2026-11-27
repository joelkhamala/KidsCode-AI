import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { curriculumAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import { nextAfterQuiz } from '../utils/learningPath';
import { getTranslatedQuiz, localizeQuiz } from '../translations/quiz';

// Same-origin by default (the dev server proxies /api to the backend).
const API_URL = (process.env.REACT_APP_API_URL || '').replace(/\/api\/?$/, '');

const Quiz = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { moduleId } = useParams();
  const { currentToken, loadProgress } = useAuth();

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [quizStarted, setQuizStarted] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [xpEarned, setXpEarned] = useState(0);
  const [attemptNumber, setAttemptNumber] = useState(1);
  const [moduleCompletion, setModuleCompletion] = useState(null);
  const [completionError, setCompletionError] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [curriculum, setCurriculum] = useState([]);
  const { notify } = useToast();

  const language = i18n.language === 'sw' ? 'sw' : 'en';

  // Bundled translations first; API-provided translations (if any) override them.
  const quiz = useMemo(
    () => localizeQuiz(getTranslatedQuiz(moduleId, language), language),
    [moduleId, language]
  );

  useEffect(() => {
    curriculumAPI.getCurriculum().then(r => setCurriculum(r.data.curriculum || [])).catch(() => {});
  }, []);

  const checkModuleCompletion = useCallback(async () => {
    setCompletionError(false);
    try {
      const response = await axios.get(
        `${API_URL}/api/module/completion/${moduleId}`,
        { headers: { Authorization: `Bearer ${currentToken}` } }
      );

      if (response.data && typeof response.data.totalLessons === 'number') {
        setModuleCompletion(response.data);
      } else {
        // An invalid response is an error, not evidence that lessons are incomplete.
        throw new Error('Invalid module completion response');
      }
    } catch (err) {
      console.error('❌ Failed to check module completion:', err);
      console.error('Error details:', err.response?.data || err.message);
      setModuleCompletion(null);
      setCompletionError(true);
    } finally {
      setLoading(false);
    }
  }, [moduleId, currentToken]);

  useEffect(() => {
    if (currentToken && moduleId) {
      checkModuleCompletion();
    }
  }, [moduleId, currentToken, checkModuleCompletion]);

  const handleStartQuiz = () => {
    // Double-check that all lessons are completed before starting
    if (!moduleCompletion?.allLessonsCompleted) {
      notify(t('quizUi.finishLessonsFirst'), 'warning');
      return;
    }

    setQuizStarted(true);
    setCurrentQuestion(0);
    setScore(0);
    setAnswers([]);
    setShowResult(false);
    setSubmitError(null);
    setStartTime(Date.now());
  };

  const handleAnswer = (answerIndex) => {
    setSelectedAnswer(answerIndex);
  };

  const handleNext = () => {
    const isCorrect = selectedAnswer === quiz.questions[currentQuestion].correct;
    const newAnswers = [...answers, {
      question: currentQuestion,
      selected: selectedAnswer,
      correct: isCorrect
    }];
    setAnswers(newAnswers);

    if (isCorrect) {
      setScore(score + 1);
    }

    if (currentQuestion < quiz.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
    } else {
      // Quiz finished - submit results
      submitQuizResults(newAnswers, score + (isCorrect ? 1 : 0));
    }
  };

  const submitQuizResults = async (finalAnswers, finalScore, timeTakenOverride) => {
    const timeTaken = timeTakenOverride ?? Math.floor((Date.now() - startTime) / 1000);
    const percentage = Math.round((finalScore / quiz.questions.length) * 100);

    try {
      const response = await axios.post(
        `${API_URL}/api/quiz/submit`,
        {
          moduleId: parseInt(moduleId),
          score: finalScore,
          totalQuestions: quiz.questions.length,
          percentage,
          timeTaken,
          answersData: finalAnswers
        },
        { headers: { Authorization: `Bearer ${currentToken}` } }
      );

      setSubmitError(null);
      setXpEarned(response.data.xpEarned || 0);
      setAttemptNumber(response.data.attemptNumber || 1);
      setShowResult(true);

      // Reload progress to update XP. A progress refresh failure must not turn a
      // successful submission into a "failed" screen.
      if (response.data.passed) {
        try {
          await loadProgress();
        } catch (err) {
          console.warn('Progress refresh failed after quiz submission:', err);
        }
      }
    } catch (err) {
      console.error('Failed to submit quiz:', err);
      // Keep the learner on an explicit error state; never claim success.
      setSubmitError({ answers: finalAnswers, score: finalScore, timeTaken });
    }
  };

  const handleRetrySubmission = () => {
    if (!submitError) return;
    const { answers: retryAnswers, score: retryScore, timeTaken } = submitError;
    setSubmitError(null);
    submitQuizResults(retryAnswers, retryScore, timeTaken);
  };

  const handleRetry = () => {
    handleStartQuiz();
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="card p-8 text-center" role="status" aria-live="polite">
          <div className="text-4xl mb-4" aria-hidden="true">⏳</div>
          <div>{t('quizUi.loading')}</div>
        </div>
      </div>
    );
  }

  if (completionError) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="card p-8" role="alert">
          <div className="text-center mb-4" aria-hidden="true">🔌</div>
          <h1 className="font-display text-2xl text-slate-800 mb-2">{t('quizUi.completeTitle')}</h1>
          <p className="text-slate-700 mb-6">{t('quizUi.completeText')}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={checkModuleCompletion} className="btn-primary justify-center">
              🔄 {t('quizUi.retry')}
            </button>
            <button onClick={() => navigate('/curriculum')} className="btn-secondary justify-center">
              🗺️ {t('lessonUi.backToMap')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (submitError) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="card p-8" role="alert">
          <div className="text-center mb-4" aria-hidden="true">📡</div>
          <h1 className="font-display text-2xl text-slate-800 mb-2">{t('quizUi.submitErrorTitle')}</h1>
          <p className="text-slate-700 mb-6">{t('quizUi.submitErrorText')}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={handleRetrySubmission} className="btn-primary justify-center">
              🔄 {t('quizUi.retry')}
            </button>
            <button onClick={() => navigate('/curriculum')} className="btn-secondary justify-center">
              🗺️ {t('lessonUi.backToMap')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!quizStarted) {
    const canTakeQuiz = moduleCompletion?.allLessonsCompleted;
    const alreadyPassed = moduleCompletion?.quizPassed;

    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button onClick={() => navigate('/curriculum')} className="text-slate-700 hover:text-indigo-600 mb-4">
          ← {t('lessonUi.backToMap')}
        </button>

        <div className="card p-8">
          <div className="text-center mb-6">
            <div className="text-6xl mb-4" aria-hidden="true">📝</div>
            <h1 className="font-display text-3xl text-slate-800 mb-2">{quiz.title}</h1>
            <p className="text-slate-700 mb-4">{quiz.description}</p>

            {alreadyPassed && (
              <div className="inline-block bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-bold mb-4">
                {t('quizUi.passedBadge', { score: moduleCompletion.quizScore })}
              </div>
            )}
          </div>

          {!canTakeQuiz && (
            <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-6 mb-6">
              <div className="flex items-start gap-3">
                <span className="text-3xl" aria-hidden="true">🔒</span>
                <div>
                  <h3 className="font-bold text-yellow-900 mb-2">{t('quizUi.lockedTitle')}</h3>
                  <p className="text-yellow-900 mb-3">
                    {t('quizUi.finishLessonsFirst', { total: moduleCompletion?.totalLessons || 0 })}
                  </p>
                  <div className="text-sm font-semibold text-yellow-900">
                    {t('quizUi.progress', {
                      done: moduleCompletion?.completedLessons || 0,
                      total: moduleCompletion?.totalLessons || 0
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="bg-indigo-50 rounded-xl p-6 mb-6">
            <h3 className="font-bold text-indigo-900 mb-3">{t('quizUi.infoTitle')}</h3>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-indigo-600 font-bold text-2xl">{quiz.questions.length}</div>
                <div className="text-slate-700">{t('quizUi.questionsLabel')}</div>
              </div>
              <div>
                <div className="text-indigo-600 font-bold text-2xl">~5</div>
                <div className="text-slate-700">{t('quizUi.minutesLabel')}</div>
              </div>
              <div>
                <div className="text-indigo-600 font-bold text-2xl">{quiz.passingScore}%</div>
                <div className="text-slate-700">{t('quizUi.toPass')}</div>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-6 text-left">
            <h4 className="font-bold text-blue-900 mb-2">{t('quizUi.tipsTitle')}</h4>
            <ul className="text-sm text-slate-700 space-y-1">
              <li>• {t('quizUi.tipRead')}</li>
              <li>• {t('quizUi.tipPass', { score: quiz.passingScore })}</li>
              <li>• {t('quizUi.tipRetake')}</li>
              <li>• {t('quizUi.tipXp')}</li>
            </ul>
          </div>

          {canTakeQuiz ? (
            <button
              onClick={handleStartQuiz}
              className="btn-primary w-full justify-center text-lg py-4"
            >
              {alreadyPassed ? t('quizUi.retake') : t('quizUi.start')}
            </button>
          ) : (
            <div>
              <button
                onClick={handleStartQuiz}
                disabled={true}
                className="btn-primary w-full justify-center text-lg py-4 opacity-50 cursor-not-allowed"
                title={t('quizUi.finishLessonsFirst')}
              >
                {t('quizUi.lockedButton')}
              </button>
              <button
                onClick={() => navigate('/curriculum')}
                className="btn-secondary w-full justify-center text-lg py-4 mt-3"
              >
                {t('quizUi.goComplete')}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (showResult) {
    const percentage = Math.round((score / quiz.questions.length) * 100);
    const passed = percentage >= quiz.passingScore;
    const nextStep = passed ? nextAfterQuiz(curriculum, moduleId) : null;

    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="card p-8">
          <div className="text-center mb-6">
            <div className="text-7xl mb-4 animate-pop" aria-hidden="true">{passed ? '🏆' : '💪'}</div>
            <h1 className="font-display text-3xl text-slate-800 mb-2">
              {passed ? t('quizUi.passedTitle') : t('quizUi.almostTitle')}
            </h1>
            <p className="text-slate-700 mb-4">
              {passed
                ? t('quizUi.passedText')
                : t('quizUi.almostText', { score: quiz.passingScore })}
            </p>

            {attemptNumber > 1 && (
              <div className="text-sm font-bold text-slate-700 mb-2">
                {t('quizUi.attempt', { n: attemptNumber })}
              </div>
            )}
          </div>

          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 mb-6">
            <div className="text-5xl font-bold text-indigo-600 mb-2">{percentage}%</div>
            <div className="text-slate-700 mb-4">{t('quizUi.scoreLabel')}</div>
            <div className="text-sm font-semibold text-slate-700 mb-3">
              {t('quizUi.correctOf', { correct: score, total: quiz.questions.length })}
            </div>

            {passed && xpEarned > 0 && (
              <div className="bg-white rounded-lg p-3 border-2 border-indigo-200">
                <div className="text-indigo-600 font-bold text-xl">+{xpEarned} XP</div>
                <div className="text-xs font-bold text-slate-700">
                  {percentage >= 90 && t('quizUi.bonusPerfect')}
                  {percentage >= 80 && percentage < 90 && t('quizUi.bonusExcellent')}
                  {percentage >= 70 && percentage < 80 && t('quizUi.bonusGood')}
                </div>
              </div>
            )}
          </div>

          {/* Review Answers */}
          <div className="text-left mb-6">
            <h3 className="font-bold text-slate-800 mb-4">{t('quizUi.reviewTitle')}</h3>
            <div className="space-y-3">
              {answers.map((answer, idx) => {
                const question = quiz.questions[answer.question];
                return (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl border-2 ${
                      answer.correct
                        ? 'bg-green-50 border-green-300'
                        : 'bg-red-50 border-red-300'
                    }`}
                  >
                    <div className="flex items-start gap-2 mb-2">
                      <span className="text-xl" aria-hidden="true">{answer.correct ? '✅' : '❌'}</span>
                      <div className="flex-1">
                        <div className="font-medium text-slate-800 mb-1">
                          {t('quizUi.questionLabel', { n: idx + 1 })} {question.question}
                        </div>
                        <div className="text-sm font-semibold text-slate-700">
                          {t('quizUi.yourAnswer')} {question.options[answer.selected]}
                        </div>
                        {!answer.correct && (
                          <div className="text-sm text-green-700 font-bold mt-1">
                            {t('quizUi.correctAnswer')} {question.options[question.correct]}
                          </div>
                        )}
                        <div className="text-sm text-slate-700 mt-2 italic bg-white p-2 rounded">
                          💡 {question.explanation}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {passed && nextStep && (
              <button onClick={() => navigate(nextStep.path)} className="kid-go-btn">
                ▶ {t('quizUi.nextWorld')}
              </button>
            )}
            {!passed && (
              <button onClick={handleRetry} className="kid-go-btn">
                🔄 {t('quizUi.tryAgain')}
              </button>
            )}
            <button onClick={() => navigate('/curriculum')} className="btn-secondary justify-center">
              🗺️ {t('lessonUi.backToMap')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const question = quiz.questions[currentQuestion];
  const progress = ((currentQuestion + 1) / quiz.questions.length) * 100;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm font-bold text-slate-700 mb-2">
          <span>{t('quizUi.questionOf', { n: currentQuestion + 1, total: quiz.questions.length })}</span>
          <span>{t('quizUi.noRush')}</span>
        </div>
        <div className="xp-bar h-3">
          <div className="xp-fill" style={{ width: `${progress}%` }}></div>
        </div>
      </div>

      {/* Question Card */}
      <div className="card p-8">
        <h2 className="font-display text-2xl text-slate-800 mb-6">{question.question}</h2>

        <div className="space-y-3 mb-6">
          {question.options.map((option, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleAnswer(idx)}
              aria-pressed={selectedAnswer === idx}
              className={`answer-btn ${selectedAnswer === idx ? 'selected' : ''}`}
            >
              <span className="answer-letter" aria-hidden="true">{String.fromCharCode(65 + idx)}</span>
              <span>{option}</span>
            </button>
          ))}
        </div>

        <button
          onClick={handleNext}
          disabled={selectedAnswer === null}
          className="btn-primary w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {selectedAnswer === null ? t('quizUi.pickAnswer') : currentQuestion < quiz.questions.length - 1 ? t('quizUi.nextQuestion') : t('quizUi.finish')}
        </button>
      </div>
    </div>
  );
};

export default Quiz;
