import { Op } from 'sequelize';
import sequelize from '../../config/database.js';
import { Student, StudentIdSequence } from './student.model.js';
import { Occupation, Batch, Level, AcademicYear } from '../academics/academic.model.js';

class StudentService {
  /**
   * Logic: GVC + [OccCode] + [Track] + [Seq] + / + [Year]
   * Track: REGULAR -> 'R', EXTENSION -> 'X'
   */
  async createStudent(data) {
    const t = await sequelize.transaction();
    try {
      // 1. Fetch Batch metadata (links to your specific Batch table)
      const batch = await Batch.findByPk(data.batch_id, {
        include: [
          { model: Occupation, as: 'occupation' },
          { model: AcademicYear, as: 'academic_year' }

        ],
        transaction: t
      });
console.log("batch of the batch",JSON.stringify(batch,null,2))
      if (!batch) throw new Error('Selected Batch does not exist.');
      if (!batch.occupation) throw new Error('Batch metadata error: Occupation not linked.');
  

      // 2. Derive ID Components
      const trackChar = batch.track_type === 'REGULAR' ? 'R' : 'X';
      const occCode = batch.occupation.occupation_code;
     
      const admissionYear = data.reg_year || batch.academic_year.academic_year_label;
      const shortYear = admissionYear.toString().slice(-2);
      
      // 3. Atomic Sequence Row-level Lock
      
   
      const [sequence] = await StudentIdSequence.findOrCreate(
      
        {
        
        where: { reg_year: admissionYear },
        defaults: { last_seq: 0 },
        transaction: t,
        lock: t.LOCK.UPDATE
        }
        
      );
     

      
      
      const nextSeq = sequence.last_seq + 1;
      
      await sequence.update({ last_seq: nextSeq }, { transaction: t });

      // 4. Construct ID: e.g., GVCHNSR013/15
      const formattedId = `GVC${occCode}${trackChar}${nextSeq.toString().padStart(3, '0')}/${shortYear}`;

      // 5. Create Record (Inherit Level/Occ from Batch)
      const newStudent = await Student.create({
        ...data,
        student_id: formattedId,
        occupation_id: batch.occupation_id, 
        level_id: batch.level_id,           
        reg_sequence: nextSeq,
        reg_year: admissionYear
      }, { transaction: t });

      await t.commit();
      return newStudent;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  async getStudents(query) {
    const { page = 1, limit = 10, search = '', status, occupation_id, level_id } = query;
    const offset = (page - 1) * limit;

    const whereClause = {
      [Op.and]: [
        search ? {
          [Op.or]: [
            { first_name: { [Op.like]: `%${search}%` } },
            { last_name: { [Op.like]: `%${search}%` } },
            { student_id: { [Op.like]: `%${search}%` } }
          ]
        } : {},
        status ? { status } : {},
        occupation_id ? { occupation_id } : {},
        level_id ? { level_id } : {}
      ]
    };

    return await Student.findAndCountAll({
      where: whereClause,
      include: [
        { model: Occupation, as: 'occupation', attributes: ['occupation_name', 'occupation_code'] },
        { model: Level, as: 'level', attributes: ['level_name'] },
        { model: Batch, as: 'batch', attributes: ['batch_code', 'track_type'] }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']]
    });
  }

  async getStudentById(id) {
    const student = await Student.findByPk(id);
    if (!student) throw new Error('Student not found');
    return student;p
  }

  async updateStudent(id, data) {
    const student = await Student.findByPk(id);
    if (!student) throw new Error('Student not found');
    return await student.update(data);
  }

  async deleteStudent(id) {
    const student = await Student.findByPk(id);
    if (!student) throw new Error('Student not found');
    return await student.destroy();
  }
}

export default new StudentService();