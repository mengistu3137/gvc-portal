/**
 * Initial comprehensive schema migration.
 *
 * Creates every table required by the application in the correct
 * dependency order so that a fresh database can be bootstrapped
 * entirely through `npx sequelize-cli db:migrate` without relying
 * on `sequelize.sync()`.
 *
 * Tables are created in sections that respect foreign-key constraints:
 *   Section 1 — leaf tables (no FK deps)
 *   Section 2 — tables that depend on Section 1
 *   Section 3 — tables that depend on Section 2
 *   Section 4 — tables that depend on Section 3
 *   Section 5 — tables that depend on Section 4
 *   Section 6 — leaf transaction/junction tables
 *
 * The `down` migration drops all tables in reverse order.
 */

export default {
  async up(queryInterface, Sequelize) {
    const t = await queryInterface.sequelize.transaction();
    try {

      // ─── Section 1: No FK dependencies ───────────────────────────────

      // 1. persons
      await queryInterface.createTable('persons', {
        person_id: {
          type: Sequelize.BIGINT.UNSIGNED,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false
        },
        first_name: { type: Sequelize.STRING(80), allowNull: false },
        middle_name: { type: Sequelize.STRING(80), allowNull: true },
        last_name: { type: Sequelize.STRING(80), allowNull: false },
        gender: { type: Sequelize.ENUM('M', 'F'), allowNull: true },
        date_of_birth: { type: Sequelize.DATEONLY, allowNull: true },
        phone: { type: Sequelize.STRING(30), allowNull: true },
        email: { type: Sequelize.STRING(190), allowNull: true },
        photo_url: { type: Sequelize.STRING(255), allowNull: true },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
        },
        deleted_at: { type: Sequelize.DATE, allowNull: true }
      }, { transaction: t });

      await queryInterface.addIndex('persons', ['email'], {
        name: 'idx_persons_email',
        transaction: t
      });

      // 2. roles
      await queryInterface.createTable('roles', {
        role_id: {
          type: Sequelize.BIGINT.UNSIGNED,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false
        },
        role_code: { type: Sequelize.STRING(50), allowNull: false, unique: true },
        role_name: { type: Sequelize.STRING(120), allowNull: false }
      }, { transaction: t });

      // 3. permissions
      await queryInterface.createTable('permissions', {
        permission_id: {
          type: Sequelize.BIGINT.UNSIGNED,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false
        },
        permission_code: { type: Sequelize.STRING(80), allowNull: false, unique: true },
        permission_name: { type: Sequelize.STRING(160), allowNull: false },
        module_scope: { type: Sequelize.STRING(80), allowNull: false }
      }, { transaction: t });

      // 4. sectors
      await queryInterface.createTable('sectors', {
        sector_id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false
        },
        sector_code: { type: Sequelize.STRING(10), allowNull: false, unique: true },
        sector_name: { type: Sequelize.STRING(100), allowNull: false }
      }, { transaction: t });

      // 5. academic_years
      await queryInterface.createTable('academic_years', {
        academic_year_id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false
        },
        academic_year_label: {
          type: Sequelize.STRING(20),
          allowNull: false,
          unique: true
        },
        start_date: { type: Sequelize.DATEONLY, allowNull: false },
        end_date: { type: Sequelize.DATEONLY, allowNull: false }
      }, { transaction: t });

      // 6. grading_policies
      await queryInterface.createTable('grading_policies', {
        policy_id: {
          type: Sequelize.BIGINT.UNSIGNED,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false
        },
        policy_name: { type: Sequelize.STRING(120), allowNull: false, unique: true },
        is_locked: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
        }
      }, { transaction: t });

      // 7. staff_id_sequences
      await queryInterface.createTable('staff_id_sequences', {
        category: {
          type: Sequelize.ENUM('INST', 'STF'),
          primaryKey: true,
          allowNull: false
        },
        reg_year: {
          type: Sequelize.SMALLINT.UNSIGNED,
          primaryKey: true,
          allowNull: false
        },
        last_seq: {
          type: Sequelize.INTEGER.UNSIGNED,
          allowNull: false,
          defaultValue: 0
        }
      }, { transaction: t });

      // 8. student_id_sequences
      await queryInterface.createTable('student_id_sequences', {
        reg_year: {
          type: Sequelize.SMALLINT.UNSIGNED,
          primaryKey: true,
          allowNull: false
        },
        last_seq: {
          type: Sequelize.INTEGER.UNSIGNED,
          allowNull: false,
          defaultValue: 0
        }
      }, { transaction: t });

      // ─── Section 2: Depends on Section 1 ─────────────────────────────

      // 9. staff → persons
      await queryInterface.createTable('staff', {
        staff_id: {
          type: Sequelize.BIGINT.UNSIGNED,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false
        },
        person_id: {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: false,
          unique: true,
          references: { model: 'persons', key: 'person_id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT'
        },
        staff_code: { type: Sequelize.STRING(30), allowNull: false, unique: true },
        staff_type: {
          type: Sequelize.ENUM('FINANCE', 'REGISTRAR', 'QA', 'ADMIN'),
          allowNull: false
        },
        employment_status: {
          type: Sequelize.ENUM('ACTIVE', 'ON_LEAVE', 'INACTIVE'),
          allowNull: false,
          defaultValue: 'ACTIVE'
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
        },
        deleted_at: { type: Sequelize.DATE, allowNull: true }
      }, { transaction: t });

      // 10. grade_scale_items → grading_policies
      await queryInterface.createTable('grade_scale_items', {
        scale_item_id: {
          type: Sequelize.BIGINT.UNSIGNED,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false
        },
        policy_id: {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: false,
          references: { model: 'grading_policies', key: 'policy_id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        letter_grade: { type: Sequelize.STRING(8), allowNull: false },
        min_score: { type: Sequelize.DECIMAL(6, 2), allowNull: false },
        max_score: { type: Sequelize.DECIMAL(6, 2), allowNull: false },
        grade_points: {
          type: Sequelize.DECIMAL(3, 2),
          allowNull: false,
          defaultValue: 0
        },
        is_pass: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
        }
      }, { transaction: t });

      // 11. occupations → sectors
      await queryInterface.createTable('occupations', {
        occupation_id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false
        },
        sector_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'sectors', key: 'sector_id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        occupation_code: { type: Sequelize.STRING(10), allowNull: false, unique: true },
        occupation_name: { type: Sequelize.STRING(150), allowNull: false }
      }, { transaction: t });

      // 12. user_accounts → persons
      await queryInterface.createTable('user_accounts', {
        user_id: {
          type: Sequelize.BIGINT.UNSIGNED,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false
        },
        person_id: {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: false,
          unique: true,
          references: { model: 'persons', key: 'person_id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT'
        },
        email: { type: Sequelize.STRING(190), allowNull: false, unique: true },
        password_hash: { type: Sequelize.STRING(255), allowNull: false },
        hash_algorithm: {
          type: Sequelize.ENUM('BCRYPT', 'ARGON2ID'),
          allowNull: false,
          defaultValue: 'ARGON2ID'
        },
        status: {
          type: Sequelize.ENUM('ACTIVE', 'LOCKED', 'DISABLED'),
          allowNull: false,
          defaultValue: 'ACTIVE'
        },
        must_change_password: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false
        },
        last_login_at: { type: Sequelize.DATE, allowNull: true },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
        },
        deleted_at: { type: Sequelize.DATE, allowNull: true }
      }, { transaction: t });

      // ─── Section 3: Depends on Section 2 ─────────────────────────────

      // 13. levels → occupations
      await queryInterface.createTable('levels', {
        level_id: {
          type: Sequelize.TINYINT.UNSIGNED,
          primaryKey: true,
          allowNull: false
        },
        occupation_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'occupations', key: 'occupation_id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        level_name: {
          type: Sequelize.ENUM('I', 'II', 'III', 'IV', 'V'),
          allowNull: false
        }
      }, { transaction: t });

      // 14. modules → occupations
      await queryInterface.createTable('modules', {
        module_id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false
        },
        m_code: { type: Sequelize.STRING(60), allowNull: false, unique: true },
        occupation_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'occupations', key: 'occupation_id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        unit_competency: { type: Sequelize.STRING(255), allowNull: false },
        theory_hours: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        practical_hours: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        cooperative_hours: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        learning_hours: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        credit_units: { type: Sequelize.DECIMAL(5, 2), allowNull: false },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
        },
        deleted_at: { type: Sequelize.DATE, allowNull: true }
      }, { transaction: t });

      // 15. user_roles → user_accounts, roles
      await queryInterface.createTable('user_roles', {
        user_id: {
          type: Sequelize.BIGINT.UNSIGNED,
          primaryKey: true,
          allowNull: false,
          references: { model: 'user_accounts', key: 'user_id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        role_id: {
          type: Sequelize.BIGINT.UNSIGNED,
          primaryKey: true,
          allowNull: false,
          references: { model: 'roles', key: 'role_id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        }
      }, { transaction: t });

      // 16. role_permissions → roles, permissions
      await queryInterface.createTable('role_permissions', {
        role_id: {
          type: Sequelize.BIGINT.UNSIGNED,
          primaryKey: true,
          allowNull: false,
          references: { model: 'roles', key: 'role_id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        permission_id: {
          type: Sequelize.BIGINT.UNSIGNED,
          primaryKey: true,
          allowNull: false,
          references: { model: 'permissions', key: 'permission_id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        }
      }, { transaction: t });

      // ─── Section 4: Depends on Section 3 ─────────────────────────────

      // 17. level_modules → occupations, levels
      await queryInterface.createTable('level_modules', {
        level_module_id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false
        },
        occupation_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'occupations', key: 'occupation_id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        level_id: {
          type: Sequelize.TINYINT.UNSIGNED,
          allowNull: false,
          references: { model: 'levels', key: 'level_id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        m_code: { type: Sequelize.STRING(60), allowNull: false },
        semester: {
          type: Sequelize.TINYINT.UNSIGNED,
          allowNull: false,
          defaultValue: 1
        }
      }, { transaction: t });

      // 18. batches → occupations, academic_years, levels, grading_policies
      await queryInterface.createTable('batches', {
        batch_id: {
          type: Sequelize.BIGINT.UNSIGNED,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false
        },
        occupation_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'occupations', key: 'occupation_id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        academic_year_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'academic_years', key: 'academic_year_id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        level_id: {
          type: Sequelize.TINYINT.UNSIGNED,
          allowNull: false,
          references: { model: 'levels', key: 'level_id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        grading_policy_id: {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: true,
          references: { model: 'grading_policies', key: 'policy_id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        batch_code: { type: Sequelize.STRING(40), allowNull: true, unique: true },
        track_type: {
          type: Sequelize.ENUM('REGULAR', 'EXTENSION'),
          allowNull: false,
          defaultValue: 'REGULAR'
        },
        capacity: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
        }
      }, { transaction: t });

      // 19. instructors → persons, occupations
      await queryInterface.createTable('instructors', {
        instructor_id: {
          type: Sequelize.BIGINT.UNSIGNED,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false
        },
        person_id: {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: false,
          unique: true,
          references: { model: 'persons', key: 'person_id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT'
        },
        staff_code: { type: Sequelize.STRING(50), allowNull: false, unique: true },
        occupation_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'occupations', key: 'occupation_id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        hire_date: { type: Sequelize.DATEONLY, allowNull: true },
        qualification: { type: Sequelize.STRING(180), allowNull: true },
        employment_status: {
          type: Sequelize.ENUM('ACTIVE', 'ON_LEAVE', 'INACTIVE'),
          allowNull: false,
          defaultValue: 'ACTIVE'
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
        },
        deleted_at: { type: Sequelize.DATE, allowNull: true }
      }, { transaction: t });

      // ─── Section 5: Depends on Section 4 ─────────────────────────────

      // 20. students → persons, occupations, levels, batches
      await queryInterface.createTable('students', {
        student_pk: {
          type: Sequelize.BIGINT.UNSIGNED,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false
        },
        person_id: {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: false,
          unique: true,
          references: { model: 'persons', key: 'person_id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT'
        },
        student_id: { type: Sequelize.STRING(30), allowNull: false, unique: true },
        reg_year: { type: Sequelize.SMALLINT.UNSIGNED, allowNull: false },
        reg_sequence: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
        occupation_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'occupations', key: 'occupation_id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT'
        },
        level_id: {
          type: Sequelize.TINYINT.UNSIGNED,
          allowNull: false,
          references: { model: 'levels', key: 'level_id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT'
        },
        batch_id: {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: false,
          references: { model: 'batches', key: 'batch_id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT'
        },
        admission_date: {
          type: Sequelize.DATEONLY,
          allowNull: true,
          defaultValue: Sequelize.literal('(CURRENT_DATE)')
        },
        status: {
          type: Sequelize.ENUM('ACTIVE', 'SUSPENDED', 'GRADUATED', 'DROPPED'),
          allowNull: false,
          defaultValue: 'ACTIVE'
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
        },
        deleted_at: { type: Sequelize.DATE, allowNull: true }
      }, { transaction: t });

      // ─── Section 6: Transaction / assessment tables ───────────────────

      // 21. assessment_tasks → batches, modules
      await queryInterface.createTable('assessment_tasks', {
        task_id: {
          type: Sequelize.BIGINT.UNSIGNED,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false
        },
        batch_id: {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: false,
          references: { model: 'batches', key: 'batch_id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        module_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'modules', key: 'module_id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        task_name: { type: Sequelize.STRING(120), allowNull: false },
        task_type: {
          type: Sequelize.ENUM(
            'EXAM', 'QUIZ', 'PROJECT', 'ASSIGNMENT', 'LAB', 'PRESENTATION', 'OTHER'
          ),
          allowNull: false
        },
        max_weight: { type: Sequelize.DECIMAL(5, 2), allowNull: false },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
        }
      }, { transaction: t });

      await queryInterface.addIndex('assessment_tasks', ['batch_id', 'module_id'], {
        name: 'idx_assessment_tasks_batch_module',
        transaction: t
      });

      // 22. grade_submissions → batches, modules
      await queryInterface.createTable('grade_submissions', {
        submission_id: {
          type: Sequelize.BIGINT.UNSIGNED,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false
        },
        batch_id: {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: false,
          references: { model: 'batches', key: 'batch_id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        module_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'modules', key: 'module_id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        status: {
          type: Sequelize.ENUM(
            'DRAFT', 'SUBMITTED', 'REJECTED',
            'HOD_APPROVED', 'QA_APPROVED', 'TVET_APPROVED', 'FINALIZED'
          ),
          allowNull: false,
          defaultValue: 'DRAFT'
        },
        note: { type: Sequelize.TEXT, allowNull: true },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
        }
      }, { transaction: t });

      await queryInterface.addIndex('grade_submissions', ['batch_id', 'module_id'], {
        name: 'uq_grade_submissions_batch_module',
        unique: true,
        transaction: t
      });

      // 23. module_prerequisites → modules (self-referential)
      await queryInterface.createTable('module_prerequisites', {
        prerequisite_id: {
          type: Sequelize.BIGINT.UNSIGNED,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false
        },
        module_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'modules', key: 'module_id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        required_module_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'modules', key: 'module_id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
        }
      }, { transaction: t });

      await queryInterface.addIndex('module_prerequisites', ['module_id', 'required_module_id'], {
        name: 'uq_module_prerequisites_pair',
        unique: true,
        transaction: t
      });

      // 24. module_enrollments → students, modules, batches
      await queryInterface.createTable('module_enrollments', {
        enrollment_id: {
          type: Sequelize.BIGINT.UNSIGNED,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false
        },
        student_pk: {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: false,
          references: { model: 'students', key: 'student_pk' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        module_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'modules', key: 'module_id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        batch_id: {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: false,
          references: { model: 'batches', key: 'batch_id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        final_score: { type: Sequelize.DECIMAL(6, 2), allowNull: true },
        letter_grade: { type: Sequelize.STRING(8), allowNull: true },
        grade_points: { type: Sequelize.DECIMAL(3, 2), allowNull: true },
        status: {
          type: Sequelize.ENUM('PASSED', 'FAILED'),
          allowNull: false,
          defaultValue: 'PASSED'
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
        }
      }, { transaction: t });

      await queryInterface.addIndex('module_enrollments', ['student_pk', 'module_id', 'batch_id'], {
        name: 'uq_module_enrollments_student_module_batch',
        unique: true,
        transaction: t
      });

      // 25. enrollments → students, modules, batches
      await queryInterface.createTable('enrollments', {
        enrollment_id: {
          type: Sequelize.BIGINT.UNSIGNED,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false
        },
        student_pk: {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: false,
          references: { model: 'students', key: 'student_pk' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        module_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'modules', key: 'module_id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        batch_id: {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: false,
          references: { model: 'batches', key: 'batch_id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        status: {
          type: Sequelize.ENUM('ENROLLED', 'DROPPED', 'COMPLETED'),
          allowNull: false,
          defaultValue: 'ENROLLED'
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
        }
      }, { transaction: t });

      await queryInterface.addIndex('enrollments', ['student_pk', 'module_id', 'batch_id'], {
        name: 'uq_enrollments_student_module_batch',
        unique: true,
        transaction: t
      });

      // 26. student_gpa_records → students, batches
      await queryInterface.createTable('student_gpa_records', {
        gpa_record_id: {
          type: Sequelize.BIGINT.UNSIGNED,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false
        },
        student_pk: {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: false,
          references: { model: 'students', key: 'student_pk' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        batch_id: {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: false,
          references: { model: 'batches', key: 'batch_id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        semester_gpa: {
          type: Sequelize.DECIMAL(4, 2),
          allowNull: false,
          defaultValue: 0
        },
        cumulative_gpa: {
          type: Sequelize.DECIMAL(4, 2),
          allowNull: false,
          defaultValue: 0
        },
        total_credits: {
          type: Sequelize.DECIMAL(6, 2),
          allowNull: false,
          defaultValue: 0
        },
        total_grade_points: {
          type: Sequelize.DECIMAL(8, 2),
          allowNull: false,
          defaultValue: 0
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
        }
      }, { transaction: t });

      await queryInterface.addIndex('student_gpa_records', ['student_pk', 'batch_id'], {
        name: 'uq_student_gpa_records_student_batch',
        unique: true,
        transaction: t
      });

      // 27. student_grades → students, assessment_tasks
      await queryInterface.createTable('student_grades', {
        grade_id: {
          type: Sequelize.BIGINT.UNSIGNED,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false
        },
        student_pk: {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: false,
          references: { model: 'students', key: 'student_pk' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        task_id: {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: false,
          references: { model: 'assessment_tasks', key: 'task_id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        obtained_score: { type: Sequelize.DECIMAL(6, 2), allowNull: false },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
        }
      }, { transaction: t });

      await queryInterface.addIndex('student_grades', ['student_pk', 'task_id'], {
        name: 'uq_student_grades_student_task',
        unique: true,
        transaction: t
      });

      // 28. grading_audit_logs → grade_submissions
      await queryInterface.createTable('grading_audit_logs', {
        log_id: {
          type: Sequelize.BIGINT.UNSIGNED,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false
        },
        submission_id: {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: true,
          references: { model: 'grade_submissions', key: 'submission_id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        actor_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true },
        action: { type: Sequelize.STRING(50), allowNull: true },
        from_status: { type: Sequelize.STRING(20), allowNull: true },
        to_status: { type: Sequelize.STRING(20), allowNull: true },
        note: { type: Sequelize.TEXT, allowNull: true },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
        }
      }, { transaction: t });

      await t.commit();
    } catch (error) {
      await t.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    const t = await queryInterface.sequelize.transaction();
    try {
      // Drop in reverse dependency order (children before parents)
      await queryInterface.dropTable('grading_audit_logs', { transaction: t });
      await queryInterface.dropTable('student_grades', { transaction: t });
      await queryInterface.dropTable('student_gpa_records', { transaction: t });
      await queryInterface.dropTable('enrollments', { transaction: t });
      await queryInterface.dropTable('module_enrollments', { transaction: t });
      await queryInterface.dropTable('module_prerequisites', { transaction: t });
      await queryInterface.dropTable('grade_submissions', { transaction: t });
      await queryInterface.dropTable('assessment_tasks', { transaction: t });
      await queryInterface.dropTable('students', { transaction: t });
      await queryInterface.dropTable('instructors', { transaction: t });
      await queryInterface.dropTable('batches', { transaction: t });
      await queryInterface.dropTable('level_modules', { transaction: t });
      await queryInterface.dropTable('role_permissions', { transaction: t });
      await queryInterface.dropTable('user_roles', { transaction: t });
      await queryInterface.dropTable('modules', { transaction: t });
      await queryInterface.dropTable('levels', { transaction: t });
      await queryInterface.dropTable('user_accounts', { transaction: t });
      await queryInterface.dropTable('occupations', { transaction: t });
      await queryInterface.dropTable('grade_scale_items', { transaction: t });
      await queryInterface.dropTable('staff', { transaction: t });
      await queryInterface.dropTable('student_id_sequences', { transaction: t });
      await queryInterface.dropTable('staff_id_sequences', { transaction: t });
      await queryInterface.dropTable('grading_policies', { transaction: t });
      await queryInterface.dropTable('academic_years', { transaction: t });
      await queryInterface.dropTable('sectors', { transaction: t });
      await queryInterface.dropTable('permissions', { transaction: t });
      await queryInterface.dropTable('roles', { transaction: t });
      await queryInterface.dropTable('persons', { transaction: t });
      await t.commit();
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }
};
