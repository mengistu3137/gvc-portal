import { Op } from 'sequelize';
import argon2 from 'argon2';
import sequelize from '../../config/database.js';
import { Staff, StaffIdSequence } from './staff.model.js';
import { User } from '../users/users.model.js';
import { UserAccount, Role } from '../auth/auth.model.js';
import { validateEthiopianPhone } from '../../utils/validation.js';

const toStaffDto = (staff) => {
  const row = staff.toJSON();
  const profile = row.user || {};
  const fullName = [profile.first_name, profile.middle_name, profile.last_name]
    .filter(Boolean)
    .join(' ');

  return {
    ...row,
    first_name: profile.first_name || null,
    middle_name: profile.middle_name || null,
    last_name: profile.last_name || null,
    full_name: fullName || null,
    gender: profile.gender || null,
    date_of_birth: profile.date_of_birth || null,
    phone: profile.phone || null,
    photo_url: profile.photo_url || null,
    account_email: profile.account?.email || null,
    account_status: profile.account?.status || null,
    account_id: profile.account?.account_id || null
  };
};

class StaffService {
  async createStaff(data) {
    if (!data.first_name || !data.last_name) {
      throw new Error('First name and last name are required.');
    }

    if (data.phone && !validateEthiopianPhone(data.phone)) {
      throw new Error('Invalid phone number. Must follow the +251 format with 9 digits.');
    }

    if (data.account?.email) {
      const existingAccount = await UserAccount.findOne({ where: { email: data.account.email } });
      if (existingAccount) throw new Error('System account email is already taken.');
    }

    const t = await sequelize.transaction();
    try {
      const currentYear = new Date().getFullYear();
      const shortYear = String(currentYear).slice(-2);

      const [sequence] = await StaffIdSequence.findOrCreate({
        where: { category: 'STF', reg_year: currentYear },
        defaults: { last_seq: 0 },
        transaction: t,
        lock: t.LOCK.UPDATE
      });

      const nextSeq = sequence.last_seq + 1;
      await sequence.update({ last_seq: nextSeq }, { transaction: t });
      const generatedStaffCode = `GVC-STF-${String(nextSeq).padStart(3, '0')}/${shortYear}`;

      const profile = await User.create({
        first_name: data.first_name,
        middle_name: data.middle_name || null,
        last_name: data.last_name,
        gender: data.gender || null,
        date_of_birth: data.date_of_birth || null,
        phone: data.phone || null,
        photo_url: data.photo_url || null
      }, { transaction: t });

      const createdStaff = await Staff.create({
        user_id: profile.user_id,
        staff_code: generatedStaffCode,
        staff_type: data.staff_type || null,
        occupation_id: data.occupation_id || null,
        hire_date: data.hire_date || null,
        qualification: data.qualification || null,
        specializations: data.specializations || null,
        employment_status: data.employment_status || 'ACTIVE'
      }, { transaction: t });

      if (data.account?.email && data.account?.password) {
        const password_hash = await argon2.hash(data.account.password, { type: argon2.argon2id });
        const account = await UserAccount.create({
          user_id: profile.user_id,
          email: data.account.email,
          password_hash,
          hash_algorithm: 'ARGON2ID',
          status: data.account.status || 'ACTIVE',
          must_change_password: data.account.must_change_password || false
        }, { transaction: t });

        if (Array.isArray(data.account.role_codes) && data.account.role_codes.length > 0) {
          const roles = await Role.findAll({ where: { role_code: data.account.role_codes }, transaction: t });
          await account.setRoles(roles, { transaction: t });
        }
      }

      await t.commit();
      return this.getStaffById(createdStaff.staff_id);
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  async getAllStaff(query) {
    const {
      page = 1,
      limit = 10,
      search = '',
      staff_type,
      employment_status,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = query;

    const safeSortBy = ['created_at', 'staff_id', 'staff_code', 'staff_type', 'employment_status'].includes(sortBy)
      ? sortBy
      : 'created_at';
    const safeSortOrder = String(sortOrder).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const whereClause = {
      [Op.and]: [
        search
          ? {
              [Op.or]: [
                { staff_code: { [Op.like]: `%${search}%` } },
                { '$user.first_name$': { [Op.like]: `%${search}%` } },
                { '$user.last_name$': { [Op.like]: `%${search}%` } },
                { '$user.phone$': { [Op.like]: `%${search}%` } },
                { '$user.account.email$': { [Op.like]: `%${search}%` } }
              ]
            }
          : {},
        staff_type ? { staff_type } : {},
        employment_status ? { employment_status } : {}
      ]
    };

    const result = await Staff.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          required: false,
          include: [{ model: UserAccount, as: 'account', attributes: ['account_id', 'email', 'status', 'must_change_password', 'last_login_at'] }]
        }
      ],
      order: [[safeSortBy, safeSortOrder]],
      limit: parseInt(limit, 10),
      offset: (parseInt(page, 10) - 1) * parseInt(limit, 10),
      distinct: true
    });

    return { count: result.count, rows: result.rows.map(toStaffDto) };
  }

  async getStaffById(id) {
    const staff = await Staff.findByPk(id, {
      include: [{ model: User, as: 'user', include: [{ model: UserAccount, as: 'account', attributes: ['account_id', 'email', 'status', 'must_change_password', 'last_login_at'] }] }]
    });

    if (!staff) throw new Error('Staff not found');
    return toStaffDto(staff);
  }

  async updateStaff(id, data) {
    if (data.phone && !validateEthiopianPhone(data.phone)) {
      throw new Error('Invalid Ethiopian phone number.');
    }

    const t = await sequelize.transaction();
    try {
      const staff = await Staff.findByPk(id, { transaction: t });
      if (!staff) throw new Error('Staff not found');

      const profileUpdates = {};
      ['first_name', 'middle_name', 'last_name', 'gender', 'date_of_birth', 'phone', 'photo_url']
        .forEach((field) => {
          if (Object.prototype.hasOwnProperty.call(data, field)) {
            profileUpdates[field] = data[field];
          }
        });

      const staffUpdates = { ...data };
      Object.keys(profileUpdates).forEach((k) => delete staffUpdates[k]);
      delete staffUpdates.account;
      delete staffUpdates.staff_code;
      delete staffUpdates.create_account;

      if (Object.keys(staffUpdates).length > 0) {
        await staff.update(staffUpdates, { transaction: t });
      }

      if (Object.keys(profileUpdates).length > 0) {
        const profile = await User.findByPk(staff.user_id, { transaction: t });
        if (!profile) throw new Error('User identity not found for staff');
        await profile.update(profileUpdates, { transaction: t });
      }

      if (data.create_account && data.account?.email && data.account?.password) {
        const existingAccount = await UserAccount.findOne({ where: { user_id: staff.user_id }, transaction: t });
        if (!existingAccount) {
          const password_hash = await argon2.hash(data.account.password, { type: argon2.argon2id });
          const account = await UserAccount.create({
            user_id: staff.user_id,
            email: data.account.email,
            password_hash,
            hash_algorithm: 'ARGON2ID',
            status: data.account.status || 'ACTIVE'
          }, { transaction: t });

          if (Array.isArray(data.account.role_codes) && data.account.role_codes.length > 0) {
            const roles = await Role.findAll({ where: { role_code: data.account.role_codes }, transaction: t });
            await account.setRoles(roles, { transaction: t });
          }
        }
      }

      await t.commit();
      return this.getStaffById(id);
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  async deleteStaff(id) {
    const staff = await Staff.findByPk(id);
    if (!staff) throw new Error('Staff not found');
    return staff.destroy();
  }
}

export { toStaffDto };
export default new StaffService();
