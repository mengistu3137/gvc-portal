const TABLES_IN_CREATION_ORDER = [
  'sectors',
  'occupations',
  'levels',
  'modules',
  'academic_years',
  'grading_policies',
  'batches',
  'level_modules',
  'persons',
  'roles',
  'permissions',
  'user_accounts',
  'user_roles',
  'role_permissions',
  'staff_id_sequences',
  'staff',
  'student_id_sequences',
  'students',
  'instructors',
  'assessment_plans',
  'assessment_tasks',
  'student_grades',
  'grade_submissions',
  'grade_scale_items',
  'module_enrollments',
  'module_prerequisites',
  'enrollments',
  'student_gpa_records'
];

const TABLES_IN_DROP_ORDER = [...TABLES_IN_CREATION_ORDER].reverse();

const INNODB_TABLE_OPTIONS = {
  engine: 'InnoDB',
  charset: 'utf8mb4',
  collate: 'utf8mb4_unicode_ci'
};

const normalizeTableName = (entry) => {
  if (typeof entry === 'string') return entry;
  if (Array.isArray(entry)) return entry[1] || entry[0];
  if (entry && typeof entry === 'object') {
    return entry.tableName || entry.table_name || entry.name;
  }
  return null;
};

const getExistingTables = async (queryInterface, transaction) => {
  const tables = await queryInterface.showAllTables({ transaction });
  return new Set((tables || []).map(normalizeTableName).filter(Boolean));
};

const dropAllKnownAndResidualTables = async (queryInterface, transaction) => {
  const existingTables = await getExistingTables(queryInterface, transaction);

  for (const tableName of TABLES_IN_DROP_ORDER) {
    if (existingTables.has(tableName)) {
      await queryInterface.dropTable(tableName, { transaction });
      existingTables.delete(tableName);
    }
  }

  // Best-effort cleanup for residual legacy tables that may exist after crash recovery.
  const leftovers = Array.from(existingTables);
  for (const tableName of leftovers) {
    await queryInterface.dropTable(tableName, { transaction });
  }
};

const createCoreAcademicTables = async (queryInterface, Sequelize, transaction) => {
  await queryInterface.createTable('sectors', {
    sector_id: { type: Sequelize.INTEGER, allowNull: false, autoIncrement: true, primaryKey: true },
    sector_code: { type: Sequelize.STRING(10), allowNull: false, unique: true },
    sector_name: { type: Sequelize.STRING(100), allowNull: false }
  }, { ...INNODB_TABLE_OPTIONS, transaction });

  await queryInterface.createTable('occupations', {
    occupation_id: { type: Sequelize.INTEGER, allowNull: false, autoIncrement: true, primaryKey: true },
    sector_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: { model: 'sectors', key: 'sector_id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
    },
    occupation_code: { type: Sequelize.STRING(10), allowNull: false, unique: true },
    occupation_name: { type: Sequelize.STRING(150), allowNull: false }
  }, { ...INNODB_TABLE_OPTIONS, transaction });

  await queryInterface.createTable('levels', {
    level_id: { type: Sequelize.TINYINT.UNSIGNED, allowNull: false, primaryKey: true },
    occupation_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      primaryKey: true,
      references: { model: 'occupations', key: 'occupation_id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
    },
    level_name: { type: Sequelize.ENUM('I', 'II', 'III', 'IV', 'V'), allowNull: false }
  }, { ...INNODB_TABLE_OPTIONS, transaction });

  await queryInterface.addIndex('levels', ['level_id'], {
    name: 'idx_levels_level_id',
    transaction
  });

  await queryInterface.createTable('modules', {
    module_id: { type: Sequelize.INTEGER, allowNull: false, autoIncrement: true, primaryKey: true },
    m_code: { type: Sequelize.STRING(60), allowNull: false, unique: true },
    occupation_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: { model: 'occupations', key: 'occupation_id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
    },
    unit_competency: { type: Sequelize.STRING(255), allowNull: false },
    theory_hours: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
    practical_hours: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
    cooperative_hours: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
    learning_hours: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
    credit_units: { type: Sequelize.DECIMAL(5, 2), allowNull: false },
    created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    updated_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
    },
    deleted_at: { type: Sequelize.DATE, allowNull: true }
  }, { ...INNODB_TABLE_OPTIONS, transaction });

  await queryInterface.createTable('academic_years', {
    academic_year_id: { type: Sequelize.INTEGER, allowNull: false, autoIncrement: true, primaryKey: true },
    academic_year_label: { type: Sequelize.STRING(20), allowNull: false, unique: true },
    start_date: { type: Sequelize.DATEONLY, allowNull: false },
    end_date: { type: Sequelize.DATEONLY, allowNull: false }
  }, { ...INNODB_TABLE_OPTIONS, transaction });

  await queryInterface.createTable('grading_policies', {
    policy_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, autoIncrement: true, primaryKey: true },
    policy_name: { type: Sequelize.STRING(120), allowNull: false, unique: true },
    is_locked: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
    created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    updated_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
    }
  }, { ...INNODB_TABLE_OPTIONS, transaction });

  await queryInterface.createTable('batches', {
    batch_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, autoIncrement: true, primaryKey: true },
    occupation_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: { model: 'occupations', key: 'occupation_id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
    },
    academic_year_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: { model: 'academic_years', key: 'academic_year_id' },
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
    grading_policy_id: {
      type: Sequelize.BIGINT.UNSIGNED,
      allowNull: true,
      references: { model: 'grading_policies', key: 'policy_id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    batch_code: { type: Sequelize.STRING(40), allowNull: true, unique: true },
    track_type: { type: Sequelize.ENUM('REGULAR', 'EXTENSION'), allowNull: false, defaultValue: 'REGULAR' },
    capacity: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
    created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    updated_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
    }
  }, { ...INNODB_TABLE_OPTIONS, transaction });

  await queryInterface.createTable('level_modules', {
    level_module_id: { type: Sequelize.INTEGER, allowNull: false, autoIncrement: true, primaryKey: true },
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
    m_code: {
      type: Sequelize.STRING(60),
      allowNull: false,
      references: { model: 'modules', key: 'm_code' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
    },
    semester: { type: Sequelize.TINYINT.UNSIGNED, allowNull: false, defaultValue: 1 }
  }, { ...INNODB_TABLE_OPTIONS, transaction });
};

const createIdentityAndAccessTables = async (queryInterface, Sequelize, transaction) => {
  await queryInterface.createTable('persons', {
    person_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, autoIncrement: true, primaryKey: true },
    first_name: { type: Sequelize.STRING(80), allowNull: false },
    middle_name: { type: Sequelize.STRING(80), allowNull: true },
    last_name: { type: Sequelize.STRING(80), allowNull: false },
    gender: { type: Sequelize.ENUM('M', 'F'), allowNull: true },
    date_of_birth: { type: Sequelize.DATEONLY, allowNull: true },
    phone: { type: Sequelize.STRING(30), allowNull: true },
    email: { type: Sequelize.STRING(190), allowNull: true },
    photo_url: { type: Sequelize.STRING(255), allowNull: true },
    created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    updated_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
    },
    deleted_at: { type: Sequelize.DATE, allowNull: true }
  }, { ...INNODB_TABLE_OPTIONS, transaction });

  await queryInterface.addIndex('persons', ['email'], {
    name: 'idx_persons_email',
    transaction
  });

  await queryInterface.createTable('roles', {
    role_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, autoIncrement: true, primaryKey: true },
    role_code: { type: Sequelize.STRING(50), allowNull: false, unique: true },
    role_name: { type: Sequelize.STRING(120), allowNull: false }
  }, { ...INNODB_TABLE_OPTIONS, transaction });

  await queryInterface.createTable('permissions', {
    permission_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, autoIncrement: true, primaryKey: true },
    permission_code: { type: Sequelize.STRING(80), allowNull: false, unique: true },
    permission_name: { type: Sequelize.STRING(160), allowNull: false },
    module_scope: { type: Sequelize.STRING(80), allowNull: false }
  }, { ...INNODB_TABLE_OPTIONS, transaction });

  await queryInterface.createTable('user_accounts', {
    user_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, autoIncrement: true, primaryKey: true },
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
    hash_algorithm: { type: Sequelize.ENUM('BCRYPT', 'ARGON2ID'), allowNull: true, defaultValue: 'ARGON2ID' },
    status: {
      type: Sequelize.ENUM('ACTIVE', 'LOCKED', 'DISABLED'),
      allowNull: true,
      defaultValue: 'ACTIVE'
    },
    must_change_password: { type: Sequelize.BOOLEAN, allowNull: true, defaultValue: false },
    last_login_at: { type: Sequelize.DATE, allowNull: true },
    created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    updated_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
    },
    deleted_at: { type: Sequelize.DATE, allowNull: true }
  }, { ...INNODB_TABLE_OPTIONS, transaction });

  await queryInterface.createTable('user_roles', {
    user_id: {
      type: Sequelize.BIGINT.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: { model: 'user_accounts', key: 'user_id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    role_id: {
      type: Sequelize.BIGINT.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: { model: 'roles', key: 'role_id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    updated_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
    }
  }, { ...INNODB_TABLE_OPTIONS, transaction });

  await queryInterface.createTable('role_permissions', {
    role_id: {
      type: Sequelize.BIGINT.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: { model: 'roles', key: 'role_id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    permission_id: {
      type: Sequelize.BIGINT.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: { model: 'permissions', key: 'permission_id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    updated_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
    }
  }, { ...INNODB_TABLE_OPTIONS, transaction });
};

const createPeopleAndAcademicFlowTables = async (queryInterface, Sequelize, transaction) => {
  await queryInterface.createTable('staff_id_sequences', {
    category: { type: Sequelize.ENUM('INST', 'STF'), allowNull: false, primaryKey: true },
    reg_year: { type: Sequelize.SMALLINT.UNSIGNED, allowNull: false, primaryKey: true },
    last_seq: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 }
  }, { ...INNODB_TABLE_OPTIONS, transaction });

  await queryInterface.createTable('staff', {
    staff_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, autoIncrement: true, primaryKey: true },
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
      allowNull: true,
      defaultValue: 'ACTIVE'
    },
    created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    updated_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
    },
    deleted_at: { type: Sequelize.DATE, allowNull: true }
  }, { ...INNODB_TABLE_OPTIONS, transaction });

  await queryInterface.createTable('student_id_sequences', {
    reg_year: { type: Sequelize.SMALLINT.UNSIGNED, allowNull: false, primaryKey: true },
    last_seq: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 }
  }, { ...INNODB_TABLE_OPTIONS, transaction });

  await queryInterface.createTable('students', {
    student_pk: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, autoIncrement: true, primaryKey: true },
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
    admission_date: { type: Sequelize.DATEONLY, allowNull: true, defaultValue: Sequelize.NOW },
    status: {
      type: Sequelize.ENUM('ACTIVE', 'SUSPENDED', 'GRADUATED', 'DROPPED'),
      allowNull: true,
      defaultValue: 'ACTIVE'
    },
    created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    updated_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
    },
    deleted_at: { type: Sequelize.DATE, allowNull: true }
  }, { ...INNODB_TABLE_OPTIONS, transaction });

  await queryInterface.createTable('instructors', {
    instructor_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, autoIncrement: true, primaryKey: true },
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
      allowNull: true,
      defaultValue: 'ACTIVE'
    },
    created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    updated_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
    },
    deleted_at: { type: Sequelize.DATE, allowNull: true }
  }, { ...INNODB_TABLE_OPTIONS, transaction });
};

const createGradingAndEnrollmentTables = async (queryInterface, Sequelize, transaction) => {
  await queryInterface.createTable('assessment_plans', {
    plan_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, autoIncrement: true, primaryKey: true },
    batch_id: {
      type: Sequelize.BIGINT.UNSIGNED,
      allowNull: false,
      references: { model: 'batches', key: 'batch_id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
    },
    module_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: { model: 'modules', key: 'module_id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
    },
    total_weight: { type: Sequelize.DECIMAL(5, 2), allowNull: false, defaultValue: 100 },
    created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    updated_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
    }
  }, { ...INNODB_TABLE_OPTIONS, transaction });

  await queryInterface.createTable('assessment_tasks', {
    task_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, autoIncrement: true, primaryKey: true },
    plan_id: {
      type: Sequelize.BIGINT.UNSIGNED,
      allowNull: false,
      references: { model: 'assessment_plans', key: 'plan_id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    task_name: { type: Sequelize.STRING(120), allowNull: false },
    task_type: {
      type: Sequelize.ENUM('EXAM', 'QUIZ', 'PROJECT', 'ASSIGNMENT', 'LAB', 'PRESENTATION', 'OTHER'),
      allowNull: false,
      defaultValue: 'OTHER'
    },
    max_weight: { type: Sequelize.DECIMAL(5, 2), allowNull: false },
    created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    updated_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
    }
  }, { ...INNODB_TABLE_OPTIONS, transaction });

  await queryInterface.createTable('student_grades', {
    grade_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, autoIncrement: true, primaryKey: true },
    student_pk: {
      type: Sequelize.BIGINT.UNSIGNED,
      allowNull: false,
      references: { model: 'students', key: 'student_pk' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
    },
    task_id: {
      type: Sequelize.BIGINT.UNSIGNED,
      allowNull: false,
      references: { model: 'assessment_tasks', key: 'task_id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    batch_id: {
      type: Sequelize.BIGINT.UNSIGNED,
      allowNull: false,
      references: { model: 'batches', key: 'batch_id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
    },
    obtained_score: { type: Sequelize.DECIMAL(6, 2), allowNull: false },
    created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    updated_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
    }
  }, { ...INNODB_TABLE_OPTIONS, transaction });

  await queryInterface.addIndex('student_grades', ['student_pk', 'task_id'], {
    unique: true,
    name: 'uq_student_grades_student_task',
    transaction
  });

  await queryInterface.createTable('grade_submissions', {
    submission_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, autoIncrement: true, primaryKey: true },
    batch_id: {
      type: Sequelize.BIGINT.UNSIGNED,
      allowNull: false,
      references: { model: 'batches', key: 'batch_id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
    },
    module_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: { model: 'modules', key: 'module_id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
    },
    status: {
      type: Sequelize.ENUM('DRAFT', 'SUBMITTED', 'REJECTED', 'HOD_APPROVED', 'QA_APPROVED', 'TVET_APPROVED', 'FINALIZED'),
      allowNull: false,
      defaultValue: 'DRAFT'
    },
    note: { type: Sequelize.TEXT, allowNull: true },
    created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    updated_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
    }
  }, { ...INNODB_TABLE_OPTIONS, transaction });

  await queryInterface.addIndex('grade_submissions', ['batch_id', 'module_id'], {
    unique: true,
    name: 'uq_grade_submissions_batch_module',
    transaction
  });

  await queryInterface.createTable('grade_scale_items', {
    scale_item_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, autoIncrement: true, primaryKey: true },
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
    grade_points: { type: Sequelize.DECIMAL(3, 2), allowNull: false, defaultValue: 0 },
    is_pass: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
    created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    updated_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
    }
  }, { ...INNODB_TABLE_OPTIONS, transaction });

  await queryInterface.createTable('module_enrollments', {
    enrollment_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, autoIncrement: true, primaryKey: true },
    student_pk: {
      type: Sequelize.BIGINT.UNSIGNED,
      allowNull: false,
      references: { model: 'students', key: 'student_pk' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
    },
    module_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: { model: 'modules', key: 'module_id' },
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
    final_score: { type: Sequelize.DECIMAL(6, 2), allowNull: true },
    letter_grade: { type: Sequelize.STRING(8), allowNull: true },
    grade_points: { type: Sequelize.DECIMAL(3, 2), allowNull: true },
    status: {
      type: Sequelize.ENUM('PASSED', 'FAILED'),
      allowNull: false,
      defaultValue: 'PASSED'
    },
    created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    updated_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
    }
  }, { ...INNODB_TABLE_OPTIONS, transaction });

  await queryInterface.addIndex('module_enrollments', ['student_pk', 'module_id', 'batch_id'], {
    unique: true,
    name: 'uq_module_enrollments_student_module_batch',
    transaction
  });

  await queryInterface.createTable('module_prerequisites', {
    prerequisite_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, autoIncrement: true, primaryKey: true },
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
    created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    updated_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
    }
  }, { ...INNODB_TABLE_OPTIONS, transaction });

  await queryInterface.addIndex('module_prerequisites', ['module_id', 'required_module_id'], {
    unique: true,
    name: 'uq_module_prerequisites_module_required',
    transaction
  });

  await queryInterface.createTable('enrollments', {
    enrollment_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, autoIncrement: true, primaryKey: true },
    student_pk: {
      type: Sequelize.BIGINT.UNSIGNED,
      allowNull: false,
      references: { model: 'students', key: 'student_pk' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
    },
    module_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: { model: 'modules', key: 'module_id' },
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
    status: { type: Sequelize.ENUM('ENROLLED', 'DROPPED', 'COMPLETED'), allowNull: false, defaultValue: 'ENROLLED' },
    created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    updated_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
    }
  }, { ...INNODB_TABLE_OPTIONS, transaction });

  await queryInterface.addIndex('enrollments', ['student_pk', 'module_id', 'batch_id'], {
    unique: true,
    name: 'uq_enrollments_student_module_batch',
    transaction
  });

  await queryInterface.createTable('student_gpa_records', {
    gpa_record_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, autoIncrement: true, primaryKey: true },
    student_pk: {
      type: Sequelize.BIGINT.UNSIGNED,
      allowNull: false,
      references: { model: 'students', key: 'student_pk' },
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
    semester_gpa: { type: Sequelize.DECIMAL(4, 2), allowNull: false, defaultValue: 0 },
    cumulative_gpa: { type: Sequelize.DECIMAL(4, 2), allowNull: false, defaultValue: 0 },
    total_credits: { type: Sequelize.DECIMAL(6, 2), allowNull: false, defaultValue: 0 },
    total_grade_points: { type: Sequelize.DECIMAL(8, 2), allowNull: false, defaultValue: 0 },
    created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    updated_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
    }
  }, { ...INNODB_TABLE_OPTIONS, transaction });

  await queryInterface.addIndex('student_gpa_records', ['student_pk', 'batch_id'], {
    unique: true,
    name: 'uq_student_gpa_records_student_batch',
    transaction
  });
};

export default {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.sequelize.query('SET FOREIGN_KEY_CHECKS = 0', { transaction });
      await dropAllKnownAndResidualTables(queryInterface, transaction);

      await createCoreAcademicTables(queryInterface, Sequelize, transaction);
      await createIdentityAndAccessTables(queryInterface, Sequelize, transaction);
      await createPeopleAndAcademicFlowTables(queryInterface, Sequelize, transaction);
      await createGradingAndEnrollmentTables(queryInterface, Sequelize, transaction);

      await queryInterface.sequelize.query('SET FOREIGN_KEY_CHECKS = 1', { transaction });
      await transaction.commit();
    } catch (error) {
      try {
        await queryInterface.sequelize.query('SET FOREIGN_KEY_CHECKS = 1', { transaction });
      } catch (_) {
        // Ignore restore failures so the original migration error can be surfaced.
      }

      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.sequelize.query('SET FOREIGN_KEY_CHECKS = 0', { transaction });
      await dropAllKnownAndResidualTables(queryInterface, transaction);
      await queryInterface.sequelize.query('SET FOREIGN_KEY_CHECKS = 1', { transaction });
      await transaction.commit();
    } catch (error) {
      try {
        await queryInterface.sequelize.query('SET FOREIGN_KEY_CHECKS = 1', { transaction });
      } catch (_) {
        // Ignore restore failures so the original migration error can be surfaced.
      }

      await transaction.rollback();
      throw error;
    }
  }
};
