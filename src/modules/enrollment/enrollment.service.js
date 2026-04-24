import { Op } from 'sequelize';
import sequelize from '../../config/database.js';
import { Enrollment, ModuleOffering } from './enrollment.model.js';
import { Student } from '../students/student.model.js';
import { Module, Batch, Level } from '../academics/academic.model.js';
import { Staff } from '../staff/staff.model.js';
import { User } from '../users/users.model.js';
import { StudentResult, Assessment, StudentAssessmentScore } from '../grading/grading.model.js';

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
        { 
          model: Student, 
          as: 'student',
          include: [
            { model: User, as: 'user' }
          ]
        },
        {
          model: ModuleOffering,
          as: 'offering',
          include: [
            { model: Module, as: 'module' },
            { model: Batch, as: 'batch' },
            { 
              model: Staff, 
              as: 'instructor',
              include: [
                { model: User, as: 'user' }
              ]
            },
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

  // NEW METHOD: Get enrolled students with their grades for a specific offering
  async getEnrolledStudentsWithGrades(offering_id) {
    // 1. Get all enrollments for this offering with student details
    const enrollments = await Enrollment.findAll({
      where: { 
        offering_id, 
        status: ['ENROLLED', 'COMPLETED'] // Include both active and completed
      },
      include: [
        { 
          model: Student, 
          as: 'student',
          include: [
            { 
              model: User, 
              as: 'user',
              attributes: ['user_id', 'first_name', 'last_name']
            }
          ],
          attributes: ['student_pk', 'student_id', 'batch_id']
        }
      ],
      order: [['created_at', 'ASC']]
    });

    if (!enrollments.length) {
      return {
        assessments: [],
        students: []
      };
    }

    // 2. Get all assessments for this offering
    const assessments = await Assessment.findAll({
      where: { offering_id },
      attributes: ['assessment_id', 'name', 'weight'],
      order: [['created_at', 'ASC']]
    });

    // 3. Get all scores for these students and assessments in one efficient query
    const studentPks = enrollments.map(e => e.student_pk);
    const assessmentIds = assessments.map(a => a.assessment_id);

    let scores = [];
    if (assessmentIds.length > 0) {
      scores = await StudentAssessmentScore.findAll({
        where: {
          student_pk: studentPks,
          assessment_id: assessmentIds
        },
        attributes: ['student_pk', 'assessment_id', 'score']
      });
    }

    // 4. Also get final results (total scores and letter grades) for each student
    const finalResults = await StudentResult.findAll({
      where: {
        student_pk: studentPks,
        offering_id
      },
      attributes: ['student_pk', 'total_score', 'letter_grade', 'grade_point', 'status']
    });

    // 5. Build the response with grades mapped to each student
    const students = enrollments.map(enrollment => {
      const student = enrollment.student;
      const user = student?.user;
      
      // Find final result for this student
      const finalResult = finalResults.find(r => r.student_pk === enrollment.student_pk);
      
      // Map assessment scores
      const grades = assessments.map(assessment => {
        const scoreRecord = scores.find(s => 
          s.student_pk === enrollment.student_pk && 
          s.assessment_id === assessment.assessment_id
        );
        
        return {
          assessment_id: assessment.assessment_id,
          name: assessment.name,
          weight: assessment.weight,
          score: scoreRecord ? parseFloat(scoreRecord.score) : null
        };
      });

      return {
        student_pk: enrollment.student_pk,
        student_id: student?.student_id || `STU-${enrollment.student_pk}`,
        full_name: user ? `${user.first_name} ${user.last_name}` : 'Unknown Student',
        enrollment_status: enrollment.status,
        final_result: finalResult ? {
          total_score: parseFloat(finalResult.total_score),
          letter_grade: finalResult.letter_grade,
          grade_point: parseFloat(finalResult.grade_point),
          status: finalResult.status
        } : null,
        grades
      };
    });

    return {
      offering_id,
      assessments: assessments.map(a => ({
        assessment_id: a.assessment_id,
        name: a.name,
        weight: parseFloat(a.weight)
      })),
      students,
      total_students: students.length
    };
  }

  // Optional: Get a single student's grades for a specific offering
  async getStudentGradesForOffering(student_pk, offering_id) {
    // Check if student is enrolled
    const enrollment = await Enrollment.findOne({
      where: { student_pk, offering_id, status: ['ENROLLED', 'COMPLETED'] },
      include: [
        { 
          model: Student, 
          as: 'student',
          include: [
            { model: User, as: 'user' }
          ]
        }
      ]
    });

    if (!enrollment) {
      throw new Error('Student is not enrolled in this offering');
    }

    // Get assessments
    const assessments = await Assessment.findAll({
      where: { offering_id },
      attributes: ['assessment_id', 'name', 'weight'],
      order: [['created_at', 'ASC']]
    });

    // Get scores
    let scores = [];
    if (assessments.length > 0) {
      scores = await StudentAssessmentScore.findAll({
        where: {
          student_pk,
          assessment_id: assessments.map(a => a.assessment_id)
        },
        attributes: ['assessment_id', 'score']
      });
    }

    // Get final result
    const finalResult = await StudentResult.findOne({
      where: { student_pk, offering_id },
      attributes: ['total_score', 'letter_grade', 'grade_point', 'status']
    });

    // Build response
    const grades = assessments.map(assessment => ({
      assessment_id: assessment.assessment_id,
      name: assessment.name,
      weight: parseFloat(assessment.weight),
      score: scores.find(s => s.assessment_id === assessment.assessment_id)?.score || null
    }));

    const user = enrollment.student?.user;
    
    return {
      student_pk,
      student_id: enrollment.student?.student_id,
      full_name: user ? `${user.first_name} ${user.last_name}` : 'Unknown Student',
      offering_id,
      grades,
      final_result: finalResult ? {
        total_score: parseFloat(finalResult.total_score),
        letter_grade: finalResult.letter_grade,
        grade_point: parseFloat(finalResult.grade_point),
        status: finalResult.status
      } : null
    };
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
          const offering = row.module_offering;
          const module = offering?.module;
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
      const batch = row.module_offering?.batch;
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