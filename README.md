# KidsCode 🚀

A browser-based coding education platform for children aged 7–16 in Kenya and East Africa. It offers block programming (Google Blockly), a five-module curriculum, gamification, parent and teacher dashboards, English and Kiswahili, and an **adaptive AI Coach** built on Bloom's taxonomy.

## Quick start (Windows)

1. Install [Node.js](https://nodejs.org) 18 or newer.
2. Backend: `cd backend` → `npm install` → copy `.env.example` to `.env` and set `JWT_SECRET` and `SESSION_SECRET`.
3. Frontend: `cd frontend-react` → `npm install`.
4. Double-click `START_DEV.bat`, or run `npm start` in `backend`, then `npm start` in `frontend-react`.
5. Open http://localhost:3001.

The AI Coach runs **offline by default**. To turn on AI-generated, personalised content, add `ANTHROPIC_API_KEY` to `backend/.env`, or point it at a school server running a local model. See [docs/AI_LEARNING_ENGINE.md](docs/AI_LEARNING_ENGINE.md).

On a fresh database, run `node setup-database.js` once in `backend`. It creates the tables, the children's curriculum and the adult learner pathway, and is safe to run again.

## Putting it online

See [docs/DEPLOY_RENDER.md](docs/DEPLOY_RENDER.md) for a step-by-step guide to hosting KidsCode on Render using the included `render.yaml`.

## Project layout

```
backend/
  server.js            API (auth, curriculum, progress, social, parent/teacher)
  sandbox/             isolated runner for learner JavaScript
  ai/                  AI learning engine (Bloom's taxonomy, learner model, content, safety)
  tests/               end-to-end tests and content verification
frontend-react/
  src/pages/AICoach.js           adaptive practice page
  src/components/ai/             activity player, Bloom ladder, Coach Kodi chat, insights
docs/AI_LEARNING_ENGINE.md       design, safety, configuration and API reference
```

## Tests

```bash
cd backend
npm test                 # end-to-end API tests
npm run verify:content   # compiles & runs generated practice code in 5 languages
```

## Security notes

* Never commit `backend/.env` or `*.db` files. The databases contain children's personal data.
* `backend/node_modules` in this repository contains a Windows-only `sqlite3` binary. Delete it and run `npm install` on other systems.
