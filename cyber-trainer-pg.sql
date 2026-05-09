CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  full_name VARCHAR(100) DEFAULT '',
  email VARCHAR(100) DEFAULT '',
  role VARCHAR(20) DEFAULT 'student' CHECK (role IN ('admin','teacher','student')),
  is_blocked SMALLINT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE courses (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(50) UNIQUE,
  title VARCHAR(100),
  description VARCHAR(255),
  icon TEXT,
  content TEXT,
  author_id INT REFERENCES users(id) ON DELETE SET NULL,
  type VARCHAR(20) DEFAULT 'lesson' CHECK (type IN ('lesson','exam')),
  time_limit INT DEFAULT 10,
  max_errors INT DEFAULT NULL
);

CREATE TABLE course_access (
  id SERIAL PRIMARY KEY,
  student_id INT REFERENCES users(id) ON DELETE CASCADE,
  course_id INT REFERENCES courses(id) ON DELETE CASCADE,
  granted_by INT,
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE questions (
  id SERIAL PRIMARY KEY,
  topic VARCHAR(50) NOT NULL,
  type VARCHAR(20) DEFAULT 'choice' CHECK (type IN ('choice','text')),
  question_text TEXT NOT NULL,
  options JSONB,
  correct_index INT,
  correct_text VARCHAR(255),
  explanation TEXT
);

CREATE TABLE results (
  id SERIAL PRIMARY KEY,
  student_name VARCHAR(100) DEFAULT 'Курсант',
  topic VARCHAR(50),
  score INT,
  total_questions INT,
  passed SMALLINT,
  date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  violations INT DEFAULT 0,
  details JSONB
);

CREATE TABLE student_lectures_view (
  id SERIAL PRIMARY KEY,
  student_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id INT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(student_id, course_id)
);

CREATE TABLE system_logs (
  id SERIAL PRIMARY KEY,
  user_id INT,
  username VARCHAR(255),
  action VARCHAR(50) NOT NULL,
  details TEXT,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Dump Users
INSERT INTO users (id, username, password, full_name, email, role, is_blocked, created_at, last_seen) VALUES 
(18, 'admin', 'a362ef86401b4fe554de998ed97c6fa2:95cc3e2a72e8433ac2f18bd7eb9e1753c58af42f9d45d4daab6f461751248177d97e4b3dbc3b8bc585e2793610edb5d02cbd447b1dec93e945c3b6b5b6bfd383', 'Главный Администратор', '', 'admin', 0, '2025-12-09 05:04:05', '2025-12-11 03:10:09'),
(32, 'student', '5f61765237cff9f3fdf2e74f57be50d0:cf4ae35c2bc423d127b4e313ea8af23ac413b3897557317b14a4d0d6523e1b456c43f67ea9ef9b46138067446329b7e3139e2d689d555ff0350809ee05861201', 'Петров Петр Петрович', 'teststudent@mail.com', 'student', 0, '2025-12-09 06:29:46', '2025-12-11 03:09:46'),
(33, 'teacher', '118805b7029feca213ab74c175ae50d3:80d18108813fa9399f13b6a4ce1803f40271ea3814c8c10894fa30e0a86013696dd432b0f5cab978fbfadce22648eb11f3e77f2e5da985f4e00d1327efc653fb', 'Сидоров Сидор Сидорович', 'testteacher@mail.com', 'teacher', 0, '2025-12-09 06:30:08', '2025-12-11 03:10:16');

-- Reset users ID sequence so new inserts don't fail
SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));

-- Dump Courses
INSERT INTO courses (id, slug, title, description, icon, content, author_id, type, time_limit, max_errors) VALUES 
(30, 'lec-ocnh3s', 'test', 'test', '?', '<p>test</p><pre class="ql-syntax" spellcheck="false">test\n</pre>', 33, 'lesson', 10, NULL),
(31, 'ex-2frb13', 'test', 'test', '⏱', 'Exam Mode', 33, 'exam', 1, 3),
(32, 'ex-n9ph24', 'qwe', 'qwe', '⏱', 'Exam Mode', 33, 'exam', 2, 0);

SELECT setval('courses_id_seq', (SELECT MAX(id) FROM courses));

-- Dump Course Access
INSERT INTO course_access (id, student_id, course_id, granted_by, granted_at) VALUES 
(14, 32, 30, 33, '2025-12-09 06:38:55'),
(15, 32, 31, 33, '2025-12-09 06:38:59'),
(16, 32, 32, 33, '2025-12-09 06:45:31');

SELECT setval('course_access_id_seq', (SELECT MAX(id) FROM course_access));

-- Dump Questions
INSERT INTO questions (id, topic, type, question_text, options, correct_index, correct_text, explanation) VALUES 
(41, 'ex-2frb13', 'choice', 'test1', '["test", "test1", "test"]', 1, NULL, ''),
(42, 'ex-2frb13', 'text', 'test1', NULL, NULL, 'regex:test', 'test'),
(43, 'ex-2frb13', 'choice', 'test', '["test", "test2", "test"]', 1, NULL, 'test'),
(44, 'ex-n9ph24', 'choice', 'asd', '["asd", "asd1"]', 1, NULL, ''),
(45, 'ex-n9ph24', 'choice', 'asd', '["asd", "asd1"]', 1, NULL, ''),
(46, 'ex-n9ph24', 'choice', 'asd', '["asd", "asd12", "asd1"]', 1, NULL, '');

SELECT setval('questions_id_seq', (SELECT MAX(id) FROM questions));

-- Dump Results
INSERT INTO results (id, student_name, topic, score, total_questions, passed, date, violations, details) VALUES 
(25, 'student', 'ex-2frb13', 3, 3, 1, '2025-12-09 06:39:23', 0, '[{"question": "test1", "isCorrect": true, "userAnswer": "test1", "correctAnswer": "test1"}, {"question": "test1", "isCorrect": true, "userAnswer": "test", "correctAnswer": "(Pattern: test)"}, {"question": "test", "isCorrect": true, "userAnswer": "test2", "correctAnswer": "test2"}]'),
(26, 'student', 'ex-2frb13', 0, 3, 0, '2025-12-09 06:39:49', 0, '[]'),
(27, 'student', 'ex-2frb13', 0, 3, 0, '2025-12-09 06:40:12', 2, '[]'),
(28, 'student', 'ex-2frb13', 3, 3, 1, '2025-12-09 06:40:24', 0, '[{"question": "test1", "isCorrect": true, "userAnswer": "test", "correctAnswer": "(Pattern: test)"}, {"question": "test", "isCorrect": true, "userAnswer": "test2", "correctAnswer": "test2"}, {"question": "test1", "isCorrect": true, "userAnswer": "test1", "correctAnswer": "test1"}]'),
(29, 'student', 'ex-2frb13', 1, 3, 1, '2025-12-09 06:40:41', 0, '[{"question": "test1", "isCorrect": false, "userAnswer": "adsa", "correctAnswer": "(Pattern: test)"}, {"question": "test", "isCorrect": false, "userAnswer": "test", "correctAnswer": "test2"}, {"question": "test1", "isCorrect": true, "userAnswer": "test1", "correctAnswer": "test1"}]'),
(30, 'student', 'ex-n9ph24', 0, 1, 1, '2025-12-09 06:45:43', 0, '[{"question": "asd", "isCorrect": false, "userAnswer": "asd", "correctAnswer": "asd1"}]'),
(31, 'student', 'ex-n9ph24', 0, 3, 0, '2025-12-09 06:47:54', 0, '[{"question": "asd", "isCorrect": false, "userAnswer": "asd", "correctAnswer": "asd12"}]'),
(32, 'student', 'ex-n9ph24', 0, 3, 0, '2025-12-09 06:50:01', 2, '[]');

SELECT setval('results_id_seq', (SELECT MAX(id) FROM results));

-- Dump Student Lectures View
INSERT INTO student_lectures_view (id, student_id, course_id, viewed_at) VALUES 
(24, 32, 30, '2025-12-09 06:39:06');

SELECT setval('student_lectures_view_id_seq', (SELECT MAX(id) FROM student_lectures_view));
