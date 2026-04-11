import { Op } from 'sequelize';
import sequelize from '../../config/database.js';
import { Student, StudentIdSequence } from './student.model.js';
import { Occupation, Batch, Level, AcademicYear, Sector } from '../academics/academic.model.js';
import { User } from '../users/users.model.js';
import { UserAccount } from '../auth/auth.model.js';
import { mapRowsByFieldMapping, parseSpreadsheetRowsFromFile } from '../../utils/spreadsheetImport.js';

const toLegacyStudentDto = (student) => {
  const row = student.toJSON();
  const profile = row.user || {};
  const full_name = [profile.first_name, profile.middle_name, profile.last_name]
    .filter(Boolean)
    .join(' ');

  return {
    ...row,
    first_name: profile.first_name || null,
    middle_name: profile.middle_name || null,
    last_name: profile.last_name || null,
    full_name: full_name || null,
    gender: profile.gender || null,
    date_of_birth: profile.date_of_birth || null,
    phone: profile.phone || null,
    photo_url: profile.photo_url || null,
    account_email: profile.account?.email || null
    ,
    sector_code: row.occupation?.sector?.sector_code || null,
    sector_name: row.occupation?.sector?.sector_name || null
  };
};

class StudentService {
  async createStudentInTransaction(data, t) {
    const userPayload = {
      first_name: data.first_name,
      middle_name: data.middle_name || null,
      last_name: data.last_name,
      gender: data.gender || null,
      date_of_birth: data.date_of_birth || null,
      phone: data.phone || null,
      photo_url: data.photo_url || null
    };

    if (!userPayload.first_name || !userPayload.last_name) {
      throw new Error('first_name and last_name are required to create student identity.');
    }

    const batch = await Batch.findByPk(data.batch_id, {
      include: [
        { model: Occupation, as: 'occupation' },
        { model: AcademicYear, as: 'academic_year' }
      ],
      transaction: t,
      lock: t.LOCK.UPDATE
    });

    if (!batch) throw new Error('Selected Batch does not exist.');
    if (!batch.occupation) throw new Error('Batch metadata error: Occupation not linked.');

    const trackChar = batch.division === 'REGULAR' ? 'R' : 'X';
    const occCode = batch.occupation.occupation_code;
    const admissionYearRaw = data.reg_year || batch.academic_year?.academic_year_label || new Date().getFullYear();
    const inferredYear = String(admissionYearRaw).match(/(19|20)\d{2}/)?.[0];
    const admissionYear = Number(inferredYear || admissionYearRaw);

    if (!Number.isFinite(admissionYear)) {
      throw new Error('Unable to infer a valid registration year for student ID generation.');
    }
    const shortYear = admissionYear.toString().slice(-2);

    const [sequence] = await StudentIdSequence.findOrCreate({
      where: { reg_year: admissionYear },
      defaults: { last_seq: 0 },
      transaction: t,
      lock: t.LOCK.UPDATE
    });

    const nextSeq = sequence.last_seq + 1;
    await sequence.update({ last_seq: nextSeq }, { transaction: t });

    const formattedId = `GVC${occCode}${trackChar}${nextSeq.toString().padStart(3, '0')}/${shortYear}`;

    const profile = await User.create(userPayload, { transaction: t });

    const newStudent = await Student.create({
      user_id: profile.user_id,
      student_id: formattedId,
      occupation_id: batch.occupation_id,
      level_id: batch.level_id,
      batch_id: data.batch_id,
      admission_date: data.admission_date,
      status: data.status,
      reg_sequence: nextSeq,
      reg_year: admissionYear
    }, { transaction: t });

    return newStudent.student_pk;
  }

  /**
   * Logic: GVC + [OccCode] + [Track] + [Seq] + / + [Year]
   * Track: REGULAR -> 'R', EXTENSION -> 'X'
   */
  async createStudent(data) {
    const t = await sequelize.transaction();
    try {
      const studentPk = await this.createStudentInTransaction(data, t);

      await t.commit();
      const created = await Student.findByPk(studentPk, {
        include: [
          { model: User, as: 'user', include: [{ model: UserAccount, as: 'account', attributes: ['account_id', 'email', 'status'] }] },
          {
            model: Occupation,
            as: 'occupation',
            attributes: ['occupation_name', 'occupation_code'],
            include: [{ model: Sector, as: 'sector', attributes: ['sector_code', 'sector_name'] }]
          },
          { model: Level, as: 'level', attributes: ['level_name'] },
          { model: Batch, as: 'batch', attributes: ['batch_code', 'division'] }
        ]
      });

      return toLegacyStudentDto(created);
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  async createStudentsBulk(rows) {
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new Error('rows array is required for bulk student import.');
    }

    const t = await sequelize.transaction();
    try {
      const createdIds = [];
      for (const row of rows) {
        const studentPk = await this.createStudentInTransaction(row, t);
        createdIds.push(studentPk);
      }

      await t.commit();

      const created = await Student.findAll({
        where: { student_pk: { [Op.in]: createdIds } },
        include: [
          { model: User, as: 'user', include: [{ model: UserAccount, as: 'account', attributes: ['account_id', 'email', 'status'] }] },
          {
            model: Occupation,
            as: 'occupation',
            attributes: ['occupation_name', 'occupation_code'],
            include: [{ model: Sector, as: 'sector', attributes: ['sector_code', 'sector_name'] }]
          },
          { model: Level, as: 'level', attributes: ['level_name'] },
          { model: Batch, as: 'batch', attributes: ['batch_code', 'division'] }
        ]
      });

      return created.map(toLegacyStudentDto);
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  async createStudentsBulkFromSpreadsheet(file, mapping = {}) {
    const parsedRows = parseSpreadsheetRowsFromFile(file);
    const rows = mapRowsByFieldMapping(parsedRows, mapping);

    if (!Array.isArray(rows) || rows.length === 0) {
      throw new Error('No import rows were found in the uploaded spreadsheet.');
    }

    return this.createStudentsBulk(rows);
  }

  async getStudents(query) {
    const { page = 1, limit = 10, search = '', status, occupation_id, level_id } = query;
    const offset = (page - 1) * limit;

    const whereClause = {
      [Op.and]: [
        search ? {
          [Op.or]: [
            { '$user.first_name$': { [Op.like]: `%${search}%` } },
            { '$user.last_name$': { [Op.like]: `%${search}%` } },
            { student_id: { [Op.like]: `%${search}%` } }
          ]
        } : {},
        status ? { status } : {},
        occupation_id ? { occupation_id } : {},
        level_id ? { level_id } : {}
      ]
    };

    const result = await Student.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          required: false,
          include: [{ model: UserAccount, as: 'account', attributes: ['account_id', 'email', 'status'] }]
        },
        {
          model: Occupation,
          as: 'occupation',
          attributes: ['occupation_name', 'occupation_code'],
          include: [{ model: Sector, as: 'sector', attributes: ['sector_code', 'sector_name'] }]
        },
        { model: Level, as: 'level', attributes: ['level_name'] },
        { model: Batch, as: 'batch', attributes: ['batch_code', 'division'] }
      ],
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
      order: [['created_at', 'DESC']],
      distinct: true
    });

    return {
      count: result.count,
      rows: result.rows.map(toLegacyStudentDto)
    };
  }

  async getStudentById(id) {
    const student = await Student.findByPk(id, {
      include: [
        { model: User, as: 'user', include: [{ model: UserAccount, as: 'account', attributes: ['account_id', 'email', 'status'] }] },
        {
          model: Occupation,
          as: 'occupation',
          attributes: ['occupation_name', 'occupation_code'],
          include: [{ model: Sector, as: 'sector', attributes: ['sector_code', 'sector_name'] }]
        },
        { model: Level, as: 'level', attributes: ['level_name'] },
        { model: Batch, as: 'batch', attributes: ['batch_code', 'division'] }
      ]
    });
    if (!student) throw new Error('Student not found');
    return toLegacyStudentDto(student);
  }

  async updateStudent(id, data) {
    const t = await sequelize.transaction();
    try {
      const student = await Student.findByPk(id, { transaction: t });
      if (!student) throw new Error('Student not found');

      const userUpdates = {};
      ['first_name', 'middle_name', 'last_name', 'gender', 'date_of_birth', 'phone', 'photo_url']
        .forEach((field) => {
          if (Object.prototype.hasOwnProperty.call(data, field)) {
            userUpdates[field] = data[field];
          }
        });

      const studentUpdates = { ...data };
      Object.keys(userUpdates).forEach((k) => delete studentUpdates[k]);

      if (Object.keys(studentUpdates).length > 0) {
        await student.update(studentUpdates, { transaction: t });
      }

      if (Object.keys(userUpdates).length > 0) {
        const profile = await User.findByPk(student.user_id, { transaction: t });
        if (!profile) throw new Error('User identity not found for student');
        await profile.update(userUpdates, { transaction: t });
      }

      await t.commit();
      return this.getStudentById(id);
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  async deleteStudent(id) {
    const student = await Student.findByPk(id);
    if (!student) throw new Error('Student not found');
    return await student.destroy({ force: true });
  }

  async updateStudentPhoto(id, photoUrl) {
    const student = await Student.findByPk(id);
    if (!student) throw new Error('Student not found');

    const profile = await User.findByPk(student.user_id);
    if (!profile) throw new Error('User identity not found for student');

    await profile.update({ photo_url: photoUrl });
    return this.getStudentById(id);
  }
}

export default new StudentService();