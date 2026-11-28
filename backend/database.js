const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// KIDSCODE_DB_PATH lets tests or deployments use a different database file.
const DB_PATH = process.env.KIDSCODE_DB_PATH || path.join(__dirname, 'codequest.db');

let db;

function getDb() {
  if (!db) {
    db = new sqlite3.Database(DB_PATH);
  }
  return db;
}

function initializeDatabase() {
  return new Promise((resolve, reject) => {
    const database = getDb();

    database.serialize(() => {
      // Enable foreign keys
      database.run('PRAGMA foreign_keys = ON');

      // Users table (extended for parent and teacher account system)
      database.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          account_type TEXT DEFAULT 'child' CHECK(account_type IN ('parent', 'child', 'teacher', 'adult_learner')),
          username TEXT UNIQUE,
          email TEXT UNIQUE,
          password TEXT,
          first_name TEXT,
          last_name TEXT,
          phone_number TEXT,
          display_name TEXT,
          age INTEGER,
          parent_id INTEGER,
          parent_email TEXT,
          avatar_url TEXT,
          xp INTEGER DEFAULT 0,
          streak INTEGER DEFAULT 0,
          last_active DATE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);

      // Modules table
      database.run(`
        CREATE TABLE IF NOT EXISTS modules (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          description TEXT,
          icon TEXT,
          color TEXT,
          order_num INTEGER,
          difficulty TEXT DEFAULT 'beginner'
        )
      `);

      // Lessons table
      database.run(`
        CREATE TABLE IF NOT EXISTS lessons (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          module_id INTEGER,
          title TEXT NOT NULL,
          content TEXT,
          example_code TEXT,
          challenge TEXT,
          hints TEXT,
          order_num INTEGER,
          FOREIGN KEY (module_id) REFERENCES modules(id)
        )
      `);

      // Progress table
      database.run(`
        CREATE TABLE IF NOT EXISTS progress (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          module_id INTEGER,
          lesson_id INTEGER,
          completed INTEGER DEFAULT 0,
          last_code TEXT,
          score INTEGER DEFAULT 0,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id),
          UNIQUE(user_id, lesson_id)
        )
      `);

      // Achievements table
      database.run(`
        CREATE TABLE IF NOT EXISTS achievements (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          icon TEXT,
          xp_reward INTEGER DEFAULT 50,
          condition TEXT
        )
      `);

      // User achievements table
      database.run(`
        CREATE TABLE IF NOT EXISTS user_achievements (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          achievement_id INTEGER,
          unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (achievement_id) REFERENCES achievements(id),
          UNIQUE(user_id, achievement_id)
        )
      `);

      // Code history table
      database.run(`
        CREATE TABLE IF NOT EXISTS code_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          title TEXT,
          code TEXT NOT NULL,
          blocks_xml TEXT,
          language TEXT DEFAULT 'javascript',
          source TEXT DEFAULT 'playground',
          lesson_id INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (lesson_id) REFERENCES lessons(id)
        )
      `);

      // Parent-child relationships table
      database.run(`
        CREATE TABLE IF NOT EXISTS parent_child_relationships (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          parent_id INTEGER NOT NULL,
          child_id INTEGER NOT NULL,
          relationship_type TEXT DEFAULT 'primary' CHECK(relationship_type IN ('primary', 'secondary')),
          can_view_progress INTEGER DEFAULT 1,
          can_modify_settings INTEGER DEFAULT 1,
          can_delete_account INTEGER DEFAULT 1,
          can_manage_restrictions INTEGER DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (child_id) REFERENCES users(id) ON DELETE CASCADE,
          UNIQUE(parent_id, child_id)
        )
      `);

      // Teacher-student relationships table
      database.run(`
        CREATE TABLE IF NOT EXISTS teacher_student_relationships (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          teacher_id INTEGER NOT NULL,
          student_id INTEGER NOT NULL,
          class_name TEXT,
          enrollment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
          can_view_progress INTEGER DEFAULT 1,
          can_approve_lessons INTEGER DEFAULT 1,
          status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'graduated')),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
          UNIQUE(teacher_id, student_id)
        )
      `);

      // Account restrictions table
      database.run(`
        CREATE TABLE IF NOT EXISTS account_restrictions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          child_id INTEGER NOT NULL,
          max_daily_minutes INTEGER,
          allowed_days TEXT,
          content_filters TEXT,
          require_parent_approval INTEGER DEFAULT 0,
          active_from DATE,
          active_until DATE,
          created_by INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (child_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (created_by) REFERENCES users(id)
        )
      `);

      // Notification preferences table
      database.run(`
        CREATE TABLE IF NOT EXISTS notification_preferences (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          parent_id INTEGER NOT NULL UNIQUE,
          email_notifications INTEGER DEFAULT 1,
          weekly_reports INTEGER DEFAULT 1,
          achievement_alerts INTEGER DEFAULT 1,
          login_alerts INTEGER DEFAULT 0,
          report_day TEXT DEFAULT 'sunday',
          report_time TEXT DEFAULT '18:00',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);

      // In-app parent notifications (no email provider required)
      database.run(`
        CREATE TABLE IF NOT EXISTS parent_notifications (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          parent_id INTEGER NOT NULL,
          type TEXT NOT NULL,
          title TEXT NOT NULL,
          body TEXT NOT NULL,
          data_json TEXT DEFAULT '{}',
          read_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);

      // Lesson approval requests routed to teachers with can_approve_lessons.
      // Kept separate from parent approvals so a child can have both a parent
      // and a teacher respond independently.
      database.run(`
        CREATE TABLE IF NOT EXISTS teacher_approval_requests (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          teacher_id INTEGER NOT NULL,
          child_id INTEGER NOT NULL,
          lesson_id INTEGER NOT NULL,
          module_id INTEGER NOT NULL,
          status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'denied')),
          requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          responded_at DATETIME,
          response_note TEXT,
          FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (child_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (lesson_id) REFERENCES lessons(id),
          UNIQUE(teacher_id, child_id, lesson_id)
        )
      `);

      // In-app teacher notifications (no email provider required)
      database.run(`
        CREATE TABLE IF NOT EXISTS teacher_notifications (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          teacher_id INTEGER NOT NULL,
          type TEXT NOT NULL,
          title TEXT NOT NULL,
          body TEXT NOT NULL,
          data_json TEXT DEFAULT '{}',
          read_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);

      // Session logs table
      database.run(`
        CREATE TABLE IF NOT EXISTS session_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          login_time DATETIME DEFAULT CURRENT_TIMESTAMP,
          logout_time DATETIME,
          duration_minutes INTEGER,
          ip_address TEXT,
          user_agent TEXT,
          parent_notified INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);

      // Learning metrics table (for advanced XP calculation)
      database.run(`
        CREATE TABLE IF NOT EXISTS learning_metrics (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          lesson_id INTEGER NOT NULL,
          time_spent_seconds INTEGER DEFAULT 0,
          code_attempts INTEGER DEFAULT 0,
          hints_used INTEGER DEFAULT 0,
          example_loads INTEGER DEFAULT 0,
          run_count INTEGER DEFAULT 0,
          error_count INTEGER DEFAULT 0,
          success_count INTEGER DEFAULT 0,
          code_quality_score INTEGER DEFAULT 0,
          challenge_met INTEGER DEFAULT 0,
          independence_score INTEGER DEFAULT 100,
          engagement_score INTEGER DEFAULT 0,
          final_xp_earned INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (lesson_id) REFERENCES lessons(id),
          UNIQUE(user_id, lesson_id)
        )
      `);

      // Lesson approval requests table
      database.run(`
        CREATE TABLE IF NOT EXISTS lesson_approvals (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          child_id INTEGER NOT NULL,
          parent_id INTEGER NOT NULL,
          lesson_id INTEGER NOT NULL,
          module_id INTEGER NOT NULL,
          status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'denied')),
          requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          responded_at DATETIME,
          response_note TEXT,
          FOREIGN KEY (child_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (lesson_id) REFERENCES lessons(id),
          UNIQUE(child_id, lesson_id)
        )
      `);

      // Friendships table
      database.run(`
        CREATE TABLE IF NOT EXISTS friendships (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          friend_id INTEGER NOT NULL,
          status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'blocked')),
          requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          accepted_at DATETIME,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (friend_id) REFERENCES users(id) ON DELETE CASCADE,
          UNIQUE(user_id, friend_id)
        )
      `);

      // Friend requests table (for easier querying)
      database.run(`
        CREATE TABLE IF NOT EXISTS friend_requests (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          from_user_id INTEGER NOT NULL,
          to_user_id INTEGER NOT NULL,
          status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'rejected')),
          message TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          responded_at DATETIME,
          FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (to_user_id) REFERENCES users(id) ON DELETE CASCADE,
          UNIQUE(from_user_id, to_user_id)
        )
      `);

      // Adult friends: requests, mutual friendships, privacy, messaging and social history.
      // These are separate from the child tables because adult accounts must never appear
      // in a child's search results (and vice versa).
      database.run(`
        CREATE TABLE IF NOT EXISTS adult_friend_requests (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          from_user_id INTEGER NOT NULL,
          to_user_id INTEGER NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'declined', 'cancelled')),
          note TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          responded_at DATETIME,
          FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (to_user_id) REFERENCES users(id) ON DELETE CASCADE,
          UNIQUE(from_user_id, to_user_id)
        )
      `);

      database.run(`
        CREATE TABLE IF NOT EXISTS adult_friendships (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_a_id INTEGER NOT NULL,
          user_b_id INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_a_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (user_b_id) REFERENCES users(id) ON DELETE CASCADE,
          UNIQUE(user_a_id, user_b_id),
          CHECK(user_a_id < user_b_id)
        )
      `);

      database.run(`
        CREATE TABLE IF NOT EXISTS adult_blocks (
          blocker_id INTEGER NOT NULL,
          blocked_id INTEGER NOT NULL,
          reason TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (blocker_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (blocked_id) REFERENCES users(id) ON DELETE CASCADE,
          PRIMARY KEY (blocker_id, blocked_id)
        )
      `);

      database.run(`
        CREATE TABLE IF NOT EXISTS adult_friend_privacy (
          user_id INTEGER PRIMARY KEY,
          allow_search INTEGER DEFAULT 1,
          show_progress INTEGER DEFAULT 1,
          show_activity INTEGER DEFAULT 1,
          allow_messages INTEGER DEFAULT 1,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);

      database.run(`
        CREATE TABLE IF NOT EXISTS adult_friend_messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          conversation_id TEXT NOT NULL,
          sender_id INTEGER NOT NULL,
          recipient_id INTEGER NOT NULL,
          body TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          edited_at DATETIME,
          read_at DATETIME,
          deleted_by_sender INTEGER DEFAULT 0,
          deleted_by_recipient INTEGER DEFAULT 0,
          FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);

      database.run(`
        CREATE TABLE IF NOT EXISTS adult_friend_cheers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          from_user_id INTEGER NOT NULL,
          to_user_id INTEGER NOT NULL,
          kind TEXT NOT NULL CHECK(kind IN ('high_five', 'star', 'keep_going', 'well_done', 'code_today')),
          note TEXT,
          event_key TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          read_at DATETIME,
          FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (to_user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);

      database.run(`
        CREATE TABLE IF NOT EXISTS adult_friend_goals (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          week_start DATE NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          target_minutes INTEGER NOT NULL DEFAULT 300,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          UNIQUE(user_id, week_start)
        )
      `);

      database.run(`
        CREATE TABLE IF NOT EXISTS adult_study_checkins (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          day DATE NOT NULL,
          note TEXT,
          minutes INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          UNIQUE(user_id, day)
        )
      `);

      database.run(`
        CREATE TABLE IF NOT EXISTS adult_friend_notifications (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          type TEXT NOT NULL,
          actor_id INTEGER,
          data_json TEXT DEFAULT '{}',
          read_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);

      database.run(`
        CREATE TABLE IF NOT EXISTS adult_friend_reports (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          reporter_id INTEGER NOT NULL,
          reported_id INTEGER NOT NULL,
          reason TEXT NOT NULL,
          details TEXT,
          status TEXT DEFAULT 'open' CHECK(status IN ('open', 'reviewed', 'closed')),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (reported_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);

      database.run('CREATE INDEX IF NOT EXISTS idx_adult_req_to ON adult_friend_requests(to_user_id, status)');
      database.run('CREATE INDEX IF NOT EXISTS idx_adult_friend_a ON adult_friendships(user_a_id)');
      database.run('CREATE INDEX IF NOT EXISTS idx_adult_friend_b ON adult_friendships(user_b_id)');
      database.run('CREATE INDEX IF NOT EXISTS idx_adult_msg_conv ON adult_friend_messages(conversation_id, id)');
      database.run('CREATE INDEX IF NOT EXISTS idx_adult_msg_unread ON adult_friend_messages(recipient_id, read_at)');
      database.run('CREATE INDEX IF NOT EXISTS idx_adult_notify_user ON adult_friend_notifications(user_id, read_at)');

      // Leaderboard entries table (cached for performance)
      database.run(`
        CREATE TABLE IF NOT EXISTS leaderboard_cache (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          username TEXT NOT NULL,
          display_name TEXT,
          avatar_url TEXT,
          total_xp INTEGER DEFAULT 0,
          lessons_completed INTEGER DEFAULT 0,
          achievements_count INTEGER DEFAULT 0,
          current_streak INTEGER DEFAULT 0,
          rank_position INTEGER,
          last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);

      // Social activities table (for activity feed)
      database.run(`
        CREATE TABLE IF NOT EXISTS social_activities (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          activity_type TEXT NOT NULL CHECK(activity_type IN ('lesson_completed', 'achievement_unlocked', 'level_up', 'streak_milestone', 'friend_added')),
          activity_data TEXT,
          is_public INTEGER DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);

      // Quiz results table
      database.run(`
        CREATE TABLE IF NOT EXISTS quiz_results (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          module_id INTEGER NOT NULL,
          score INTEGER NOT NULL,
          total_questions INTEGER NOT NULL,
          percentage INTEGER NOT NULL,
          passed INTEGER DEFAULT 0,
          time_taken_seconds INTEGER DEFAULT 0,
          answers_data TEXT,
          xp_earned INTEGER DEFAULT 0,
          attempt_number INTEGER DEFAULT 1,
          completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (module_id) REFERENCES modules(id)
        )
      `);

      // Module completion tracking
      database.run(`
        CREATE TABLE IF NOT EXISTS module_completions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          module_id INTEGER NOT NULL,
          all_lessons_completed INTEGER DEFAULT 0,
          quiz_passed INTEGER DEFAULT 0,
          quiz_score INTEGER DEFAULT 0,
          completed_at DATETIME,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (module_id) REFERENCES modules(id),
          UNIQUE(user_id, module_id)
        )
      `);

      // Coding Arena: authoritative match state, submissions, ratings and payouts.
      database.run(`
        CREATE TABLE IF NOT EXISTS duel_matches (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          mode TEXT NOT NULL CHECK(mode IN ('code_race','bug_busters','code_maze','code_quiz')),
          difficulty TEXT NOT NULL CHECK(difficulty IN ('easy','medium','hard')),
          format TEXT NOT NULL DEFAULT 'quick' CHECK(format IN ('quick','friend')),
          status TEXT NOT NULL DEFAULT 'waiting' CHECK(status IN ('waiting','active','finished','cancelled','expired')),
          challenge_json TEXT NOT NULL,
          created_by INTEGER NOT NULL,
          winner_id INTEGER,
          end_reason TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          starts_at DATETIME,
          ends_at DATETIME,
          finished_at DATETIME,
          FOREIGN KEY (created_by) REFERENCES users(id)
        )
      `);

      database.run(`
        CREATE TABLE IF NOT EXISTS duel_participants (
          match_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          ready_at DATETIME,
          submitted_at DATETIME,
          left_at DATETIME,
          last_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          score INTEGER DEFAULT 0,
          attempts INTEGER DEFAULT 0,
          breakdown_json TEXT,
          rewarded_at DATETIME,
          PRIMARY KEY (match_id, user_id),
          FOREIGN KEY (match_id) REFERENCES duel_matches(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);

      database.run(`
        CREATE TABLE IF NOT EXISTS duel_submissions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          match_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          attempt INTEGER NOT NULL,
          payload TEXT NOT NULL,
          verdict_json TEXT NOT NULL,
          score INTEGER NOT NULL DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(match_id, user_id, attempt),
          FOREIGN KEY (match_id) REFERENCES duel_matches(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);

      database.run(`
        CREATE TABLE IF NOT EXISTS duel_ratings (
          user_id INTEGER PRIMARY KEY,
          rating INTEGER NOT NULL DEFAULT 1000,
          wins INTEGER NOT NULL DEFAULT 0,
          losses INTEGER NOT NULL DEFAULT 0,
          ties INTEGER NOT NULL DEFAULT 0,
          duels INTEGER NOT NULL DEFAULT 0,
          coins INTEGER NOT NULL DEFAULT 0,
          gems INTEGER NOT NULL DEFAULT 0,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);

      // One payout per player per match: the uniqueness constraint is the reward guard.
      database.run(`
        CREATE TABLE IF NOT EXISTS duel_payouts (
          match_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          xp INTEGER NOT NULL DEFAULT 0,
          coins INTEGER NOT NULL DEFAULT 0,
          gems INTEGER NOT NULL DEFAULT 0,
          rating_delta INTEGER NOT NULL DEFAULT 0,
          breakdown_json TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (match_id, user_id),
          FOREIGN KEY (match_id) REFERENCES duel_matches(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);

      // Shared state for SSE and rate limits: any backend instance using this
      // database sees the same events and request counters.
      database.run(`
        CREATE TABLE IF NOT EXISTS duel_events (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          match_id INTEGER NOT NULL,
          payload_json TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          FOREIGN KEY (match_id) REFERENCES duel_matches(id) ON DELETE CASCADE
        )
      `);
      database.run(`
        CREATE TABLE IF NOT EXISTS rate_buckets (
          key TEXT PRIMARY KEY,
          start_ms INTEGER NOT NULL,
          count INTEGER NOT NULL
        )
      `);

      // Privacy-safe product analytics (pseudonymous event metadata only).
      database.run(`
        CREATE TABLE IF NOT EXISTS analytics_events (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          props_json TEXT NOT NULL DEFAULT '{}',
          ts INTEGER NOT NULL,
          session_id TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Hot-path indexes for leaderboards and progress lookups.
      database.run('CREATE INDEX IF NOT EXISTS idx_users_xp ON users(xp DESC)');
      database.run('CREATE INDEX IF NOT EXISTS idx_progress_user_lesson ON progress(user_id, lesson_id)');
      database.run('CREATE INDEX IF NOT EXISTS idx_analytics_ts ON analytics_events(ts)');
      database.run('CREATE INDEX IF NOT EXISTS idx_parent_notifications ON parent_notifications(parent_id, read_at, created_at)');
      database.run('CREATE INDEX IF NOT EXISTS idx_duel_queue ON duel_matches(status, mode, difficulty, created_at)');
      database.run('CREATE INDEX IF NOT EXISTS idx_duel_participant_user ON duel_participants(user_id, match_id)');
      database.run('CREATE INDEX IF NOT EXISTS idx_duel_payout_user ON duel_payouts(user_id, created_at)');
      database.run('CREATE INDEX IF NOT EXISTS idx_duel_events_match ON duel_events(match_id, id)');

      // Insert sample modules
      database.get('SELECT COUNT(*) as count FROM modules', (err, row) => {
        if (err || row.count > 0) return;

        const modules = [
          [1, 'Welcome to Coding! 🚀', 'Start your coding adventure! Learn what code is and make your first program.', '🚀', '#6366f1', 1, 'beginner'],
          [2, 'Creative Animations 🎨', 'Bring your ideas to life with colorful drawings and animations!', '🎨', '#ec4899', 2, 'beginner'],
          [3, 'Game Design Basics 🎮', 'Create your own simple games and learn about game logic!', '🎮', '#10b981', 3, 'intermediate'],
          [4, 'Web Wizards 🌐', 'Build your own web pages and learn HTML magic!', '🌐', '#f59e0b', 4, 'intermediate'],
          [5, 'Python Explorers 🐍', 'Discover Python, one of the most popular coding languages!', '🐍', '#8b5cf6', 5, 'advanced'],
        ];

        // A nested serialize block keeps module inserts ahead of the lessons
        // that reference them; sqlite3 does not order statements queued from a callback.
        const insertModule = 'INSERT OR IGNORE INTO modules (id, title, description, icon, color, order_num, difficulty) VALUES (?, ?, ?, ?, ?, ?, ?)';

        // Insert lessons for each module
        const lessons = [
          // Module 1: Welcome to Coding
          [1, 1, 'What is Code? 🤔', 'Code is like giving instructions to a computer! Just like you follow recipes to make cookies, computers follow code to do things.\n\nCode is written in special languages that computers understand. Today we\'ll use JavaScript!\n\nEvery great app, game, and website you\'ve ever used was made with code. YOU can make amazing things too!', 'console.log("Hello, World!");\nconsole.log("I am learning to code!");\nconsole.log("This is so cool! 🎉");', 'Make the computer say your name! Use console.log() to print your name to the screen. Try printing 3 different messages!', '["Use console.log() to print messages", "Put your text inside quotes like \\"Hello\\"", "Each console.log() goes on its own line"]', 1],
          [2, 1, 'Variables: Storing Information 📦', 'Variables are like labeled boxes where you store information!\n\nYou can store words, numbers, or anything else.\n\nUse "let" to create a variable:\nlet myName = "Alex";\n\nThen use it anywhere:', 'let myName = "Alex";\nlet myAge = 10;\nlet favColor = "blue";\n\nconsole.log("My name is " + myName);\nconsole.log("I am " + myAge + " years old");\nconsole.log("My favorite color is " + favColor);', 'Create 3 variables about yourself: your name, age, and favorite animal. Then print them all!', '["Use let to create a variable", "Put words in quotes but not numbers", "Use + to join text and variables"]', 2],
          [3, 1, 'Numbers and Math 🔢', 'Computers are amazing at math! You can use all the basic math operations:\n\n+ for adding\n- for subtracting\n* for multiplying\n/ for dividing\n\nLet\'s do some math!', 'let apples = 5;\nlet oranges = 3;\nlet total = apples + oranges;\nconsole.log("Total fruits: " + total);\n\nlet doubled = total * 2;\nconsole.log("Doubled: " + doubled);\n\nconsole.log("10 divided by 2 = " + (10 / 2));', 'Calculate how many hours are in a week! (Hint: 24 hours in a day, 7 days in a week). Print the answer!', '["Store numbers in variables", "Use * to multiply", "Print your answer with console.log"]', 3],
          [4, 1, 'Making Decisions with If/Else 🤔', 'Code can make decisions! If something is true, do one thing. Otherwise, do something else.\n\nThis is called an "if statement" and it\'s super powerful!', 'let age = 10;\n\nif (age >= 13) {\n  console.log("You can use most social media!");\n} else {\n  console.log("You\'re still young - enjoy it! 🎉");\n}\n\nlet score = 85;\nif (score >= 90) {\n  console.log("Amazing! You got an A! 🌟");\n} else if (score >= 70) {\n  console.log("Great job! You passed! 👍");\n} else {\n  console.log("Keep practicing! You\'ve got this! 💪");\n}', 'Write code that checks if a number is even or odd. Print "Even!" or "Odd!" based on the number. Try it with different numbers!', '["Use % to find the remainder", "If number % 2 === 0, it\'s even!", "Use if/else to print the right message"]', 4],

          // Module 2: Creative Animations
          [5, 2, 'Drawing with Turtle 🐢', 'Meet your new friend - the Turtle! It\'s a little arrow that draws as it moves.\n\nYou can tell the turtle to:\n- Move forward: forward(100)\n- Turn right: right(90)\n- Turn left: left(90)\n- Change color: color("red")\n\nLet\'s draw something amazing!', 'color("blue");\nforward(100);\nright(90);\nforward(100);\nright(90);\nforward(100);\nright(90);\nforward(100);\nconsole.log("I drew a square! 🟦");', 'Draw a colorful square using the turtle! Use forward() and right() commands. Try making it different colors!', '["Use forward(100) to move 100 pixels", "Use right(90) to turn right 90 degrees", "Use color(\\"red\\") to change colors", "A square has 4 equal sides and 4 right angle turns"]', 1],
          [6, 2, 'Loops: Don\'t Repeat Yourself 🔄', 'What if you need to do something many times? Don\'t copy-paste! Use a LOOP!\n\nA for loop does something a set number of times:\nfor (let i = 0; i < 4; i++) {\n  // This repeats 4 times!\n}', 'color("purple");\nfor (let i = 0; i < 4; i++) {\n  forward(100);\n  right(90);\n}\nconsole.log("Drew a square with a loop! 🔄");\n\n// Now let\'s make a fancy star!\ncolor("gold");\nfor (let i = 0; i < 5; i++) {\n  forward(80);\n  right(144);\n}\nconsole.log("Drew a star! ⭐");', 'Use a loop to draw a triangle! A triangle has 3 sides. Each turn should be 120 degrees. Try different colors!', '["A loop starts with for (let i = 0; i < 3; i++)", "Inside the loop, move forward and turn", "For a triangle, turn 120 degrees each time"]', 2],
          [7, 2, 'Colorful Patterns 🌈', 'Let\'s create amazing colorful patterns! We can use arrays to store multiple colors and cycle through them.', 'let colors = ["red", "orange", "yellow", "green", "blue", "purple"];\n\nfor (let i = 0; i < 6; i++) {\n  color(colors[i]);\n  forward(80);\n  right(60);\n}\nconsole.log("Rainbow hexagon! 🌈");', 'Create a rainbow spiral! Use a loop that runs 36 times, moves forward a little more each time, and turns 10 degrees each step.', '["Use an array of colors like [\"red\", \"blue\"]", "colors[i % colors.length] cycles through colors", "Increase the forward distance each step for a spiral"]', 3],

          // Module 3: Game Design
          [8, 3, 'Random Numbers 🎲', 'Games need randomness to be fun! In JavaScript, we use Math.random() to get random numbers.\n\nMath.random() gives a number between 0 and 1\nMultiply it to get bigger numbers!\nMath.floor() rounds down to a whole number', 'let randomNum = Math.floor(Math.random() * 10) + 1;\nconsole.log("Random number (1-10): " + randomNum);\n\nlet coinFlip = Math.random() < 0.5 ? "Heads" : "Tails";\nconsole.log("Coin flip: " + coinFlip);\n\nlet dice = Math.floor(Math.random() * 6) + 1;\nconsole.log("You rolled a: " + dice + " 🎲");', 'Create a number guessing game setup! Generate a random number 1-100 and store it. Then check if a "guess" variable equals it and print "Correct!" or "Wrong!"', '["Math.floor(Math.random() * 100) + 1 gives 1-100", "Use a variable to store your guess", "Use if/else to check the answer"]', 1],
          [9, 3, 'Score Tracking 🏆', 'Every game needs a score! Let\'s learn how to track and update scores.', 'let score = 0;\nlet lives = 3;\n\nconsole.log("Game started! Score: " + score);\n\n// Player gets points\nscore = score + 10;\nconsole.log("Got a coin! Score: " + score);\n\nscore += 20; // Short way to add!\nconsole.log("Bonus! Score: " + score);\n\nlives--; // Lose a life!\nconsole.log("Ouch! Lives left: " + lives);\n\nif (lives <= 0) {\n  console.log("Game Over! Final score: " + score);\n} else {\n  console.log("Keep going! You can do it! 💪");\n}', 'Build a simple scoring system! Create score and level variables. Add 50 points, then check if score > 100 to level up. Print the level and score!', '["Use += to add to a variable", "Use ++ to add 1", "Use if statements to check level ups"]', 2],
          [10, 3, 'Functions: Reusable Code Magic ✨', 'Functions are like mini-programs inside your program! Write once, use many times!\n\nDeclare with: function myFunction() { }\nCall it with: myFunction()', 'function greetPlayer(name) {\n  console.log("Welcome to the game, " + name + "! 🎮");\n  console.log("Good luck on your adventure!");\n}\n\nfunction calculateScore(coins, time) {\n  let bonus = Math.max(0, 100 - time);\n  return coins * 10 + bonus;\n}\n\ngreetPlayer("Alex");\ngreetPlayer("Sam");\n\nlet myScore = calculateScore(5, 30);\nconsole.log("Your score: " + myScore);', 'Write a function called "levelUp" that takes a player name and their score. Print a congratulations message and the new level (score divided by 100)!', '["function levelUp(name, score) { }", "Divide score by 100 to get level", "Use Math.floor to get whole number levels"]', 3],

          // Module 4: Web Wizards
          [11, 4, 'HTML Basics 🌐', 'HTML is the language of web pages! Every website uses it.\n\nHTML uses "tags" wrapped in < > brackets:\n<h1>Big Heading</h1>\n<p>A paragraph</p>\n<button>Click me!</button>\n\nTags usually come in pairs - open and close.', '// Let\'s explore what HTML looks like in code!\nlet htmlExample = `\n<h1>My First Webpage!</h1>\n<p>Hello, I made this myself!</p>\n<ul>\n  <li>Item 1</li>\n  <li>Item 2</li>\n</ul>\n`;\nconsole.log("HTML creates structure on web pages!");\nconsole.log("Tags: h1, p, div, button, img...");\nconsole.log("Try the Web IDE to write real HTML! 🌐");', 'List 5 HTML tags you know (or look up) and what each one does. Print them using console.log!', '["HTML tags go inside < > brackets", "Most tags have an opening and closing tag", "Common tags: h1, p, div, a, img, button"]', 1],
          [12, 4, 'Styling with CSS 💅', 'CSS makes web pages beautiful! It controls colors, fonts, sizes, and more.\n\nCSS rules look like:\nelement { property: value; }\n\nLike giving instructions: "Make all headings blue and big!"', 'console.log("CSS Styling Examples:");\nconsole.log("color: red; - makes text red");\nconsole.log("background: blue; - blue background");\nconsole.log("font-size: 24px; - bigger text");\nconsole.log("border-radius: 10px; - rounded corners");\n\nlet styles = {\n  color: "purple",\n  fontSize: "20px",\n  backgroundColor: "yellow"\n};\n\nfor (let property in styles) {\n  console.log(property + ": " + styles[property]);\n}', 'Create an object with 5 CSS properties and their values for making a "fun button". Print each property!', '["Objects use { } and key: value pairs", "CSS properties like color, background, fontSize", "Use a for...in loop to print all properties"]', 2],

          // Module 5: Python Explorers
          [13, 5, 'Python vs JavaScript 🐍', 'Python is another amazing coding language! It\'s used for AI, science, and web servers.\n\nBig differences from JavaScript:\n- No semicolons needed!\n- Indentation matters (spaces = structure)\n- print() instead of console.log()\n- Different syntax for some things\n\nLet\'s compare them!', 'console.log("=== JavaScript vs Python ===");\nconsole.log("");\nconsole.log("JavaScript: console.log(\\"Hello\\")");\nconsole.log("Python:     print(\\"Hello\\")");\nconsole.log("");\nconsole.log("JavaScript: let x = 5;");\nconsole.log("Python:     x = 5");\nconsole.log("");\nconsole.log("JavaScript: // this is a comment");\nconsole.log("Python:     # this is a comment");\nconsole.log("");\nconsole.log("Both are awesome languages! 🚀");', 'Research and list 3 things Python is commonly used for. Print them with console.log. (Hint: AI/ML, data science, web servers!)', '["Python is popular for data science", "Many AI tools are built with Python", "Python is great for beginners too!"]', 1],
          [14, 5, 'Data Structures: Lists & Dicts 📊', 'Python has powerful ways to store data:\n\nLists: [1, 2, 3] - like JS arrays\nDictionaries: {"name": "Alex"} - like JS objects\n\nIn JavaScript, these are arrays and objects. The concepts are the same, just different names!', 'console.log("=== Python Lists & Dicts in JS ===");\n\n// In Python: my_list = [1, 2, 3]\nlet myList = [1, 2, 3, 4, 5];\nconsole.log("List:", myList);\nconsole.log("First item:", myList[0]);\n\n// In Python: person = {"name": "Alex", "age": 10}\nlet person = { name: "Alex", age: 10, hobby: "coding" };\nconsole.log("\\nDictionary/Object:");\nfor (let key in person) {\n  console.log(key + ": " + person[key]);\n}\n\nconsole.log("\\nThese concepts work in all languages! 🌍");', 'Create an array of 5 of your favorite things. Then create an object with 3 facts about yourself. Print them all!', '["Arrays: let favorites = [\\"pizza\\", \\"games\\"]", "Objects: let me = { name: \\"...\\" }", "Use for loops to print arrays", "Use for...in to print objects"]', 2],
        ];

        const insertLesson = 'INSERT OR IGNORE INTO lessons (id, module_id, title, content, example_code, challenge, hints, order_num) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';

        // Insert achievements
        const achievements = [
          [1, 'First Steps! 👶', 'Complete your very first lesson', '🌟', 100, 'complete_first_lesson'],
          [2, 'Code Newbie 🌱', 'Complete 5 lessons', '🌱', 150, 'complete_5_lessons'],
          [3, 'Turtle Artist 🎨', 'Draw something with the turtle', '🐢', 200, 'use_turtle'],
          [4, 'Loop Master 🔄', 'Use a for loop in your code', '🔄', 150, 'use_loop'],
          [5, 'Module Champion 🏆', 'Complete an entire module', '🏆', 500, 'complete_module'],
          [6, 'Code Ninja ⚡', 'Earn 1000 XP', '⚡', 300, 'earn_1000_xp'],
          [7, 'Explorer 🗺️', 'Try all 5 modules', '🗺️', 250, 'try_all_modules'],
          [8, 'Consistent Coder 📅', 'Code for 3 days in a row', '📅', 200, 'streak_3'],
        ];

        const insertAchievement = 'INSERT OR IGNORE INTO achievements (id, name, description, icon, xp_reward, condition) VALUES (?, ?, ?, ?, ?, ?)';

        database.serialize(() => {
          modules.forEach((m) => database.run(insertModule, m));
          lessons.forEach((l) => database.run(insertLesson, l));
          achievements.forEach((a) => database.run(insertAchievement, a));
        });

        // No seeded accounts: a fresh database must contain no child personal
        // data or credentials. Accounts are created through the API only.
      });
    });

    // Queue a final no-op; sqlite3 runs serialized statements in order, so its
    // callback fires after all schema statements above have completed.
    database.serialize(() => {
      database.get('SELECT 1', (err) => (err ? reject(err) : resolve(database)));
    });
  });
}

module.exports = { getDb, initializeDatabase };
