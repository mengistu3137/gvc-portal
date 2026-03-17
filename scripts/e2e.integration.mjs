import axios from 'axios';

const BASE_URL = process.env.E2E_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
const API_BASE = `${BASE_URL}/api`;

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'admin@gvc.edu';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'admin123';

const ADMIN2_EMAIL = process.env.E2E_ADMIN2_EMAIL || ADMIN_EMAIL;
const ADMIN2_PASSWORD = process.env.E2E_ADMIN2_PASSWORD || ADMIN_PASSWORD;

const RUN_ID = Date.now();

const ids = {
  authUserId: null,
  sectorId: null,
  occupationId: null,
  levelId: 4,
  academicYearId: null,
  moduleId: null,
  batchId: null,
  levelModuleId: null,
  studentPk: null,
  instructorId: null,
  staffId: null,
  enrollmentId: null,
  policyId: null,
  scaleItemIdA: null,
  scaleItemIdB: null,
  planId: null,
  taskId: null,
  submissionId: null
};

let stepCounter = 0;
let adminToken = null;
let admin2Token = null;

const api = axios.create({
  baseURL: API_BASE,
  timeout: Number(process.env.E2E_TIMEOUT_MS || 30000)
});

function redactToken(token) {
  if (!token) return null;
  if (token.length <= 16) return token;
  return `${token.slice(0, 8)}...${token.slice(-8)}`;
}

function pick(obj, keys) {
  if (!obj || typeof obj !== 'object') return obj;
  const out = {};
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      out[key] = obj[key];
    }
  }
  return out;
}

function summarize(data) {
  if (data === null || data === undefined) return data;
  if (Array.isArray(data)) return { type: 'array', size: data.length };
  if (typeof data !== 'object') return data;

  if (data.success !== undefined) {
    return {
      success: data.success,
      message: data.message || null,
      data: data.data
        ? pick(data.data, [
            'user_id',
            'person_id',
            'email',
            'sector_id',
            'occupation_id',
            'level_id',
            'academic_year_id',
            'module_id',
            'batch_id',
            'level_module_id',
            'student_pk',
            'student_id',
            'instructor_id',
            'staff_id',
            'enrollment_id',
            'policy_id',
            'scale_item_id',
            'plan_id',
            'task_id',
            'submission_id',
            'status',
            'letter_grade',
            'total_score',
            'semester_gpa',
            'cumulative_gpa',
            'eligible',
            'missing'
          ])
        : null,
      count: data.count ?? data.totalItems ?? data.rows?.length ?? null,
      rows: Array.isArray(data.rows) ? data.rows.length : null
    };
  }

  return pick(data, [
    'user_id',
    'person_id',
    'email',
    'sector_id',
    'occupation_id',
    'level_id',
    'academic_year_id',
    'module_id',
    'batch_id',
    'level_module_id',
    'student_pk',
    'student_id',
    'instructor_id',
    'staff_id',
    'enrollment_id',
    'policy_id',
    'scale_item_id',
    'plan_id',
    'task_id',
    'submission_id',
    'status',
    'letter_grade',
    'total_score'
  ]);
}

function logStepStart(title, details = null) {
  stepCounter += 1;
  const prefix = `[STEP ${String(stepCounter).padStart(2, '0')}]`;
  console.log(`\n${prefix} ${title}`);
  if (details) {
    console.log('REQUEST:', JSON.stringify(details, null, 2));
  }
}

function logStepPass(resp) {
  console.log('RESULT: PASS');
  if (resp) {
    console.log(`HTTP: ${resp.status} ${resp.statusText}`);
    console.log('RESPONSE:', JSON.stringify(summarize(resp.data), null, 2));
  }
}

function logStepFail(err) {
  console.error('RESULT: FAIL');
  if (err.response) {
    console.error(`HTTP: ${err.response.status} ${err.response.statusText}`);
    console.error('RESPONSE:', JSON.stringify(err.response.data, null, 2));
    return;
  }
  console.error('ERROR:', err.message || err);
}

async function runStep(title, fn) {
  logStepStart(title);
  try {
    const resp = await fn();
    logStepPass(resp);
    return resp;
  } catch (err) {
    logStepFail(err);
    throw err;
  }
}

function authHeaders(token) {
  return {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };
}

async function loginAs(email, password) {
  const resp = await api.post('/auth/login', { email, password });
  return resp;
}

async function main() {
  console.log('==================================================');
  console.log('Grand Valley College API E2E Integration Test Flow');
  console.log('==================================================');
  console.log('BASE_URL:', BASE_URL);
  console.log('RUN_ID:', RUN_ID);

  const unique = {
    sectorCode: `E2ESEC${String(RUN_ID).slice(-6)}`,
    occupationCode: `E2EOCC${String(RUN_ID).slice(-6)}`,
    moduleCode: `E2EMOD${String(RUN_ID).slice(-6)}`,
    yearLabel: `E2E-${new Date().getFullYear()}-${String(RUN_ID).slice(-4)}`,
    authEmail: `e2e.user.${RUN_ID}@gvc.edu`,
    studentEmail: `e2e.student.${RUN_ID}@gvc.edu`,
    instructorEmail: `e2e.instructor.${RUN_ID}@gvc.edu`,
    staffEmail: `e2e.staff.${RUN_ID}@gvc.edu`
  };

  const flowPlan = [
    'Authenticate two admin sessions',
    'Create user account via auth module and verify retrieval',
    'Create academics master data (sector, occupation, level, year, module, batch, curriculum)',
    'Create and verify student/instructor/staff profiles',
    'Run enrollment eligibility and enrollment creation/update',
    'Run grading policy + scale + assessment + submission + final grade + GPA',
    'Run cleanup deletes in reverse dependency order'
  ];

  console.log('FLOW:', JSON.stringify(flowPlan, null, 2));

  const login1 = await runStep('Login as primary admin', () => loginAs(ADMIN_EMAIL, ADMIN_PASSWORD));
  adminToken = login1.data?.token;
  if (!adminToken) throw new Error('Primary admin token missing from login response.');
  console.log('TOKEN (admin):', redactToken(adminToken));

  const login2 = await runStep('Login as secondary workflow actor', () => loginAs(ADMIN2_EMAIL, ADMIN2_PASSWORD));
  admin2Token = login2.data?.token;
  if (!admin2Token) throw new Error('Secondary token missing from login response.');
  console.log('TOKEN (admin2):', redactToken(admin2Token));

  await runStep('Create user account via /auth/create', async () => {
    const resp = await api.post(
      '/auth/create',
      {
        email: unique.authEmail,
        password: 'TempE2E#1234',
        status: 'ACTIVE',
        must_change_password: false,
        first_name: 'E2E',
        last_name: 'AuthUser',
        role_codes: ['REGISTRAR']
      },
      authHeaders(adminToken)
    );

    ids.authUserId = resp.data?.data?.user_id || null;
    return resp;
  });

  await runStep('List users and assert newly created auth user appears', async () => {
    const resp = await api.get(`/auth?search=${encodeURIComponent(unique.authEmail)}`, authHeaders(adminToken));
    const rows = resp.data?.data?.users || resp.data?.users || [];
    const found = rows.find((u) => u.email === unique.authEmail);
    if (!found) throw new Error('Created auth user not found in users list.');
    ids.authUserId = ids.authUserId || found.user_id;
    return resp;
  });

  await runStep('Create sector', async () => {
    const resp = await api.post(
      '/academics/sectors',
      { sector_code: unique.sectorCode, sector_name: `E2E Sector ${RUN_ID}` },
      authHeaders(adminToken)
    );
    ids.sectorId = resp.data?.data?.sector_id;
    return resp;
  });

  await runStep('Create occupation', async () => {
    const resp = await api.post(
      '/academics/occupations',
      {
        sector_id: ids.sectorId,
        occupation_code: unique.occupationCode,
        occupation_name: `E2E Occupation ${RUN_ID}`
      },
      authHeaders(adminToken)
    );
    ids.occupationId = resp.data?.data?.occupation_id;
    return resp;
  });

  await runStep('Create level for occupation (composite key)', async () => {
    const resp = await api.post(
      '/academics/levels',
      {
        level_id: ids.levelId,
        occupation_id: ids.occupationId,
        level_name: 'IV'
      },
      authHeaders(adminToken)
    );
    return resp;
  });

  await runStep('Create academic year', async () => {
    const resp = await api.post(
      '/academics/academic-years',
      {
        academic_year_label: unique.yearLabel,
        start_date: '2026-01-01',
        end_date: '2026-12-31'
      },
      authHeaders(adminToken)
    );
    ids.academicYearId = resp.data?.data?.academic_year_id;
    return resp;
  });

  await runStep('Create module', async () => {
    const resp = await api.post(
      '/academics/modules',
      {
        m_code: unique.moduleCode,
        occupation_id: ids.occupationId,
        unit_competency: `E2E competency ${RUN_ID}`,
        theory_hours: 20,
        practical_hours: 50,
        cooperative_hours: 10,
        learning_hours: 80,
        credit_units: 3.0
      },
      authHeaders(adminToken)
    );
    ids.moduleId = resp.data?.data?.module_id;
    return resp;
  });

  await runStep('Create batch', async () => {
    const resp = await api.post(
      '/academics/batches',
      {
        occupation_id: ids.occupationId,
        academic_year_id: ids.academicYearId,
        level_id: ids.levelId,
        track_type: 'REGULAR',
        capacity: 30
      },
      authHeaders(adminToken)
    );
    ids.batchId = resp.data?.data?.batch_id;
    return resp;
  });

  await runStep('Add module to curriculum', async () => {
    const resp = await api.post(
      '/academics/curriculum',
      {
        occupation_id: ids.occupationId,
        level_id: ids.levelId,
        m_code: unique.moduleCode,
        semester: 1
      },
      authHeaders(adminToken)
    );
    ids.levelModuleId = resp.data?.data?.level_module_id;
    return resp;
  });

  await runStep('Create student profile', async () => {
    const resp = await api.post(
      '/students',
      {
        first_name: 'E2E',
        last_name: 'Student',
        gender: 'M',
        email: unique.studentEmail,
        batch_id: ids.batchId,
        admission_date: '2026-02-10',
        status: 'ACTIVE'
      },
      authHeaders(adminToken)
    );
    ids.studentPk = resp.data?.data?.student_pk;
    return resp;
  });

  await runStep('Get student by id', async () => {
    const resp = await api.get(`/students/${ids.studentPk}`, authHeaders(adminToken));
    return resp;
  });

  await runStep('Create instructor profile', async () => {
    const resp = await api.post(
      '/instructors',
      {
        first_name: 'E2E',
        last_name: 'Instructor',
        gender: 'M',
        email: unique.instructorEmail,
        occupation_id: ids.occupationId,
        qualification: 'MSc in Computer Science',
        employment_status: 'ACTIVE'
      },
      authHeaders(adminToken)
    );
    ids.instructorId = resp.data?.data?.instructor_id;
    return resp;
  });

  await runStep('Create staff profile', async () => {
    const resp = await api.post(
      '/staff',
      {
        first_name: 'E2E',
        last_name: 'Staff',
        gender: 'F',
        email: unique.staffEmail,
        staff_type: 'REGISTRAR',
        employment_status: 'ACTIVE'
      },
      authHeaders(adminToken)
    );
    ids.staffId = resp.data?.data?.staff_id;
    return resp;
  });

  await runStep('Create enrollment prerequisite relation (self prerequisite test skipped by policy)', async () => {
    const resp = await api.post(
      '/enrollment/prerequisites',
      {
        module_id: ids.moduleId,
        required_module_id: ids.moduleId
      },
      authHeaders(adminToken)
    );
    return resp;
  });

  await runStep('Check enrollment eligibility (should report missing prerequisite)', async () => {
    const resp = await api.get(
      `/enrollment/eligibility/${ids.studentPk}/${ids.moduleId}`,
      authHeaders(adminToken)
    );

    const eligible = resp.data?.data?.eligible;
    if (eligible !== false) {
      throw new Error('Eligibility expected false due to prerequisite requirement.');
    }
    return resp;
  });

  await runStep('Create enrollment (expected to fail due to missing prerequisite)', async () => {
    try {
      await api.post(
        '/enrollment',
        {
          student_pk: ids.studentPk,
          module_id: ids.moduleId,
          batch_id: ids.batchId,
          status: 'ENROLLED'
        },
        authHeaders(adminToken)
      );
      throw new Error('Enrollment unexpectedly succeeded while prerequisite is missing.');
    } catch (err) {
      if (err.response && err.response.status >= 400) {
        return {
          status: err.response.status,
          statusText: 'Expected Failure',
          data: {
            success: true,
            message: 'Enrollment blocked as expected by prerequisite rule.',
            data: {
              blocked: true,
              http_status: err.response.status
            }
          }
        };
      }
      throw err;
    }
  });

  await runStep('Create grading policy', async () => {
    const resp = await api.post(
      '/grading/policies',
      {
        policy_name: `E2E Policy ${RUN_ID}`
      },
      authHeaders(adminToken)
    );
    ids.policyId = resp.data?.data?.policy_id;
    return resp;
  });

  await runStep('Add grade scale item A (0-59 F)', async () => {
    const resp = await api.post(
      `/grading/policies/${ids.policyId}/scale-items`,
      {
        letter_grade: 'F',
        min_score: 0,
        max_score: 59,
        grade_points: 0.0,
        is_pass: false
      },
      authHeaders(adminToken)
    );
    ids.scaleItemIdA = resp.data?.data?.scale_item_id;
    return resp;
  });

  await runStep('Add grade scale item B (60-100 A)', async () => {
    const resp = await api.post(
      `/grading/policies/${ids.policyId}/scale-items`,
      {
        letter_grade: 'A',
        min_score: 60,
        max_score: 100,
        grade_points: 4.0,
        is_pass: true
      },
      authHeaders(adminToken)
    );
    ids.scaleItemIdB = resp.data?.data?.scale_item_id;
    return resp;
  });

  await runStep('Attach grading policy to batch', async () => {
    const resp = await api.put(
      `/academics/batches/${ids.batchId}`,
      {
        grading_policy_id: ids.policyId
      },
      authHeaders(adminToken)
    );
    return resp;
  });

  await runStep('Create assessment plan', async () => {
    const resp = await api.post(
      '/grading/plans',
      {
        batch_id: ids.batchId,
        module_id: ids.moduleId,
        total_weight: 100
      },
      authHeaders(adminToken)
    );
    ids.planId = resp.data?.data?.plan_id;
    return resp;
  });

  await runStep('Create assessment task with full 100 weight', async () => {
    const resp = await api.post(
      `/grading/plans/${ids.planId}/tasks`,
      {
        task_name: 'E2E Final Exam',
        task_type: 'EXAM',
        max_weight: 100
      },
      authHeaders(adminToken)
    );
    ids.taskId = resp.data?.data?.task_id;
    return resp;
  });

  await runStep('Create grade submission in DRAFT', async () => {
    const resp = await api.post(
      '/grading/submissions',
      {
        batch_id: ids.batchId,
        module_id: ids.moduleId,
        status: 'DRAFT'
      },
      authHeaders(adminToken)
    );
    ids.submissionId = resp.data?.data?.submission_id;
    return resp;
  });

  await runStep('Upsert student grade', async () => {
    const resp = await api.post(
      '/grading/grades',
      {
        student_pk: ids.studentPk,
        task_id: ids.taskId,
        batch_id: ids.batchId,
        module_id: ids.moduleId,
        obtained_score: 85
      },
      authHeaders(adminToken)
    );
    return resp;
  });

  await runStep('Submission workflow transition to SUBMITTED', async () => {
    const resp = await api.put(
      `/grading/submissions/${ids.submissionId}/status`,
      {
        next_status: 'SUBMITTED'
      },
      authHeaders(adminToken)
    );
    return resp;
  });

  await runStep('Submission workflow transition to HOD_APPROVED (admin2 actor)', async () => {
    const resp = await api.put(
      `/grading/submissions/${ids.submissionId}/status`,
      {
        next_status: 'HOD_APPROVED'
      },
      authHeaders(admin2Token)
    );
    return resp;
  });

  await runStep('Submission workflow finalization with skip note', async () => {
    const resp = await api.put(
      `/grading/submissions/${ids.submissionId}/status`,
      {
        next_status: 'FINALIZED',
        note: 'E2E skip of optional QA/TVET approval path by authorized actor.'
      },
      authHeaders(adminToken)
    );
    return resp;
  });

  await runStep('Calculate final grade after finalization', async () => {
    const resp = await api.get(
      `/grading/calculate/${ids.studentPk}/${ids.moduleId}/${ids.batchId}`,
      authHeaders(adminToken)
    );
    const grade = resp.data?.data?.letter_grade;
    if (!grade) throw new Error('Final grade calculation did not return a letter grade.');
    return resp;
  });

  await runStep('Calculate student GPA', async () => {
    const resp = await api.get(
      `/enrollment/gpa/${ids.studentPk}/${ids.batchId}`,
      authHeaders(adminToken)
    );
    return resp;
  });

  const cleanup = [
    {
      title: 'Cleanup: delete instructor',
      run: () => (ids.instructorId ? api.delete(`/instructors/${ids.instructorId}`, authHeaders(adminToken)) : null)
    },
    {
      title: 'Cleanup: delete staff',
      run: () => (ids.staffId ? api.delete(`/staff/${ids.staffId}`, authHeaders(adminToken)) : null)
    },
    {
      title: 'Cleanup: delete student',
      run: () => (ids.studentPk ? api.delete(`/students/${ids.studentPk}`, authHeaders(adminToken)) : null)
    },
    {
      title: 'Cleanup: remove curriculum entry',
      run: () => (ids.levelModuleId ? api.delete(`/academics/curriculum/${ids.levelModuleId}`, authHeaders(adminToken)) : null)
    },
    {
      title: 'Cleanup: delete module',
      run: () => (ids.moduleId ? api.delete(`/academics/modules/${ids.moduleId}`, authHeaders(adminToken)) : null)
    },
    {
      title: 'Cleanup: delete batch',
      run: () => (ids.batchId ? api.delete(`/academics/batches/${ids.batchId}`, authHeaders(adminToken)) : null)
    },
    {
      title: 'Cleanup: delete level',
      run: () =>
        ids.occupationId
          ? api.delete(`/academics/levels/${ids.levelId}/${ids.occupationId}`, authHeaders(adminToken))
          : null
    },
    {
      title: 'Cleanup: delete occupation',
      run: () => (ids.occupationId ? api.delete(`/academics/occupations/${ids.occupationId}`, authHeaders(adminToken)) : null)
    },
    {
      title: 'Cleanup: delete sector',
      run: () => (ids.sectorId ? api.delete(`/academics/sectors/${ids.sectorId}`, authHeaders(adminToken)) : null)
    },
    {
      title: 'Cleanup: delete test auth user',
      run: () => (ids.authUserId ? api.delete(`/auth/${ids.authUserId}`, authHeaders(adminToken)) : null)
    }
  ];

  console.log('\n--- CLEANUP PHASE START ---');
  for (const task of cleanup) {
    await runStep(task.title, async () => {
      const result = await task.run();
      if (!result) {
        return {
          status: 200,
          statusText: 'Skipped',
          data: { success: true, message: 'Skipped due to missing id' }
        };
      }
      return result;
    });
  }
  console.log('--- CLEANUP PHASE COMPLETE ---\n');

  console.log('E2E TEST FLOW COMPLETED SUCCESSFULLY.');
}

main().catch((err) => {
  console.error('\nE2E TEST FLOW TERMINATED WITH FAILURE.');
  if (err.response) {
    console.error(`HTTP: ${err.response.status} ${err.response.statusText}`);
    console.error('RESPONSE:', JSON.stringify(err.response.data, null, 2));
  } else {
    console.error('ERROR:', err.message || err);
  }
  process.exitCode = 1;
});
