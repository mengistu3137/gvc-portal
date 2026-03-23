// Helper script to build a minimal grading context and upsert one student grade
// Usage: node scripts/grade-demo-setup.mjs [batchId] [moduleId] [studentPk]
// Defaults: batchId=1, moduleId=1, studentPk=1

import sequelize from '../src/config/database.js';
import { Batch } from '../src/modules/academics/academic.model.js';
import {
  AssessmentPlan,
  AssessmentTask,
  GradeSubmission,
  GradingPolicy,
  GradeScaleItem
} from '../src/modules/grading/grading.model.js';
import GradingService from '../src/modules/grading/grading.service.js';

const [batchArg, moduleArg, studentArg] = process.argv.slice(2);
const batchId = Number(batchArg) || 1;
const moduleId = Number(moduleArg) || 1;
const studentPk = Number(studentArg) || 1;

// Permissions stub so grading service authorizations pass
const actor = {
  email: 'demo.script@gvc.edu',
  permissions: [
    'manage_grading',
    'manage_grading_policy',
    'approve_grades_hod',
    'approve_grades_qa',
    'approve_grades_tvet',
    'finalize_grades_registrar'
  ]
};

const defaultScale = [
  { letter_grade: 'A', min_score: 90, max_score: 100, grade_points: 4, is_pass: true },
  { letter_grade: 'B', min_score: 80, max_score: 89.99, grade_points: 3, is_pass: true },
  { letter_grade: 'C', min_score: 70, max_score: 79.99, grade_points: 2, is_pass: true },
  { letter_grade: 'D', min_score: 60, max_score: 69.99, grade_points: 1, is_pass: true },
  { letter_grade: 'F', min_score: 0, max_score: 59.99, grade_points: 0, is_pass: false }
];

async function ensurePolicy(transaction) {
  const policyName = 'Demo Default Policy';
  const [policy] = await GradingPolicy.findOrCreate({
    where: { policy_name: policyName },
    defaults: { policy_name: policyName, is_locked: false },
    transaction
  });

  const existingCount = await GradeScaleItem.count({ where: { policy_id: policy.policy_id }, transaction });
  if (existingCount === 0) {
    await GradeScaleItem.bulkCreate(
      defaultScale.map((item) => ({ ...item, policy_id: policy.policy_id })),
      { transaction }
    );
  }

  return policy;
}

async function ensureBatchHasPolicy(batch, policy, transaction) {
  if (!batch.grading_policy_id || Number(batch.grading_policy_id) !== Number(policy.policy_id)) {
    await batch.update({ grading_policy_id: policy.policy_id }, { transaction });
  }
}

async function ensurePlanAndTasks(batchIdParam, moduleIdParam, transaction) {
  const [plan] = await AssessmentPlan.findOrCreate({
    where: { batch_id: batchIdParam, module_id: moduleIdParam },
    defaults: { batch_id: batchIdParam, module_id: moduleIdParam, total_weight: 100 },
    transaction
  });

  const tasks = await AssessmentTask.findAll({ where: { plan_id: plan.plan_id }, transaction });
  if (tasks.length === 0) {
    await AssessmentTask.bulkCreate([
      { plan_id: plan.plan_id, task_name: 'Midterm', task_type: 'EXAM', max_weight: 40 },
      { plan_id: plan.plan_id, task_name: 'Final', task_type: 'EXAM', max_weight: 60 }
    ], { transaction });
  }

  const refreshedTasks = await AssessmentTask.findAll({ where: { plan_id: plan.plan_id }, transaction, order: [['task_id', 'ASC']] });
  return { plan, tasks: refreshedTasks };
}

async function ensureSubmission(batchIdParam, moduleIdParam, transaction) {
  const [submission] = await GradeSubmission.findOrCreate({
    where: { batch_id: batchIdParam, module_id: moduleIdParam },
    defaults: { batch_id: batchIdParam, module_id: moduleIdParam, status: 'DRAFT' },
    transaction
  });
  return submission;
}

async function main() {
  console.log('➡️  Preparing grading demo data...');
  await sequelize.authenticate();

  const t = await sequelize.transaction();
  try {
    const batch = await Batch.findByPk(batchId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!batch) throw new Error(`Batch ${batchId} not found`);

    const policy = await ensurePolicy(t);
    await ensureBatchHasPolicy(batch, policy, t);

    const { tasks } = await ensurePlanAndTasks(batchId, moduleId, t);
    const submission = await ensureSubmission(batchId, moduleId, t);

    await t.commit();
    console.log(`✅ Ready. Submission ${submission.submission_id} for batch ${batchId}, module ${moduleId}.`);

    // Upsert two grades so final score is non-zero
    const midterm = tasks[0];
    const finalExam = tasks[1] || tasks[0];

    const midtermScore = 36; // out of 40
    const finalScore = 54;   // out of 60

    await GradingService.upsertStudentGrade({
      student_pk: studentPk,
      task_id: midterm.task_id,
      batch_id: batchId,
      module_id: moduleId,
      obtained_score: midtermScore
    }, actor);

    await GradingService.upsertStudentGrade({
      student_pk: studentPk,
      task_id: finalExam.task_id,
      batch_id: batchId,
      module_id: moduleId,
      obtained_score: finalScore
    }, actor);

    console.log('🎯 Grades upserted successfully. You can now hit the API without the missing submission error.');
  } catch (error) {
    await t.rollback();
    console.error('❌ Setup failed:', error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

main();
