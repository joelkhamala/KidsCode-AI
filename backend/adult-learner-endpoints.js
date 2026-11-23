// =====================
// ADULT LEARNER ENDPOINTS
// =====================

// Middleware to require adult learner account
function requireAdultLearnerAccount(req, res, next) {
  if (req.user.accountType !== 'adult_learner') {
    return res.status(403).json({ error: 'Adult learner account required' });
  }
  next();
}

// Adult learner registration
app.post('/api/adult/register', async (req, res) => {
  const { email, password, firstName, lastName, phoneNumber, occupation, educationLevel, learningGoals } = req.body;

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
    const hashedPassword = await bcrypt.hash(password, 10);
    const db = getDb();

    db.run(
      `INSERT INTO users (account_type, email, password, first_name, last_name, phone_number) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['adult_learner', email, hashedPassword, firstName, lastName, phoneNumber || null],
      function (err) {
        if (err) {
          if (err.message.includes('UNIQUE')) {
            return res.status(400).json({ error: 'Email already registered' });
          }
          return res.status(500).json({ error: 'Registration failed. Please try again.' });
        }

        const userId = this.lastID;

        // Create adult learner profile
        db.run(
          `INSERT INTO adult_learner_profiles (user_id, occupation, education_level, learning_goals) 
           VALUES (?, ?, ?, ?)`,
          [userId, occupation || null, educationLevel || null, learningGoals || null],
          (err) => {
            if (err) {
              console.error('Failed to create profile:', err);
            }

            const token = jwt.sign(
              { id: userId, email, accountType: 'adult_learner' },
              JWT_SECRET,
              { expiresIn: '30d' }
            );

            res.json({
              success: true,
              token,
              user: {
                id: userId,
                email,
                firstName,
                lastName,
                phoneNumber,
                accountType: 'adult_learner',
                occupation,
                educationLevel
              }
            });
          }
        );
      }
    );
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

// Adult learner login
app.post('/api/adult/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  const db = getDb();
  db.get(
    'SELECT * FROM users WHERE email = ? AND account_type = ?',
    [email, 'adult_learner'],
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

      // Get profile
      db.get(
        'SELECT * FROM adult_learner_profiles WHERE user_id = ?',
        [user.id],
        (err, profile) => {
          const token = jwt.sign(
            { id: user.id, email: user.email, accountType: 'adult_learner' },
            JWT_SECRET,
            { expiresIn: '30d' }
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
              accountType: 'adult_learner',
              occupation: profile?.occupation,
              educationLevel: profile?.education_level,
              totalHoursLogged: profile?.total_hours_logged || 0,
              certificationEligible: profile?.certification_eligible || 0
            }
          });
        }
      );
    }
  );
});

// Get adult curriculum
app.get('/api/adult/curriculum', authenticateToken, requireAdultLearnerAccount, (req, res) => {
  const userId = req.user.id;
  const db = getDb();

  // Get modules for adults
  db.all(
    `SELECT * FROM modules 
     WHERE target_audience IN ('adults', 'both') 
     ORDER BY order_num`,
    [],
    (err, modules) => {
      if (err) {
        console.error('Failed to fetch modules:', err);
        return res.status(500).json({ error: 'Failed to load curriculum' });
      }

      // Get lessons for each module
      db.all(
        `SELECT l.*, 
                p.completed, 
                p.score,
                p.updated_at as progress_updated
         FROM lessons l
         LEFT JOIN progress p ON l.id = p.lesson_id AND p.user_id = ?
         WHERE l.module_id IN (${modules.map(m => m.id).join(',')})
         ORDER BY l.module_id, l.order_num`,
        [userId],
        (err, lessons) => {
          if (err) {
            console.error('Failed to fetch lessons:', err);
            return res.status(500).json({ error: 'Failed to load lessons' });
          }

          // Group lessons by module
          const curriculum = modules.map(module => ({
            ...module,
            lessons: lessons.filter(l => l.module_id === module.id).map(l => ({
              id: l.id,
              title: l.title,
              content: l.content,
              example_code: l.example_code,
              challenge: l.challenge,
              hints: l.hints,
              order_num: l.order_num,
              has_practical_test: l.has_practical_test,
              has_written_test: l.has_written_test,
              has_oral_test: l.has_oral_test,
              completed: l.completed || 0,
              score: l.score || 0,
              progress_updated: l.progress_updated
            }))
          }));

          // Get user stats
          db.get(
            `SELECT 
              (SELECT COUNT(*) FROM progress WHERE user_id = ? AND completed = 1) as completedLessons,
              (SELECT COUNT(*) FROM lessons WHERE module_id IN (${modules.map(m => m.id).join(',')})) as totalLessons,
              (SELECT AVG(score) FROM progress WHERE user_id = ? AND completed = 1) as averageScore,
              (SELECT total_hours_logged FROM adult_learner_profiles WHERE user_id = ?) as hoursLogged
            `,
            [userId, userId, userId],
            (err, stats) => {
              res.json({
                curriculum,
                stats: {
                  completedLessons: stats?.completedLessons || 0,
                  totalLessons: stats?.totalLessons || 0,
                  averageScore: Math.round(stats?.averageScore || 0),
                  hoursLogged: stats?.hoursLogged || 0,
                  progressPercentage: stats?.totalLessons > 0 
                    ? Math.round((stats.completedLessons / stats.totalLessons) * 100) 
                    : 0
                }
              });
            }
          );
        }
      );
    }
  );
});

// Get specific lesson
app.get('/api/adult/lesson/:lessonId', authenticateToken, requireAdultLearnerAccount, (req, res) => {
  const lessonId = req.params.lessonId;
  const userId = req.user.id;
  const db = getDb();

  db.get(
    `SELECT l.*, m.title as module_title, m.id as module_id,
            p.completed, p.score, p.last_code
     FROM lessons l
     INNER JOIN modules m ON l.module_id = m.id
     LEFT JOIN progress p ON l.id = p.lesson_id AND p.user_id = ?
     WHERE l.id = ?`,
    [userId, lessonId],
    (err, lesson) => {
      if (err || !lesson) {
        return res.status(404).json({ error: 'Lesson not found' });
      }

      res.json({ lesson });
    }
  );
});

// Submit assessment
app.post('/api/adult/assessment', authenticateToken, requireAdultLearnerAccount, (req, res) => {
  const { lessonId, assessmentType, score, maxScore, submissionData, feedback } = req.body;
  const userId = req.user.id;

  if (!lessonId || !assessmentType || score === undefined || !maxScore) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const percentage = Math.round((score / maxScore) * 100);
  const passed = percentage >= 70 ? 1 : 0;

  const db = getDb();
  db.run(
    `INSERT INTO assessment_results 
     (user_id, lesson_id, assessment_type, score, max_score, percentage, passed, submission_data, feedback) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, lessonId, assessmentType, score, maxScore, percentage, passed, 
     submissionData ? JSON.stringify(submissionData) : null, feedback || null],
    function (err) {
      if (err) {
        console.error('Failed to save assessment:', err);
        return res.status(500).json({ error: 'Failed to save assessment' });
      }

      res.json({
        success: true,
        assessmentId: this.lastID,
        percentage,
        passed
      });
    }
  );
});

// Log learning hours
app.post('/api/adult/hours', authenticateToken, requireAdultLearnerAccount, (req, res) => {
  const { moduleId, lessonId, sessionStart, sessionEnd, durationMinutes, activityType } = req.body;
  const userId = req.user.id;

  if (!sessionStart || !durationMinutes) {
    return res.status(400).json({ error: 'Session start and duration required' });
  }

  const db = getDb();
  db.run(
    `INSERT INTO learning_hours_log 
     (user_id, module_id, lesson_id, session_start, session_end, duration_minutes, activity_type) 
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [userId, moduleId || null, lessonId || null, sessionStart, sessionEnd || null, 
     durationMinutes, activityType || 'lesson'],
    function (err) {
      if (err) {
        console.error('Failed to log hours:', err);
        return res.status(500).json({ error: 'Failed to log hours' });
      }

      // Update total hours in profile
      db.run(
        `UPDATE adult_learner_profiles 
         SET total_hours_logged = (
           SELECT SUM(duration_minutes) / 60.0 
           FROM learning_hours_log 
           WHERE user_id = ?
         )
         WHERE user_id = ?`,
        [userId, userId],
        (err) => {
          if (err) {
            console.error('Failed to update total hours:', err);
          }

          res.json({ success: true, logId: this.lastID });
        }
      );
    }
  );
});

// Get progress and stats
app.get('/api/adult/progress', authenticateToken, requireAdultLearnerAccount, (req, res) => {
  const userId = req.user.id;
  const db = getDb();

  db.get(
    `SELECT 
      (SELECT COUNT(*) FROM progress WHERE user_id = ? AND completed = 1) as completedLessons,
      (SELECT COUNT(*) FROM lessons WHERE module_id >= 101) as totalLessons,
      (SELECT AVG(score) FROM progress WHERE user_id = ? AND completed = 1) as averageScore,
      (SELECT COUNT(DISTINCT module_id) FROM progress WHERE user_id = ? AND completed = 1) as completedModules,
      (SELECT total_hours_logged FROM adult_learner_profiles WHERE user_id = ?) as hoursLogged,
      (SELECT certification_eligible FROM adult_learner_profiles WHERE user_id = ?) as certificationEligible
    `,
    [userId, userId, userId, userId, userId],
    (err, stats) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to load progress' });
      }

      // Get recent assessments
      db.all(
        `SELECT ar.*, l.title as lesson_title 
         FROM assessment_results ar
         INNER JOIN lessons l ON ar.lesson_id = l.id
         WHERE ar.user_id = ?
         ORDER BY ar.completed_at DESC
         LIMIT 10`,
        [userId],
        (err, assessments) => {
          res.json({
            progress: {
              completedLessons: stats.completedLessons || 0,
              totalLessons: stats.totalLessons || 0,
              averageScore: Math.round(stats.averageScore || 0),
              completedModules: stats.completedModules || 0,
              hoursLogged: Math.round(stats.hoursLogged || 0),
              certificationEligible: stats.certificationEligible || 0,
              progressPercentage: stats.totalLessons > 0 
                ? Math.round((stats.completedLessons / stats.totalLessons) * 100) 
                : 0,
              recentAssessments: assessments || []
            }
          });
        }
      );
    }
  );
});

// Check certificate eligibility
app.get('/api/adult/certificate/eligibility', authenticateToken, requireAdultLearnerAccount, (req, res) => {
  const userId = req.user.id;
  const db = getDb();

  db.get(
    `SELECT 
      (SELECT COUNT(*) FROM progress WHERE user_id = ? AND completed = 1) as completedLessons,
      (SELECT COUNT(*) FROM lessons WHERE module_id >= 101) as totalLessons,
      (SELECT AVG(percentage) FROM assessment_results WHERE user_id = ?) as averageScore,
      (SELECT total_hours_logged FROM adult_learner_profiles WHERE user_id = ?) as hoursLogged
    `,
    [userId, userId, userId],
    (err, stats) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to check eligibility' });
      }

      const allLessonsCompleted = stats.completedLessons >= stats.totalLessons;
      const passedAssessments = (stats.averageScore || 0) >= 70;
      const sufficientHours = (stats.hoursLogged || 0) >= 170;

      const eligible = allLessonsCompleted && passedAssessments && sufficientHours;

      res.json({
        eligible,
        requirements: {
          allLessonsCompleted: {
            met: allLessonsCompleted,
            current: stats.completedLessons,
            required: stats.totalLessons
          },
          passedAssessments: {
            met: passedAssessments,
            current: Math.round(stats.averageScore || 0),
            required: 70
          },
          sufficientHours: {
            met: sufficientHours,
            current: Math.round(stats.hoursLogged || 0),
            required: 170
          }
        }
      });
    }
  );
});

// Generate certificate (placeholder - full implementation would generate PDF)
app.post('/api/adult/certificate', authenticateToken, requireAdultLearnerAccount, (req, res) => {
  const userId = req.user.id;
  const db = getDb();

  // Check eligibility first
  db.get(
    `SELECT 
      (SELECT COUNT(*) FROM progress WHERE user_id = ? AND completed = 1) as completedLessons,
      (SELECT COUNT(*) FROM lessons WHERE module_id >= 101) as totalLessons,
      (SELECT AVG(percentage) FROM assessment_results WHERE user_id = ?) as averageScore,
      (SELECT total_hours_logged FROM adult_learner_profiles WHERE user_id = ?) as hoursLogged
    `,
    [userId, userId, userId],
    (err, stats) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to check eligibility' });
      }

      const eligible = stats.completedLessons >= stats.totalLessons && 
                      (stats.averageScore || 0) >= 70 && 
                      (stats.hoursLogged || 0) >= 170;

      if (!eligible) {
        return res.status(400).json({ error: 'Not eligible for certificate yet' });
      }

      // Generate certificate number
      const certNumber = `KCWEB-${Date.now()}-${userId}`;
      const verificationCode = `${Math.random().toString(36).substring(2, 15)}`;

      db.run(
        `INSERT INTO certificates 
         (user_id, certificate_number, issue_date, total_hours, overall_score, verification_code) 
         VALUES (?, ?, date('now'), ?, ?, ?)`,
        [userId, certNumber, Math.round(stats.hoursLogged), Math.round(stats.averageScore), verificationCode],
        function (err) {
          if (err) {
            console.error('Failed to create certificate:', err);
            return res.status(500).json({ error: 'Failed to generate certificate' });
          }

          // Update profile
          db.run(
            `UPDATE adult_learner_profiles 
             SET certification_eligible = 1, 
                 certification_issued_date = date('now'),
                 certificate_number = ?
             WHERE user_id = ?`,
            [certNumber, userId]
          );

          res.json({
            success: true,
            certificate: {
              id: this.lastID,
              certificateNumber: certNumber,
              verificationCode,
              issueDate: new Date().toISOString().split('T')[0],
              totalHours: Math.round(stats.hoursLogged),
              overallScore: Math.round(stats.averageScore),
              curriculumCode: 'ICT/CU/CP/CR/08/6/A'
            }
          });
        }
      );
    }
  );
});

// Get user's certificate
app.get('/api/adult/certificate', authenticateToken, requireAdultLearnerAccount, (req, res) => {
  const userId = req.user.id;
  const db = getDb();

  db.get(
    `SELECT c.*, u.first_name, u.last_name, u.email
     FROM certificates c
     INNER JOIN users u ON c.user_id = u.id
     WHERE c.user_id = ?
     ORDER BY c.issue_date DESC
     LIMIT 1`,
    [userId],
    (err, certificate) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to load certificate' });
      }

      if (!certificate) {
        return res.status(404).json({ error: 'No certificate found' });
      }

      res.json({ certificate });
    }
  );
});
