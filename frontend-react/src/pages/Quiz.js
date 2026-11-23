import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { curriculumAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import { nextAfterQuiz } from '../utils/learningPath';

// Same-origin by default (the dev server proxies /api to the backend).
const API_URL = (process.env.REACT_APP_API_URL || '').replace(/\/api\/?$/, '');

const Quiz = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
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
  const [loading, setLoading] = useState(true);
  const [curriculum, setCurriculum] = useState([]);
  const { notify } = useToast();

  useEffect(() => {
    curriculumAPI.getCurriculum().then(r => setCurriculum(r.data.curriculum || [])).catch(() => {});
  }, []);

  // Enhanced quiz questions by module with more challenging content
  const quizzes = {
    1: {
      title: 'Welcome to Coding! 🚀',
      description: 'Test your understanding of basic coding concepts',
      passingScore: 70,
      questions: [
        {
          question: 'What does console.log("Hello") do?',
          options: [
            'Deletes the word Hello',
            'Prints "Hello" to the console',
            'Creates a variable named Hello',
            'Stops the program'
          ],
          correct: 1,
          explanation: 'console.log() is used to print messages and values to the console, helping you see what your code is doing!'
        },
        {
          question: 'Which keyword creates a variable that CAN be changed later?',
          options: ['const', 'let', 'var', 'Both let and var'],
          correct: 3,
          explanation: 'Both "let" and "var" create variables that can be changed. "const" creates variables that cannot be changed!'
        },
        {
          question: 'What is the result of: 5 + 3 * 2',
          options: ['16', '11', '13', '10'],
          correct: 1,
          explanation: 'Multiplication happens before addition! So 3 * 2 = 6, then 5 + 6 = 11. Remember PEMDAS!'
        },
        {
          question: 'What does this code print? let age = 10; if (age > 12) { console.log("Teen"); } else { console.log("Kid"); }',
          options: ['Teen', 'Kid', 'Nothing', 'Error'],
          correct: 1,
          explanation: 'Since 10 is NOT greater than 12, the else block runs and prints "Kid"!'
        },
        {
          question: 'What is a variable best compared to?',
          options: [
            'A loop that repeats',
            'A labeled box that stores information',
            'A decision maker',
            'A printer'
          ],
          correct: 1,
          explanation: 'A variable is like a labeled box - you put information in it and can get it out later by using its name!'
        },
        {
          question: 'What does the + operator do with text? "Hello" + " " + "World"',
          options: [
            'Adds the numbers',
            'Joins the text together',
            'Causes an error',
            'Deletes the text'
          ],
          correct: 1,
          explanation: 'The + operator joins (concatenates) text together! "Hello" + " " + "World" becomes "Hello World"'
        }
      ]
    },
    2: {
      title: 'Creative Animations 🎨',
      description: 'Test your turtle graphics and loop knowledge',
      passingScore: 70,
      questions: [
        {
          question: 'To draw a square, how many times should you repeat: forward(100); right(90);',
          options: ['2 times', '3 times', '4 times', '5 times'],
          correct: 2,
          explanation: 'A square has 4 sides, so you need to repeat the forward and turn commands 4 times!'
        },
        {
          question: 'What does this loop do? for (let i = 0; i < 3; i++) { console.log("Hi"); }',
          options: [
            'Prints "Hi" 2 times',
            'Prints "Hi" 3 times',
            'Prints "Hi" 4 times',
            'Causes an error'
          ],
          correct: 1,
          explanation: 'The loop starts at 0 and runs while i < 3, so it runs for i=0, i=1, and i=2. That\'s 3 times!'
        },
        {
          question: 'To draw a triangle, what angle should you turn at each corner?',
          options: ['90 degrees', '120 degrees', '60 degrees', '180 degrees'],
          correct: 1,
          explanation: 'For a triangle, you turn 120 degrees at each corner. The exterior angles of a triangle are 120 degrees!'
        },
        {
          question: 'What happens after penUp() is called?',
          options: [
            'The turtle draws a line',
            'The turtle moves without drawing',
            'The turtle changes color',
            'The turtle stops moving'
          ],
          correct: 1,
          explanation: 'penUp() lifts the pen, so the turtle can move around without drawing lines!'
        },
        {
          question: 'How do you make the turtle draw in red?',
          options: ['red()', 'color("red")', 'paint("red")', 'setColor(red)'],
          correct: 1,
          explanation: 'Use color("red") to change the turtle\'s pen color. Put the color name in quotes!'
        },
        {
          question: 'What does i++ do in a for loop?',
          options: [
            'Decreases i by 1',
            'Increases i by 1',
            'Multiplies i by 2',
            'Resets i to 0'
          ],
          correct: 1,
          explanation: 'i++ is shorthand for i = i + 1. It increases the value of i by 1 each time the loop runs!'
        }
      ]
    },
    3: {
      title: 'Game Design Basics 🎮',
      description: 'Test your game logic and function knowledge',
      passingScore: 70,
      questions: [
        {
          question: 'What does Math.floor(Math.random() * 6) + 1 give you?',
          options: [
            'A random number from 0 to 5',
            'A random number from 1 to 6',
            'A random number from 0 to 6',
            'Always gives 6'
          ],
          correct: 1,
          explanation: 'Math.random() * 6 gives 0 to 5.999, Math.floor() rounds down to 0-5, then +1 makes it 1-6. Perfect for a dice roll!'
        },
        {
          question: 'What does this function return? function double(x) { return x * 2; } double(5);',
          options: ['5', '10', '7', 'Nothing'],
          correct: 1,
          explanation: 'The function takes 5, multiplies it by 2, and returns 10!'
        },
        {
          question: 'What is score after this code? let score = 10; score += 5; score++;',
          options: ['10', '15', '16', '11'],
          correct: 2,
          explanation: 'Start with 10, add 5 (now 15), then add 1 with ++ (now 16)!'
        },
        {
          question: 'What are parameters in a function?',
          options: [
            'The function name',
            'Values you pass into the function',
            'The return value',
            'The function body'
          ],
          correct: 1,
          explanation: 'Parameters are like ingredients - you pass them into the function so it can use them!'
        },
        {
          question: 'How do you call a function named "jump" that takes no parameters?',
          options: ['function jump()', 'jump()', 'call jump()', 'run jump'],
          correct: 1,
          explanation: 'To call a function, write its name followed by parentheses: jump()'
        },
        {
          question: 'What does return do in a function?',
          options: [
            'Prints to console',
            'Sends a value back to where the function was called',
            'Stops the program',
            'Creates a variable'
          ],
          correct: 1,
          explanation: 'return sends a value back to whoever called the function, so they can use it!'
        }
      ]
    },
    4: {
      title: 'Web Wizards 🌐',
      description: 'Test your HTML and CSS knowledge',
      passingScore: 70,
      questions: [
        {
          question: 'Which HTML tag creates a clickable link?',
          options: ['<link>', '<a>', '<href>', '<url>'],
          correct: 1,
          explanation: 'The <a> tag (anchor) creates links! Use it like: <a href="url">Click me</a>'
        },
        {
          question: 'What does CSS stand for?',
          options: [
            'Computer Style Sheets',
            'Cascading Style Sheets',
            'Creative Style System',
            'Colorful Site Styles'
          ],
          correct: 1,
          explanation: 'CSS stands for Cascading Style Sheets - it makes websites beautiful!'
        },
        {
          question: 'Which CSS property changes the background color?',
          options: ['color', 'background-color', 'bg-color', 'background'],
          correct: 1,
          explanation: 'Use background-color to change the background! Example: background-color: blue;'
        },
        {
          question: 'What does <h1> create?',
          options: [
            'A paragraph',
            'The biggest heading',
            'A link',
            'An image'
          ],
          correct: 1,
          explanation: '<h1> creates the biggest heading. Headings go from <h1> (biggest) to <h6> (smallest)!'
        },
        {
          question: 'How do you make text bold in HTML?',
          options: ['<bold>', '<b> or <strong>', '<text-bold>', '<weight>'],
          correct: 1,
          explanation: 'Use <b> or <strong> to make text bold! <strong> also tells screen readers it\'s important.'
        },
        {
          question: 'What does the <div> tag do?',
          options: [
            'Creates a division',
            'Creates a container for grouping elements',
            'Divides the page',
            'Creates a button'
          ],
          correct: 1,
          explanation: '<div> is a container that groups elements together. It\'s like a box that holds other HTML elements!'
        }
      ]
    },
    5: {
      title: 'Python Explorers 🐍',
      description: 'Test your Python knowledge',
      passingScore: 70,
      questions: [
        {
          question: 'How do you create a comment in Python?',
          options: ['//', '#', '/*', '--'],
          correct: 1,
          explanation: 'In Python, use # for comments. In JavaScript, we use //!'
        },
        {
          question: 'What is the output? print(5 + 3 * 2)',
          options: ['16', '11', '13', '10'],
          correct: 1,
          explanation: 'Just like in JavaScript, multiplication happens first! 3 * 2 = 6, then 5 + 6 = 11'
        },
        {
          question: 'What is a list in Python similar to in JavaScript?',
          options: ['Object', 'Array', 'String', 'Function'],
          correct: 1,
          explanation: 'Python lists are like JavaScript arrays - they store multiple items in order!'
        },
        {
          question: 'How do you print "Hello" in Python?',
          options: ['console.log("Hello")', 'print("Hello")', 'echo "Hello"', 'System.out.println("Hello")'],
          correct: 1,
          explanation: 'In Python, use print()! In JavaScript, we use console.log()'
        },
        {
          question: 'What is a dictionary in Python similar to in JavaScript?',
          options: ['Array', 'Object', 'String', 'Number'],
          correct: 1,
          explanation: 'Python dictionaries are like JavaScript objects - they store key-value pairs!'
        },
        {
          question: 'What does indentation do in Python?',
          options: [
            'Makes code look nice',
            'Defines code blocks (like { } in JavaScript)',
            'Nothing important',
            'Creates comments'
          ],
          correct: 1,
          explanation: 'In Python, indentation is VERY important! It defines code blocks, like curly braces { } do in JavaScript!'
        }
      ]
    }
  };

  const quiz = quizzes[moduleId] || quizzes[1];

  const checkModuleCompletion = async () => {
    try {
      
      const response = await axios.get(
        `${API_URL}/api/module/completion/${moduleId}`,
        { headers: { Authorization: `Bearer ${currentToken}` } }
      );
      
      
      // Validate the response
      if (response.data && typeof response.data.totalLessons === 'number') {
        setModuleCompletion(response.data);
      } else {
        console.error('❌ Invalid module completion response:', response.data);
        setModuleCompletion({
          totalLessons: 0,
          completedLessons: 0,
          allLessonsCompleted: false,
          quizPassed: false
        });
      }
      setLoading(false);
    } catch (err) {
      console.error('❌ Failed to check module completion:', err);
      console.error('Error details:', err.response?.data || err.message);
      // Set a default state so UI doesn't break
      setModuleCompletion({
        totalLessons: 0,
        completedLessons: 0,
        allLessonsCompleted: false,
        quizPassed: false
      });
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentToken && moduleId) {
      checkModuleCompletion();
    }
  }, [moduleId, currentToken]);

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

  const submitQuizResults = async (finalAnswers, finalScore) => {
    const timeTaken = Math.floor((Date.now() - startTime) / 1000);
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

      setXpEarned(response.data.xpEarned || 0);
      setAttemptNumber(response.data.attemptNumber || 1);
      setShowResult(true);
      
      // Reload progress to update XP
      if (response.data.passed) {
        await loadProgress();
      }
    } catch (err) {
      console.error('Failed to submit quiz:', err);
      setShowResult(true);
    }
  };

  const handleRetry = () => {
    handleStartQuiz();
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="card p-8 text-center">
          <div className="text-4xl mb-4">⏳</div>
          <div>Loading quiz...</div>
        </div>
      </div>
    );
  }

  if (!quizStarted) {
    const canTakeQuiz = moduleCompletion?.allLessonsCompleted;
    const alreadyPassed = moduleCompletion?.quizPassed;

    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button onClick={() => navigate('/curriculum')} className="text-slate-600 hover:text-indigo-600 mb-4">
          ← {t('lessonUi.backToMap')}
        </button>

        <div className="card p-8">
          <div className="text-center mb-6">
            <div className="text-6xl mb-4">📝</div>
            <h1 className="font-display text-3xl text-slate-800 mb-2">{quiz.title}</h1>
            <p className="text-slate-600 mb-4">{quiz.description}</p>
            
            {alreadyPassed && (
              <div className="inline-block bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-bold mb-4">
                ✅ Quiz Passed ({moduleCompletion.quizScore}%)
              </div>
            )}
          </div>

          {!canTakeQuiz && (
            <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-6 mb-6">
              <div className="flex items-start gap-3">
                <span className="text-3xl">🔒</span>
                <div>
                  <h3 className="font-bold text-yellow-900 mb-2">Complete All Lessons First!</h3>
                  <p className="text-yellow-800 mb-3">
                    You need to complete all {moduleCompletion?.totalLessons || 0} lessons in this module before taking the quiz.
                  </p>
                  <div className="text-sm text-yellow-700">
                    Progress: {moduleCompletion?.completedLessons || 0} / {moduleCompletion?.totalLessons || 0} lessons completed
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="bg-indigo-50 rounded-xl p-6 mb-6">
            <h3 className="font-bold text-indigo-900 mb-3">Quiz Information</h3>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-indigo-600 font-bold text-2xl">{quiz.questions.length}</div>
                <div className="text-slate-600">Questions</div>
              </div>
              <div>
                <div className="text-indigo-600 font-bold text-2xl">~5</div>
                <div className="text-slate-600">Minutes</div>
              </div>
              <div>
                <div className="text-indigo-600 font-bold text-2xl">{quiz.passingScore}%</div>
                <div className="text-slate-600">To Pass</div>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-6 text-left">
            <h4 className="font-bold text-blue-900 mb-2">💡 Quiz Tips:</h4>
            <ul className="text-sm text-slate-700 space-y-1">
              <li>• Read each question carefully</li>
              <li>• You need {quiz.passingScore}% to pass and unlock the next module</li>
              <li>• You can retake the quiz if you don't pass</li>
              <li>• Higher scores earn more XP!</li>
            </ul>
          </div>

          {canTakeQuiz ? (
            <button 
              onClick={handleStartQuiz} 
              className="btn-primary w-full justify-center text-lg py-4"
            >
              {alreadyPassed ? 'Retake Quiz 🔄' : 'Start Quiz 🚀'}
            </button>
          ) : (
            <div>
              <button 
                onClick={handleStartQuiz}
                disabled={true}
                className="btn-primary w-full justify-center text-lg py-4 opacity-50 cursor-not-allowed"
                title="Complete all lessons first"
              >
                🔒 Quiz Locked
              </button>
              <button 
                onClick={() => navigate('/curriculum')} 
                className="btn-secondary w-full justify-center text-lg py-4 mt-3"
              >
                Go Complete Lessons 📚
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
            <p className="text-slate-600 mb-4">
              {passed
                ? t('quizUi.passedText')
                : t('quizUi.almostText', { score: quiz.passingScore })}
            </p>
            
            {attemptNumber > 1 && (
              <div className="text-sm text-slate-500 mb-2">
                Attempt #{attemptNumber}
              </div>
            )}
          </div>

          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 mb-6">
            <div className="text-5xl font-bold text-indigo-600 mb-2">{percentage}%</div>
            <div className="text-slate-600 mb-4">Your Score</div>
            <div className="text-sm text-slate-600 mb-3">
              {score} / {quiz.questions.length} correct answers
            </div>
            
            {passed && xpEarned > 0 && (
              <div className="bg-white rounded-lg p-3 border-2 border-indigo-200">
                <div className="text-indigo-600 font-bold text-xl">+{xpEarned} XP</div>
                <div className="text-xs text-slate-600">
                  {percentage >= 90 && '🌟 Perfect Score Bonus!'}
                  {percentage >= 80 && percentage < 90 && '⭐ Excellent Performance!'}
                  {percentage >= 70 && percentage < 80 && '✨ Good Job!'}
                </div>
              </div>
            )}
          </div>

          {/* Review Answers */}
          <div className="text-left mb-6">
            <h3 className="font-bold text-slate-800 mb-4">📋 Review Your Answers</h3>
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
                      <span className="text-xl">{answer.correct ? '✅' : '❌'}</span>
                      <div className="flex-1">
                        <div className="font-medium text-slate-800 mb-1">
                          Question {idx + 1}: {question.question}
                        </div>
                        <div className="text-sm text-slate-600">
                          Your answer: {question.options[answer.selected]}
                        </div>
                        {!answer.correct && (
                          <div className="text-sm text-green-700 mt-1">
                            Correct answer: {question.options[question.correct]}
                          </div>
                        )}
                        <div className="text-sm text-slate-600 mt-2 italic bg-white p-2 rounded">
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
        <div className="flex justify-between text-sm text-slate-600 mb-2">
          <span className="font-extrabold">{t('quizUi.questionOf', { n: currentQuestion + 1, total: quiz.questions.length })}</span>
          <span className="font-bold">{t('quizUi.noRush')}</span>
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
              <span className="answer-letter">{String.fromCharCode(65 + idx)}</span>
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
