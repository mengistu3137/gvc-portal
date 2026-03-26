import { Op } from 'sequelize';
import sequelize from '../../config/database.js';
import { Enrollment, ModuleOffering } from './enrollment.model.js';
import { Student } from '../students/student.model.js';
import { Module, Batch, Level } from '../academics/academic.model.js';
import { Instructor } from '../instructors/instructor.model.js';
import { StudentResult } from '../grading/grading.model.js';

class EnrollmentService {
  async createEnrollment(payload, user) {
    const { student_pk, offering_id, status = 'ENROLLED' } = payload;

    return sequelize.transaction(async (transaction) => {
      const student = await Student.findByPk(student_pk, { transaction });
      if (!student) throw new Error('Student not found');

      const offering = await ModuleOffering.findByPk(offering_id, {
        include: [{ model: Batch, as: 'batch' }],
        transaction,
      });
      if (!offering) throw new Error('Module offering not found');

      if (student.batch_id && offering.batch_id && String(student.batch_id) !== String(offering.batch_id)) {
        throw new Error('Student is not part of this offering batch');
      }

      const [enrollment, created] = await Enrollment.findOrCreate({
        where: { student_pk, offering_id },
        defaults: { status },
        transaction,
      });

      if (!created && status && enrollment.status !== status) {
        await enrollment.update({ status }, { transaction });
      }

      return enrollment;
    });
  }

  async getEnrollments(query, user) {
    const { student_pk, offering_id, instructor_id } = query;

    return Enrollment.findAll({
      where: {
        ...(student_pk ? { student_pk } : {}),
        ...(offering_id ? { offering_id } : {}),
      },
      include: [
        { model: Student, as: 'student' },
        {
          model: ModuleOffering,
          as: 'offering',
          include: [
            { model: Module, as: 'module' },
            { model: Batch, as: 'batch' },
            { model: Instructor, as: 'instructor' },
          ],
          ...(instructor_id ? { where: { instructor_id } } : {}),
        },
      ],
      order: [['created_at', 'DESC']],
    });
  }

  async updateEnrollment(id, payload) {
    const enrollment = await Enrollment.findByPk(id);
    if (!enrollment) throw new Error('Enrollment not found');

    const updatable = {};
    if (payload.status) updatable.status = payload.status;
    if (payload.offering_id) updatable.offering_id = payload.offering_id;

    return enrollment.update(updatable);
  }

  async deleteEnrollment(id) {
    const enrollment = await Enrollment.findByPk(id);
    if (!enrollment) throw new Error('Enrollment not found');
    await enrollment.destroy();
    return enrollment;
  }

  async listOfferings(filters = {}) {
    const { level_id, occupation_id, instructor_id, batch_id, module_id } = filters;

    return ModuleOffering.findAll({
      where: {
        ...(batch_id ? { batch_id } : {}),
        ...(module_id ? { module_id } : {}),
        ...(instructor_id ? { instructor_id } : {}),
      },
      include: [
        { model: Module, as: 'module', where: occupation_id ? { occupation_id } : undefined },
        {
          model: Batch,
          as: 'batch',
          where: level_id ? { level_id } : undefined,
          include: level_id ? [{ model: Level, as: 'level' }] : [],
        },
        { model: Instructor, as: 'instructor' },
      ],
      order: [['batch_id', 'DESC'], ['module_id', 'ASC']],
    });
  }

  async calculateStudentGpa(student_pk, level_id) {
    const student = await Student.findByPk(student_pk);
    if (!student) throw new Error('Student not found');

    const results = await StudentResult.findAll({
      where: { student_pk },
      include: [
        {
          model: ModuleOffering,
          as: 'module_offering',
          include: [
            { model: Module, as: 'module' },
            { model: Batch, as: 'batch' },
          ],
          required: true,
        },
      ],
    });

    const computeGpa = (rows) => {
      const totals = rows.reduce(
        (acc, row) => {
          const offering = row.module_offering || row.moduleOffering;
          const module = offering?.module || offering?.Module;
          const credits = Number(module?.credit_units || 0);
          const gp = Number(row.grade_point || 0);

          if (!credits) return acc;
          acc.gradePoints += gp * credits;
          acc.credits += credits;
          return acc;
        },
        { gradePoints: 0, credits: 0 }
      );

      if (!totals.credits) {
        return { gpa: 0, total_grade_points: 0, total_credits: 0 };
      }

      return {
        gpa: Number((totals.gradePoints / totals.credits).toFixed(2)),
        total_grade_points: Number(totals.gradePoints.toFixed(2)),
        total_credits: totals.credits,
      };
    };

    const levelResults = results.filter((row) => {
      const offering = row.module_offering || row.moduleOffering;
      const batch = offering?.batch || offering?.Batch;
      return batch && Number(batch.level_id) === Number(level_id);
    });

    const levelStats = computeGpa(levelResults);
    const cumulativeStats = computeGpa(results);

    return {
      student_pk,
      level_id: Number(level_id),
      level_gpa: levelStats.gpa,
      cumulative_gpa: cumulativeStats.gpa,
      total_grade_points: cumulativeStats.total_grade_points,
      total_credits: cumulativeStats.total_credits,
    };
  }
}

export default new EnrollmentService();
