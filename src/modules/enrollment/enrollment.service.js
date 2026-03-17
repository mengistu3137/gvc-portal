import sequelize from '../../config/database.js';
import { Module, Batch } from '../academics/academic.model.js';
import { ModuleEnrollment } from '../grading/grading.model.js';
import { Student } from '../students/student.model.js';
import { Enrollment, ModulePrerequisite, StudentGpaRecord } from './enrollment.model.js';

const has = (actor, permission) => (actor?.permissions || []).includes(permission);

class EnrollmentService {
  async checkPrerequisites(studentId, moduleId) {
    const prerequisites = await ModulePrerequisite.findAll({
      where: { module_id: moduleId },
      include: [{
        model: Module,
        as: 'required_module',
        attributes: ['module_id', 'm_code', 'unit_competency']
      }]
    });
    if (prerequisites.length === 0) {
      return { eligible: true, missing: [], missing_module_ids: [], missing_modules: [] };
    }

    const missing = [];

    for (const prerequisite of prerequisites) {
      const passed = await ModuleEnrollment.findOne({
        where: {
          student_pk: studentId,
          module_id: prerequisite.required_module_id,
          status: 'PASSED'
        }
      });

      if (!passed) {
        missing.push({
          module_id: prerequisite.required_module_id,
          module_name:
            prerequisite.required_module?.unit_competency ||
            prerequisite.required_module?.m_code ||
            `Module ${prerequisite.required_module_id}`
        });
      }
    }

    return {
      eligible: missing.length === 0,
      missing: missing.map((item) => item.module_name),
      missing_module_ids: missing.map((item) => item.module_id),
      missing_modules: missing
    };
  }

  async createEnrollment(data, actor) {
    if (!has(actor, 'manage_enrollment')) {
      throw new Error('Forbidden: missing manage_enrollment permission.');
    }

    const eligibility = await this.checkPrerequisites(data.student_pk, data.module_id);
    if (!eligibility.eligible) {
      throw new Error(`Enrollment blocked. Missing passed prerequisite modules: ${eligibility.missing.join(', ')}`);
    }

    const [enrollment] = await Enrollment.findOrCreate({
      where: {
        student_pk: data.student_pk,
        module_id: data.module_id,
        batch_id: data.batch_id
      },
      defaults: {
        status: data.status || 'ENROLLED'
      }
    });

    return enrollment;
  }

  async updateEnrollment(id, data, actor) {
    if (!has(actor, 'manage_enrollment')) {
      throw new Error('Forbidden: missing manage_enrollment permission.');
    }

    const t = await sequelize.transaction();
    try {
      const enrollment = await Enrollment.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
      if (!enrollment) throw new Error('Enrollment not found');

      const targetStudent = data.student_pk || enrollment.student_pk;
      const targetModule = data.module_id || enrollment.module_id;

      if (data.module_id || data.student_pk) {
        const eligibility = await this.checkPrerequisites(targetStudent, targetModule);
        if (!eligibility.eligible) {
          throw new Error(`Enrollment update blocked. Missing passed prerequisite modules: ${eligibility.missing.join(', ')}`);
        }
      }

      await enrollment.update(data, { transaction: t });
      await t.commit();
      return enrollment;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  async getEnrollments(query, actor) {
    if (!has(actor, 'manage_enrollment')) {
      throw new Error('Forbidden: missing manage_enrollment permission.');
    }

    const where = {};
    if (query.status) {
      where.status = query.status;
    }

    return Enrollment.findAll({
      where,
      include: [
        { model: Student, as: 'student', attributes: ['student_pk', 'student_id'] },
        { model: Module, as: 'module', attributes: ['module_id', 'm_code', 'unit_competency'] },
        { model: Batch, as: 'batch', attributes: ['batch_id', 'batch_code'] }
      ],
      order: [['created_at', 'DESC']]
    });
  }

  async deleteEnrollment(id, actor) {
    if (!has(actor, 'manage_enrollment')) {
      throw new Error('Forbidden: missing manage_enrollment permission.');
    }

    const enrollment = await Enrollment.findByPk(id);
    if (!enrollment) {
      throw new Error('Enrollment not found');
    }

    await enrollment.destroy({ force: true });
    return { enrollment_id: Number(id) };
  }

  async calculateStudentGpa(studentId, batchId, actor) {
    if (!(has(actor, 'view_academic_progress') || has(actor, 'manage_enrollment'))) {
      throw new Error('Forbidden: missing view_academic_progress permission.');
    }

    const semesterOutcomes = await ModuleEnrollment.findAll({
      where: {
        student_pk: studentId,
        batch_id: batchId
      },
      include: [{ model: Module, as: 'module', attributes: ['credit_units'] }]
    });

    const semesterTotals = semesterOutcomes.reduce((acc, row) => {
      const credit = Number(row.module?.credit_units || 0);
      const gp = Number(row.grade_points || 0);
      acc.credits += credit;
      acc.points += gp * credit;
      return acc;
    }, { credits: 0, points: 0 });

    const semesterGpa = semesterTotals.credits > 0
      ? Number((semesterTotals.points / semesterTotals.credits).toFixed(2))
      : 0;

    const cumulativeOutcomes = await ModuleEnrollment.findAll({
      where: { student_pk: studentId },
      include: [{ model: Module, as: 'module', attributes: ['credit_units'] }]
    });

    const cumulativeTotals = cumulativeOutcomes.reduce((acc, row) => {
      const credit = Number(row.module?.credit_units || 0);
      const gp = Number(row.grade_points || 0);
      acc.credits += credit;
      acc.points += gp * credit;
      return acc;
    }, { credits: 0, points: 0 });

    const cumulativeGpa = cumulativeTotals.credits > 0
      ? Number((cumulativeTotals.points / cumulativeTotals.credits).toFixed(2))
      : 0;

    const [record] = await StudentGpaRecord.findOrCreate({
      where: { student_pk: studentId, batch_id: batchId },
      defaults: {
        semester_gpa: semesterGpa,
        cumulative_gpa: cumulativeGpa,
        total_credits: Number(semesterTotals.credits.toFixed(2)),
        total_grade_points: Number(semesterTotals.points.toFixed(2))
      }
    });

    if (!record.isNewRecord) {
      await record.update({
        semester_gpa: semesterGpa,
        cumulative_gpa: cumulativeGpa,
        total_credits: Number(semesterTotals.credits.toFixed(2)),
        total_grade_points: Number(semesterTotals.points.toFixed(2))
      });
    }

    return {
      student_pk: Number(studentId),
      batch_id: Number(batchId),
      semester_gpa: semesterGpa,
      cumulative_gpa: cumulativeGpa,
      total_credits: Number(semesterTotals.credits.toFixed(2)),
      total_grade_points: Number(semesterTotals.points.toFixed(2))
    };
  }
}

export default new EnrollmentService();
