import { Op } from 'sequelize';
import sequelize from '../../config/database.js';
import { StaffIdSequence } from '../staff/staff.model.js';
import { Staff } from '../staff/staff.model.js';
import { User } from '../users/users.model.js';
import { Occupation } from '../academics/academic.model.js';
import { UserAccount, Role } from '../auth/auth.model.js';
import argon2 from 'argon2';

const toLegacyInstructorDto = (instructor) => {
  const row = instructor.toJSON();
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
  };
};

class InstructorService {
  async createInstructor(data) {
    const t = await sequelize.transaction();
    try {
      const currentYear = new Date().getFullYear();
      const shortYear = String(currentYear).slice(-2);

      const [sequence] = await StaffIdSequence.findOrCreate({
        where: {
          category: 'INST',
          reg_year: currentYear
        },
        defaults: { last_seq: 0 },
        transaction: t,
        lock: t.LOCK.UPDATE
      });

      const nextSeq = sequence.last_seq + 1;
      await sequence.update({ last_seq: nextSeq }, { transaction: t });

      const generatedStaffCode = `GVC-INST-${String(nextSeq).padStart(3, '0')}/${shortYear}`;

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
        throw new Error('first_name and last_name are required to create instructor identity.');
      }

      const profile = await User.create(userPayload, { transaction: t });

      const instructor = await Staff.create({
        user_id: profile.user_id,
        staff_code: generatedStaffCode,
        staff_type: data.staff_type || 'INSTRUCTOR',
        occupation_id: data.occupation_id || null,
        hire_date: data.hire_date || null,
        qualification: data.qualification || null,
        employment_status: data.employment_status || 'ACTIVE'
      }, { transaction: t });

      if (data.account && data.account.email && data.account.password) {
        const password_hash = await argon2.hash(data.account.password, { type: argon2.argon2id });
        const user = await UserAccount.create({
          user_id: profile.user_id,
          email: data.account.email,
          password_hash,
          status: data.account.status || 'ACTIVE'
        }, { transaction: t });

        if (data.account.role_codes && data.account.role_codes.length > 0) {
          const roles = await Role.findAll({
            where: { role_code: data.account.role_codes },
            transaction: t
          });
          await user.setRoles(roles, { transaction: t });
        }
      }

      await t.commit();

      const created = await Staff.findByPk(instructor.staff_id, {
        include: [
          { model: User, as: 'user', include: [{ model: UserAccount, as: 'account', attributes: ['account_id', 'email', 'status'] }] },
          { model: Occupation, as: 'occupation', attributes: ['occupation_name', 'occupation_code'] }
        ]
      });

      return toLegacyInstructorDto(created);
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  async getInstructors(query) {
    const { 
      page = 1, limit = 10, search = '', 
      status, occupation_id, sortBy = 'created_at', sortOrder = 'DESC'
    } = query;

    const whereClause = {
      [Op.and]: [
        search ? {
          [Op.or]: [
            { staff_code: { [Op.like]: `%${search}%` } },
            { '$user.first_name$': { [Op.like]: `%${search}%` } },
            { '$user.last_name$': { [Op.like]: `%${search}%` } }
          ]
        } : {},
        { staff_type: 'INSTRUCTOR' },
        status ? { employment_status: status } : {},
        occupation_id ? { occupation_id } : {}
      ]
    };

    const result = await Staff.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          required: false,
          include: [{ model: UserAccount, as: 'account', attributes: ['account_id', 'email', 'status'] }]
        },
        { model: Occupation, as: 'occupation', attributes: ['occupation_name', 'occupation_code'] }
      ],
      order: [[sortBy, sortOrder]],
      limit: parseInt(limit, 10),
      offset: (parseInt(page, 10) - 1) * parseInt(limit, 10),
      distinct: true
    });

    return {
      count: result.count,
      rows: result.rows.map(toLegacyInstructorDto)
    };
  }

  async getInstructorById(id) {
    const instructor = await Staff.findOne({
      where: { staff_id: id, staff_type: 'INSTRUCTOR' },
      include: [
        { model: User, as: 'user', include: [{ model: UserAccount, as: 'account', attributes: ['account_id', 'email', 'status'] }] },
        { model: Occupation, as: 'occupation', attributes: ['occupation_name', 'occupation_code'] }
      ]
    });

    if (!instructor) throw new Error('Instructor not found');
    return toLegacyInstructorDto(instructor);
  }

  async updateInstructor(id, data) {
    const t = await sequelize.transaction();
    try {
      const inst = await Staff.findOne({ where: { staff_id: id, staff_type: 'INSTRUCTOR' }, transaction: t });
      if (!inst) throw new Error('Instructor not found');

      const userUpdates = {};
      ['first_name', 'middle_name', 'last_name', 'gender', 'date_of_birth', 'phone', 'email', 'photo_url']
        .forEach((field) => {
          if (Object.prototype.hasOwnProperty.call(data, field)) {
            if (field !== 'email') userUpdates[field] = data[field];
          }
        });

      const instructorUpdates = { ...data };
      Object.keys(userUpdates).forEach((k) => delete instructorUpdates[k]);

      if (Object.keys(instructorUpdates).length > 0) {
        await inst.update(instructorUpdates, { transaction: t });
      }

      if (Object.keys(userUpdates).length > 0) {
        const profile = await User.findByPk(inst.user_id, { transaction: t });
        if (!profile) throw new Error('User identity not found for instructor');
        await profile.update(userUpdates, { transaction: t });
      }

      await t.commit();
      const updated = await Staff.findByPk(id, {
        include: [
          { model: User, as: 'user', include: [{ model: UserAccount, as: 'account', attributes: ['account_id', 'email', 'status'] }] },
          { model: Occupation, as: 'occupation', attributes: ['occupation_name', 'occupation_code'] }
        ]
      });
      return toLegacyInstructorDto(updated);
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  async deleteInstructor(id) {
    const inst = await Staff.findOne({ where: { staff_id: id, staff_type: 'INSTRUCTOR' } });
    if (!inst) throw new Error('Instructor not found');
    return await inst.destroy();
  }

  async updateInstructorPhoto(id, photoUrl) {
    const inst = await Staff.findOne({ where: { staff_id: id, staff_type: 'INSTRUCTOR' } });
    if (!inst) throw new Error('Instructor not found');

    const profile = await User.findByPk(inst.user_id);
    if (!profile) throw new Error('User identity not found for instructor');

    await profile.update({ photo_url: photoUrl });
    return this.getInstructorById(id);
  }
}

export default new InstructorService();