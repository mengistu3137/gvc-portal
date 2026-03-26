import sequelize from '../../config/database.js';
import {
  Assessment,
  GradeScale,
  GradeSubmission,
  StudentAssessmentScore,
  StudentResult,
  SubmissionItem
} from './grading.model.js';
import { ModuleOffering } from '../enrollment/enrollment.model.js';
import { Module } from '../academics/academic.model.js';

class GradingService {
  formatSubmissionForView(row) {
    if (!row) return null;
    const json = typeof row.toJSON === 'function' ? row.toJSON() : row;
    return {
      submission_id: json.submission_id,
      offering_id: json.offering_id,
      instructor_id: json.instructor_id,
      status: json.status,
      created_at: json.created_at,
      updated_at: json.updated_at,
      note: json.note,
      workflow_history: json.workflow_history || [],
    };
  }

  async upsertStudentGrade(payload, user) {
    const { student_pk, offering_id, assessment_scores = [], attempt_no = 1 } = payload;

    return sequelize.transaction(async (transaction) => {
      const offering = await ModuleOffering.findByPk(offering_id, {
        include: [{ model: Module, as: 'module' }],
        transaction,
      });
      if (!offering) throw new Error('Module offering not found');

      const assessments = [];
      for (const row of assessment_scores) {
        const [assessment] = await Assessment.findOrCreate({
          where: { offering_id, name: row.name },
          defaults: { weight: Number(row.weight || 0) },
          transaction,
        });

        if (row.weight && Number(row.weight) !== Number(assessment.weight)) {
          await assessment.update({ weight: Number(row.weight) }, { transaction });
        }
        assessments.push({ assessment, score: Number(row.score || 0) });
      }

      for (const item of assessments) {
        await StudentAssessmentScore.upsert(
          {
            student_pk,
            assessment_id: item.assessment.assessment_id,
            score: item.score,
          },
          { transaction }
        );
      }

      const totalWeighted = assessments.reduce((sum, item) => {
        const weight = Number(item.assessment.weight || 0);
        return sum + (item.score * weight) / 100;
      }, 0);

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

      const letter_grade = matchedScale?.letter || matchedScale?.letter_grade || 'F';
      const grade_point = Number(matchedScale?.grade_point || matchedScale?.grade_points || 0);
      const is_pass = typeof matchedScale?.is_pass === 'boolean' ? matchedScale.is_pass : grade_point > 0;

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
    const safeRows = Array.isArray(rows) ? rows : [];
    const results = [];
    for (const row of safeRows) {
      const record = await this.upsertStudentGrade(row, user);
      results.push(record);
    }
    return results;
  }

  async upsertStudentGradesBulkFromSpreadsheet(file, mapping, user) {
    // Placeholder: spreadsheet import is not implemented in this refactor.
    return [];
  }

  async changeSubmissionStatus(id, next_status, user, note) {
    const submission = await GradeSubmission.findByPk(id);
    if (!submission) throw new Error('Submission not found');
    return submission.update({ status: next_status, note });
  }

  async calculateStudentFinalGrade(student_pk, offering_id) {
    const results = await StudentResult.findAll({
      where: { student_pk, offering_id },
      order: [['attempt_no', 'DESC']],
      limit: 1,
    });

    return results[0] || null;
  }
}

export default new GradingService();
