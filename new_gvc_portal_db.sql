-- ==============================================
-- CORE TABLES (No Foreign Key Dependencies)
-- ==============================================

-- 1. Sector table
CREATE TABLE `sectors` (
  `sector_id` INT NOT NULL AUTO_INCREMENT,
  `sector_code` VARCHAR(10) NOT NULL UNIQUE,
  `sector_name` VARCHAR(100) NOT NULL,
  PRIMARY KEY (`sector_id`)
) ENGINE=InnoDB;

-- 2. Occupation table
CREATE TABLE `occupations` (
  `occupation_id` INT NOT NULL AUTO_INCREMENT,
  `sector_id` INT NOT NULL,
  `occupation_code` VARCHAR(10) NOT NULL UNIQUE,
  `occupation_name` VARCHAR(150) NOT NULL,
  PRIMARY KEY (`occupation_id`),
  FOREIGN KEY (`sector_id`) REFERENCES `sectors`(`sector_id`) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 3. Persons table
CREATE TABLE `persons` (
  `person_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `first_name` VARCHAR(80) NOT NULL,
  `middle_name` VARCHAR(80),
  `last_name` VARCHAR(80) NOT NULL,
  `gender` ENUM('M', 'F'),
  `date_of_birth` DATE,
  `phone` VARCHAR(30),
  `email` VARCHAR(190),
  `photo_url` VARCHAR(255),
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` DATETIME,
  PRIMARY KEY (`person_id`),
  INDEX `idx_person_email` (`email`),
  INDEX `idx_person_name` (`last_name`, `first_name`)
) ENGINE=InnoDB;

-- 4. User Accounts table
CREATE TABLE `user_accounts` (
  `user_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `person_id` BIGINT UNSIGNED NOT NULL UNIQUE,
  `email` VARCHAR(190) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `hash_algorithm` ENUM('BCRYPT', 'ARGON2ID') DEFAULT 'ARGON2ID',
  `status` ENUM('ACTIVE', 'LOCKED', 'DISABLED') DEFAULT 'ACTIVE',
  `must_change_password` BOOLEAN DEFAULT FALSE,
  `last_login_at` DATETIME,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` DATETIME,
  PRIMARY KEY (`user_id`),
  FOREIGN KEY (`person_id`) REFERENCES `persons`(`person_id`) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 5. Roles table
CREATE TABLE `roles` (
  `role_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `role_code` VARCHAR(50) NOT NULL UNIQUE,
  `role_name` VARCHAR(120) NOT NULL,
  `permissions` JSON,
  PRIMARY KEY (`role_id`)
) ENGINE=InnoDB;

-- 6. Permissions table
CREATE TABLE `permissions` (
  `permission_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `permission_code` VARCHAR(80) NOT NULL UNIQUE,
  `permission_name` VARCHAR(160) NOT NULL,
  `module_scope` VARCHAR(80) NOT NULL,
  PRIMARY KEY (`permission_id`)
) ENGINE=InnoDB;

-- 7. User Roles
CREATE TABLE `user_roles` (
  `user_id` BIGINT UNSIGNED NOT NULL,
  `role_id` BIGINT UNSIGNED NOT NULL,
  `assigned_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`, `role_id`),
  FOREIGN KEY (`user_id`) REFERENCES `user_accounts`(`user_id`) ON DELETE CASCADE,
  FOREIGN KEY (`role_id`) REFERENCES `roles`(`role_id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 8. Role Permissions
CREATE TABLE `role_permissions` (
  `role_id` BIGINT UNSIGNED NOT NULL,
  `permission_id` BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (`role_id`, `permission_id`),
  FOREIGN KEY (`role_id`) REFERENCES `roles`(`role_id`) ON DELETE CASCADE,
  FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`permission_id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 9. Level table
CREATE TABLE `levels` (
  `level_id` TINYINT UNSIGNED NOT NULL,
  `occupation_id` INT NOT NULL,
  `level_name` ENUM('I','II','III','IV','V') NOT NULL,
  PRIMARY KEY (`level_id`, `occupation_id`),
  FOREIGN KEY (`occupation_id`) REFERENCES `occupations`(`occupation_id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 10. Module table
CREATE TABLE `modules` (
  `module_id` INT NOT NULL AUTO_INCREMENT,
  `m_code` VARCHAR(60) NOT NULL UNIQUE,
  `occupation_id` INT NOT NULL,
  `unit_competency` VARCHAR(255) NOT NULL,
  `theory_hours` INT DEFAULT 0,
  `practical_hours` INT DEFAULT 0,
  `cooperative_hours` INT DEFAULT 0,
  `learning_hours` INT DEFAULT 0,
  `credit_units` DECIMAL(5,2) NOT NULL,
  `assessments` JSON DEFAULT NULL COMMENT 'Array of assessment tasks with weights that sum to 100',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` DATETIME,
  PRIMARY KEY (`module_id`),
  FOREIGN KEY (`occupation_id`) REFERENCES `occupations`(`occupation_id`) ON DELETE RESTRICT,
  INDEX `idx_module_code` (`m_code`)
) ENGINE=InnoDB;

-- 11. Academic Year table
CREATE TABLE `academic_years` (
  `academic_year_id` INT NOT NULL AUTO_INCREMENT,
  `academic_year_label` VARCHAR(20) NOT NULL UNIQUE,
  `start_date` DATE NOT NULL,
  `end_date` DATE NOT NULL,
  PRIMARY KEY (`academic_year_id`)
) ENGINE=InnoDB;

-- 12. Grading Policy table
CREATE TABLE `grading_policies` (
  `policy_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `policy_name` VARCHAR(120) NOT NULL UNIQUE,
  `is_locked` BOOLEAN NOT NULL DEFAULT FALSE,
  `grade_scale` JSON NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`policy_id`)
) ENGINE=InnoDB;

-- ==============================================
-- TABLES WITH FOREIGN KEY DEPENDENCIES
-- ==============================================

-- 13. Batch table
CREATE TABLE `batches` (
  `batch_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `occupation_id` INT NOT NULL,
  `academic_year_id` INT NOT NULL,
  `level_id` TINYINT UNSIGNED NOT NULL,
  `grading_policy_id` BIGINT UNSIGNED,
  `batch_code` VARCHAR(40) UNIQUE,
  `track_type` ENUM('REGULAR', 'EXTENSION') DEFAULT 'REGULAR',
  `capacity` INT DEFAULT 0,
  `metadata` JSON,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` DATETIME,
  PRIMARY KEY (`batch_id`),
  FOREIGN KEY (`occupation_id`) REFERENCES `occupations`(`occupation_id`) ON DELETE RESTRICT,
  FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years`(`academic_year_id`) ON DELETE RESTRICT,
  FOREIGN KEY (`level_id`) REFERENCES `levels`(`level_id`),
  FOREIGN KEY (`grading_policy_id`) REFERENCES `grading_policies`(`policy_id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 14. Level Module table
CREATE TABLE `level_modules` (
  `level_module_id` INT NOT NULL AUTO_INCREMENT,
  `occupation_id` INT NOT NULL,
  `level_id` TINYINT UNSIGNED NOT NULL,
  `m_code` VARCHAR(60) NOT NULL,
  `semester` TINYINT UNSIGNED DEFAULT 1,
  `is_elective` BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (`level_module_id`),
  FOREIGN KEY (`occupation_id`) REFERENCES `occupations`(`occupation_id`) ON DELETE CASCADE,
  FOREIGN KEY (`level_id`) REFERENCES `levels`(`level_id`),
  FOREIGN KEY (`m_code`) REFERENCES `modules`(`m_code`) ON DELETE CASCADE,
  INDEX `idx_level_module` (`level_id`, `occupation_id`, `semester`)
) ENGINE=InnoDB;

-- 15. Students table
CREATE TABLE `students` (
  `student_pk` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `person_id` BIGINT UNSIGNED NOT NULL UNIQUE,
  `student_id` VARCHAR(30) NOT NULL UNIQUE,
  `reg_year` SMALLINT UNSIGNED NOT NULL,
  `reg_sequence` INT UNSIGNED NOT NULL,
  `occupation_id` INT NOT NULL,
  `level_id` TINYINT UNSIGNED NOT NULL,
  `batch_id` BIGINT UNSIGNED NOT NULL,
  `admission_date` DATE DEFAULT (CURRENT_DATE),
  `status` ENUM('ACTIVE', 'SUSPENDED', 'GRADUATED', 'DROPPED') DEFAULT 'ACTIVE',
  `contact_info` JSON,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` DATETIME,
  PRIMARY KEY (`student_pk`),
  FOREIGN KEY (`person_id`) REFERENCES `persons`(`person_id`) ON DELETE RESTRICT,
  FOREIGN KEY (`occupation_id`) REFERENCES `occupations`(`occupation_id`) ON DELETE RESTRICT,
  FOREIGN KEY (`level_id`) REFERENCES `levels`(`level_id`),
  FOREIGN KEY (`batch_id`) REFERENCES `batches`(`batch_id`) ON DELETE RESTRICT,
  INDEX `idx_student_id` (`student_id`),
  INDEX `idx_student_status` (`status`)
) ENGINE=InnoDB;

-- 16. Student ID Sequence table
CREATE TABLE `student_id_sequences` (
  `reg_year` SMALLINT UNSIGNED NOT NULL,
  `last_seq` INT UNSIGNED DEFAULT 0,
  PRIMARY KEY (`reg_year`)
) ENGINE=InnoDB;

-- 17. Instructors table
CREATE TABLE `instructors` (
  `instructor_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `person_id` BIGINT UNSIGNED NOT NULL UNIQUE,
  `staff_code` VARCHAR(50) NOT NULL UNIQUE,
  `occupation_id` INT,
  `hire_date` DATE,
  `qualification` VARCHAR(180),
  `specializations` JSON,
  `employment_status` ENUM('ACTIVE', 'ON_LEAVE', 'INACTIVE') DEFAULT 'ACTIVE',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` DATETIME,
  PRIMARY KEY (`instructor_id`),
  FOREIGN KEY (`person_id`) REFERENCES `persons`(`person_id`) ON DELETE RESTRICT,
  FOREIGN KEY (`occupation_id`) REFERENCES `occupations`(`occupation_id`) ON DELETE SET NULL,
  INDEX `idx_staff_code` (`staff_code`)
) ENGINE=InnoDB;

-- 18. Module Prerequisites table
CREATE TABLE `module_prerequisites` (
  `prerequisite_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `module_id` INT NOT NULL,
  `required_module_id` INT NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`prerequisite_id`),
  UNIQUE KEY `unique_prerequisite` (`module_id`, `required_module_id`),
  FOREIGN KEY (`module_id`) REFERENCES `modules`(`module_id`) ON DELETE CASCADE,
  FOREIGN KEY (`required_module_id`) REFERENCES `modules`(`module_id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 19. Enrollments table
CREATE TABLE `enrollments` (
  `enrollment_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `student_pk` BIGINT UNSIGNED NOT NULL,
  `module_id` INT NOT NULL,
  `batch_id` BIGINT UNSIGNED NOT NULL,
  `status` ENUM('ENROLLED', 'DROPPED', 'COMPLETED') NOT NULL DEFAULT 'ENROLLED',
  `enrolled_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `dropped_at` DATETIME,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`enrollment_id`),
  UNIQUE KEY `unique_enrollment` (`student_pk`, `module_id`, `batch_id`),
  FOREIGN KEY (`student_pk`) REFERENCES `students`(`student_pk`) ON DELETE CASCADE,
  FOREIGN KEY (`module_id`) REFERENCES `modules`(`module_id`) ON DELETE RESTRICT,
  FOREIGN KEY (`batch_id`) REFERENCES `batches`(`batch_id`) ON DELETE CASCADE,
  INDEX `idx_enrollment_status` (`status`)
) ENGINE=InnoDB;

-- 20. Student Grades table
CREATE TABLE `student_grades` (
  `grade_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `student_pk` BIGINT UNSIGNED NOT NULL,
  `module_id` INT NOT NULL,
  `batch_id` BIGINT UNSIGNED NOT NULL,
  `assessment_scores` JSON NOT NULL,
  `total_score` DECIMAL(6,2) AS (CAST(JSON_EXTRACT(assessment_scores, '$**.score') AS DECIMAL(6,2))) STORED,
  `final_score` DECIMAL(6,2),
  `letter_grade` VARCHAR(8),
  `grade_points` DECIMAL(3,2),
  `status` ENUM('PASSED', 'FAILED', 'PENDING') DEFAULT 'PENDING',
  `submitted_by` BIGINT UNSIGNED,
  `submitted_at` DATETIME,
  `approved_by` BIGINT UNSIGNED,
  `approved_at` DATETIME,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`grade_id`),
  UNIQUE KEY `unique_student_module_batch` (`student_pk`, `module_id`, `batch_id`),
  FOREIGN KEY (`student_pk`) REFERENCES `students`(`student_pk`) ON DELETE CASCADE,
  FOREIGN KEY (`module_id`) REFERENCES `modules`(`module_id`) ON DELETE RESTRICT,
  FOREIGN KEY (`batch_id`) REFERENCES `batches`(`batch_id`) ON DELETE CASCADE,
  FOREIGN KEY (`submitted_by`) REFERENCES `instructors`(`instructor_id`) ON DELETE SET NULL,
  FOREIGN KEY (`approved_by`) REFERENCES `instructors`(`instructor_id`) ON DELETE SET NULL,
  INDEX `idx_final_score` (`final_score`),
  INDEX `idx_grade_status` (`status`)
) ENGINE=InnoDB;

-- 21. Grade Submissions table
CREATE TABLE `grade_submissions` (
  `submission_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `batch_id` BIGINT UNSIGNED NOT NULL,
  `module_id` INT NOT NULL,
  `instructor_id` BIGINT UNSIGNED NOT NULL,
  `status` ENUM('DRAFT', 'SUBMITTED', 'REJECTED', 'HOD_APPROVED', 'QA_APPROVED', 'TVET_APPROVED', 'FINALIZED') NOT NULL DEFAULT 'DRAFT',
  `submission_data` JSON,
  `note` TEXT,
  `review_comments` JSON,
  `submitted_at` DATETIME,
  `hod_approved_at` DATETIME,
  `qa_approved_at` DATETIME,
  `tvet_approved_at` DATETIME,
  `finalized_at` DATETIME,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`submission_id`),
  UNIQUE KEY `unique_batch_module` (`batch_id`, `module_id`),
  FOREIGN KEY (`batch_id`) REFERENCES `batches`(`batch_id`) ON DELETE CASCADE,
  FOREIGN KEY (`module_id`) REFERENCES `modules`(`module_id`) ON DELETE RESTRICT,
  FOREIGN KEY (`instructor_id`) REFERENCES `instructors`(`instructor_id`) ON DELETE RESTRICT,
  INDEX `idx_submission_status` (`status`)
) ENGINE=InnoDB;

-- 22. Student GPA Records table
CREATE TABLE `student_gpa_records` (
  `gpa_record_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `student_pk` BIGINT UNSIGNED NOT NULL,
  `batch_id` BIGINT UNSIGNED NOT NULL,
  `semester` TINYINT UNSIGNED NOT NULL,
  `semester_gpa` DECIMAL(4,2) NOT NULL DEFAULT 0,
  `cumulative_gpa` DECIMAL(4,2) NOT NULL DEFAULT 0,
  `total_credits_earned` DECIMAL(6,2) NOT NULL DEFAULT 0,
  `total_credits_attempted` DECIMAL(6,2) NOT NULL DEFAULT 0,
  `total_grade_points` DECIMAL(8,2) NOT NULL DEFAULT 0,
  `semester_modules` JSON,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`gpa_record_id`),
  UNIQUE KEY `unique_student_batch_semester` (`student_pk`, `batch_id`, `semester`),
  FOREIGN KEY (`student_pk`) REFERENCES `students`(`student_pk`) ON DELETE CASCADE,
  FOREIGN KEY (`batch_id`) REFERENCES `batches`(`batch_id`) ON DELETE CASCADE,
  INDEX `idx_cumulative_gpa` (`cumulative_gpa`)
) ENGINE=InnoDB;

-- 23. Module Enrollments table
CREATE TABLE `module_enrollments` (
  `enrollment_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `student_pk` BIGINT UNSIGNED NOT NULL,
  `module_id` INT NOT NULL,
  `batch_id` BIGINT UNSIGNED NOT NULL,
  `final_score` DECIMAL(6,2),
  `letter_grade` VARCHAR(8),
  `grade_points` DECIMAL(3,2),
  `credits_earned` DECIMAL(5,2),
  `status` ENUM('PASSED', 'FAILED', 'IN_PROGRESS') NOT NULL DEFAULT 'IN_PROGRESS',
  `completed_at` DATETIME,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`enrollment_id`),
  UNIQUE KEY `unique_module_enrollment` (`student_pk`, `module_id`, `batch_id`),
  FOREIGN KEY (`student_pk`) REFERENCES `students`(`student_pk`) ON DELETE CASCADE,
  FOREIGN KEY (`module_id`) REFERENCES `modules`(`module_id`) ON DELETE RESTRICT,
  FOREIGN KEY (`batch_id`) REFERENCES `batches`(`batch_id`) ON DELETE CASCADE,
  INDEX `idx_module_enrollment_status` (`status`),
  INDEX `idx_final_grade` (`letter_grade`)
) ENGINE=InnoDB;

-- 24. Audit Log table
CREATE TABLE `audit_logs` (
  `log_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `table_name` VARCHAR(100) NOT NULL,
  `record_id` VARCHAR(100) NOT NULL,
  `action` ENUM('INSERT', 'UPDATE', 'DELETE') NOT NULL,
  `old_data` JSON,
  `new_data` JSON,
  `changed_by` BIGINT UNSIGNED,
  `changed_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`log_id`),
  FOREIGN KEY (`changed_by`) REFERENCES `user_accounts`(`user_id`) ON DELETE SET NULL,
  INDEX `idx_audit_table_record` (`table_name`, `record_id`),
  INDEX `idx_audit_changed_at` (`changed_at`)
) ENGINE=InnoDB;

-- ==============================================
-- STORED PROCEDURES FOR VALIDATION
-- ==============================================

DELIMITER //

-- Stored procedure to validate assessment weights
CREATE PROCEDURE `validate_assessment_weights`(IN assessments_json JSON, OUT is_valid BOOLEAN, OUT total_weight DECIMAL(5,2))
BEGIN
    DECLARE i INT DEFAULT 0;
    DECLARE weight_val DECIMAL(5,2);
    DECLARE json_length INT;
    
    SET total_weight = 0;
    SET is_valid = TRUE;
    
    IF assessments_json IS NOT NULL THEN
        SET json_length = JSON_LENGTH(assessments_json);
        
        WHILE i < json_length DO
            SET weight_val = CAST(JSON_EXTRACT(assessments_json, CONCAT('$[', i, '].max_weight')) AS DECIMAL(5,2));
            SET total_weight = total_weight + COALESCE(weight_val, 0);
            SET i = i + 1;
        END WHILE;
        
        IF total_weight != 100 THEN
            SET is_valid = FALSE;
        END IF;
    END IF;
END//

-- Trigger for INSERT validation
CREATE TRIGGER `check_assessments_weight` 
BEFORE INSERT ON `modules` 
FOR EACH ROW
BEGIN
    DECLARE total_weight DECIMAL(5,2);
    DECLARE is_valid BOOLEAN;
    
    IF NEW.assessments IS NOT NULL THEN
        CALL validate_assessment_weights(NEW.assessments, is_valid, total_weight);
        
        IF NOT is_valid THEN
            SIGNAL SQLSTATE '45000' 
            SET MESSAGE_TEXT = CONCAT('Total assessment weight must equal 100. Current total: ', total_weight);
        END IF;
    END IF;
END//

-- Trigger for UPDATE validation
CREATE TRIGGER `check_assessments_weight_update` 
BEFORE UPDATE ON `modules` 
FOR EACH ROW
BEGIN
    DECLARE total_weight DECIMAL(5,2);
    DECLARE is_valid BOOLEAN;
    
    IF NEW.assessments IS NOT NULL THEN
        CALL validate_assessment_weights(NEW.assessments, is_valid, total_weight);
        
        IF NOT is_valid THEN
            SIGNAL SQLSTATE '45000' 
            SET MESSAGE_TEXT = CONCAT('Total assessment weight must equal 100. Current total: ', total_weight);
        END IF;
    END IF;
END//

DELIMITER ;

-- ==============================================
-- HELPER FUNCTIONS (MariaDB Compatible)
-- ==============================================

-- Function to calculate total score from assessment scores JSON
DELIMITER //

CREATE FUNCTION `calculate_total_score`(scores_json JSON) 
RETURNS DECIMAL(6,2)
DETERMINISTIC
BEGIN
    DECLARE i INT DEFAULT 0;
    DECLARE total DECIMAL(6,2) DEFAULT 0;
    DECLARE score_val DECIMAL(6,2);
    DECLARE json_length INT;
    
    IF scores_json IS NOT NULL THEN
        SET json_length = JSON_LENGTH(scores_json);
        
        WHILE i < json_length DO
            SET score_val = CAST(JSON_EXTRACT(scores_json, CONCAT('$[', i, '].score')) AS DECIMAL(6,2));
            SET total = total + COALESCE(score_val, 0);
            SET i = i + 1;
        END WHILE;
    END IF;
    
    RETURN total;
END//

-- Function to get total assessment weight
CREATE FUNCTION `get_total_assessment_weight`(assessments_json JSON) 
RETURNS DECIMAL(5,2)
DETERMINISTIC
BEGIN
    DECLARE i INT DEFAULT 0;
    DECLARE total DECIMAL(5,2) DEFAULT 0;
    DECLARE weight_val DECIMAL(5,2);
    DECLARE json_length INT;
    
    IF assessments_json IS NOT NULL THEN
        SET json_length = JSON_LENGTH(assessments_json);
        
        WHILE i < json_length DO
            SET weight_val = CAST(JSON_EXTRACT(assessments_json, CONCAT('$[', i, '].max_weight')) AS DECIMAL(5,2));
            SET total = total + COALESCE(weight_val, 0);
            SET i = i + 1;
        END WHILE;
    END IF;
    
    RETURN total;
END//

DELIMITER ;