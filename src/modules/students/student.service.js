import { Student, StudentSequence } from './student.model';
import  sequelize from '../../config/database';

class StudentService {
  /**
   * Registers a new student with atomic ID generation
   */
  async createStudent(studentData) {
    const t = await sequelize.transaction();

    try {
      const currentYear = new Date().getFullYear();
      const yearSuffix = currentYear.toString().slice(-2);

      // 1. Lock the sequence row for this year exclusively (SELECT ... FOR UPDATE)
      const [sequence] = await StudentSequence.findOrCreate({
        where: { year_id: currentYear },
        defaults: { current_val: 0 },
        transaction: t,
        lock: t.LOCK.UPDATE 
      });

      // 2. Increment value
      const nextVal = sequence.current_val + 1;
      await sequence.update({ current_val: nextVal }, { transaction: t });

      // 3. Format ID: GVCHNSR0001/24
      const formattedId = `GVCHNSR${nextVal.toString().padStart(4, '0')}/${yearSuffix}`;
      
      // 4. Create Student
      const newStudent = await Student.create({
        ...studentData,
        student_id: formattedId
      }, { transaction: t });

      // 5. Commit everything
      await t.commit();
      return newStudent;

    } catch (error) {
      // If anything fails, the ID sequence is NOT incremented
      await t.rollback();
      throw error;
    }
  }

  async getAllActiveStudents() {
    return await Student.findAll(); // Automatically filters out deleted_at IS NOT NULL
  }
}

module.exports = new StudentService();