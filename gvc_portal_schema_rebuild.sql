-- Grand Valley College Portal: Full Schema Recreation
-- Generated from Sequelize models and migration scripts
-- Date: 2026-03-23

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- Drop existing tables to clear broken InnoDB dictionary entries
DROP TABLE IF EXISTS enrollments;
DROP TABLE IF EXISTS module_enrollments;
DROP TABLE IF EXISTS student_gpa_records;
DROP TABLE IF EXISTS student_grades;
DROP TABLE IF EXISTS grade_submissions;
DROP TABLE IF EXISTS assessment_tasks;
DROP TABLE IF EXISTS module_prerequisites;
DROP TABLE IF EXISTS level_modules;
DROP TABLE IF EXISTS modules;
DROP TABLE IF EXISTS batches;
DROP TABLE IF EXISTS academic_years;
DROP TABLE IF EXISTS grade_scale_items;
DROP TABLE IF EXISTS grading_policies;
DROP TABLE IF EXISTS students;
DROP TABLE IF EXISTS student_id_sequences;
DROP TABLE IF EXISTS staff;
DROP TABLE IF EXISTS staff_id_sequences;
DROP TABLE IF EXISTS instructors;
DROP TABLE IF EXISTS occupations;
DROP TABLE IF EXISTS sectors;
DROP TABLE IF EXISTS user_roles;
DROP TABLE IF EXISTS role_permissions;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS permissions;
DROP TABLE IF EXISTS user_accounts;
DROP TABLE IF EXISTS persons;

-- 1. persons
CREATE TABLE IF NOT EXISTS persons (
  person_id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  first_name VARCHAR(80) NOT NULL,
  middle_name VARCHAR(80),
  last_name VARCHAR(80) NOT NULL,
  gender ENUM('M','F'),
  date_of_birth DATE,
  phone VARCHAR(30),
  email VARCHAR(190),
  photo_url VARCHAR(255),
  deleted_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_persons_email (email)
) ENGINE=InnoDB;

-- 2. staff
CREATE TABLE IF NOT EXISTS staff (
  staff_id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  person_id BIGINT UNSIGNED NOT NULL UNIQUE,
  staff_code VARCHAR(30) NOT NULL UNIQUE,
  staff_type ENUM('FINANCE','REGISTRAR','QA','ADMIN') NOT NULL,
  employment_status ENUM('ACTIVE','ON_LEAVE','INACTIVE') DEFAULT 'ACTIVE',
  deleted_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (person_id) REFERENCES persons(person_id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 3. staff_id_sequences
CREATE TABLE IF NOT EXISTS staff_id_sequences (
  category ENUM('INST','STF') NOT NULL,
  reg_year SMALLINT UNSIGNED NOT NULL,
  last_seq INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (category, reg_year)
) ENGINE=InnoDB;

-- 4. instructors
CREATE TABLE IF NOT EXISTS instructors (
  instructor_id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  person_id BIGINT UNSIGNED NOT NULL UNIQUE,
  staff_code VARCHAR(50) NOT NULL UNIQUE,
  occupation_id INT,
  hire_date DATE,
  qualification VARCHAR(180),
  employment_status ENUM('ACTIVE','ON_LEAVE','INACTIVE') DEFAULT 'ACTIVE',
  deleted_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (person_id) REFERENCES persons(person_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  FOREIGN KEY (occupation_id) REFERENCES occupations(occupation_id) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;

-- 5. students
CREATE TABLE IF NOT EXISTS students (
  student_pk BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  person_id BIGINT UNSIGNED NOT NULL UNIQUE,
  student_id VARCHAR(30) NOT NULL UNIQUE,
  reg_year SMALLINT UNSIGNED NOT NULL,
  reg_sequence INT UNSIGNED NOT NULL,
  occupation_id INT NOT NULL,
  level_id TINYINT UNSIGNED NOT NULL,
  batch_id BIGINT UNSIGNED NOT NULL,
  admission_date DATE DEFAULT CURRENT_DATE,
  status ENUM('ACTIVE','SUSPENDED','GRADUATED','DROPPED') DEFAULT 'ACTIVE',
  deleted_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (person_id) REFERENCES persons(person_id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 6. student_id_sequences
CREATE TABLE IF NOT EXISTS student_id_sequences (
  reg_year SMALLINT UNSIGNED PRIMARY KEY,
  last_seq INT UNSIGNED DEFAULT 0
) ENGINE=InnoDB;

-- 7. user_accounts
CREATE TABLE IF NOT EXISTS user_accounts (
  user_id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  person_id BIGINT UNSIGNED NOT NULL UNIQUE,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  hash_algorithm ENUM('BCRYPT','ARGON2ID') DEFAULT 'ARGON2ID',
  status ENUM('ACTIVE','LOCKED','DISABLED') DEFAULT 'ACTIVE',
  must_change_password BOOLEAN DEFAULT FALSE,
  last_login_at DATETIME,
  deleted_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (person_id) REFERENCES persons(person_id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 8. roles
CREATE TABLE IF NOT EXISTS roles (
  role_id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  role_code VARCHAR(50) NOT NULL UNIQUE,
  role_name VARCHAR(120) NOT NULL
) ENGINE=InnoDB;

-- 9. permissions
CREATE TABLE IF NOT EXISTS permissions (
  permission_id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  permission_code VARCHAR(80) NOT NULL UNIQUE,
  permission_name VARCHAR(160) NOT NULL,
  module_scope VARCHAR(80) NOT NULL
) ENGINE=InnoDB;

-- 10. user_roles
CREATE TABLE IF NOT EXISTS user_roles (
  user_id BIGINT UNSIGNED NOT NULL,
  role_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (user_id, role_id),
  FOREIGN KEY (user_id) REFERENCES user_accounts(user_id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(role_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 11. role_permissions
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id BIGINT UNSIGNED NOT NULL,
  permission_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  FOREIGN KEY (role_id) REFERENCES roles(role_id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(permission_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 12. sectors
CREATE TABLE IF NOT EXISTS sectors (
  sector_id INT PRIMARY KEY AUTO_INCREMENT,
  sector_code VARCHAR(10) NOT NULL UNIQUE,
  sector_name VARCHAR(100) NOT NULL
) ENGINE=InnoDB;

-- 13. occupations
CREATE TABLE IF NOT EXISTS occupations (
  occupation_id INT PRIMARY KEY AUTO_INCREMENT,
  sector_id INT NOT NULL,
  occupation_code VARCHAR(10) NOT NULL UNIQUE,
  occupation_name VARCHAR(150) NOT NULL,
  FOREIGN KEY (sector_id) REFERENCES sectors(sector_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 14. levels
CREATE TABLE IF NOT EXISTS levels (
  level_id TINYINT UNSIGNED PRIMARY KEY,
  occupation_id INT NOT NULL,
  level_name ENUM('I','II','III','IV','V') NOT NULL,
  FOREIGN KEY (occupation_id) REFERENCES occupations(occupation_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 15. modules
CREATE TABLE IF NOT EXISTS modules (
  module_id INT PRIMARY KEY AUTO_INCREMENT,
  m_code VARCHAR(60) NOT NULL UNIQUE,
  occupation_id INT NOT NULL,
  unit_competency VARCHAR(255) NOT NULL,
  theory_hours INT DEFAULT 0,
  practical_hours INT DEFAULT 0,
  cooperative_hours INT DEFAULT 0,
  learning_hours INT DEFAULT 0,
  credit_units DECIMAL(5,2) NOT NULL,
  deleted_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (occupation_id) REFERENCES occupations(occupation_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 16. level_modules
CREATE TABLE IF NOT EXISTS level_modules (
  level_module_id INT PRIMARY KEY AUTO_INCREMENT,
  occupation_id INT NOT NULL,
  level_id TINYINT UNSIGNED NOT NULL,
  m_code VARCHAR(60) NOT NULL,
  semester TINYINT UNSIGNED DEFAULT 1,
  FOREIGN KEY (occupation_id) REFERENCES occupations(occupation_id) ON DELETE CASCADE,
  FOREIGN KEY (level_id) REFERENCES levels(level_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 17. academic_years
CREATE TABLE IF NOT EXISTS academic_years (
  academic_year_id INT PRIMARY KEY AUTO_INCREMENT,
  academic_year_label VARCHAR(20) NOT NULL UNIQUE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL
) ENGINE=InnoDB;

-- 18. batches
CREATE TABLE IF NOT EXISTS batches (
  batch_id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  occupation_id INT NOT NULL,
  academic_year_id INT NOT NULL,
  level_id TINYINT UNSIGNED NOT NULL,
  grading_policy_id BIGINT UNSIGNED,
  batch_code VARCHAR(40) UNIQUE,
  track_type ENUM('REGULAR','EXTENSION') DEFAULT 'REGULAR',
  capacity INT DEFAULT 0,
  FOREIGN KEY (occupation_id) REFERENCES occupations(occupation_id) ON DELETE CASCADE,
  FOREIGN KEY (academic_year_id) REFERENCES academic_years(academic_year_id) ON DELETE CASCADE,
  FOREIGN KEY (level_id) REFERENCES levels(level_id) ON DELETE CASCADE,
  FOREIGN KEY (grading_policy_id) REFERENCES grading_policies(policy_id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 19. grading_policies
CREATE TABLE IF NOT EXISTS grading_policies (
  policy_id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  policy_name VARCHAR(120) NOT NULL UNIQUE,
  is_locked BOOLEAN NOT NULL DEFAULT FALSE
) ENGINE=InnoDB;

-- 20. grade_scale_items
CREATE TABLE IF NOT EXISTS grade_scale_items (
  scale_item_id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  policy_id BIGINT UNSIGNED NOT NULL,
  letter_grade VARCHAR(8) NOT NULL,
  min_score DECIMAL(6,2) NOT NULL,
  max_score DECIMAL(6,2) NOT NULL,
  grade_points DECIMAL(3,2) NOT NULL DEFAULT 0,
  is_pass BOOLEAN NOT NULL DEFAULT TRUE,
  FOREIGN KEY (policy_id) REFERENCES grading_policies(policy_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 21. assessment_tasks
CREATE TABLE IF NOT EXISTS assessment_tasks (
  task_id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  batch_id BIGINT UNSIGNED NOT NULL,
  module_id INT NOT NULL,
  task_name VARCHAR(120) NOT NULL,
  task_type ENUM('EXAM','QUIZ','PROJECT','ASSIGNMENT','LAB','PRESENTATION','OTHER') NOT NULL,
  max_weight DECIMAL(5,2) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_assessment_tasks_batch_module (batch_id, module_id),
  FOREIGN KEY (batch_id) REFERENCES batches(batch_id) ON DELETE CASCADE,
  FOREIGN KEY (module_id) REFERENCES modules(module_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 22. student_grades
CREATE TABLE IF NOT EXISTS student_grades (
  grade_id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  student_pk BIGINT UNSIGNED NOT NULL,
  task_id BIGINT UNSIGNED NOT NULL,
  obtained_score DECIMAL(6,2) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_student_task (student_pk, task_id),
  FOREIGN KEY (student_pk) REFERENCES students(student_pk) ON DELETE CASCADE,
  FOREIGN KEY (task_id) REFERENCES assessment_tasks(task_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 23. grade_submissions
CREATE TABLE IF NOT EXISTS grade_submissions (
  submission_id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  batch_id BIGINT UNSIGNED NOT NULL,
  module_id INT NOT NULL,
  status ENUM('DRAFT','SUBMITTED','REJECTED','HOD_APPROVED','QA_APPROVED','TVET_APPROVED','FINALIZED') DEFAULT 'DRAFT',
  note TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_batch_module (batch_id, module_id),
  FOREIGN KEY (batch_id) REFERENCES batches(batch_id) ON DELETE CASCADE,
  FOREIGN KEY (module_id) REFERENCES modules(module_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 24. module_enrollments
CREATE TABLE IF NOT EXISTS module_enrollments (
  enrollment_id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  student_pk BIGINT UNSIGNED NOT NULL,
  module_id INT NOT NULL,
  batch_id BIGINT UNSIGNED NOT NULL,
  final_score DECIMAL(6,2),
  letter_grade VARCHAR(8),
  grade_points DECIMAL(3,2),
  status ENUM('PASSED','FAILED') DEFAULT 'PASSED',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_student_module_batch (student_pk, module_id, batch_id),
  FOREIGN KEY (student_pk) REFERENCES students(student_pk) ON DELETE CASCADE,
  FOREIGN KEY (module_id) REFERENCES modules(module_id) ON DELETE CASCADE,
  FOREIGN KEY (batch_id) REFERENCES batches(batch_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 25. enrollments
CREATE TABLE IF NOT EXISTS enrollments (
  enrollment_id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  student_pk BIGINT UNSIGNED NOT NULL,
  module_id INT NOT NULL,
  batch_id BIGINT UNSIGNED NOT NULL,
  status ENUM('ENROLLED','DROPPED','COMPLETED') DEFAULT 'ENROLLED',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_student_module_batch (student_pk, module_id, batch_id),
  FOREIGN KEY (student_pk) REFERENCES students(student_pk) ON DELETE CASCADE,
  FOREIGN KEY (module_id) REFERENCES modules(module_id) ON DELETE CASCADE,
  FOREIGN KEY (batch_id) REFERENCES batches(batch_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 26. module_prerequisites
CREATE TABLE IF NOT EXISTS module_prerequisites (
  prerequisite_id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  module_id INT NOT NULL,
  required_module_id INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_module_required (module_id, required_module_id),
  FOREIGN KEY (module_id) REFERENCES modules(module_id) ON DELETE CASCADE,
  FOREIGN KEY (required_module_id) REFERENCES modules(module_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 27. student_gpa_records
CREATE TABLE IF NOT EXISTS student_gpa_records (
  gpa_record_id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  student_pk BIGINT UNSIGNED NOT NULL,
  batch_id BIGINT UNSIGNED NOT NULL,
  semester_gpa DECIMAL(4,2) NOT NULL DEFAULT 0,
  cumulative_gpa DECIMAL(4,2) NOT NULL DEFAULT 0,
  total_credits DECIMAL(6,2) NOT NULL DEFAULT 0,
  total_grade_points DECIMAL(8,2) NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_student_batch (student_pk, batch_id),
  FOREIGN KEY (student_pk) REFERENCES students(student_pk) ON DELETE CASCADE,
  FOREIGN KEY (batch_id) REFERENCES batches(batch_id) ON DELETE CASCADE
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;
