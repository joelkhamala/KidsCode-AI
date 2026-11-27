const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const path = require('path');
require('./lib/loadEnv')(path.join(__dirname, '.env'));
const { getDb, initializeDatabase } = require('./database');
const { runJavaScript } = require('./sandbox/runJs');
const lessonChallenges = require('./lessonChallenges');
const achievements = require('./achievements');
const { createSocialRouter, createParentSocialRouter } = require('./social');
const { createAdultRouter, createCertificateVerifyRouter, ensureReady: ensureAdultCourse } = require('./adult');
const aiEngine = require('./ai');

const app = express();
const PORT = process.env.PORT || 3000;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Render/most PaaS deployments terminate TLS at a reverse proxy. Trusting the
// first hop keeps `req.ip` accurate for per-client rate limits and secure cookies.
app.set('trust proxy', 1);

// Secrets must come from the environment in production. The development
// fallbacks keep `node server.js` working out of the box on a laptop.
if (IS_PRODUCTION && (!process.env.JWT_SECRET || !process.env.SESSION_SECRET)) {
  console.error('FATAL: JWT_SECRET and SESSION_SECRET must be set when NODE_ENV=production.');
  process.exit(1);
}
if (!process.env.JWT_SECRET) {
  console.warn('⚠️  JWT_SECRET not set - using an insecure development secret. Set it in backend/.env');
}
const JWT_SECRET = process.env.JWT_SECRET || 'kidscode_dev_only_jwt_secret_change_me';
const BCRYPT_ROUNDS = 12;

// Approved school domains for teacher registration. Empty = open (development).
const teacherDomains = (process.env.TEACHER_EMAIL_DOMAINS || '')
  .split(',').map((d) => d.trim().toLowerCase()).filter(Boolean);

// ---------------------------------------------------------------------------
// Lightweight in-memory rate limiter (no extra dependency). This protects a
// single instance; use a shared store (e.g. Redis) when scaling horizontally.
// ---------------------------------------------------------------------------
const rateBuckets = new Map();
function rateLimit({ windowMs = 60_000, max = 200, prefix = 'global' } = {}) {
  // Throttling is a production concern; keep local dev and tests unthrottled.
  if (!IS_PRODUCTION) return (req, res, next) => next();
  return (req, res, next) => {
    const key = `${prefix}:${req.ip || req.socket.remoteAddress || 'unknown'}`;
    const now = Date.now();
    let bucket = rateBuckets.get(key);
    if (!bucket || now - bucket.start >= windowMs) {
      bucket = { start: now, count: 0 };
      rateBuckets.set(key, bucket);
    }
    bucket.count += 1;
    if (bucket.count > max) {
      res.set('Retry-After', String(Math.ceil((bucket.start + windowMs - now) / 1000)));
      return res.status(429).json({ error: 'Too many requests. Please slow down.' });
    }
    next();
  };
}
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of rateBuckets) {
    if (now - bucket.start >= 120_000) rateBuckets.delete(key);
  }
}, 60_000).unref?.();

const authRateLimit = rateLimit({ prefix: 'auth', max: 100 });
const runRateLimit = rateLimit({ prefix: 'run', max: 200 });
const aiRateLimit = rateLimit({ prefix: 'ai', max: 200 });

// Middleware
// Production fails closed: Express serves the built frontend from the same
// origin, so cross-origin requests are not needed. Only opt in via env var.
const allowedOrigins = (process.env.CORS_ORIGINS || '').split(',').map((o) => o.trim()).filter(Boolean);
app.use(cors({
  origin: allowedOrigins.length ? allowedOrigins : !IS_PRODUCTION,
  credentials: true,
}));
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('X-Frame-Options', 'DENY');
  res.set('Referrer-Policy', 'no-referrer');
  res.set('Cross-Origin-Opener-Policy', 'same-origin');
  next();
});
app.use('/api', rateLimit({ prefix: 'api', max: 2000 }), (req, res, next) => {
  // Child profiles, progress and AI output must never be cached by proxies.
  res.set('Cache-Control', 'no-store');
  next();
});
app.use(bodyParser.json({ limit: '200kb' }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'kidscode_dev_only_session_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: IS_PRODUCTION,
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 3600000, // 1 hour
  }
}));

// NOTE: Static files are served at the END of the file, after all API routes

// Auth middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
}

/** The logged-in user if a valid token was sent, else null (never rejects the request). */
function optionalUser(req) {
  const token = (req.headers['authorization'] || '').split(' ')[1];
  if (!token) return null;
  try { return jwt.verify(token, JWT_SECRET); } catch { return null; }
}

// Middleware to require parent account
function requireParentAccount(req, res, next) {
  if (req.user.accountType !== 'parent') {
    return res.status(403).json({ error: 'Parent account required' });
  }
  next();
}

// Middleware to require teacher account
function requireTeacherAccount(req, res, next) {
  if (req.user.accountType !== 'teacher') {
    return res.status(403).json({ error: 'Teacher account required' });
  }
  next();
}

// Middleware to verify parent-child relationship
function verifyParentChildAccess(req, res, next) {
  const childId = req.params.childId || req.body.childId;
  const parentId = req.user.id;
  
  const db = getDb();
  db.get(
    'SELECT * FROM parent_child_relationships WHERE parent_id = ? AND child_id = ?',
    [parentId, childId],
    (err, relationship) => {
      if (err || !relationship) {
        return res.status(403).json({ error: 'Access denied to this child account' });
      }
      req.relationship = relationship;
      next();
    }
  );
}

// =====================
// AUTH ENDPOINTS
// =====================

// Parent registration
app.post('/api/parent/register', authRateLimit, async (req, res) => {
  const { email, password, firstName, lastName, phoneNumber } = req.body;

  if (!email || !password || !firstName || !lastName) {
    return res.status(400).json({ error: 'Email, password, first name, and last name are required' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const db = getDb();

    db.run(
      `INSERT INTO users (account_type, email, password, first_name, last_name, phone_number) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['parent', email, hashedPassword, firstName, lastName, phoneNumber || null],
      function (err) {
        if (err) {
          if (err.message.includes('UNIQUE')) {
            return res.status(400).json({ error: 'Email already registered' });
          }
          return res.status(500).json({ error: 'Registration failed. Try again!' });
        }

        const parentId = this.lastID;

        // Create default notification preferences
        db.run(
          `INSERT INTO notification_preferences (parent_id) VALUES (?)`,
          [parentId],
          (err) => {
            if (err) console.error('Failed to create notification preferences:', err);
          }
        );

        const token = jwt.sign(
          { id: parentId, email, accountType: 'parent' },
          JWT_SECRET,
          { expiresIn: '7d' }
        );

        res.json({
          success: true,
          token,
          user: {
            id: parentId,
            email,
            firstName,
            lastName,
            phoneNumber,
            accountType: 'parent'
          }
        });
      }
    );
  } catch (err) {
    res.status(500).json({ error: 'Something went wrong. Try again!' });
  }
});

// Parent login
app.post('/api/parent/login', authRateLimit, (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  const db = getDb();
  db.get(
    'SELECT * FROM users WHERE email = ? AND account_type = ?',
    [email, 'parent'],
    async (err, user) => {
      if (err || !user) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      // Update last active
      db.run('UPDATE users SET last_active = date("now") WHERE id = ?', [user.id]);

      const token = jwt.sign(
        { id: user.id, email: user.email, accountType: 'parent' },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          phoneNumber: user.phone_number,
          accountType: 'parent'
        }
      });
    }
  );
});

// =====================
// TEACHER AUTH ENDPOINTS
// =====================

// Teacher registration
app.post('/api/teacher/register', authRateLimit, async (req, res) => {
  const { email, password, firstName, lastName, phoneNumber } = req.body;

  if (!email || !password || !firstName || !lastName) {
    return res.status(400).json({ error: 'Email, password, first name, and last name are required' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  // Teacher self-registration is disabled in production unless the operator
  // configures approved school domains. Failing closed prevents unverified
  // adults from gaining access to children's data.
  if (IS_PRODUCTION && !teacherDomains.length) {
    return res.status(503).json({ error: 'Teacher registration is not configured on this server' });
  }
  if (teacherDomains.length && !teacherDomains.some((d) => email.toLowerCase().endsWith('@' + d))) {
    return res.status(403).json({ error: 'Teacher registration requires an approved school email address' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const db = getDb();

    db.run(
      `INSERT INTO users (account_type, email, password, first_name, last_name, phone_number) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['teacher', email, hashedPassword, firstName, lastName, phoneNumber || null],
      function (err) {
        if (err) {
          if (err.message.includes('UNIQUE')) {
            return res.status(400).json({ error: 'Email already registered' });
          }
          return res.status(500).json({ error: 'Registration failed. Try again!' });
        }

        const teacherId = this.lastID;

        const token = jwt.sign(
          { id: teacherId, email, accountType: 'teacher' },
          JWT_SECRET,
          { expiresIn: '7d' }
        );

        res.json({
          success: true,
          token,
          user: {
            id: teacherId,
            email,
            firstName,
            lastName,
            phoneNumber,
            accountType: 'teacher'
          }
        });
      }
    );
  } catch (err) {
    res.status(500).json({ error: 'Something went wrong. Try again!' });
  }
});

// Teacher login
app.post('/api/teacher/login', authRateLimit, (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  const db = getDb();
  db.get(
    'SELECT * FROM users WHERE email = ? AND account_type = ?',
    [email, 'teacher'],
    async (err, user) => {
      if (err || !user) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      // Update last active
      db.run('UPDATE users SET last_active = date("now") WHERE id = ?', [user.id]);

      const token = jwt.sign(
        { id: user.id, email: user.email, accountType: 'teacher' },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          phoneNumber: user.phone_number,
          accountType: 'teacher'
        }
      });
    }
  );
});

// Child registration (existing, updated for compatibility)
app.post('/api/register', authRateLimit, async (req, res) => {
  const { username, email, password, age, parent_email } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email, and password are required' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  if (age && age < 13 && !parent_email) {
    return res.status(400).json({ error: 'Parent email required for users under 13' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const db = getDb();

    db.run(
      `INSERT INTO users (account_type, username, email, password, age, parent_email) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['child', username, email, hashedPassword, age || null, parent_email || null],
      function (err) {
        if (err) {
          if (err.message.includes('UNIQUE')) {
            return res.status(400).json({ error: 'Username or email already exists!' });
          }
          return res.status(500).json({ error: 'Registration failed. Try again!' });
        }

        const token = jwt.sign(
          { id: this.lastID, username, email, accountType: 'child' },
          JWT_SECRET,
          { expiresIn: '7d' }
        );
        res.json({
          success: true,
          token,
          user: {
            id: this.lastID,
            username,
            email,
            age,
            xp: 0,
            streak: 0,
            accountType: 'child'
          }
        });
      }
    );
  } catch (err) {
    res.status(500).json({ error: 'Something went wrong. Try again!' });
  }
});

// Child login (existing, updated for compatibility)
app.post('/api/login', authRateLimit, (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email/Username and password required' });
  }

  const db = getDb();
  // Allow login with either email OR username, but ONLY for child accounts.
  // Parents and teachers use their dedicated login endpoints.
  db.get("SELECT * FROM users WHERE (email = ? OR username = ?) AND account_type = 'child'", [email, email], async (err, user) => {
    if (err || !user) {
      return res.status(401).json({ error: 'Wrong email/username or password. Try again! 🔒' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Wrong email/username or password. Try again! 🔒' });
    }

    // Update last active
    db.run('UPDATE users SET last_active = date("now") WHERE id = ?', [user.id]);

    // Log session for child accounts
    if (user.account_type === 'child') {
      db.run(
        'INSERT INTO session_logs (user_id, login_time) VALUES (?, datetime("now"))',
        [user.id]
      );
    }

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        accountType: user.account_type || 'child'
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        age: user.age,
        xp: user.xp,
        streak: user.streak,
        accountType: user.account_type || 'child'
      }
    });
  });
});

// =====================
// PARENT ACCOUNT ENDPOINTS
// =====================

// Create child account under parent
app.post('/api/parent/children', authenticateToken, requireParentAccount, async (req, res) => {
  const { username, displayName, age, avatarUrl, restrictions, password, email } = req.body;
  const parentId = req.user.id;

  if (!username || !displayName || !age) {
    return res.status(400).json({ error: 'Username, display name, and age are required' });
  }

  if (age < 4 || age > 17) {
    return res.status(400).json({ error: 'Age must be between 4 and 17' });
  }

  const db = getDb();

  // Check parent's child limit (max 10)
  db.get(
    'SELECT COUNT(*) as count FROM parent_child_relationships WHERE parent_id = ?',
    [parentId],
    async (err, result) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      
      if (result.count >= 10) {
        return res.status(400).json({ error: 'Maximum 10 children per parent account' });
      }

      // Check username uniqueness
      db.get('SELECT id FROM users WHERE username = ?', [username], async (err, existing) => {
        if (existing) {
          return res.status(400).json({ error: 'Username already taken' });
        }

        // Check email uniqueness if provided
        if (email) {
          const emailExists = await new Promise((resolve) => {
            db.get('SELECT id FROM users WHERE email = ?', [email], (err, row) => {
              resolve(!!row);
            });
          });
          
          if (emailExists) {
            return res.status(400).json({ error: 'Email already in use' });
          }
        }

        // Never derive a child password from the username. Generate a random
        // one-time credential that the parent must store and hand to the child.
        const childPassword = password || crypto.randomBytes(6).toString('base64url');
        const hashedPassword = await bcrypt.hash(childPassword, BCRYPT_ROUNDS);

        // Create child account with password and optional email
        db.run(
          `INSERT INTO users (account_type, username, email, password, display_name, age, parent_id, avatar_url, xp, streak) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0)`,
          ['child', username, email || null, hashedPassword, displayName, age, parentId, avatarUrl || null],
          function (err) {
            if (err) {
              console.error('Failed to create child:', err);
              return res.status(500).json({ error: 'Failed to create child account' });
            }

            const childId = this.lastID;

            // Create parent-child relationship
            db.run(
              `INSERT INTO parent_child_relationships (parent_id, child_id, relationship_type) 
               VALUES (?, ?, 'primary')`,
              [parentId, childId],
              (err) => {
                if (err) {
                  console.error('Failed to create relationship:', err);
                  // Rollback: delete the child
                  db.run('DELETE FROM users WHERE id = ?', [childId]);
                  return res.status(500).json({ error: 'Failed to link child to parent' });
                }

                // Create restrictions if provided
                if (restrictions) {
                  db.run(
                    `INSERT INTO account_restrictions 
                     (child_id, max_daily_minutes, allowed_days, content_filters, require_parent_approval, created_by) 
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [
                      childId,
                      restrictions.maxDailyMinutes || null,
                      restrictions.allowedDays ? JSON.stringify(restrictions.allowedDays) : null,
                      restrictions.contentFilters ? JSON.stringify(restrictions.contentFilters) : null,
                      restrictions.requireParentApproval ? 1 : 0,
                      parentId
                    ]
                  );
                }

                res.json({
                  success: true,
                  child: {
                    id: childId,
                    username,
                    email: email || null,
                    displayName,
                    age,
                    parentId,
                    avatarUrl,
                    accountType: 'child',
                    xp: 0,
                    streak: 0
                  },
                  loginCredentials: {
                    username: username,
                    email: email || null,
                    password: childPassword
                  }
                });
              }
            );
          }
        );
      });
    }
  );
});

// Generate a consent code a parent can hand to a teacher to enrol their child.
// The code is an HMAC of the child id, so it proves parent consent without
// exposing the child's email to self-registered adults.
app.get('/api/parent/children/:childId/enrollment-code', authenticateToken, requireParentAccount, verifyParentChildAccess, (req, res) => {
  const childId = Number(req.params.childId);
  const code = crypto.createHmac('sha256', JWT_SECRET).update(`enroll:${childId}`).digest('hex').slice(0, 12);
  res.json({ success: true, childId, enrollmentCode: code });
});

// Get all children for a parent
app.get('/api/parent/children', authenticateToken, requireParentAccount, (req, res) => {
  const parentId = req.user.id;
  const db = getDb();

  db.all(
    `SELECT u.id, u.username, u.display_name as displayName, u.age, u.avatar_url as avatarUrl, 
            u.xp, u.streak, u.last_active as lastActive, u.created_at as createdAt,
            (SELECT COUNT(*) FROM progress WHERE user_id = u.id AND completed = 1 AND CAST(lesson_id AS TEXT) NOT LIKE 'quiz%') as completedLessons
     FROM users u
     INNER JOIN parent_child_relationships pcr ON u.id = pcr.child_id
     WHERE pcr.parent_id = ?
     ORDER BY u.created_at DESC`,
    [parentId],
    (err, children) => {
      if (err) {
        console.error('Failed to fetch children:', err);
        return res.status(500).json({ error: 'Failed to load children' });
      }

      res.json({ children });
    }
  );
});

// Get specific child details
app.get('/api/parent/children/:childId', authenticateToken, requireParentAccount, verifyParentChildAccess, (req, res) => {
  const childId = req.params.childId;
  const db = getDb();

  db.get(
    `SELECT u.*, 
            (SELECT COUNT(*) FROM progress WHERE user_id = u.id AND completed = 1 AND CAST(lesson_id AS TEXT) NOT LIKE 'quiz%') as completedLessons,
            (SELECT COUNT(*) FROM lessons) as totalLessons
     FROM users u
     WHERE u.id = ?`,
    [childId],
    (err, child) => {
      if (err || !child) {
        return res.status(404).json({ error: 'Child not found' });
      }

      // Get restrictions
      db.get(
        'SELECT * FROM account_restrictions WHERE child_id = ? ORDER BY created_at DESC LIMIT 1',
        [childId],
        (err, restrictions) => {
          res.json({
            child: {
              id: child.id,
              username: child.username,
              displayName: child.display_name,
              age: child.age,
              avatarUrl: child.avatar_url,
              xp: child.xp,
              streak: child.streak,
              lastActive: child.last_active,
              completedLessons: child.completedLessons,
              totalLessons: child.totalLessons,
              restrictions: restrictions ? {
                maxDailyMinutes: restrictions.max_daily_minutes,
                allowedDays: restrictions.allowed_days ? JSON.parse(restrictions.allowed_days) : null,
                contentFilters: restrictions.content_filters ? JSON.parse(restrictions.content_filters) : null,
                requireParentApproval: restrictions.require_parent_approval === 1
              } : null
            }
          });
        }
      );
    }
  );
});

// Update child account
app.put('/api/parent/children/:childId', authenticateToken, requireParentAccount, verifyParentChildAccess, (req, res) => {
  const childId = req.params.childId;
  const { displayName, age, avatarUrl } = req.body;
  const db = getDb();

  if (!req.relationship.can_modify_settings) {
    return res.status(403).json({ error: 'No permission to modify this child account' });
  }

  const updates = [];
  const values = [];

  if (displayName) {
    updates.push('display_name = ?');
    values.push(displayName);
  }
  if (age) {
    updates.push('age = ?');
    values.push(age);
  }
  if (avatarUrl !== undefined) {
    updates.push('avatar_url = ?');
    values.push(avatarUrl);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  updates.push('updated_at = datetime("now")');
  values.push(childId);

  db.run(
    `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
    values,
    function (err) {
      if (err) {
        console.error('Failed to update child:', err);
        return res.status(500).json({ error: 'Failed to update child account' });
      }

      res.json({ success: true, message: 'Child account updated' });
    }
  );
});

// Delete child account
app.delete('/api/parent/children/:childId', authenticateToken, requireParentAccount, verifyParentChildAccess, (req, res) => {
  const childId = req.params.childId;
  const db = getDb();

  if (!req.relationship.can_delete_account) {
    return res.status(403).json({ error: 'No permission to delete this child account' });
  }

  db.run('DELETE FROM users WHERE id = ?', [childId], function (err) {
    if (err) {
      console.error('Failed to delete child:', err);
      return res.status(500).json({ error: 'Failed to delete child account' });
    }

    res.json({ success: true, message: 'Child account deleted' });
  });
});

// Get child progress
app.get('/api/parent/children/:childId/progress', authenticateToken, requireParentAccount, verifyParentChildAccess, (req, res) => {
  const childId = req.params.childId;
  const db = getDb();

  if (!req.relationship.can_view_progress) {
    return res.status(403).json({ error: 'No permission to view this child\'s progress' });
  }

  // Get user stats
  db.get(
    'SELECT xp, streak, last_active FROM users WHERE id = ?',
    [childId],
    (err, user) => {
      if (err || !user) {
        return res.status(404).json({ error: 'Child not found' });
      }

      // Get progress records
      db.all(
        'SELECT * FROM progress WHERE user_id = ? ORDER BY updated_at DESC',
        [childId],
        (err, progress) => {
          if (err) {
            return res.status(500).json({ error: 'Failed to load progress' });
          }

          // Get recent achievements
          db.all(
            `SELECT a.*, ua.unlocked_at 
             FROM achievements a
             INNER JOIN user_achievements ua ON a.id = ua.achievement_id
             WHERE ua.user_id = ?
             ORDER BY ua.unlocked_at DESC
             LIMIT 5`,
            [childId],
            (err, achievements) => {
              // Get session logs
              db.all(
                `SELECT login_time, logout_time, duration_minutes 
                 FROM session_logs 
                 WHERE user_id = ? 
                 ORDER BY login_time DESC 
                 LIMIT 30`,
                [childId],
                (err, sessions) => {
                  const completedLessons = progress.filter(p => p.completed).length;
                  const totalScore = progress.reduce((sum, p) => sum + (p.score || 0), 0);
                  const averageScore = completedLessons > 0 ? Math.round(totalScore / completedLessons) : 0;
                  const totalMinutes = sessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);

                  res.json({
                    progress: {
                      childId: parseInt(childId),
                      totalXP: user.xp,
                      currentLevel: Math.floor(user.xp / 200) + 1,
                      streak: user.streak,
                      completedLessons,
                      averageScore,
                      timeSpentMinutes: totalMinutes,
                      lastActive: user.last_active,
                      recentAchievements: achievements || [],
                      progressRecords: progress,
                      recentSessions: sessions || []
                    }
                  });
                }
              );
            }
          );
        }
      );
    }
  );
});

// Set/update restrictions for a child
app.post('/api/parent/children/:childId/restrictions', authenticateToken, requireParentAccount, verifyParentChildAccess, (req, res) => {
  const childId = req.params.childId;
  const parentId = req.user.id;
  const { maxDailyMinutes, allowedDays, contentFilters, requireParentApproval } = req.body;
  const db = getDb();

  if (!req.relationship.can_manage_restrictions) {
    return res.status(403).json({ error: 'No permission to manage restrictions for this child' });
  }

  db.run(
    `INSERT INTO account_restrictions 
     (child_id, max_daily_minutes, allowed_days, content_filters, require_parent_approval, created_by) 
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      childId,
      maxDailyMinutes || null,
      allowedDays ? JSON.stringify(allowedDays) : null,
      contentFilters ? JSON.stringify(contentFilters) : null,
      requireParentApproval ? 1 : 0,
      parentId
    ],
    function (err) {
      if (err) {
        console.error('Failed to set restrictions:', err);
        return res.status(500).json({ error: 'Failed to set restrictions' });
      }

      res.json({ success: true, message: 'Restrictions updated' });
    }
  );
});

// Get parent dashboard (aggregated data for all children)
app.get('/api/parent/dashboard', authenticateToken, requireParentAccount, (req, res) => {
  const parentId = req.user.id;
  const db = getDb();

  // Get all children with their stats
  db.all(
    `SELECT u.id, u.username, u.display_name as displayName, u.xp, u.streak, u.last_active as lastActive,
            (SELECT COUNT(*) FROM progress WHERE user_id = u.id AND completed = 1 AND CAST(lesson_id AS TEXT) NOT LIKE 'quiz%') as completedLessons,
            (SELECT AVG(score) FROM progress WHERE user_id = u.id AND completed = 1 AND CAST(lesson_id AS TEXT) NOT LIKE 'quiz%') as avgScore
     FROM users u
     INNER JOIN parent_child_relationships pcr ON u.id = pcr.child_id
     WHERE pcr.parent_id = ?`,
    [parentId],
    (err, children) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to load dashboard data' });
      }

      const totalFamilyXP = children.reduce((sum, child) => sum + (child.xp || 0), 0);
      const mostActiveChild = children.reduce((max, child) => 
        (child.xp > (max?.xp || 0)) ? child : max, null
      );

      res.json({
        dashboard: {
          parentId,
          children: children.map(c => ({
            id: c.id,
            username: c.username,
            displayName: c.displayName,
            xp: c.xp,
            streak: c.streak,
            lastActive: c.lastActive,
            completedLessons: c.completedLessons,
            avgScore: Math.round(c.avgScore || 0)
          })),
          totalFamilyXP,
          mostActiveChild: mostActiveChild ? mostActiveChild.id : null,
          childCount: children.length
        }
      });
    }
  );
});

// Switch to child account view (generates child token for parent)
app.post('/api/parent/switch-child/:childId', authenticateToken, requireParentAccount, verifyParentChildAccess, (req, res) => {
  const childId = req.params.childId;
  const db = getDb();

  db.get('SELECT * FROM users WHERE id = ?', [childId], (err, child) => {
    if (err || !child) {
      return res.status(404).json({ error: 'Child not found' });
    }

    // Generate a token for the child account
    const token = jwt.sign(
      {
        id: child.id,
        username: child.username,
        accountType: 'child',
        parentId: req.user.id,
        switchedByParent: true
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      child: {
        id: child.id,
        username: child.username,
        displayName: child.display_name,
        age: child.age,
        xp: child.xp,
        streak: child.streak,
        accountType: 'child'
      }
    });
  });
});

// =====================
// TEACHER ACCOUNT ENDPOINTS
// =====================

// Middleware to verify teacher-student relationship
function verifyTeacherStudentAccess(req, res, next) {
  const studentId = req.params.studentId || req.body.studentId;
  const teacherId = req.user.id;
  
  const db = getDb();
  db.get(
    'SELECT * FROM teacher_student_relationships WHERE teacher_id = ? AND student_id = ? AND status = ?',
    [teacherId, studentId, 'active'],
    (err, relationship) => {
      if (err || !relationship) {
        return res.status(403).json({ error: 'Access denied to this student account' });
      }
      req.relationship = relationship;
      next();
    }
  );
}

// Get all students for a teacher
app.get('/api/teacher/students', authenticateToken, requireTeacherAccount, (req, res) => {
  const teacherId = req.user.id;
  const db = getDb();

  db.all(
    `SELECT u.id, u.username, u.display_name as displayName, u.age, u.avatar_url as avatarUrl, 
            u.xp, u.streak, u.last_active as lastActive, u.created_at as createdAt,
            tsr.class_name as className, tsr.enrollment_date as enrollmentDate,
            (SELECT COUNT(*) FROM progress WHERE user_id = u.id AND completed = 1 AND CAST(lesson_id AS TEXT) NOT LIKE 'quiz%') as completedLessons
     FROM users u
     INNER JOIN teacher_student_relationships tsr ON u.id = tsr.student_id
     WHERE tsr.teacher_id = ? AND tsr.status = 'active'
     ORDER BY tsr.enrollment_date DESC`,
    [teacherId],
    (err, students) => {
      if (err) {
        console.error('Failed to fetch students:', err);
        return res.status(500).json({ error: 'Failed to load students' });
      }

      res.json({ children: students }); // Using 'children' key for compatibility with frontend
    }
  );
});

// Get specific student details
app.get('/api/teacher/students/:studentId', authenticateToken, requireTeacherAccount, verifyTeacherStudentAccess, (req, res) => {
  const studentId = req.params.studentId;
  const db = getDb();

  db.get(
    `SELECT u.*, 
            (SELECT COUNT(*) FROM progress WHERE user_id = u.id AND completed = 1 AND CAST(lesson_id AS TEXT) NOT LIKE 'quiz%') as completedLessons,
            (SELECT COUNT(*) FROM lessons) as totalLessons
     FROM users u
     WHERE u.id = ?`,
    [studentId],
    (err, student) => {
      if (err || !student) {
        return res.status(404).json({ error: 'Student not found' });
      }

      res.json({
        child: {
          id: student.id,
          username: student.username,
          displayName: student.display_name,
          age: student.age,
          avatarUrl: student.avatar_url,
          xp: student.xp,
          streak: student.streak,
          lastActive: student.last_active,
          completedLessons: student.completedLessons,
          totalLessons: student.totalLessons
        }
      });
    }
  );
});

// Get student progress
app.get('/api/teacher/students/:studentId/progress', authenticateToken, requireTeacherAccount, verifyTeacherStudentAccess, (req, res) => {
  const studentId = req.params.studentId;
  const db = getDb();

  // Get user stats
  db.get(
    'SELECT xp, streak, last_active FROM users WHERE id = ?',
    [studentId],
    (err, user) => {
      if (err || !user) {
        return res.status(404).json({ error: 'Student not found' });
      }

      // Get progress records
      db.all(
        'SELECT * FROM progress WHERE user_id = ? ORDER BY updated_at DESC',
        [studentId],
        (err, progress) => {
          if (err) {
            return res.status(500).json({ error: 'Failed to load progress' });
          }

          // Get recent achievements
          db.all(
            `SELECT a.*, ua.unlocked_at 
             FROM achievements a
             INNER JOIN user_achievements ua ON a.id = ua.achievement_id
             WHERE ua.user_id = ?
             ORDER BY ua.unlocked_at DESC
             LIMIT 5`,
            [studentId],
            (err, achievements) => {
              // Get session logs
              db.all(
                `SELECT login_time, logout_time, duration_minutes 
                 FROM session_logs 
                 WHERE user_id = ? 
                 ORDER BY login_time DESC 
                 LIMIT 30`,
                [studentId],
                (err, sessions) => {
                  const completedLessons = progress.filter(p => p.completed).length;
                  const totalScore = progress.reduce((sum, p) => sum + (p.score || 0), 0);
                  const averageScore = completedLessons > 0 ? Math.round(totalScore / completedLessons) : 0;
                  const totalMinutes = sessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);

                  res.json({
                    progress: {
                      childId: parseInt(studentId),
                      totalXP: user.xp,
                      currentLevel: Math.floor(user.xp / 200) + 1,
                      streak: user.streak,
                      completedLessons,
                      averageScore,
                      timeSpentMinutes: totalMinutes,
                      lastActive: user.last_active,
                      recentAchievements: achievements || [],
                      progressRecords: progress,
                      recentSessions: sessions || []
                    }
                  });
                }
              );
            }
          );
        }
      );
    }
  );
});

// Get teacher dashboard (aggregated data for all students)
app.get('/api/teacher/dashboard', authenticateToken, requireTeacherAccount, (req, res) => {
  const teacherId = req.user.id;
  const db = getDb();

  // Get all students with their stats
  db.all(
    `SELECT u.id, u.username, u.display_name as displayName, u.xp, u.streak, u.last_active as lastActive,
            (SELECT COUNT(*) FROM progress WHERE user_id = u.id AND completed = 1 AND CAST(lesson_id AS TEXT) NOT LIKE 'quiz%') as completedLessons,
            (SELECT AVG(score) FROM progress WHERE user_id = u.id AND completed = 1 AND CAST(lesson_id AS TEXT) NOT LIKE 'quiz%') as avgScore
     FROM users u
     INNER JOIN teacher_student_relationships tsr ON u.id = tsr.student_id
     WHERE tsr.teacher_id = ? AND tsr.status = 'active'`,
    [teacherId],
    (err, students) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to load dashboard data' });
      }

      const totalClassXP = students.reduce((sum, student) => sum + (student.xp || 0), 0);
      const mostActiveStudent = students.reduce((max, student) => 
        (student.xp > (max?.xp || 0)) ? student : max, null
      );

      res.json({
        dashboard: {
          teacherId,
          children: students.map(s => ({
            id: s.id,
            username: s.username,
            displayName: s.displayName,
            xp: s.xp,
            streak: s.streak,
            lastActive: s.lastActive,
            completedLessons: s.completedLessons,
            avgScore: Math.round(s.avgScore || 0)
          })),
          totalFamilyXP: totalClassXP,
          mostActiveChild: mostActiveStudent ? mostActiveStudent.id : null,
          childCount: students.length
        }
      });
    }
  );
});

// Add student to teacher's class (enrollment)
app.post('/api/teacher/students/enroll', authRateLimit, authenticateToken, requireTeacherAccount, (req, res) => {
  const { studentEmail, className, enrollmentCode } = req.body;
  const teacherId = req.user.id;
  const db = getDb();

  if (!studentEmail) {
    return res.status(400).json({ error: 'Student email is required' });
  }

  // Find student by email
  db.get(
    'SELECT id, username, display_name, account_type FROM users WHERE email = ? AND account_type = ?',
    [studentEmail, 'child'],
    (err, student) => {
      if (err || !student) {
        return res.status(404).json({ error: 'Student not found with that email' });
      }

      // Require a parent-provided consent code. Never allow enrollment by email alone.
      const expectedCode = crypto.createHmac('sha256', JWT_SECRET).update(`enroll:${student.id}`).digest('hex').slice(0, 12);
      if (!enrollmentCode || enrollmentCode !== expectedCode) {
        return res.status(403).json({ error: 'A parent-provided enrollment code is required to enrol this child' });
      }

      // Check if relationship already exists
      db.get(
        'SELECT id FROM teacher_student_relationships WHERE teacher_id = ? AND student_id = ?',
        [teacherId, student.id],
        (err, existing) => {
          if (existing) {
            return res.status(400).json({ error: 'Student already enrolled in your class' });
          }

          // Create relationship
          db.run(
            `INSERT INTO teacher_student_relationships (teacher_id, student_id, class_name, status) 
             VALUES (?, ?, ?, 'active')`,
            [teacherId, student.id, className || 'Default Class'],
            function (err) {
              if (err) {
                console.error('Failed to enroll student:', err);
                return res.status(500).json({ error: 'Failed to enroll student' });
              }

              res.json({
                success: true,
                message: 'Student enrolled successfully',
                student: {
                  id: student.id,
                  username: student.username,
                  displayName: student.display_name
                }
              });
            }
          );
        }
      );
    }
  );
});

// Remove student from teacher's class
app.delete('/api/teacher/students/:studentId', authenticateToken, requireTeacherAccount, verifyTeacherStudentAccess, (req, res) => {
  const studentId = req.params.studentId;
  const teacherId = req.user.id;
  const db = getDb();

  db.run(
    'UPDATE teacher_student_relationships SET status = ? WHERE teacher_id = ? AND student_id = ?',
    ['inactive', teacherId, studentId],
    function (err) {
      if (err) {
        console.error('Failed to remove student:', err);
        return res.status(500).json({ error: 'Failed to remove student' });
      }

      res.json({ success: true, message: 'Student removed from class' });
    }
  );
});

// =====================
// ADULT LEARNERS - Professional Web Development course (see adult.js and adultCourse/)
// =====================
app.use('/api/adult', createAdultRouter({ authenticateToken, jwt, JWT_SECRET, bcrypt }));
app.use('/api/certificates', createCertificateVerifyRouter());

// =====================
// CURRICULUM ENDPOINTS
// =====================

app.get('/api/curriculum', (req, res) => {
  const db = getDb();

  // Children only see children's modules; adult modules live under /api/adult/curriculum.
  // (Databases created before the adult pathway have no target_audience column: show everything.)
  const loadModules = (cb) => db.all(
    "SELECT * FROM modules WHERE target_audience IS NULL OR target_audience IN ('children', 'both') ORDER BY order_num",
    (err, rows) => (err && /no such column/i.test(err.message) ? db.all('SELECT * FROM modules ORDER BY order_num', cb) : cb(err, rows)),
  );

  loadModules((err, modules) => {
    if (err) return res.status(500).json({ error: 'Failed to load curriculum' });

    db.all('SELECT * FROM lessons ORDER BY module_id, order_num', (err, lessons) => {
      if (err) return res.status(500).json({ error: 'Failed to load lessons' });

      const curriculum = modules.map(module => ({
        ...module,
        lessons: lessons.filter(l => l.module_id === module.id)
      }));

      res.json({ curriculum });
    });
  });
});

app.get('/api/lesson/:id', (req, res) => {
  const db = getDb();
  db.get('SELECT * FROM lessons WHERE id = ?', [req.params.id], (err, lesson) => {
    if (err || !lesson) return res.status(404).json({ error: 'Lesson not found' });
    res.json({ lesson });
  });
});

// Check if a lesson is unlocked for the user
app.get('/api/lesson/:lessonId/unlocked', authenticateToken, (req, res) => {
  const db = getDb();
  const lessonId = parseInt(req.params.lessonId);
  const userId = req.user.id;
  
  // Get the lesson and its module
  db.get('SELECT * FROM lessons WHERE id = ?', [lessonId], (err, lesson) => {
    if (err || !lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }
    
    const moduleId = lesson.module_id;
    const lessonOrder = lesson.order_num;
    
    // Get all lessons in this module ordered by order_num
    db.all(
      'SELECT id, order_num FROM lessons WHERE module_id = ? ORDER BY order_num',
      [moduleId],
      (err, allLessons) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to check lesson status' });
        }
        
        // Find the current lesson's position
        const currentIndex = allLessons.findIndex(l => l.id === lessonId);
        
        // First lesson of a module: verify the previous MODULE was completed.
        // Resolve by order_num because module ids are not contiguous.
        if (currentIndex === 0) {
          db.get('SELECT order_num FROM modules WHERE id = ?', [moduleId], (err, moduleRow) => {
            if (err || !moduleRow) return res.json({ unlocked: true, reason: 'first_lesson' });
            db.get('SELECT id FROM modules WHERE order_num < ? ORDER BY order_num DESC LIMIT 1', [moduleRow.order_num], (err, prevModule) => {
              if (err || !prevModule) return res.json({ unlocked: true, reason: 'first_lesson' });
              db.get(
                'SELECT 1 FROM module_completions WHERE user_id = ? AND module_id = ? AND all_lessons_completed = 1 AND quiz_passed = 1',
                [userId, prevModule.id],
                (err, completion) => {
                  if (!completion) {
                    return res.json({ unlocked: false, reason: 'previous_module_incomplete', previousModuleId: prevModule.id });
                  }
                  return res.json({ unlocked: true, reason: 'progression_met' });
                }
              );
            });
          });
          return;
        }
        
        // Check if previous lesson is completed
        const previousLesson = allLessons[currentIndex - 1];
        db.get(
          'SELECT completed FROM progress WHERE user_id = ? AND lesson_id = ?',
          [userId, previousLesson.id],
          (err, progress) => {
            const previousCompleted = progress && progress.completed === 1;
            
            if (!previousCompleted) {
              return res.json({ 
                unlocked: false, 
                reason: 'previous_lesson_incomplete',
                previousLessonId: previousLesson.id
              });
            }
            
            return res.json({ unlocked: true, reason: 'progression_met' });
          }
        );
      }
    );
  });
});

// =====================
// PROGRESS ENDPOINTS
// =====================

app.get('/api/progress', authenticateToken, (req, res) => {
  const db = getDb();
  db.all('SELECT * FROM progress WHERE user_id = ?', [req.user.id], (err, progress) => {
    if (err) return res.status(500).json({ error: 'Failed to load progress' });

    db.get('SELECT xp, streak, username FROM users WHERE id = ?', [req.user.id], async (err, user) => {
      if (err || !user) return res.status(500).json({ error: 'Failed to load user data' });
      const streak = await achievements.currentStreak(req.user.id).catch(() => user.streak || 0);
      res.json({ progress, xp: user.xp, streak, username: user.username });
    });
  });
});

// =====================
// LESSON CHALLENGES (learners must reach 50% before completing a lesson)
// =====================
const getLesson = (id) => new Promise((resolve, reject) => {
  getDb().get('SELECT * FROM lessons WHERE id = ?', [id], (err, row) => (err ? reject(err) : resolve(row)));
});
const challengeLocale = (v) => (v === 'sw' ? 'sw' : 'en');

// The checklist for a lesson challenge, so learners know what to aim for.
app.get('/api/lessons/:id/challenge', authenticateToken, async (req, res) => {
  try {
    const lesson = await getLesson(Number(req.params.id));
    if (!lesson) return res.status(404).json({ error: 'Lesson not found' });
    const best = await new Promise((resolve) => getDb().get(
      'SELECT score, completed FROM progress WHERE user_id = ? AND lesson_id = ?', [req.user.id, lesson.id],
      (err, row) => resolve(err ? null : row),
    ));
    res.json({ ...lessonChallenges.describeChallenge(lesson, challengeLocale(req.query.locale)), bestScore: best ? best.score || 0 : 0, completed: Boolean(best && best.completed) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load the challenge' });
  }
});

// Score the learner's code against the challenge checklist and remember their best score.
app.post('/api/lessons/:id/check', authenticateToken, async (req, res) => {
  try {
    const lesson = await getLesson(Number(req.params.id));
    if (!lesson) return res.status(404).json({ error: 'Lesson not found' });
    const code = typeof req.body.code === 'string' ? req.body.code : '';
    const result = await lessonChallenges.gradeChallenge(lesson, code, challengeLocale(req.body.locale));
    achievements.noteCoding(req.user.id, { code: result.kind === 'js' ? code : '' });
    getDb().run(
      `INSERT INTO progress (user_id, module_id, lesson_id, completed, last_code, score, updated_at)
       VALUES (?, ?, ?, 0, ?, ?, datetime('now'))
       ON CONFLICT(user_id, lesson_id) DO UPDATE SET last_code = excluded.last_code,
         score = MAX(score, excluded.score), updated_at = excluded.updated_at`,
      [req.user.id, lesson.module_id, lesson.id, code, result.score],
    );
    res.json(result);
  } catch (err) {
    console.error('Challenge check failed:', err);
    res.status(500).json({ error: 'Failed to check your code' });
  }
});

app.post('/api/progress', authenticateToken, (req, res) => {
  const { module_id, lesson_id, completed, last_code, learningMetrics } = req.body; // any "score" sent by the browser is ignored
  const db = getDb();

  // Adult lessons are finished through /api/adult/lesson/:id/complete, which checks the practical and written tests.
  if (req.user.accountType === 'adult_learner') {
    return res.status(403).json({ error: 'Adult lessons are saved through the adult course pages.' });
  }

  if (!Number.isInteger(Number(lesson_id)) || !Number.isInteger(Number(module_id))) {
    return res.status(400).json({ error: 'module_id and lesson_id are required' });
  }

  // Look up the previous state first so XP is only awarded the FIRST time a
  // lesson is completed (previously, clicking "complete" again re-awarded XP),
  // and so a later "run" does not un-complete a finished lesson.
  db.get('SELECT completed FROM progress WHERE user_id = ? AND lesson_id = ?', [req.user.id, lesson_id], async (lookupErr, existing) => {
    if (lookupErr) return res.status(500).json({ error: 'Failed to save progress' });
    const wasCompleted = Boolean(existing && existing.completed === 1);
    const nowCompleted = wasCompleted || Boolean(completed);

    // A lesson can only be completed once the challenge reaches the pass mark.
    // The server grades the code itself - the score sent by the browser is not trusted.
    let earnedScore = 0;
    if (completed && !wasCompleted) {
      try {
        const lesson = await getLesson(Number(lesson_id));
        if (!lesson) return res.status(404).json({ error: 'Lesson not found' });
        const graded = await lessonChallenges.gradeChallenge(lesson, typeof last_code === 'string' ? last_code : '', challengeLocale(req.body.locale));
        if (!graded.passed) {
          return res.status(400).json({ error: 'challenge_not_passed', score: graded.score, passMark: graded.passMark, checks: graded.checks });
        }
        earnedScore = graded.score;
      } catch (gradeErr) {
        console.error('Challenge grading failed:', gradeErr);
        return res.status(500).json({ error: 'Failed to check your code' });
      }
    }

    db.run(
      `INSERT INTO progress (user_id, module_id, lesson_id, completed, last_code, score, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(user_id, lesson_id) DO UPDATE SET
         completed = excluded.completed,
         last_code = excluded.last_code,
         score = MAX(score, excluded.score),
         updated_at = excluded.updated_at`,
      [req.user.id, module_id, lesson_id, nowCompleted ? 1 : 0, last_code, earnedScore],
      function (err) {
        if (err) return res.status(500).json({ error: 'Failed to save progress' });

        if (!completed) return res.json({ success: true });

        // Feed the adaptive AI learner model (Bloom "Apply" evidence).
        aiEngine.recordLessonCompletion(req.user.id, Number(lesson_id), learningMetrics || {}).catch((e) =>
          console.error('AI learner model update failed:', e.message));

        if (wasCompleted) {
          return res.json({ success: true, xpEarned: 0, alreadyCompleted: true });
        }

        const xpGain = learningMetrics
          ? calculateLearningBasedXP(learningMetrics, earnedScore)
          : Math.floor(earnedScore * 1.5);
        if (learningMetrics) saveLearningMetrics(req.user.id, lesson_id, learningMetrics, xpGain, db);

        db.run('UPDATE users SET xp = xp + ? WHERE id = ?', [xpGain, req.user.id]);
        checkAndAwardAchievements(req.user.id, db);
        return res.json({ success: true, xpEarned: xpGain });
      }
    );
  });
});

// =====================
// QUIZ ENDPOINTS
// =====================

// Submit quiz results
app.post('/api/quiz/submit', authenticateToken, (req, res) => {
  const { moduleId, score, totalQuestions, percentage, timeTaken, answersData } = req.body;
  const db = getDb();
  const userId = req.user.id;
  
  // VALIDATION: Check if all lessons are completed before allowing quiz submission
  db.get(
    `SELECT COUNT(*) as total FROM lessons WHERE module_id = ?`,
    [moduleId],
    (err, totalResult) => {
      if (err) return res.status(500).json({ error: 'Failed to validate quiz eligibility' });
      
      db.get(
        `SELECT COUNT(*) as completed FROM progress 
         WHERE user_id = ? AND module_id = ? AND completed = 1 AND CAST(lesson_id AS TEXT) NOT LIKE 'quiz%'`,
        [userId, moduleId],
        (err, completedResult) => {
          if (err) return res.status(500).json({ error: 'Failed to validate quiz eligibility' });
          
          const totalLessons = totalResult.total;
          const completedLessons = completedResult.completed;
          
          // Reject if not all lessons are completed
          if (completedLessons < totalLessons) {
            return res.status(403).json({ 
              error: 'You must complete all lessons before taking the quiz',
              completedLessons,
              totalLessons
            });
          }
          
          // Clamp client-supplied values. The browser is untrusted input.
          const num = (v, min, max, fallback) => {
            const n = Number(v);
            return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
          };
          const safePercentage = num(percentage, 0, 100, 0);
          const safeScore = num(score, 0, 100000, 0);
          const safeTotal = num(totalQuestions, 1, 100000, 1);
          const safeTime = num(timeTaken, 0, 86400, 0);
          const passed = safePercentage >= 70;

          // Calculate XP based on quiz performance
          let xpEarned = 0;
          if (passed) {
            xpEarned = 50;
            if (safePercentage >= 90) xpEarned += 30;
            else if (safePercentage >= 80) xpEarned += 20;
            else if (safePercentage >= 70) xpEarned += 10;
            if (safeTime > 0 && safeTime < 180) xpEarned += 10;

            db.get(
              'SELECT COUNT(*) as attempts, SUM(CASE WHEN passed = 1 THEN 1 ELSE 0 END) as passes FROM quiz_results WHERE user_id = ? AND module_id = ?',
              [userId, moduleId],
              (err, result) => {
                const attemptNumber = (result?.attempts || 0) + 1;
                const alreadyPassed = (result?.passes || 0) > 0;
                if (attemptNumber === 1) xpEarned += 20; // First try bonus
                // XP is awarded only once per module; no repeat farming.
                const award = alreadyPassed ? 0 : xpEarned;

                // Save quiz result
                db.run(
                  `INSERT INTO quiz_results 
                   (user_id, module_id, score, total_questions, percentage, passed, time_taken_seconds, answers_data, xp_earned, attempt_number)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                  [userId, moduleId, safeScore, safeTotal, safePercentage, passed ? 1 : 0, safeTime, JSON.stringify(answersData), award, attemptNumber],
                  function(err) {
                    if (err) {
                      console.error('Failed to save quiz result:', err);
                      return res.status(500).json({ error: 'Failed to save quiz result' });
                    }
                    
                    if (passed && award > 0) {
                      db.run('UPDATE users SET xp = xp + ? WHERE id = ?', [award, userId]);
                      
                      // Update module completion
                      updateModuleCompletion(userId, moduleId, db);
                      
                      // Check for achievements
                      checkAndAwardAchievements(userId, db);
                      
                      // Update leaderboard cache
                      updateLeaderboardCache(userId, db);
                    }
                    
                    res.json({
                      success: true,
                      passed,
                      xpEarned: passed ? award : 0,
                      attemptNumber
                    });
                  }
                );
              }
            );
          } else {
            // Failed quiz - no XP but save attempt
            db.get(
              'SELECT COUNT(*) as attempts FROM quiz_results WHERE user_id = ? AND module_id = ?',
              [userId, moduleId],
              (err, result) => {
                const attemptNumber = (result?.attempts || 0) + 1;
                
                db.run(
                  `INSERT INTO quiz_results 
                   (user_id, module_id, score, total_questions, percentage, passed, time_taken_seconds, answers_data, xp_earned, attempt_number)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                  [userId, moduleId, safeScore, safeTotal, safePercentage, 0, safeTime, JSON.stringify(answersData), 0, attemptNumber],
                  function(err) {
                    if (err) {
                      console.error('Failed to save quiz result:', err);
                      return res.status(500).json({ error: 'Failed to save quiz result' });
                    }
                    
                    res.json({ 
                      success: true, 
                      passed: false, 
                      xpEarned: 0,
                      attemptNumber 
                    });
                  }
                );
              }
            );
          }
        }
      );
    }
  );
});

// Get quiz history for a module
app.get('/api/quiz/history/:moduleId', authenticateToken, (req, res) => {
  const db = getDb();
  const { moduleId } = req.params;
  
  db.all(
    `SELECT * FROM quiz_results 
     WHERE user_id = ? AND module_id = ? 
     ORDER BY completed_at DESC`,
    [req.user.id, moduleId],
    (err, results) => {
      if (err) return res.status(500).json({ error: 'Failed to load quiz history' });
      res.json({ results });
    }
  );
});

// Get module completion status
app.get('/api/module/completion/:moduleId', authenticateToken, (req, res) => {
  const db = getDb();
  const { moduleId } = req.params;
  const userId = req.user.id;
  
  // Check lessons completion
  db.get(
    `SELECT COUNT(*) as total FROM lessons WHERE module_id = ?`,
    [moduleId],
    (err, totalResult) => {
      if (err) {
        console.error('Error counting total lessons:', err);
        return res.status(500).json({ error: 'Failed to check completion' });
      }
      
      const totalLessons = totalResult.total;
      
      // Get all lesson IDs for this module
      db.all(
        `SELECT id FROM lessons WHERE module_id = ? ORDER BY order_num`,
        [moduleId],
        (err, lessonRows) => {
          if (err) {
            console.error('Error fetching lesson IDs:', err);
            return res.status(500).json({ error: 'Failed to check completion' });
          }
          
          const lessonIds = lessonRows.map(row => row.id);
          
          // Count completed lessons by checking each lesson ID
          if (lessonIds.length === 0) {
            // No lessons in this module
            return res.json({
              moduleId: parseInt(moduleId),
              totalLessons: 0,
              completedLessons: 0,
              allLessonsCompleted: false,
              quizPassed: false,
              quizScore: 0,
              moduleCompleted: false,
              completedAt: null
            });
          }
          
          const placeholders = lessonIds.map(() => '?').join(',');
          db.get(
            `SELECT COUNT(*) as completed FROM progress 
             WHERE user_id = ? AND lesson_id IN (${placeholders}) AND completed = 1`,
            [userId, ...lessonIds],
            (err, completedResult) => {
              if (err) {
                console.error('Error counting completed lessons:', err);
                return res.status(500).json({ error: 'Failed to check completion' });
              }
              
              const completedLessons = completedResult.completed;
              const allLessonsCompleted = completedLessons >= totalLessons && totalLessons > 0;
              
              // Check quiz status
              db.get(
                `SELECT * FROM quiz_results 
                 WHERE user_id = ? AND module_id = ? AND passed = 1 
                 ORDER BY completed_at DESC LIMIT 1`,
                [userId, moduleId],
                (err, quizResult) => {
                  const quizPassed = !!quizResult;
                  
                  // Get module completion record
                  db.get(
                    `SELECT * FROM module_completions WHERE user_id = ? AND module_id = ?`,
                    [userId, moduleId],
                    (err, completion) => {
                      res.json({
                        moduleId: parseInt(moduleId),
                        totalLessons,
                        completedLessons,
                        allLessonsCompleted,
                        quizPassed,
                        quizScore: quizResult?.percentage || 0,
                        moduleCompleted: allLessonsCompleted && quizPassed,
                        completedAt: completion?.completed_at || null,
                        lessonIds: lessonIds // Include for debugging
                      });
                    }
                  );
                }
              );
            }
          );
        }
      );
    }
  );
});

// Helper function to update module completion
function updateModuleCompletion(userId, moduleId, db) {
  // Check if all lessons are completed
  db.get(
    `SELECT COUNT(*) as total FROM lessons WHERE module_id = ?`,
    [moduleId],
    (err, totalResult) => {
      if (err) return;
      
      db.get(
        `SELECT COUNT(*) as completed FROM progress 
         WHERE user_id = ? AND module_id = ? AND completed = 1 AND CAST(lesson_id AS TEXT) NOT LIKE 'quiz%'`,
        [userId, moduleId],
        (err, completedResult) => {
          if (err) return;
          
          const allLessonsCompleted = completedResult.completed >= totalResult.total;
          
          // Check if quiz is passed
          db.get(
            `SELECT percentage FROM quiz_results 
             WHERE user_id = ? AND module_id = ? AND passed = 1 
             ORDER BY completed_at DESC LIMIT 1`,
            [userId, moduleId],
            (err, quizResult) => {
              const quizPassed = !!quizResult;
              const quizScore = quizResult?.percentage || 0;
              
              if (allLessonsCompleted && quizPassed) {
                // Module is complete!
                db.run(
                  `INSERT INTO module_completions 
                   (user_id, module_id, all_lessons_completed, quiz_passed, quiz_score, completed_at)
                   VALUES (?, ?, 1, 1, ?, datetime('now'))
                   ON CONFLICT(user_id, module_id) DO UPDATE SET
                     all_lessons_completed = 1,
                     quiz_passed = 1,
                     quiz_score = excluded.quiz_score,
                     completed_at = datetime('now')`,
                  [userId, moduleId, quizScore]
                );
                
                // Award module completion achievement
                awardAchievement(userId, 5, db); // Module Champion achievement
              }
            }
          );
        }
      );
    }
  );
}

// Helper function to update leaderboard cache
function updateLeaderboardCache(userId, db) {
  db.get(
    `SELECT u.*, 
            (SELECT COUNT(*) FROM progress WHERE user_id = u.id AND completed = 1 AND CAST(lesson_id AS TEXT) NOT LIKE 'quiz%') as lessons_completed,
            (SELECT COUNT(*) FROM user_achievements WHERE user_id = u.id) as achievements_count
     FROM users u WHERE u.id = ?`,
    [userId],
    (err, user) => {
      if (err || !user) return;
      
      db.run(
        `INSERT INTO leaderboard_cache 
         (user_id, username, display_name, avatar_url, total_xp, lessons_completed, achievements_count, current_streak, last_updated)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
         ON CONFLICT(user_id) DO UPDATE SET
           total_xp = excluded.total_xp,
           lessons_completed = excluded.lessons_completed,
           achievements_count = excluded.achievements_count,
           current_streak = excluded.current_streak,
           last_updated = datetime('now')`,
        [userId, user.username, user.display_name, user.avatar_url, user.xp, user.lessons_completed, user.achievements_count, user.streak]
      );
    }
  );
}

// Advanced XP calculation based on learning behavior
function calculateLearningBasedXP(metrics, baseScore = 100) {
  let xp = 0;
  
  // 1. Base XP (30% of total) - for completing the lesson
  const baseXP = 30;
  xp += baseXP;
  
  // 2. Engagement Score (25% of total) - time spent learning
  // Optimal time: 5-15 minutes per lesson
  const timeMinutes = (metrics.timeSpentSeconds || 0) / 60;
  let engagementXP = 0;
  if (timeMinutes >= 5 && timeMinutes <= 15) {
    engagementXP = 25; // Perfect engagement
  } else if (timeMinutes >= 3 && timeMinutes < 5) {
    engagementXP = 15; // Quick but learned
  } else if (timeMinutes > 15 && timeMinutes <= 30) {
    engagementXP = 20; // Took time to understand
  } else if (timeMinutes > 30) {
    engagementXP = 10; // Struggled but persisted
  } else {
    engagementXP = 5; // Too quick, might not have learned
  }
  xp += engagementXP;
  
  // 3. Independence Score (20% of total) - learning without help
  let independenceXP = 20;
  const hintsUsed = metrics.hintsUsed || 0;
  const exampleLoads = metrics.exampleLoads || 0;
  
  // Deduct for excessive help
  if (hintsUsed > 0) independenceXP -= Math.min(hintsUsed * 3, 10);
  if (exampleLoads > 1) independenceXP -= Math.min((exampleLoads - 1) * 2, 5);
  independenceXP = Math.max(independenceXP, 5); // Minimum 5 XP
  xp += independenceXP;
  
  // 4. Effort Score (15% of total) - trying and iterating
  const attempts = metrics.codeAttempts || 0;
  const runCount = metrics.runCount || 0;
  let effortXP = 0;
  
  if (attempts >= 3 && attempts <= 10) {
    effortXP = 15; // Good iteration
  } else if (attempts > 10 && attempts <= 20) {
    effortXP = 12; // Lots of trying - persistence!
  } else if (attempts > 20) {
    effortXP = 8; // Struggled but didn't give up
  } else if (attempts === 1) {
    effortXP = 10; // Got it right first time!
  } else {
    effortXP = 5;
  }
  xp += effortXP;
  
  // 5. Success Rate (10% of total) - learning from mistakes
  const successCount = metrics.successCount || 0;
  const errorCount = metrics.errorCount || 0;
  const totalRuns = successCount + errorCount;
  let successXP = 0;
  
  if (totalRuns > 0) {
    const successRate = successCount / totalRuns;
    if (successRate >= 0.8) {
      successXP = 10; // High success rate
    } else if (successRate >= 0.5) {
      successXP = 8; // Learning from errors
    } else {
      successXP = 5; // Struggled but completed
    }
  } else {
    successXP = 5;
  }
  xp += successXP;
  
  // 6. Bonus XP for exceptional performance
  let bonusXP = 0;
  
  // Perfect run bonus (completed with minimal help, good time, high success rate)
  if (hintsUsed === 0 && exampleLoads === 0 && timeMinutes >= 5 && timeMinutes <= 15) {
    bonusXP += 15; // Perfect learning!
  }
  
  // Persistence bonus (many attempts but completed)
  if (attempts > 15 && successCount > 0) {
    bonusXP += 10; // Never gave up!
  }
  
  // Quick learner bonus (completed quickly with high success)
  if (timeMinutes < 5 && (successCount / Math.max(totalRuns, 1)) > 0.8) {
    bonusXP += 10; // Fast and accurate!
  }
  
  xp += bonusXP;
  
  // Total XP calculation
  const totalXP = Math.round(xp);
  
  return Math.max(totalXP, 20); // Minimum 20 XP for completion
}

// Save learning metrics to database
function saveLearningMetrics(userId, lessonId, metrics, xpEarned, db) {
  const timeMinutes = (metrics.timeSpentSeconds || 0) / 60;
  const independenceScore = 100 - (Math.min((metrics.hintsUsed || 0) * 10, 50)) - (Math.min((metrics.exampleLoads || 0) * 5, 30));
  const engagementScore = timeMinutes >= 5 && timeMinutes <= 15 ? 100 : Math.min(Math.round((timeMinutes / 15) * 100), 100);
  
  db.run(
    `INSERT INTO learning_metrics (
      user_id, lesson_id, time_spent_seconds, code_attempts, hints_used, 
      example_loads, run_count, error_count, success_count, 
      challenge_met, independence_score, engagement_score, final_xp_earned, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(user_id, lesson_id) DO UPDATE SET
      time_spent_seconds = excluded.time_spent_seconds,
      code_attempts = excluded.code_attempts,
      hints_used = excluded.hints_used,
      example_loads = excluded.example_loads,
      run_count = excluded.run_count,
      error_count = excluded.error_count,
      success_count = excluded.success_count,
      challenge_met = excluded.challenge_met,
      independence_score = excluded.independence_score,
      engagement_score = excluded.engagement_score,
      final_xp_earned = excluded.final_xp_earned,
      updated_at = excluded.updated_at`,
    [
      userId, lessonId, metrics.timeSpentSeconds || 0, metrics.codeAttempts || 0,
      metrics.hintsUsed || 0, metrics.exampleLoads || 0, metrics.runCount || 0,
      metrics.errorCount || 0, metrics.successCount || 0, metrics.challengeMet ? 1 : 0,
      Math.max(independenceScore, 0), engagementScore, xpEarned
    ]
  );
}

function checkAndAwardAchievements(userId) {
  achievements.noteCoding(userId);
}

function awardAchievement(userId, achievementId, db) {
  db.get('SELECT xp_reward FROM achievements WHERE id = ?', [achievementId], (err, ach) => {
    if (err || !ach) return;

    db.run(
      'INSERT OR IGNORE INTO user_achievements (user_id, achievement_id) VALUES (?, ?)',
      [userId, achievementId],
      function (err) {
        if (!err && this.changes > 0) {
          db.run('UPDATE users SET xp = xp + ? WHERE id = ?', [ach.xp_reward, userId]);
        }
      }
    );
  });
}

// =====================
// ACHIEVEMENTS ENDPOINTS
// =====================

app.get('/api/achievements', authenticateToken, async (req, res) => {
  const db = getDb();
  const progress = await achievements.evaluateAchievements(req.user.id).catch(() => ({}));

  db.all('SELECT * FROM achievements', (err, achievements) => {
    if (err) return res.status(500).json({ error: 'Failed to load achievements' });

    db.all('SELECT achievement_id, unlocked_at FROM user_achievements WHERE user_id = ?', [req.user.id], (err, unlocked) => {
      if (err) return res.status(500).json({ error: 'Failed to load achievement data' });

      const unlockedIds = new Set(unlocked.map(u => u.achievement_id));
      const achievementsWithStatus = achievements.map(a => ({
        ...a,
        unlocked: unlockedIds.has(a.id),
        unlocked_at: unlocked.find(u => u.achievement_id === a.id)?.unlocked_at || null,
        progress: progress[a.id] || null,
      }));

      res.json({ achievements: achievementsWithStatus });
    });
  });
});

// =====================
// CODE HISTORY ENDPOINTS
// =====================

app.post('/api/code-history', authenticateToken, (req, res) => {
  const { title, code, blocks_xml, language, source, lesson_id } = req.body;
  const db = getDb();

  if (!code || code.trim().length === 0) {
    return res.status(400).json({ error: 'Code cannot be empty' });
  }

  db.run(
    `INSERT INTO code_history (user_id, title, code, blocks_xml, language, source, lesson_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    [req.user.id, title || 'Untitled', code, blocks_xml || null, language || 'javascript', source || 'playground', lesson_id || null],
    function (err) {
      if (err) {
        console.error('Failed to save code history:', err);
        return res.status(500).json({ error: 'Failed to save code' });
      }
      res.json({ success: true, id: this.lastID });
    }
  );
});

app.get('/api/code-history', authenticateToken, (req, res) => {
  const db = getDb();
  const limit = parseInt(req.query.limit) || 50;
  const offset = parseInt(req.query.offset) || 0;

  db.all(
    `SELECT id, title, code, blocks_xml, language, source, lesson_id, created_at 
     FROM code_history 
     WHERE user_id = ? 
     ORDER BY created_at DESC 
     LIMIT ? OFFSET ?`,
    [req.user.id, limit, offset],
    (err, history) => {
      if (err) return res.status(500).json({ error: 'Failed to load code history' });
      
      db.get(
        'SELECT COUNT(*) as total FROM code_history WHERE user_id = ?',
        [req.user.id],
        (err, count) => {
          if (err) return res.status(500).json({ error: 'Failed to count history' });
          res.json({ history, total: count.total });
        }
      );
    }
  );
});

app.get('/api/code-history/:id', authenticateToken, (req, res) => {
  const db = getDb();
  
  db.get(
    'SELECT * FROM code_history WHERE id = ? AND user_id = ?',
    [req.params.id, req.user.id],
    (err, code) => {
      if (err || !code) return res.status(404).json({ error: 'Code not found' });
      res.json({ code });
    }
  );
});

app.delete('/api/code-history/:id', authenticateToken, (req, res) => {
  const db = getDb();
  
  db.run(
    'DELETE FROM code_history WHERE id = ? AND user_id = ?',
    [req.params.id, req.user.id],
    function (err) {
      if (err) return res.status(500).json({ error: 'Failed to delete code' });
      if (this.changes === 0) return res.status(404).json({ error: 'Code not found' });
      res.json({ success: true });
    }
  );
});

// =====================
// CODE EXECUTION SANDBOX
// =====================

app.post('/api/run-code', runRateLimit, async (req, res) => {
  const { code } = req.body || {};

  if (typeof code !== 'string' || code.trim().length === 0) {
    return res.json({ output: 'No code to run! Write some code first. 💻', error: false, turtleCommands: [] });
  }

  if (code.length > 5000) {
    return res.json({
      output: '⚠️ Your code is too long! Try breaking it into smaller pieces. 📏',
      error: true,
      turtleCommands: [],
    });
  }

  try {
    // Runs in an isolated worker thread with no access to the server (see sandbox/).
    const result = await runJavaScript(code, { timeoutMs: 3000 });
    const runner = optionalUser(req);
    if (runner) achievements.noteCoding(runner.id, { code, turtleUsed: (result.turtleCommands || []).length > 0 });

    if (result.error) {
      const partial = result.output.length ? result.output.join('\n') + '\n\n' : '';
      return res.json({
        output: partial + getFriendlyError(`${result.error.name}: ${result.error.message}`),
        error: true,
        turtleCommands: result.turtleCommands || [],
      });
    }

    let outputText;
    if (result.output.length === 0 && result.turtleCommands.length === 0) {
      outputText = "🤔 Your code ran but didn't print anything!\nTry adding console.log(\"Hello!\") to see output.";
    } else {
      outputText = result.output.join('\n');
      if (result.truncated) outputText += '\n… (output cut short - that is a lot of printing!)';
      if (result.turtleCommands.length > 0) {
        outputText = (outputText ? outputText + '\n\n' : '') + `🐢 Turtle drew ${result.turtleCommands.length} commands!`;
      }
    }

    res.json({
      output: outputText || '✅ Code ran successfully!',
      turtleCommands: result.turtleCommands || [],
      error: false,
    });
  } catch (err) {
    console.error('run-code failed:', err);
    res.status(500).json({ output: '❌ Could not run your code right now. Please try again.', error: true, turtleCommands: [] });
  }
});

function getFriendlyError(errorMsg) {
  if (errorMsg.includes('is not defined')) {
    const varName = errorMsg.match(/([A-Za-z_$][\w$]*) is not defined/)?.[1] || 'something';
    return `🔍 Oops! I couldn't find "${varName}".\nMake sure you spelled it correctly and created it with "let"!\n\nExample: let ${varName} = 10;`;
  }
  if (errorMsg.includes('Unexpected token') || errorMsg.includes('missing )') || errorMsg.includes('Unexpected end of input')) {
    return `😕 There's a typo somewhere in your code!\nCheck for:\n- Missing quotes around text\n- Missing parentheses ()\n- Missing curly braces {}\n- Spelling mistakes`;
  }
  if (errorMsg.includes('SyntaxError')) {
    return `📝 Syntax Error! Your code has a writing mistake.\nLook for missing brackets, quotes, or semicolons!`;
  }
  if (errorMsg.includes('TypeError')) {
    return `🔧 Type Error! You're trying to do something that doesn't work with that type of data.\nMake sure numbers are numbers and text is in quotes!`;
  }
  if (errorMsg.includes('timed out')) {
    return `⏱️ Your code took too long! Maybe there's an infinite loop?\nCheck your loops have proper stopping conditions!`;
  }
  return `❌ Error: ${errorMsg}\n\n💡 Tip: Check your code carefully. Every symbol matters!`;
}

// =====================
// LESSON APPROVAL ENDPOINTS
// =====================

// Request lesson approval (child)
app.post('/api/lesson-approval/request', authenticateToken, (req, res) => {
  const { lessonId, moduleId } = req.body;
  const childId = req.user.id;
  const db = getDb();

  if (!lessonId || !moduleId) {
    return res.status(400).json({ error: 'Lesson ID and Module ID are required' });
  }

  // Get parent ID
  db.get('SELECT parent_id FROM users WHERE id = ?', [childId], (err, user) => {
    if (err || !user || !user.parent_id) {
      return res.status(400).json({ error: 'No parent account linked' });
    }

    const parentId = user.parent_id;

    // Check if approval already exists
    db.get(
      'SELECT * FROM lesson_approvals WHERE child_id = ? AND lesson_id = ?',
      [childId, lessonId],
      (err, existing) => {
        if (existing) {
          return res.json({
            success: true,
            approval: {
              id: existing.id,
              status: existing.status,
              requestedAt: existing.requested_at,
              respondedAt: existing.responded_at
            }
          });
        }

        // Create new approval request
        db.run(
          `INSERT INTO lesson_approvals (child_id, parent_id, lesson_id, module_id, status)
           VALUES (?, ?, ?, ?, 'pending')`,
          [childId, parentId, lessonId, moduleId],
          function (err) {
            if (err) {
              console.error('Failed to create approval request:', err);
              return res.status(500).json({ error: 'Failed to request approval' });
            }

            res.json({
              success: true,
              approval: {
                id: this.lastID,
                status: 'pending',
                requestedAt: new Date().toISOString()
              }
            });
          }
        );
      }
    );
  });
});

// Check lesson approval status (child)
app.get('/api/lesson-approval/check/:lessonId', authenticateToken, (req, res) => {
  const lessonId = req.params.lessonId;
  const childId = req.user.id;
  const db = getDb();

  db.get(
    'SELECT * FROM lesson_approvals WHERE child_id = ? AND lesson_id = ?',
    [childId, lessonId],
    (err, approval) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to check approval status' });
      }

      if (!approval) {
        return res.json({ approved: false, status: 'not_requested' });
      }

      res.json({
        approved: approval.status === 'approved',
        status: approval.status,
        requestedAt: approval.requested_at,
        respondedAt: approval.responded_at,
        responseNote: approval.response_note
      });
    }
  );
});

// Get all approval requests for parent
app.get('/api/parent/approval-requests', authenticateToken, requireParentAccount, (req, res) => {
  const parentId = req.user.id;
  const db = getDb();

  db.all(
    `SELECT la.*, u.username, u.display_name as childName, l.title as lessonTitle, m.title as moduleTitle
     FROM lesson_approvals la
     INNER JOIN users u ON la.child_id = u.id
     INNER JOIN lessons l ON la.lesson_id = l.id
     INNER JOIN modules m ON la.module_id = m.id
     WHERE la.parent_id = ?
     ORDER BY la.requested_at DESC`,
    [parentId],
    (err, requests) => {
      if (err) {
        console.error('Failed to fetch approval requests:', err);
        return res.status(500).json({ error: 'Failed to load approval requests' });
      }

      res.json({
        requests: requests.map(r => ({
          id: r.id,
          childId: r.child_id,
          childName: r.childName || r.username,
          lessonId: r.lesson_id,
          lessonTitle: r.lessonTitle,
          moduleId: r.module_id,
          moduleTitle: r.moduleTitle,
          status: r.status,
          requestedAt: r.requested_at,
          respondedAt: r.responded_at,
          responseNote: r.response_note
        }))
      });
    }
  );
});

// Approve or deny lesson (parent)
app.post('/api/parent/approval-requests/:requestId/respond', authenticateToken, requireParentAccount, (req, res) => {
  const requestId = req.params.requestId;
  const parentId = req.user.id;
  const { status, note } = req.body;
  const db = getDb();

  if (!status || !['approved', 'denied'].includes(status)) {
    return res.status(400).json({ error: 'Status must be "approved" or "denied"' });
  }

  // Verify this request belongs to this parent
  db.get(
    'SELECT * FROM lesson_approvals WHERE id = ? AND parent_id = ?',
    [requestId, parentId],
    (err, request) => {
      if (err || !request) {
        return res.status(404).json({ error: 'Approval request not found' });
      }

      if (request.status !== 'pending') {
        return res.status(400).json({ error: 'This request has already been responded to' });
      }

      db.run(
        `UPDATE lesson_approvals 
         SET status = ?, responded_at = datetime('now'), response_note = ?
         WHERE id = ?`,
        [status, note || null, requestId],
        function (err) {
          if (err) {
            console.error('Failed to update approval:', err);
            return res.status(500).json({ error: 'Failed to update approval' });
          }

          res.json({
            success: true,
            message: `Lesson ${status}`,
            approval: {
              id: requestId,
              status,
              respondedAt: new Date().toISOString(),
              responseNote: note
            }
          });
        }
      );
    }
  );
});

// =====================
// LEADERBOARD
// =====================

app.get('/api/leaderboard', authenticateToken, (req, res) => {
  const db = getDb();
  db.all(
    "SELECT username, xp, streak FROM users WHERE account_type = 'child' ORDER BY xp DESC LIMIT 10",
    (err, users) => {
      if (err) return res.status(500).json({ error: 'Failed to load leaderboard' });
      res.json({ leaderboard: users });
    }
  );
});

// =====================
// PRODUCT ANALYTICS (privacy-safe, best-effort)
// =====================
// Accepts batched, pseudonymous events. Never stores child text, code, email,
// phone or answers. Events are written to a bounded table and ignored on error.
app.post('/api/analytics/events', rateLimit({ prefix: 'analytics', max: 300 }), (req, res) => {
  const events = Array.isArray(req.body?.events) ? req.body.events.slice(0, 25) : [];
  if (!events.length) return res.json({ success: true });
  const db = getDb();
  const blocked = new Set(['email', 'password', 'code', 'answer', 'answers', 'text', 'phone', 'name', 'childname', 'parentemail']);
  const stmt = db.prepare('INSERT INTO analytics_events (name, props_json, ts, session_id) VALUES (?, ?, ?, ?)');
  for (const e of events) {
    if (!e || typeof e.name !== 'string' || e.name.length > 80) continue;
    const props = {};
    for (const key of Object.keys(e.props || {}).slice(0, 12)) {
      if (blocked.has(key.toLowerCase())) continue;
      const value = e.props[key];
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        props[key] = typeof value === 'string' ? value.slice(0, 120) : value;
      }
    }
    try {
      stmt.run(e.name.slice(0, 80), JSON.stringify(props), Number(e.ts) || Date.now(), String(e.sessionId || '').slice(0, 40));
    } catch { /* best effort */ }
  }
  stmt.finalize(() => res.json({ success: true }));
});




// =====================
// SOCIAL FEATURES - friends, leaderboards and activity feed (see social.js)
// Built from the real learning records so the numbers match the rest of KidsCode.
// =====================
app.use('/api/social', createSocialRouter({ authenticateToken }));
// Parents: see their child's friends, remove one, switch friends/sharing on or off.
app.use('/api/parent/social', createParentSocialRouter({ authenticateToken, requireParentAccount }));

// Create social activity (called when user completes lesson, unlocks achievement, etc.)
function createSocialActivity(userId, activityType, activityData, isPublic = true) {
  const db = getDb();
  db.run(
    'INSERT INTO social_activities (user_id, activity_type, activity_data, is_public) VALUES (?, ?, ?, ?)',
    [userId, activityType, JSON.stringify(activityData), isPublic ? 1 : 0],
    (err) => {
      if (err) {
        console.error('Failed to create social activity:', err);
      }
    }
  );
}



// =====================
// AI LEARNING ENGINE (adaptive content, Bloom's taxonomy, tutor, insights)
// =====================
app.post('/api/ai/activities/:id/submit', (req, res, next) => {
  const user = optionalUser(req);
  if (user) achievements.noteCoding(user.id, { code: typeof req.body?.code === 'string' ? req.body.code : '' });
  next();
});
app.use('/api/ai', aiRateLimit, aiEngine.createRouter({ authenticateToken, getDb }));

// Unknown API routes return JSON 404 instead of the React app.
app.use('/api', (req, res) => res.status(404).json({ error: 'API route not found' }));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Serve static frontend files (MUST be after all API routes)
app.use(express.static(path.join(__dirname, '../frontend-react/build')));

// Catch-all route to serve index.html for client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend-react/build', 'index.html'), (err) => {
    if (err) res.status(404).send('Frontend not built yet. Run "npm run build" in frontend-react, or use the React dev server.');
  });
});

// Start server (skipped when the file is imported by tests)
if (require.main === module) {
  initializeDatabase()
    .then(() => aiEngine.initialize(getDb()))
    .then(() => ensureAdultCourse().catch((e) => console.error('Adult course setup failed:', e.message)))
    .then(() => {
      app.listen(PORT, () => {
        console.log(`\n🚀 KIDSCODE is running!`);
        console.log(`📖 Open: http://localhost:${PORT}`);
        console.log(`🤖 AI coach provider: ${aiEngine.describeProvider()}\n`);
      });
    })
    .catch((err) => {
      console.error('Failed to initialize database:', err);
      process.exit(1);
    });
}

module.exports = app;
module.exports.createSocialActivity = createSocialActivity;
