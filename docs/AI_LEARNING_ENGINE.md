# KidsCode AI Learning Engine

This document explains the adaptive AI coach added to KidsCode: how it works, how to configure it, how it keeps children safe, and how it was tested. It implements the proposal's recommendation (§6.2) for "an adaptive tutor based on AI principles to tailor learning to the needs of individual learners".

---

## 1. What learners, parents and teachers get

| Who | Feature | Where |
|---|---|---|
| Learner | **AI Coach** page: one personalised activity at a time, picked by a learner model that moves from known to unknown | `/coach` (navbar: 🤖 AI Coach) |
| Learner | **Mini-lessons** before each new idea or level. They link the new idea to what the learner already knows | AI Coach |
| Learner | **Progressive hints** (3 levels) that never give away the answer | Every activity |
| Learner | **Coach Kodi chat**: a Socratic tutor that answers questions with hints, not solutions | AI Coach + every lesson |
| Learner | **"Check my code"**: runs JavaScript and explains common mistakes | Every lesson |
| Learner | **9 languages**: KidsCode Blocks, Scratch, Python, JavaScript, HTML & CSS, Java, C, C++, C#, with age-based suggestions | AI Coach language picker |
| Parent | **AI learning insights** for each child: Bloom thinking-skills profile, strengths, needs, and actions for this week | Parent dashboard → child's progress |
| Teacher | Per-student insights, plus a **class view** showing the concepts to reteach and which students are struggling | Teacher dashboard |
| Everyone | English and Kiswahili throughout | Language switcher |

The engine also works **fully offline**, with no internet and no API key. In that mode it uses a built-in bank of verified activities. This supports the proposal's low-bandwidth and PWA aims.

---

## 2. How it teaches: Bloom's taxonomy, from known to unknown

Each concept has a ladder of six levels (Anderson & Krathwohl's revised Bloom's taxonomy). Every level uses a different kind of activity:

| Level | Kid goal | Activity type | How it is checked |
|---|---|---|---|
| 🧠 Remember | "I can spot it" | Multiple choice: recognise the syntax | Exact |
| 💡 Understand | "I can explain what it does" | Read a program and choose what it does | Exact |
| 🛠️ Apply | "I can use it in code" | **JavaScript**: write the missing line, then the code is run and its output checked. **Other languages**: choose the missing line | Executed / exact |
| 🔍 Analyse | "I can trace it and predict" | Predict the exact output | Exact (output computed by an interpreter) |
| ⚖️ Evaluate | "I can find and fix mistakes" | Find the line with the bug | Exact |
| 🚀 Create | "I can build something new" | Open project brief, Kenya/climate themed | Structure check, plus an AI rubric when online |

**Concept map** (in `backend/ai/concepts.js`), ordered from known to unknown:

```
sequence → output → variables → arithmetic → conditionals → while loops
                         └──→ loops ──→ lists        └──────────↗
sequence/output → functions → parameters & return (also needs arithmetic)
html_structure → css_styling   (HTML & CSS)
```

### The learner model (`backend/ai/learnerModel.js`)

* **Bayesian Knowledge Tracing** (Corbett & Anderson, 1994) estimates, for every *(language, concept, level)*, the probability that the learner knows it. Correct answers raise the estimate and wrong ones lower it. A correct answer given after hints counts for less.
* A level is **mastered** when the estimate reaches 0.85 after at least 2 attempts. In practice that means about 3 correct multiple-choice answers in a row, or 2 correct open answers, because open answers are much harder to guess.
* **Levels unlock in order** for each concept. A **concept unlocks** when all its prerequisites have reached Apply. A learner does not need to Evaluate loops before starting lists.
* **Transfer between languages**: if a learner mastered loops in Blocks, loops in Python start from a higher estimate, and the mini-lesson says "You already know loops…".
* **Recommendation policy**, in priority order:
  1. A concept the learner chose.
  2. **Scaffolding**: after 3 wrong answers in a row, step back one level and show the mini-lesson again.
  3. **Spaced review** every 7th activity, of the mastered skill most likely to be forgotten.
  4. **Deeper thinking** every 3rd activity (Analyse/Evaluate/Create on concepts the learner already has).
  5. Otherwise, the earliest unfinished concept, climbed to Apply first (known → unknown).
* Each recommendation comes with a reason shown to the learner ("Why this activity?").

Completing the existing KidsCode lessons also feeds the model (`LESSON_MAP` in `engine.js`), so the coach knows what a child already learned in the lessons.

---

## 3. Where AI is used and where it is not

Wrong answer keys would teach children false things, so AI-generated content is limited to places where it is low-risk or can be verified:

| Content | Online (AI available) | Offline / fallback |
|---|---|---|
| Remember & Understand questions | AI-written (validated: 3–4 distinct options, valid answer index, safety-filtered) | Verified bank |
| Apply & Analyse in **JavaScript** | AI-written, then **the server runs the code** and uses the real output as the answer key. A solution that does not use the concept is rejected | Verified bank |
| Apply & Analyse in other languages | **Never AI**: verified bank only | Verified bank |
| Evaluate (find the bug) | Verified bank | Verified bank |
| Create briefs | AI-written, personalised to the learner's interests | Bank |
| Mini-lessons, hints, tutor, code review, parent/teacher summaries | AI | Rule-based equivalents |

Every AI response that is malformed, unsafe or fails verification is thrown away, and the offline version is used instead. Learners never see an error.

### The verified offline bank

Practice programs are written once in a language-neutral form (`backend/ai/program/ast.js`). From that single source:
* `render.js` produces real code in JavaScript, Python, Java, C, C++, C#, Blockly-style blocks and Scratch-style blocks.
* `interpret.js` computes the exact expected output.
* `tests/verify-renderers.js` **compiles and runs** every scenario in Python, JavaScript, C, C++ and Java and checks the output matches the interpreter (300 checks).

C#, Blocks and Scratch are render-checked only, because no toolchain is available in the build environment.

---

## 4. Child safety (proposal §3.6)

`backend/ai/safety.js` applies to every AI interaction:

* **Personal data is removed before anything is sent to an AI provider**: e-mails, Kenyan and international phone numbers, and ID-like numbers. If a child shares personal information, the coach gently reminds them to keep it private.
* **Self-harm signals** (English and Kiswahili) get a fixed, caring message pointing to a trusted adult and Kenya's free **National Child Helpline, 116** (24 hours). The AI is never asked to counsel the child.
* **Contact requests, sexual content, violence and profanity** are blocked. Each event is logged in `ai_safety_log` (category only, not the child's text) for adult review.
* **AI output is filtered too**: links are stripped, and unsafe replies are replaced.
* **Prompt-injection defence**: learner text is wrapped in tags and treated as data by the system prompt.
* **Hints are checked for answer leaks** and replaced if they reveal the answer.
* **Moderation endpoint** `POST /api/ai/moderate` lets community/showcase features screen posts before publishing (proposal: "AI content moderation layer").
* **Role-based access**: parents and teachers can only see insights for children linked to them, and learners can only open their own activities.
* **Cost/abuse limits**: an hourly AI budget per learner (`AI_MAX_CALLS_PER_LEARNER_PER_HOUR`). Generated content is cached and reused, which also saves bandwidth.

The word lists are a first filter, not a replacement for human moderation. Have a teacher review the Kiswahili strings and the lists before launch.

---

## 5. Configuration

Copy `backend/.env.example` to `backend/.env`.

| Mode | Settings |
|---|---|
| **Offline** (default) | Nothing. Uses the verified bank and rule-based coaching |
| **Claude (Anthropic API)** | `ANTHROPIC_API_KEY=...` (default model `claude-haiku-5-5`, which is fast and low-cost; override with `AI_MODEL`) |
| **School server / local model** | `AI_PROVIDER=openai`, `OPENAI_BASE_URL=http://<server>:11434`, `AI_MODEL=<model name>` (any OpenAI-compatible server, e.g. Ollama). Keeps data on the school network |

The server prints the active mode at startup: `🤖 AI coach provider: ...`.

---

## 6. API reference (all require a logged-in user)

| Method & path | Purpose |
|---|---|
| `GET /api/ai/status` | Provider and whether AI is on |
| `GET /api/ai/catalog?locale=` | Languages (with age suitability, curricula), Bloom levels |
| `GET /api/ai/profile?language=&locale=` | Mastery map for the learner |
| `PUT /api/ai/preferences` | `{ language, locale, interests[] }` |
| `GET /api/ai/next?language=&concept=&fresh=1` | Next adaptive activity (answers removed) + mini-lesson + reason |
| `POST /api/ai/activities/:id/hint` | `{ hintNumber, learnerAnswer }` |
| `POST /api/ai/activities/:id/submit` | `{ answerIndex \| text \| code, timeSeconds }`. Returns feedback, XP, level-ups and unlocked concepts |
| `POST /api/ai/explain` | `{ concept, language, level, question }` mini-lesson |
| `POST /api/ai/review-code` | `{ code, language, task }` |
| `POST /api/ai/tutor` | `{ message, history[], context: { task, code, language } }` |
| `POST /api/ai/moderate` | `{ text }` → `{ allowed, reasons }` |
| `GET /api/ai/insights/learner/:id?narrative=1` | Parent/teacher/self insights |
| `GET /api/ai/insights/class` | Teacher class overview |

New tables (created automatically on start): `ai_mastery`, `ai_activities`, `ai_learner_prefs`, `ai_content_cache`, `ai_safety_log`.

---

## 7. Languages and curricula

The catalogue (`backend/ai/languages.js`) only lists curriculum references found in official or widely cited sources:

* **Kenya**: KICD Competency-Based Curriculum. Scratch is widely used to introduce coding (Scratch Foundation / Robotics Society of Kenya teacher training), and a KICD-approved Python coding curriculum exists for ages 7–16 (Kodris Africa; UNESCO-recognised).
* **England**: National Curriculum KS3 requires two or more programming languages, at least one textual. Python is the most common choice, and C# appears in some schools.
* **Australia**: Digital Technologies uses visual programming in Years 3–6 and general-purpose languages (e.g. Python, JavaScript) from Year 7.
* **India**: CBSE Class XI–XII Computer Science (Code 083) uses Python.
* **USA**: AP Computer Science A uses Java.

To add a language, add a renderer branch in `program/render.js`, an entry in `languages.js`, construct patterns, and run `npm run verify:content`.

---

## 8. Tests

```bash
cd backend
npm test                 # 15 end-to-end API tests (temporary database)
npm run verify:content   # compile & run all scenarios in 5 languages; check all 486 activity variants
```

`npm test` uses Node's built-in SQLite through `tests/sqlite3-shim.js`, so it runs on any OS with Node ≥ 22.5. Production still uses the `sqlite3` package.

---

## 9. Known limitations and next steps

* **Browser testing**: the React components were bundled and server-rendered with every activity type, but have not been clicked through in a real browser yet. Do a manual pass on a low-cost Android phone (proposal target device).
* **Python and other non-JavaScript code is not executed** (no safe sandbox yet). Apply-level work in those languages uses "complete the code" questions, and Create work is checked by structure plus the AI rubric. Next step: run Python in the browser with a Web Worker (e.g. Skulpt or Pyodide, cached by the PWA).
* **Playground canvas mode** (`frontend-react/src/pages/Playground.js`, ~line 1260) still `eval`s learner code in the page, where it can read the login token. Move it into a sandboxed `<iframe sandbox="allow-scripts">`.
* **Kiswahili text and safety word lists** need review by a native-speaking teacher.
* **Tailwind and Blockly load from CDNs** (`public/index.html`), which does not work offline. Bundle them locally for the PWA.
* **The proposal specifies Firebase; the code uses SQLite + Express.** The AI engine only depends on the small `Store` class (`ai/store.js`), so it can be ported to Firestore by reimplementing that class.
