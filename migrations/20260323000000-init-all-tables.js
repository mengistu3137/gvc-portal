export default {
  async up(queryInterface, Sequelize) {
    const t = await queryInterface.sequelize.transaction();
    try {
      // persons
      await queryInterface.createTable('persons', {
        person_id: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true, allowNull: false },
        first_name: { type: Sequelize.STRING(80), allowNull: false },
        middle_name: { type: Sequelize.STRING(80) },
        last_name: { type: Sequelize.STRING(80), allowNull: false },
        gender: { type: Sequelize.ENUM('M', 'F') },
        date_of_birth: { type: Sequelize.DATEONLY },
        phone: { type: Sequelize.STRING(30) },
        email: { type: Sequelize.STRING(190) },
        photo_url: { type: Sequelize.STRING(255) },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
        deleted_at: { type: Sequelize.DATE }
      }, { transaction: t });

      await queryInterface.addIndex('persons', ['email'], { name: 'uq_persons_email', unique: true, transaction: t });

      // staff id sequences
      await queryInterface.createTable('staff_id_sequences', {
        category: { type: Sequelize.ENUM('INST', 'STF'), allowNull: false, primaryKey: true },
        reg_year: { type: Sequelize.SMALLINT.UNSIGNED, allowNull: false, primaryKey: true },
        last_seq: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 }
      }, { transaction: t });

      // staff
      await queryInterface.createTable('staff', {
        staff_id: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true, allowNull: false },
        person_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, unique: true },
        staff_code: { type: Sequelize.STRING(30), allowNull: false, unique: true },
        staff_type: { type: Sequelize.ENUM('FINANCE', 'REGISTRAR', 'QA', 'ADMIN'), allowNull: false },
        employment_status: { type: Sequelize.ENUM('ACTIVE', 'ON_LEAVE', 'INACTIVE'), defaultValue: 'ACTIVE' },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
        deleted_at: { type: Sequelize.DATE }
      }, { transaction: t });

      await queryInterface.addConstraint('staff', {
        fields: ['person_id'],
        type: 'foreign key',
        name: 'fk_staff_person_id',
        references: { table: 'persons', field: 'person_id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        transaction: t
      });

      // sectors
      await queryInterface.createTable('sectors', {
        sector_id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        sector_code: { type: Sequelize.STRING(10), allowNull: false, unique: true },
        sector_name: { type: Sequelize.STRING(100), allowNull: false }
      }, { transaction: t });

      // occupations
      await queryInterface.createTable('occupations', {
        occupation_id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        sector_id: { type: Sequelize.INTEGER, allowNull: false },
        occupation_code: { type: Sequelize.STRING(10), allowNull: false, unique: true },
        occupation_name: { type: Sequelize.STRING(150), allowNull: false }
      }, { transaction: t });

      await queryInterface.addConstraint('occupations', {
        fields: ['sector_id'],
        type: 'foreign key',
        name: 'fk_occupations_sector_id',
        references: { table: 'sectors', field: 'sector_id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        transaction: t
      });

      // levels
      await queryInterface.createTable('levels', {
        level_id: { type: Sequelize.TINYINT.UNSIGNED, primaryKey: true },
        occupation_id: { type: Sequelize.INTEGER, allowNull: false },
        level_name: { type: Sequelize.ENUM('I', 'II', 'III', 'IV', 'V'), allowNull: false }
      }, { transaction: t });

      await queryInterface.addConstraint('levels', {
        fields: ['occupation_id'],
        type: 'foreign key',
        name: 'fk_levels_occupation_id',
        references: { table: 'occupations', field: 'occupation_id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        transaction: t
      });

      // modules
      await queryInterface.createTable('modules', {
        module_id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        m_code: { type: Sequelize.STRING(60), allowNull: false, unique: true },
        occupation_id: { type: Sequelize.INTEGER, allowNull: false },
        unit_competency: { type: Sequelize.STRING(255), allowNull: false },
        theory_hours: { type: Sequelize.INTEGER, defaultValue: 0 },
        practical_hours: { type: Sequelize.INTEGER, defaultValue: 0 },
        cooperative_hours: { type: Sequelize.INTEGER, defaultValue: 0 },
        learning_hours: { type: Sequelize.INTEGER, defaultValue: 0 },
        credit_units: { type: Sequelize.DECIMAL(5, 2), allowNull: false },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
        deleted_at: { type: Sequelize.DATE }
      }, { transaction: t });

      await queryInterface.addConstraint('modules', {
        fields: ['occupation_id'],
        type: 'foreign key',
        name: 'fk_modules_occupation_id',
        references: { table: 'occupations', field: 'occupation_id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        transaction: t
      });

      // level_modules
      await queryInterface.createTable('level_modules', {
        level_module_id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        occupation_id: { type: Sequelize.INTEGER, allowNull: false },
        level_id: { type: Sequelize.TINYINT.UNSIGNED, allowNull: false },
        m_code: { type: Sequelize.STRING(60), allowNull: false },
        semester: { type: Sequelize.TINYINT.UNSIGNED, defaultValue: 1 }
      }, { transaction: t });

      await queryInterface.addConstraint('level_modules', {
        fields: ['occupation_id'],
        type: 'foreign key',
        name: 'fk_level_modules_occupation_id',
        references: { table: 'occupations', field: 'occupation_id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        transaction: t
      });

      await queryInterface.addConstraint('level_modules', {
        fields: ['level_id'],
        type: 'foreign key',
        name: 'fk_level_modules_level_id',
        references: { table: 'levels', field: 'level_id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        transaction: t
      });

      await queryInterface.addConstraint('level_modules', {
        fields: ['m_code'],
        type: 'foreign key',
        name: 'fk_level_modules_m_code',
        references: { table: 'modules', field: 'm_code' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        transaction: t
      });

      // academic_years
      await queryInterface.createTable('academic_years', {
        academic_year_id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        academic_year_label: { type: Sequelize.STRING(20), allowNull: false, unique: true },
        start_date: { type: Sequelize.DATEONLY, allowNull: false },
        end_date: { type: Sequelize.DATEONLY, allowNull: false }
      }, { transaction: t });

      // grade_scales
      await queryInterface.createTable('grade_scales', {
        scale_id: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
        min_score: { type: Sequelize.DECIMAL(5, 2), allowNull: false },
        max_score: { type: Sequelize.DECIMAL(5, 2), allowNull: false },
        letter: { type: Sequelize.STRING(5), allowNull: false },
        grade_point: { type: Sequelize.DECIMAL(3, 2), allowNull: false },
        is_pass: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') }
      }, { transaction: t });

      // batches
      await queryInterface.createTable('batches', {
        batch_id: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
        occupation_id: { type: Sequelize.INTEGER, allowNull: false },
        academic_year_id: { type: Sequelize.INTEGER, allowNull: false },
        level_id: { type: Sequelize.TINYINT.UNSIGNED, allowNull: false },
        batch_code: { type: Sequelize.STRING(40), unique: true },
        division: { type: Sequelize.ENUM('REGULAR', 'EXTENSION'), defaultValue: 'REGULAR' },
        capacity: { type: Sequelize.INTEGER, defaultValue: 0 },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
        deleted_at: { type: Sequelize.DATE }
      }, { transaction: t });

      await queryInterface.addConstraint('batches', {
        fields: ['occupation_id'],
        type: 'foreign key',
        name: 'fk_batches_occupation_id',
        references: { table: 'occupations', field: 'occupation_id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        transaction: t
      });

      await queryInterface.addConstraint('batches', {
        fields: ['academic_year_id'],
        type: 'foreign key',
        name: 'fk_batches_academic_year_id',
        references: { table: 'academic_years', field: 'academic_year_id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        transaction: t
      });

      await queryInterface.addConstraint('batches', {
        fields: ['level_id'],
        type: 'foreign key',
        name: 'fk_batches_level_id',
        references: { table: 'levels', field: 'level_id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        transaction: t
      });

      // assessment_plans
      await queryInterface.createTable('assessment_plans', {
        plan_id: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
        batch_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false },
        module_id: { type: Sequelize.INTEGER, allowNull: false },
        total_weight: { type: Sequelize.DECIMAL(5, 2), allowNull: false, defaultValue: 100 },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') }
      }, { transaction: t });

      await queryInterface.addConstraint('assessment_plans', {
        fields: ['batch_id'],
        type: 'foreign key',
        name: 'fk_assessment_plans_batch_id',
        references: { table: 'batches', field: 'batch_id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        transaction: t
      });

      await queryInterface.addConstraint('assessment_plans', {
        fields: ['module_id'],
        type: 'foreign key',
        name: 'fk_assessment_plans_module_id',
        references: { table: 'modules', field: 'module_id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        transaction: t
      });

      // assessment_tasks
      await queryInterface.createTable('assessment_tasks', {
        task_id: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
        plan_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false },
        task_name: { type: Sequelize.STRING(120), allowNull: false },
        task_type: { type: Sequelize.ENUM('EXAM', 'QUIZ', 'PROJECT', 'ASSIGNMENT', 'LAB', 'PRESENTATION', 'OTHER'), allowNull: false, defaultValue: 'OTHER' },
        max_weight: { type: Sequelize.DECIMAL(5, 2), allowNull: false },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') }
      }, { transaction: t });

      await queryInterface.addConstraint('assessment_tasks', {
        fields: ['plan_id'],
        type: 'foreign key',
        name: 'fk_assessment_tasks_plan_id',
        references: { table: 'assessment_plans', field: 'plan_id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        transaction: t
      });

      // students
      await queryInterface.createTable('students', {
        student_pk: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
        person_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, unique: true },
        student_id: { type: Sequelize.STRING(30), allowNull: false, unique: true },
        reg_year: { type: Sequelize.SMALLINT.UNSIGNED, allowNull: false },
        reg_sequence: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
        occupation_id: { type: Sequelize.INTEGER, allowNull: false },
        level_id: { type: Sequelize.TINYINT.UNSIGNED, allowNull: false },
        batch_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false },
        admission_date: { type: Sequelize.DATEONLY, defaultValue: Sequelize.literal('CURRENT_DATE') },
        status: { type: Sequelize.ENUM('ACTIVE', 'SUSPENDED', 'GRADUATED', 'DROPPED'), defaultValue: 'ACTIVE' },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
        deleted_at: { type: Sequelize.DATE }
      }, { transaction: t });

      await queryInterface.addConstraint('students', {
        fields: ['person_id'],
        type: 'foreign key',
        name: 'fk_students_person_id',
        references: { table: 'persons', field: 'person_id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
        transaction: t
      });

      await queryInterface.addConstraint('students', {
        fields: ['occupation_id'],
        type: 'foreign key',
        name: 'fk_students_occupation_id',
        references: { table: 'occupations', field: 'occupation_id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        transaction: t
      });

      await queryInterface.addConstraint('students', {
        fields: ['level_id'],
        type: 'foreign key',
        name: 'fk_students_level_id',
        references: { table: 'levels', field: 'level_id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        transaction: t
      });

      await queryInterface.addConstraint('students', {
        fields: ['batch_id'],
        type: 'foreign key',
        name: 'fk_students_batch_id',
        references: { table: 'batches', field: 'batch_id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        transaction: t
      });

      // student_id_sequences
      await queryInterface.createTable('student_id_sequences', {
        reg_year: { type: Sequelize.SMALLINT.UNSIGNED, primaryKey: true },
        last_seq: { type: Sequelize.INTEGER.UNSIGNED, defaultValue: 0 }
      }, { transaction: t });

      // user_accounts
      await queryInterface.createTable('user_accounts', {
        user_id: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
        person_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, unique: true },
        email: { type: Sequelize.STRING(190), allowNull: false, unique: true },
        password_hash: { type: Sequelize.STRING(255), allowNull: false },
        hash_algorithm: { type: Sequelize.ENUM('BCRYPT', 'ARGON2ID'), defaultValue: 'ARGON2ID' },
        status: { type: Sequelize.ENUM('ACTIVE', 'LOCKED', 'DISABLED'), defaultValue: 'ACTIVE' },
        must_change_password: { type: Sequelize.BOOLEAN, defaultValue: false },
        last_login_at: { type: Sequelize.DATE },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
        deleted_at: { type: Sequelize.DATE }
      }, { transaction: t });

      await queryInterface.addConstraint('user_accounts', {
        fields: ['person_id'],
        type: 'foreign key',
        name: 'fk_user_accounts_person_id',
        references: { table: 'persons', field: 'person_id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
        transaction: t
      });

      // roles
      await queryInterface.createTable('roles', {
        role_id: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
        role_code: { type: Sequelize.STRING(50), allowNull: false, unique: true },
        role_name: { type: Sequelize.STRING(120), allowNull: false }
      }, { transaction: t });

      // permissions
      await queryInterface.createTable('permissions', {
        permission_id: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
        permission_code: { type: Sequelize.STRING(80), allowNull: false, unique: true },
        permission_name: { type: Sequelize.STRING(160), allowNull: false },
        module_scope: { type: Sequelize.STRING(80), allowNull: false }
      }, { transaction: t });

      // user_roles
      await queryInterface.createTable('user_roles', {
        user_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false },
        role_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false }
      }, { transaction: t });

      await queryInterface.addConstraint('user_roles', {
        fields: ['user_id', 'role_id'],
        type: 'primary key',
        name: 'pk_user_roles',
        transaction: t
      });

      await queryInterface.addConstraint('user_roles', {
        fields: ['user_id'],
        type: 'foreign key',
        name: 'fk_user_roles_user_id',
        references: { table: 'user_accounts', field: 'user_id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        transaction: t
      });

      await queryInterface.addConstraint('user_roles', {
        fields: ['role_id'],
        type: 'foreign key',
        name: 'fk_user_roles_role_id',
        references: { table: 'roles', field: 'role_id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        transaction: t
      });

      // role_permissions
      await queryInterface.createTable('role_permissions', {
        role_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false },
        permission_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false }
      }, { transaction: t });

      await queryInterface.addConstraint('role_permissions', {
        fields: ['role_id', 'permission_id'],
        type: 'primary key',
        name: 'pk_role_permissions',
        transaction: t
      });

      await queryInterface.addConstraint('role_permissions', {
        fields: ['role_id'],
        type: 'foreign key',
        name: 'fk_role_permissions_role_id',
        references: { table: 'roles', field: 'role_id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        transaction: t
      });

      await queryInterface.addConstraint('role_permissions', {
        fields: ['permission_id'],
        type: 'foreign key',
        name: 'fk_role_permissions_permission_id',
        references: { table: 'permissions', field: 'permission_id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        transaction: t
      });

      // instructors
      await queryInterface.createTable('instructors', {
        instructor_id: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
        person_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, unique: true },
        staff_code: { type: Sequelize.STRING(50), allowNull: false, unique: true },
        occupation_id: { type: Sequelize.INTEGER },
        hire_date: { type: Sequelize.DATEONLY },
        qualification: { type: Sequelize.STRING(180) },
        employment_status: { type: Sequelize.ENUM('ACTIVE', 'ON_LEAVE', 'INACTIVE'), defaultValue: 'ACTIVE' },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
        deleted_at: { type: Sequelize.DATE }
      }, { transaction: t });

      await queryInterface.addConstraint('instructors', {
        fields: ['person_id'],
        type: 'foreign key',
        name: 'fk_instructors_person_id',
        references: { table: 'persons', field: 'person_id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
        transaction: t
      });

      await queryInterface.addConstraint('instructors', {
        fields: ['occupation_id'],
        type: 'foreign key',
        name: 'fk_instructors_occupation_id',
        references: { table: 'occupations', field: 'occupation_id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
        transaction: t
      });

      // module_prerequisites
      await queryInterface.createTable('module_prerequisites', {
        prerequisite_id: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
        module_id: { type: Sequelize.INTEGER, allowNull: false },
        required_module_id: { type: Sequelize.INTEGER, allowNull: false },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') }
      }, { transaction: t });

      await queryInterface.addIndex('module_prerequisites', ['module_id', 'required_module_id'], { name: 'uq_module_required', unique: true, transaction: t });

      await queryInterface.addConstraint('module_prerequisites', {
        fields: ['module_id'],
        type: 'foreign key',
        name: 'fk_module_prerequisites_module_id',
        references: { table: 'modules', field: 'module_id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        transaction: t
      });

      await queryInterface.addConstraint('module_prerequisites', {
        fields: ['required_module_id'],
        type: 'foreign key',
        name: 'fk_module_prerequisites_required_module_id',
        references: { table: 'modules', field: 'module_id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        transaction: t
      });

      // grade_submissions
      await queryInterface.createTable('grade_submissions', {
        submission_id: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
        batch_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false },
        module_id: { type: Sequelize.INTEGER, allowNull: false },
        status: { type: Sequelize.ENUM('DRAFT', 'SUBMITTED', 'REJECTED', 'HOD_APPROVED', 'QA_APPROVED', 'TVET_APPROVED', 'FINALIZED'), allowNull: false, defaultValue: 'DRAFT' },
        note: { type: Sequelize.TEXT },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') }
      }, { transaction: t });

      await queryInterface.addIndex('grade_submissions', ['batch_id', 'module_id'], { name: 'uq_grade_submissions_batch_module', unique: true, transaction: t });

      await queryInterface.addConstraint('grade_submissions', {
        fields: ['batch_id'],
        type: 'foreign key',
        name: 'fk_grade_submissions_batch_id',
        references: { table: 'batches', field: 'batch_id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        transaction: t
      });

      await queryInterface.addConstraint('grade_submissions', {
        fields: ['module_id'],
        type: 'foreign key',
        name: 'fk_grade_submissions_module_id',
        references: { table: 'modules', field: 'module_id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        transaction: t
      });

      // student_grades
      await queryInterface.createTable('student_grades', {
        grade_id: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
        student_pk: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false },
        task_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false },
        batch_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false },
        obtained_score: { type: Sequelize.DECIMAL(6, 2), allowNull: false },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') }
      }, { transaction: t });

      await queryInterface.addIndex('student_grades', ['student_pk', 'task_id'], { name: 'uq_student_grade_task', unique: true, transaction: t });

      await queryInterface.addConstraint('student_grades', {
        fields: ['student_pk'],
        type: 'foreign key',
        name: 'fk_student_grades_student_pk',
        references: { table: 'students', field: 'student_pk' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        transaction: t
      });

      await queryInterface.addConstraint('student_grades', {
        fields: ['task_id'],
        type: 'foreign key',
        name: 'fk_student_grades_task_id',
        references: { table: 'assessment_tasks', field: 'task_id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        transaction: t
      });

      await queryInterface.addConstraint('student_grades', {
        fields: ['batch_id'],
        type: 'foreign key',
        name: 'fk_student_grades_batch_id',
        references: { table: 'batches', field: 'batch_id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        transaction: t
      });

      // module_enrollments
      await queryInterface.createTable('module_enrollments', {
        enrollment_id: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
        student_pk: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false },
        module_id: { type: Sequelize.INTEGER, allowNull: false },
        batch_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false },
        final_score: { type: Sequelize.DECIMAL(6, 2) },
        letter_grade: { type: Sequelize.STRING(8) },
        grade_points: { type: Sequelize.DECIMAL(3, 2) },
        status: { type: Sequelize.ENUM('PASSED', 'FAILED'), allowNull: false, defaultValue: 'PASSED' },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') }
      }, { transaction: t });

      await queryInterface.addIndex('module_enrollments', ['student_pk', 'module_id', 'batch_id'], { name: 'uq_module_enrollment', unique: true, transaction: t });

      await queryInterface.addConstraint('module_enrollments', {
        fields: ['student_pk'],
        type: 'foreign key',
        name: 'fk_module_enrollments_student_pk',
        references: { table: 'students', field: 'student_pk' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        transaction: t
      });

      await queryInterface.addConstraint('module_enrollments', {
        fields: ['module_id'],
        type: 'foreign key',
        name: 'fk_module_enrollments_module_id',
        references: { table: 'modules', field: 'module_id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        transaction: t
      });

      await queryInterface.addConstraint('module_enrollments', {
        fields: ['batch_id'],
        type: 'foreign key',
        name: 'fk_module_enrollments_batch_id',
        references: { table: 'batches', field: 'batch_id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        transaction: t
      });

      // enrollments
      await queryInterface.createTable('enrollments', {
        enrollment_id: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
        student_pk: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false },
        module_id: { type: Sequelize.INTEGER, allowNull: false },
        batch_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false },
        status: { type: Sequelize.ENUM('ENROLLED', 'DROPPED', 'COMPLETED'), allowNull: false, defaultValue: 'ENROLLED' },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') }
      }, { transaction: t });

      await queryInterface.addIndex('enrollments', ['student_pk', 'module_id', 'batch_id'], { name: 'uq_enrollments', unique: true, transaction: t });

      await queryInterface.addConstraint('enrollments', {
        fields: ['student_pk'],
        type: 'foreign key',
        name: 'fk_enrollments_student_pk',
        references: { table: 'students', field: 'student_pk' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        transaction: t
      });

      await queryInterface.addConstraint('enrollments', {
        fields: ['module_id'],
        type: 'foreign key',
        name: 'fk_enrollments_module_id',
        references: { table: 'modules', field: 'module_id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        transaction: t
      });

      await queryInterface.addConstraint('enrollments', {
        fields: ['batch_id'],
        type: 'foreign key',
        name: 'fk_enrollments_batch_id',
        references: { table: 'batches', field: 'batch_id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        transaction: t
      });

      // student_gpa_records
      await queryInterface.createTable('student_gpa_records', {
        gpa_record_id: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
        student_pk: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false },
        batch_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false },
        semester_gpa: { type: Sequelize.DECIMAL(4, 2), allowNull: false, defaultValue: 0 },
        cumulative_gpa: { type: Sequelize.DECIMAL(4, 2), allowNull: false, defaultValue: 0 },
        total_credits: { type: Sequelize.DECIMAL(6, 2), allowNull: false, defaultValue: 0 },
        total_grade_points: { type: Sequelize.DECIMAL(8, 2), allowNull: false, defaultValue: 0 },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') }
      }, { transaction: t });

      await queryInterface.addIndex('student_gpa_records', ['student_pk', 'batch_id'], { name: 'uq_student_gpa_records', unique: true, transaction: t });

      await queryInterface.addConstraint('student_gpa_records', {
        fields: ['student_pk'],
        type: 'foreign key',
        name: 'fk_student_gpa_records_student_pk',
        references: { table: 'students', field: 'student_pk' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        transaction: t
      });

      await queryInterface.addConstraint('student_gpa_records', {
        fields: ['batch_id'],
        type: 'foreign key',
        name: 'fk_student_gpa_records_batch_id',
        references: { table: 'batches', field: 'batch_id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        transaction: t
      });

      await t.commit();
    } catch (error) {
      await t.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    const t = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.dropTable('student_gpa_records', { transaction: t });
      await queryInterface.dropTable('enrollments', { transaction: t });
      await queryInterface.dropTable('module_enrollments', { transaction: t });
      await queryInterface.dropTable('student_grades', { transaction: t });
      await queryInterface.dropTable('grade_submissions', { transaction: t });
      await queryInterface.dropTable('module_prerequisites', { transaction: t });
      await queryInterface.dropTable('instructors', { transaction: t });
      await queryInterface.dropTable('role_permissions', { transaction: t });
      await queryInterface.dropTable('user_roles', { transaction: t });
      await queryInterface.dropTable('permissions', { transaction: t });
      await queryInterface.dropTable('roles', { transaction: t });
      await queryInterface.dropTable('user_accounts', { transaction: t });
      await queryInterface.dropTable('student_id_sequences', { transaction: t });
      await queryInterface.dropTable('students', { transaction: t });
      await queryInterface.dropTable('assessment_tasks', { transaction: t });
      await queryInterface.dropTable('assessment_plans', { transaction: t });
      await queryInterface.dropTable('batches', { transaction: t });
        await queryInterface.dropTable('grade_scales', { transaction: t });
      await queryInterface.dropTable('academic_years', { transaction: t });
      await queryInterface.dropTable('level_modules', { transaction: t });
      await queryInterface.dropTable('modules', { transaction: t });
      await queryInterface.dropTable('levels', { transaction: t });
      await queryInterface.dropTable('occupations', { transaction: t });
      await queryInterface.dropTable('sectors', { transaction: t });
      await queryInterface.dropTable('staff', { transaction: t });
      await queryInterface.dropTable('staff_id_sequences', { transaction: t });
      await queryInterface.dropTable('persons', { transaction: t });
      await t.commit();
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }
};
