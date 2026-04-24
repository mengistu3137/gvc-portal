import sequelize from '../../config/database.js';
import { Op } from 'sequelize';
import {
  Assessment,
  GradeScale,
  GradeSubmission,
  StudentAssessmentScore,
  StudentResult,
  SubmissionItem,
  Approval,
  StudentGpaRecord
} from './grading.model.js';
import { ModuleOffering } from '../enrollment/enrollment.model.js';
import { Module, Batch, Level, Occupation, AcademicYear } from '../academics/academic.model.js';
import { Student } from '../students/student.model.js';

class GradingService {
  // ---------------------------------------------------------
  // 1. GRADE ENTRY (Fixed Associations & Fields)
  // ---------------------------------------------------------

  async upsertStudentGrade(payload, user) {
    const { student_pk, offering_id, assessment_scores = [], attempt_no = 1 } = payload;

    return sequelize.transaction(async (transaction) => {
      // 1. Fetch Offering with Module (to get credit_units for GPA later)
      const offering = await ModuleOffering.findByPk(offering_id, {
        include: [
          { 
            model: Module, 
            as: 'module',
            attributes: ['module_id', 'm_code', 'unit_competency', 'credit_units'] 
          },
          {
            model: Batch,
            as: 'batch', // Assuming this association exists in enrollment.model.js
            attributes: ['batch_id', 'level_id']
          }
        ],
        transaction,
      });

      if (!offering) throw new Error('Module offering not found');
      if (!offering.module) throw new Error('Module details not found for this offering');

      // 2. Manage Assessments & Scores
      const assessments = [];
      for (const row of assessment_scores) {
        // Find or create assessment definition
        const [assessment] = await Assessment.findOrCreate({
          where: { offering_id, name: row.name },
          defaults: { weight: Number(row.weight || 0) },
          transaction,
        });

        // Update weight if it changed
        if (row.weight && Number(row.weight) !== Number(assessment.weight)) {
          await assessment.update({ weight: Number(row.weight) }, { transaction });
        }

        // Save Student Score
        await StudentAssessmentScore.upsert(
          {
            student_pk,
            assessment_id: assessment.assessment_id,
            score: Number(row.score || 0),
          },
          { transaction }
        );
        
        assessments.push({ assessment, score: Number(row.score || 0) });
      }

      // 3. Calculate Total Weighted Score
      const totalWeighted = assessments.reduce((sum, item) => {
        const weight = Number(item.assessment.weight || 0);
        return sum + (item.score * weight) / 100;
      }, 0);

      // 4. Determine Letter Grade & Status
      const gradeScale = await GradeScale.findAll({ order: [['min_score', 'ASC']], transaction });
      const fallbackScale = [
        { min_score: 85, max_score: 100, letter: 'A', grade_point: 4.0, is_pass: true },
        { min_score: 75, max_score: 84.99, letter: 'B', grade_point: 3.0, is_pass: true },
        { min_score: 65, max_score: 74.99, letter: 'C', grade_point: 2.0, is_pass: true },
        { min_score: 50, max_score: 64.99, letter: 'D', grade_point: 1.0, is_pass: true },
        { min_score: 0, max_score: 49.99, letter: 'F', grade_point: 0, is_pass: false },
      ];

      const activeScale = gradeScale.length ? gradeScale : fallbackScale;
      const matchedScale = activeScale.find((scale) => {
        const min = Number(scale.min_score);
        const max = Number(scale.max_score);
        return totalWeighted >= min && totalWeighted <= max;
      });

      const letter_grade = matchedScale?.letter || 'F';
      const grade_point = Number(matchedScale?.grade_point || 0);
      const is_pass = typeof matchedScale?.is_pass === 'boolean' ? matchedScale.is_pass : grade_point > 0;

      // 5. Upsert Final Result
      const [result] = await StudentResult.findOrCreate({
        where: { student_pk, offering_id, attempt_no },
        defaults: {
          total_score: totalWeighted,
          letter_grade,
          grade_point,
          status: is_pass ? 'PASSED' : 'FAILED',
        },
        transaction,
      });

      if (!result.isNewRecord) {
        await result.update(
          {
            total_score: totalWeighted,
            letter_grade,
            grade_point,
            status: is_pass ? 'PASSED' : 'FAILED',
          },
          { transaction }
        );
      }

      return result;
    });
  }

  async upsertStudentGradesBulk(rows, user) {
    const results = [];
    for (const row of Array.isArray(rows) ? rows : []) {
      try {
        const record = await this.upsertStudentGrade(row, user);
        results.push({ success: true, data: record });
      } catch (error) {
        results.push({ success: false, error: error.message, student: row.student_pk });
      }
    }
    return results;
  }

  // ---------------------------------------------------------
  // 2. SUBMISSION WORKFLOW
  // ---------------------------------------------------------

  async submitGradesForApproval(offering_id, instructor_id) {
    return sequelize.transaction(async (t) => {
      const existing = await GradeSubmission.findOne({
        where: { offering_id, status: ['DRAFT', 'SUBMITTED'] },
        transaction: t
      });
      if (existing) throw new Error('A draft or active submission already exists.');

      const submission = await GradeSubmission.create({
        offering_id,
        instructor_id,
        status: 'SUBMITTED'
      }, { transaction: t });

      const results = await StudentResult.findAll({
        where: { offering_id },
        attributes: ['result_id'],
        transaction: t
      });

      if (results.length === 0) throw new Error('No student results found to submit.');

      const items = results.map(r => ({
        submission_id: submission.submission_id,
        result_id: r.result_id
      }));

      await SubmissionItem.bulkCreate(items, { transaction: t });
      return submission;
    });
  }

  async approveGradeSubmission(submission_id, approver_id, role, status = 'APPROVED') {
    return sequelize.transaction(async (t) => {
      const submission = await GradeSubmission.findByPk(submission_id, { transaction: t });
      if (!submission) throw new Error('Submission not found');
      if (submission.status === 'APPROVED') throw new Error('Submission already approved');

      await Approval.create({
        submission_id,
        role,
        status,
        approved_by: approver_id,
        approved_at: new Date()
      }, { transaction: t });

      const newStatus = status === 'REJECTED' ? 'REJECTED' : 'APPROVED';
      await submission.update({ status: newStatus }, { transaction: t });

      return submission;
    });
  }

  // ---------------------------------------------------------
  // 3. GPA CALCULATION (Schema Corrected)
  // ---------------------------------------------------------

  async calculateStudentGpa(student_pk, batch_id, level_id) {
    return sequelize.transaction(async (t) => {
      // 1. Fetch Batch to confirm level_id and get context
      const batch = await Batch.findByPk(batch_id, {
        include: [{ model: Level, as: 'level' }],
        transaction: t
      });
      
      if (!batch) throw new Error('Batch not found');
      // Use the batch's level_id if the passed one is null, or validate they match
      const targetLevelId = level_id || batch.level_id;

      // 2. Get all Results for this student in this Batch
      // We join ModuleOffering -> Module to get credit_units
      const results = await StudentResult.findAll({
        where: { student_pk },
        include: [{
          model: ModuleOffering,
          as: 'module_offering',
          attributes: ['offering_id', 'batch_id'],
          where: { batch_id }, // Filter strictly by this batch
          include: [{
            model: Module,
            as: 'module',
            attributes: ['credit_units'] // SCHEMA FIX: credit_units, not credit_hours
          }]
        }],
        transaction: t
      });

      let totalPoints = 0;
      let totalCredits = 0;

      results.forEach(res => {
        // SCHEMA FIX: Access credit_units from the included module
        const credits = Number(res.module_offering?.module?.credit_units || 0);
        const points = Number(res.grade_point || 0);
        
        totalPoints += (points * credits);
        totalCredits += credits;
      });

      const level_gpa = totalCredits > 0 ? (totalPoints / totalCredits) : 0.00;

      // 3. Calculate Cumulative GPA
      // Logic: Fetch all GPA records for levels BELOW current level
      const pastRecords = await StudentGpaRecord.findAll({
        where: { 
          student_pk, 
          level_id: { [Op.lt]: targetLevelId } 
        },
        order: [['level_id', 'DESC']],
        limit: 1,
        transaction: t
      });

      let cumulative_gpa = level_gpa;
      
      if (pastRecords.length > 0) {
        // Simple averaging logic for example: (Current Level GPA + Previous Cumulative GPA) / 2
        // A robust system would re-sum all points/credits from history.
        // Using standard increment logic:
        const prevCumGpa = Number(pastRecords[0].cumulative_gpa);
        // Formula: ( (PrevCumGpa * PrevLevels) + (CurrentGPA * 1) ) / (PrevLevels + 1)
        // Assuming uniform weight per level for simplicity here:
        cumulative_gpa = ((prevCumGpa * pastRecords.length) + level_gpa) / (pastRecords.length + 1);
      }

      // 4. Upsert GPA Record
      const [gpaRecord] = await StudentGpaRecord.findOrCreate({
        where: { student_pk, batch_id, level_id: targetLevelId },
        defaults: {
          level_gpa: parseFloat(level_gpa.toFixed(2)),
          cumulative_gpa: parseFloat(cumulative_gpa.toFixed(2))
        },
        transaction: t
      });

      if (!gpaRecord.isNewRecord) {
        await gpaRecord.update({ 
          level_gpa: parseFloat(level_gpa.toFixed(2)),
          cumulative_gpa: parseFloat(cumulative_gpa.toFixed(2))
        }, { transaction: t });
      }

      return gpaRecord;
    });
  }

  // ---------------------------------------------------------
  // 4. REPORTING
  // ---------------------------------------------------------

  async getStudentTranscript(student_pk) {
    const results = await StudentResult.findAll({
      where: { student_pk },
      include: [
        { 
          model: ModuleOffering, 
          as: 'module_offering',
          attributes: ['offering_id'],
          include: [
            { model: Module, as: 'module' },
            { model: Batch, as: 'batch', include: [{ model: Level, as: 'level' }] }
          ] 
        }
      ],
      order: [['created_at', 'DESC']]
    });

    return results;
  }

  async getModuleGradeSheet(offering_id) {
    const offering = await ModuleOffering.findByPk(offering_id, {
      include: [
        { model: Module, as: 'module' },
        { model: Batch, as: 'batch', include: [{ model: Level, as: 'level' }] }
      ]
    });

    if (!offering) throw new Error('Offering not found');

    const students = await Student.findAll({
      attributes: ['student_pk', 'first_name', 'last_name', 'id_number'],
      include: [
        {
          model: StudentResult,
          as: 'results', 
          where: { offering_id },
          required: false 
        }
      ]
    });

    const assessments = await Assessment.findAll({
      where: { offering_id },
      order: [['created_at', 'ASC']]
    });

    return {
      offering,
      assessments,
      students
    };
  }
}

export default new GradingService();