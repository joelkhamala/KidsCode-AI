import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { curriculumAPI, codeAPI, approvalAPI, lessonAPI, progressAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useRestrictions } from '../context/RestrictionsContext';
import { Play, RotateCcw, Lock } from 'feather-icons-react';
import { getTranslatedLesson } from '../translations/lessons';
import CodeCheck from '../components/ai/CodeCheck';
import CoachChat from '../components/ai/CoachChat';
import { useToast } from '../context/ToastContext';
import { nextAfterLesson, lessonPosition } from '../utils/learningPath';

const Lesson = () => {
  const { moduleId, lessonId } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { loadProgress, userXP } = useAuth();
  const [challenge, setChallenge] = useState(null); // checklist + best score from the server
  const [check, setCheck] = useState(null); // result of the latest check
  const [checking, setChecking] = useState(false);
  const [htmlPreview, setHtmlPreview] = useState(null);
  const challengeLocale = i18n.language === 'sw' ? 'sw' : 'en';
  const { notify } = useToast();
  const [curriculum, setCurriculum] = useState([]);
  const [celebration, setCelebration] = useState(null);
  const [completing, setCompleting] = useState(false);
  const { requiresApproval } = useRestrictions();
  
  const [lesson, setLesson] = useState(null);
  const [module, setModule] = useState(null);
  const [code, setCode] = useState('');
  const [output, setOutput] = useState('');
  const [hasError, setHasError] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [showConcept, setShowConcept] = useState(true);
  const [approvalStatus, setApprovalStatus] = useState(null);
  const [requestingApproval, setRequestingApproval] = useState(false);
  
  // Learning metrics tracking
  const [startTime, setStartTime] = useState(null);
  const [codeAttempts, setCodeAttempts] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [exampleLoads, setExampleLoads] = useState(0);
  const [runCount, setRunCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  
  const canvasRef = useRef(null);
  const turtleX = useRef(200);
  const turtleY = useRef(200);
  const turtleAngle = useRef(-90);
  const turtleColor = useRef('#6366f1');
  const turtlePenDown = useRef(true);

  // Kid-friendly concept explanations
  const conceptExplanations = {
    // Module 1: JavaScript Basics
    1: {
      0: {
        title: "What is Code? 🤖",
        explanation: "Code is like a <strong>secret recipe</strong> or a <strong>special instruction manual</strong> that tells computers, tablets, and robots exactly what to do! Just like you use words to tell a friend a story, programmers use code (special languages) to tell machines how to play games, show videos, or turn on lights.<br><br>Think of it this way: When you want your friend to make a sandwich, you tell them step by step: 'First, get two slices of bread. Then, add peanut butter. Finally, put the slices together.' Code works the same way! You write instructions step by step, and the computer follows them exactly!",
        example: "console.log('Hello, World!'); // This tells the computer to say hello!",
        analogy: "Code is like giving directions to a robot friend who does exactly what you say! If you say 'turn left,' it turns left. If you say 'jump,' it jumps! But you have to be very clear and use the special words (code) that the robot understands."
      },
      1: {
        title: "What is console.log? 🖨️",
        explanation: "Think of <code>console.log()</code> as a magic printer! Whatever you put inside the parentheses () gets printed to the screen. It's like telling the computer to show you a message!",
        example: "console.log('Hello!'); // This prints: Hello!",
        analogy: "It's like writing a note and showing it to someone!"
      },
      2: {
        title: "What are Variables? 📦",
        explanation: "Variables are like <strong>labeled boxes</strong> where you can store things! Imagine you have a toy box with a label that says 'LEGO' - you know what's inside without opening it!<br><br>In coding, you create a box (variable), give it a name, and put something inside it. Later, whenever you need what's in that box, you just call it by its name! The computer remembers what you put in there.<br><br>For example, if you create a variable called <code>age</code> and put the number 10 inside, the computer will remember that <code>age</code> means 10. You can use it over and over again!",
        example: "let age = 10; // A box named 'age' with 10 inside\nlet name = 'Alex'; // A box named 'name' with 'Alex' inside",
        analogy: "Like a toy box with a label - you know what's inside by reading the label! You can have many boxes: one for toys, one for books, one for snacks. Each box has a name and holds something special."
      },
      3: {
        title: "What are Numbers and Math? ➕",
        explanation: "Computers are <strong>super fast calculators</strong>! They can do math problems in the blink of an eye. You can add (+), subtract (-), multiply (*), and divide (/) numbers, and the computer does it instantly!<br><br>Just like in school math, you can write <code>5 + 3</code> and the computer knows the answer is 8. But computers can do thousands of calculations per second! That's why they're so good at games, counting scores, and solving puzzles.",
        example: "let total = 5 + 3; // total is now 8\nlet double = 10 * 2; // double is now 20\nlet half = 100 / 2; // half is now 50",
        analogy: "Like using a calculator, but the computer does it for you automatically! Imagine having a super-smart friend who can solve any math problem instantly!"
      },
      4: {
        title: "What are Strings (Text)? 📝",
        explanation: "Strings are <strong>words and sentences</strong> in code! You put them in quotes (\"\") to tell the computer 'this is text, not a math problem or code command.'<br><br>For example, if you write <code>\"Hello\"</code>, the computer knows you mean the word 'Hello' - not a variable or command. You can join strings together like building with blocks! <code>\"Hello\" + \" \" + \"World\"</code> becomes <code>\"Hello World\"</code>!<br><br>Strings can be names, messages, stories, or anything you want to write!",
        example: "let name = 'Alex'; // A string with the name Alex\nlet greeting = 'Hello, ' + name; // Joins strings: 'Hello, Alex'",
        analogy: "Like writing words on paper - the quotes are like the paper edges that show where your words start and end! You can write anything: your name, a story, a joke, or a secret message!"
      }
    },
    // Module 2: Control Flow
    2: {
      1: {
        title: "What are If Statements? 🤔",
        explanation: "If statements help the computer make decisions! It's like asking a question: 'IF this is true, THEN do this.' The computer checks and decides what to do!",
        example: "if (age > 10) { console.log('You are old enough!'); }",
        analogy: "Like a choose-your-own-adventure book - different choices lead to different outcomes!"
      },
      2: {
        title: "What are Loops? 🔄",
        explanation: "Loops make the computer repeat things! Instead of writing the same code 100 times, you tell the computer 'do this 100 times.' It's a shortcut!",
        example: "for (let i = 0; i < 5; i++) { console.log('Hi!'); }",
        analogy: "Like doing jumping jacks - you count and repeat the same action!"
      },
      3: {
        title: "What are Comparisons? ⚖️",
        explanation: "Comparisons check if things are equal, bigger, or smaller! Use == for 'equal to', > for 'greater than', < for 'less than'. The computer answers true or false!",
        example: "5 > 3 // This is true! 5 is bigger than 3",
        analogy: "Like comparing heights - who is taller?"
      }
    },
    // Module 3: Functions
    3: {
      1: {
        title: "What are Functions? 🎁",
        explanation: "Functions are like recipes! You write the steps once, give it a name, and then you can use that recipe anytime by calling its name. No need to write the steps again!",
        example: "function sayHello() { console.log('Hello!'); }",
        analogy: "Like a recipe card - write it once, use it many times!"
      },
      2: {
        title: "What are Parameters? 📥",
        explanation: "Parameters are like ingredients for your function recipe! You can give different ingredients each time you use the function, and it will work with whatever you give it!",
        example: "function greet(name) { console.log('Hi ' + name); }",
        analogy: "Like making a sandwich - same recipe, but you can choose different fillings!"
      },
      3: {
        title: "What is Return? 📤",
        explanation: "Return is like getting an answer back! When a function finishes its job, it can give you a result. You can save that result and use it later!",
        example: "function add(a, b) { return a + b; }",
        analogy: "Like asking a friend to solve a math problem - they give you the answer!"
      }
    },
    // Module 4: Arrays and Objects
    4: {
      1: {
        title: "What are Arrays? 📚",
        explanation: "Arrays are like a list or a row of boxes! Each box holds something, and they're numbered starting from 0. You can store many things in one array!",
        example: "let colors = ['red', 'blue', 'green'];",
        analogy: "Like a bookshelf - each book has a position (0, 1, 2...)"
      },
      2: {
        title: "What are Objects? 🎒",
        explanation: "Objects are like backpacks with labeled pockets! Each pocket has a name (key) and something inside (value). You can organize related information together!",
        example: "let person = { name: 'Alex', age: 10 };",
        analogy: "Like a backpack with labeled compartments - pencil case, lunch box, etc!"
      }
    },
    // Module 5: Turtle Graphics
    5: {
      1: {
        title: "What is Turtle Graphics? 🐢",
        explanation: "Imagine a turtle with a pen! You tell the turtle to move forward, turn left or right, and it draws as it moves. You're the turtle's teacher!",
        example: "forward(100); // Turtle walks forward 100 steps",
        analogy: "Like remote-controlling a robot that draws!"
      },
      2: {
        title: "What are Angles? 📐",
        explanation: "Angles are how much the turtle turns! 90 degrees is a square corner (like the corner of a book). 180 degrees is turning around completely!",
        example: "right(90); // Turn right like making a square corner",
        analogy: "Like turning a steering wheel - small turns or big turns!"
      }
    }
  };

  const getCurrentConcept = () => {
    const moduleNum = parseInt(moduleId);
    const lessonNum = parseInt(lessonId);
    return conceptExplanations[moduleNum]?.[lessonNum] || null;
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const checkApprovalStatus = useCallback(async () => {
    if (!requiresApproval()) {
      setApprovalStatus({ approved: true, status: 'not_required' });
      return;
    }

    try {
      const res = await approvalAPI.checkApproval(lessonId);
      setApprovalStatus(res.data);
    } catch (err) {
      console.error('Failed to check approval:', err);
      setApprovalStatus({ approved: false, status: 'error' });
    }
  }, [lessonId, requiresApproval]);

  const loadLesson = useCallback(async () => {
    try {
      const currRes = await curriculumAPI.getCurriculum();
      setCurriculum(currRes.data.curriculum || []);
      const foundModule = currRes.data.curriculum.find(m => m.id === parseInt(moduleId));
      const foundLesson = foundModule?.lessons.find(l => l.id === parseInt(lessonId));
      
      if (foundModule && foundLesson) {
        setModule(foundModule);
        setLesson(foundLesson);
        setCode(foundLesson.starter_code || '// Write your code here\nconsole.log("Hello, World!");');
        initTurtleCanvas();
      } else {
        navigate('/curriculum');
      }
    } catch (err) {
      console.error('Failed to load lesson:', err);
      navigate('/curriculum');
    }
  }, [moduleId, lessonId, navigate]);

  // Fresh start whenever the child moves to another lesson
  useEffect(() => {
    setCelebration(null);
    setCheck(null);
    setHtmlPreview(null);
    setOutput('');
    setHasError(false);
    setCodeAttempts(0); setHintsUsed(0); setExampleLoads(0); setRunCount(0); setErrorCount(0); setSuccessCount(0);
    window.scrollTo(0, 0);
  }, [moduleId, lessonId]);

  // The challenge checklist (what the learner must do to reach 50%).
  useEffect(() => {
    let cancelled = false;
    setChallenge(null);
    lessonAPI.getChallenge(lessonId, challengeLocale)
      .then((res) => { if (!cancelled) setChallenge(res.data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [lessonId, challengeLocale]);

  useEffect(() => {
    loadLesson();
    checkApprovalStatus();
    // Start tracking time when lesson loads
    setStartTime(Date.now());
  }, [loadLesson, checkApprovalStatus]);

  const requestApproval = async () => {
    setRequestingApproval(true);
    try {
      await approvalAPI.requestApproval(parseInt(lessonId), parseInt(moduleId));
      await checkApprovalStatus();
      notify(t('lessonUi.approvalSent'), 'success');
    } catch (err) {
      console.error('Failed to request approval:', err);
      notify(t('lessonUi.approvalFailed'), 'error');
    } finally {
      setRequestingApproval(false);
    }
  };

  const initTurtleCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Reset turtle state
    turtleX.current = 200;
    turtleY.current = 200;
    turtleAngle.current = -90;
    turtleColor.current = '#6366f1';
    turtlePenDown.current = true;
  };

  const executeTurtleCommands = (commands) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    commands.forEach(cmd => {
      switch (cmd.type) {
        case 'forward':
          const newX = turtleX.current + cmd.dist * Math.cos(turtleAngle.current * Math.PI / 180);
          const newY = turtleY.current + cmd.dist * Math.sin(turtleAngle.current * Math.PI / 180);
          
          if (turtlePenDown.current) {
            ctx.beginPath();
            ctx.moveTo(turtleX.current, turtleY.current);
            ctx.lineTo(newX, newY);
            ctx.strokeStyle = turtleColor.current;
            ctx.lineWidth = 2;
            ctx.stroke();
          }
          
          turtleX.current = newX;
          turtleY.current = newY;
          break;
          
        case 'backward':
          const backX = turtleX.current - cmd.dist * Math.cos(turtleAngle.current * Math.PI / 180);
          const backY = turtleY.current - cmd.dist * Math.sin(turtleAngle.current * Math.PI / 180);
          
          if (turtlePenDown.current) {
            ctx.beginPath();
            ctx.moveTo(turtleX.current, turtleY.current);
            ctx.lineTo(backX, backY);
            ctx.strokeStyle = turtleColor.current;
            ctx.lineWidth = 2;
            ctx.stroke();
          }
          
          turtleX.current = backX;
          turtleY.current = backY;
          break;
          
        case 'right':
          turtleAngle.current += cmd.angle;
          break;
          
        case 'left':
          turtleAngle.current -= cmd.angle;
          break;
          
        case 'color':
          turtleColor.current = cmd.color;
          break;
          
        case 'penUp':
          turtlePenDown.current = false;
          break;
          
        case 'penDown':
          turtlePenDown.current = true;
          break;
          
        case 'clear':
          initTurtleCanvas();
          break;

        default:
          break;
      }
    });
  };

  // Score the code against the challenge checklist (the server also saves the best score).
  const runCheck = async (source) => {
    setChecking(true);
    try {
      const res = await lessonAPI.check(lessonId, source, challengeLocale);
      setCheck(res.data);
      setChallenge((prev) => (prev ? { ...prev, bestScore: Math.max(prev.bestScore || 0, res.data.score) } : prev));
      return res.data;
    } catch {
      return null;
    } finally {
      setChecking(false);
    }
  };

  const runCode = async () => {
    // HTML lessons: show the page as a preview (never run it as JavaScript), then check it.
    if (isHtmlLesson) {
      setRunCount(prev => prev + 1);
      setCodeAttempts(prev => prev + 1);
      setHasError(false);
      setHtmlPreview(code);
      setOutput(t('lessonUi.htmlPreviewBelow'));
      await runCheck(code);
      return;
    }
    setIsRunning(true);
    setOutput('Running...');
    setHasError(false);
    initTurtleCanvas();
    
    // Track code run attempt
    setCodeAttempts(prev => prev + 1);
    setRunCount(prev => prev + 1);
    
    try {
      const res = await codeAPI.runCode(code, 'javascript');
      setOutput(res.data.output);
      setHasError(res.data.error);
      
      // Track errors vs successes
      if (res.data.error) {
        setErrorCount(prev => prev + 1);
      } else {
        setSuccessCount(prev => prev + 1);
      }
      
      if (res.data.turtleCommands && res.data.turtleCommands.length > 0) {
        executeTurtleCommands(res.data.turtleCommands);
      }
      
      // Score it against the challenge (this also saves the code and the best score)
      await runCheck(code);
    } catch (err) {
      setOutput('❌ Failed to run code. Please try again.');
      setHasError(true);
      setErrorCount(prev => prev + 1);
    } finally {
      setIsRunning(false);
    }
  };

  const completeLesson = async () => {
    // Calculate time spent in seconds
    const timeSpentSeconds = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
    
    // Prepare learning metrics
    const learningMetrics = {
      timeSpentSeconds,
      codeAttempts,
      hintsUsed,
      exampleLoads,
      runCount,
      errorCount,
      successCount
    };
    
    // Send progress with learning metrics, then celebrate and point to what comes next
    setCompleting(true);
    const xpBefore = userXP || 0;
    try {
      await progressAPI.saveProgress({
        module_id: parseInt(moduleId), lesson_id: parseInt(lessonId), completed: true, last_code: code,
        learningMetrics, locale: challengeLocale,
      });
      await loadProgress();
      setCelebration({ xpBefore, next: nextAfterLesson(curriculum, moduleId, lessonId) });
    } catch (err) {
      const data = err.response?.data;
      if (data?.error === 'challenge_not_passed') {
        // The server re-checked this code and it is below 50%: show what is still missing.
        setCheck({ score: data.score, passMark: data.passMark, passed: false, checks: data.checks });
        notify(t('lessonUi.notYet50', { score: data.score }), 'warning');
      } else {
        notify(t('lessonUi.saveFailed'), 'error');
      }
    } finally {
      setCompleting(false);
    }
  };

  const loadExample = () => {
    if (lesson?.example_code) {
      setCode(lesson.example_code);
      // Track example load
      setExampleLoads(prev => prev + 1);
    }
  };

  // Get translated lesson content - memoized to prevent re-renders
  // Must be called before any conditional returns (React hooks rule)
  const translatedLesson = useMemo(
    () => lesson ? getTranslatedLesson(parseInt(lessonId), i18n.language) : null,
    [lesson, lessonId, i18n.language]
  );

  const position = lessonPosition(curriculum, moduleId, lessonId);
  // HTML lessons are previewed, never run as JavaScript. Use the checklist's answer, or spot
  // HTML from the lesson's example code if the checklist could not be loaded.
  const isHtmlLesson = challenge ? challenge.kind === 'html' : /^\s*(<!doctype|<\w|<!--)/i.test(lesson?.example_code || '');
  // Hints are stored as a JSON list (or plain text); show them as plain text.
  const hintList = (() => {
    const raw = lesson?.hints;
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(String).filter((h) => h.trim());
    } catch { /* not JSON */ }
    return [String(raw)];
  })();
  const passMark = challenge?.passMark ?? 50;
  const bestScore = Math.max(challenge?.bestScore || 0, check?.score || 0);
  const shownScore = check ? check.score : bestScore;
  const canFinish = Boolean(challenge?.completed) || bestScore >= passMark;
  const nextTitle = (n) => n?.type === 'lesson' ? (getTranslatedLesson(n.lesson.id, i18n.language)?.title || n.lesson.title) : t('learn.quizName');

  if (!lesson || !module) {
    return (
      <div className="p-8 text-center">
        <div className="text-4xl mb-4">📚</div>
        <div>{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 pt-8 pb-28">
      {/* Header */}
      <div className="mb-6">
        <div className="text-sm text-slate-600 mb-2">
          <button onClick={() => navigate('/curriculum')} className="font-bold hover:text-indigo-600">
            ← {t('lessonUi.backToMap')}
          </button>
          <span className="mx-2" aria-hidden="true">/</span>
          <span className="font-semibold">{module.icon} {module.title}</span>
          {position && (
            <span className="ml-3 inline-block text-xs font-extrabold bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">
              {t('kidHome.lessonOf', { n: position.n, total: position.total })}
            </span>
          )}
        </div>
        <h1 className="font-display text-3xl text-slate-800 mb-2">
          {translatedLesson?.title || lesson.title}
        </h1>
        <p className="text-slate-600">{lesson.description}</p>
      </div>

      {/* Approval Required Notice */}
      {requiresApproval() && approvalStatus && !approvalStatus.approved && (
        <div className="mb-6 card p-6 bg-yellow-50 border-2 border-yellow-300">
          <div className="flex items-start gap-4">
            <Lock size={32} className="text-yellow-600 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h2 className="font-display text-xl text-yellow-800 mb-2">
                🔒 {t('lesson.approvalRequired')}
              </h2>
              {approvalStatus.status === 'pending' ? (
                <div>
                  <p className="text-yellow-700 mb-3">
                    {t('lesson.approvalPending')}
                  </p>
                  <div className="text-sm text-yellow-600">
                    {t('lesson.requested')}: {new Date(approvalStatus.requestedAt).toLocaleString()}
                  </div>
                </div>
              ) : approvalStatus.status === 'denied' ? (
                <div>
                  <p className="text-yellow-700 mb-2">
                    {t('lesson.approvalDenied')}
                  </p>
                  {approvalStatus.responseNote && (
                    <div className="p-3 bg-white rounded-lg border border-yellow-200 mb-3">
                      <div className="text-xs text-yellow-600 font-bold mb-1">{t('lesson.parentNote')}:</div>
                      <div className="text-sm text-slate-700">{approvalStatus.responseNote}</div>
                    </div>
                  )}
                  <button
                    onClick={requestApproval}
                    disabled={requestingApproval}
                    className="btn-secondary text-sm py-2"
                  >
                    {requestingApproval ? t('lesson.requesting') : t('lesson.requestAgain')}
                  </button>
                </div>
              ) : (
                <div>
                  <p className="text-yellow-700 mb-3">
                    {t('lesson.needPermission')}
                  </p>
                  <button
                    onClick={requestApproval}
                    disabled={requestingApproval}
                    className="btn-primary text-sm py-2"
                  >
                    {requestingApproval ? t('lesson.requesting') : '📨 ' + t('lesson.requestApproval')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left - Instructions */}
        <div className="space-y-6">
          {/* Concept Explanation */}
          {getCurrentConcept() && (
            <div className="card p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-indigo-200">
              <button
                onClick={() => setShowConcept(!showConcept)}
                className="w-full flex justify-between items-center mb-3"
              >
                <h2 className="font-display text-xl text-indigo-800 flex items-center gap-2">
                  🎓 {getCurrentConcept().title}
                </h2>
                <span className="text-2xl">{showConcept ? '▼' : '▶'}</span>
              </button>
              
              {showConcept && (
                <div className="space-y-3">
                  <div 
                    className="text-slate-700 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: getCurrentConcept().explanation }}
                  />
                  
                  <div className="bg-white p-3 rounded-lg border border-indigo-200">
                    <div className="text-xs text-indigo-600 font-bold mb-1">📝 Example:</div>
                    <code className="text-sm text-slate-800">{getCurrentConcept().example}</code>
                  </div>
                  
                  <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                    <div className="text-xs text-yellow-700 font-bold mb-1">💡 Think of it like:</div>
                    <div className="text-sm text-slate-700">{getCurrentConcept().analogy}</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Challenge */}
          <div className="card p-6">
            <h2 className="font-display text-xl text-slate-800 mb-3">🎯 {t('lesson.challenge')}</h2>
            <div 
              className="text-slate-700 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: translatedLesson?.challenge || lesson.challenge }}
            />
          </div>

          {/* Hints: revealed one at a time (each one counts as a hint used) */}
          {hintList.length > 0 && (
            <div className="card p-6 bg-yellow-50 border-yellow-200">
              <h3 className="font-bold text-yellow-800 mb-2">💡 {t('lesson.hints')}</h3>
              {hintsUsed > 0 && (
                <ol className="list-decimal pl-5 space-y-1 text-slate-700 text-sm mb-3">
                  {hintList.slice(0, hintsUsed).map((h, i) => <li key={i}>{h}</li>)}
                </ol>
              )}
              {hintsUsed < hintList.length ? (
                <button type="button" onClick={() => setHintsUsed(prev => prev + 1)} className="btn-secondary text-sm py-2">
                  💡 {t('lessonUi.showHint', { n: hintsUsed + 1, total: hintList.length })}
                </button>
              ) : (
                <p className="text-xs font-bold text-yellow-700">{t('lessonUi.noMoreHints')}</p>
              )}
            </div>
          )}

          {/* Example Code */}
          {lesson.example_code && (
            <div className="card p-6">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-slate-800">📝 {t('lesson.exampleCode')}</h3>
                <button onClick={loadExample} className="btn-secondary text-sm py-2">
                  {t('lesson.loadExample')}
                </button>
              </div>
              <pre className="text-xs">{lesson.example_code}</pre>
            </div>
          )}
        </div>

        {/* Right - Code Editor & Output */}
        <div className="space-y-6">
          {/* Code Editor */}
          <div className="card p-6">
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-display text-xl text-slate-800">💻 {t('lesson.codeEditor')}</h2>
              <div className="flex gap-2">
                <button
                  onClick={initTurtleCanvas}
                  className="btn-secondary text-sm py-2 px-3"
                  title={t('lesson.clearCanvas')}
                  disabled={requiresApproval() && !approvalStatus?.approved}
                >
                  <RotateCcw size={16} />
                </button>
                <button
                  onClick={runCode}
                  disabled={isRunning || (requiresApproval() && !approvalStatus?.approved)}
                  className="btn-primary text-sm py-2"
                >
                  <Play size={16} />
                  {isRunning ? t('lesson.running') : t('lesson.runCode')}
                </button>
              </div>
            </div>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full h-64 p-4 font-code text-sm bg-slate-900 text-green-400 rounded-xl border-2 border-slate-700 focus:border-indigo-500 outline-none resize-none"
              spellCheck="false"
              disabled={requiresApproval() && !approvalStatus?.approved}
              placeholder={requiresApproval() && !approvalStatus?.approved ? "🔒 " + t('lesson.requestApprovalPlaceholder') : t('lesson.codePlaceholder')}
            />
          </div>

          {/* Output */}
          <div className="card p-6">
            <h3 className="font-bold text-slate-800 mb-3">📤 {t('lesson.output')}</h3>
            <div className={`output-panel ${hasError ? 'has-error' : ''}`}>
              {output || t('lesson.outputPlaceholder')}
            </div>
            {htmlPreview !== null && (
              <iframe
                title={t('lessonUi.htmlPreview')}
                sandbox=""
                srcDoc={htmlPreview}
                className="w-full mt-3 rounded-2xl border-4 border-slate-200 bg-white"
                style={{ height: 260 }}
              />
            )}
          </div>

          {/* AI code check (works offline too) */}
          <CodeCheck code={code} language={isHtmlLesson ? 'html_css' : 'javascript'} task={lesson.challenge} />

          {/* Turtle Canvas (not used by HTML lessons) */}
          <div className="card p-6" style={isHtmlLesson ? { display: 'none' } : undefined}>
            <h3 className="font-bold text-slate-800 mb-3">🐢 {t('lesson.turtleGraphics')}</h3>
            <canvas
              ref={canvasRef}
              width={400}
              height={300}
              id="turtleCanvas"
              className="w-full"
            />
          </div>

          {/* Challenge score: the learner needs 50% before the lesson can be completed */}
          {challenge && (
            <section className="card p-6" style={{ borderColor: canFinish ? '#86efac' : '#fcd34d' }} aria-labelledby="challenge-score-title">
              <div className="flex justify-between items-baseline gap-2 mb-2">
                <h3 id="challenge-score-title" className="font-display text-xl text-slate-800">🎯 {t('lessonUi.challengeScore')}</h3>
                <span className={`font-display text-2xl ${canFinish ? 'text-green-600' : 'text-amber-600'}`}>{shownScore}%</span>
              </div>
              <div className="relative kid-bar mb-1" style={{ height: 14 }} role="progressbar" aria-valuenow={shownScore} aria-valuemin={0} aria-valuemax={100} aria-label={t('lessonUi.challengeScore')}>
                <div className="kid-bar-fill" style={{ width: `${shownScore}%`, background: canFinish ? undefined : 'linear-gradient(90deg, #f59e0b, #fbbf24)' }} />
                <div className="absolute top-0 bottom-0" style={{ left: `${passMark}%`, borderLeft: '3px dashed #475569' }} aria-hidden="true" />
              </div>
              <p className="text-xs font-bold text-slate-500 mb-4">
                {canFinish ? `✅ ${t('lessonUi.readyToFinish')}` : t('lessonUi.needPassMark', { mark: passMark })}
                {check && bestScore > check.score ? ` · ${t('lessonUi.bestSoFar', { score: bestScore })}` : ''}
              </p>
              <ul className="space-y-2">
                {(check?.checks || challenge.checks).map((c, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-lg leading-5" aria-hidden="true">{check ? (c.passed ? '✅' : '⬜') : '▫️'}</span>
                    <span className="flex-1">
                      <span className={`font-bold ${check && c.passed ? 'text-green-700' : 'text-slate-700'}`}>{c.label}</span>
                      {check && !c.passed && c.tip && <span className="block text-xs text-slate-500 font-semibold">💡 {c.tip}</span>}
                    </span>
                  </li>
                ))}
              </ul>
              {checking && <p className="text-xs text-slate-500 font-bold mt-3">{t('lessonUi.checking')}</p>}
            </section>
          )}

          {/* Complete Button */}
          <div>
            {!canFinish && (
              <p className="text-center text-sm font-bold text-slate-500 mb-2">
                💡 {runCount === 0 ? t('lessonUi.runFirstHint') : t('lessonUi.keepTrying', { mark: passMark })}
              </p>
            )}
            <button
              onClick={completeLesson}
              disabled={!canFinish || completing || (requiresApproval() && !approvalStatus?.approved)}
              className={canFinish ? 'kid-go-btn w-full' : 'btn-secondary w-full justify-center text-lg py-4'}
              style={canFinish ? { width: '100%' } : { width: '100%', opacity: 1, cursor: 'not-allowed' }}
            >
              {canFinish ? `✅ ${completing ? t('kidHome.gettingReady') : t('lessonUi.imDone')}` : `🔒 ${t('lessonUi.lockedUntil', { mark: passMark })}`}
            </button>
          </div>
        </div>
      </div>
      <CoachChat context={{ task: lesson.challenge, code, language: isHtmlLesson ? 'html_css' : 'javascript' }} />

      {celebration && (
        <div className="modal-backdrop">
          <div className="modal-card animate-pop" role="dialog" aria-modal="true" aria-labelledby="done-title">
            <div className="text-7xl mb-2 animate-float" aria-hidden="true">🎉</div>
            <h2 id="done-title" className="font-display text-3xl text-slate-800 mb-1">{t('lessonUi.doneTitle')}</h2>
            <p className="text-slate-600 font-semibold mb-4">{t('lessonUi.doneText')}</p>
            {(userXP || 0) > celebration.xpBefore && (
              <div className="inline-block bg-amber-100 text-amber-700 font-display text-2xl px-5 py-2 rounded-2xl mb-5">
                ⭐ +{(userXP || 0) - celebration.xpBefore} XP
              </div>
            )}
            {celebration.next && (
              <p className="text-sm font-bold text-slate-500 mb-2">
                {t('lessonUi.upNext')}: <span className="text-slate-800">{nextTitle(celebration.next)}</span>
              </p>
            )}
            <div className="flex flex-col gap-3">
              {celebration.next && (
                <button type="button" className="kid-go-btn" style={{ width: '100%' }} onClick={() => navigate(celebration.next.path)} autoFocus>
                  ▶ {celebration.next.type === 'quiz' ? t('kidHome.takeQuiz') : t('lessonUi.nextLesson')}
                </button>
              )}
              <button type="button" className="btn-secondary justify-center" onClick={() => navigate('/curriculum')}>
                🗺️ {t('lessonUi.backToMap')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Lesson;
