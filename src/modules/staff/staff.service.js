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
  const account = profile.account || {};
  
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
    // Ensure these are pulled correctly from the included account
    account_email: account.email || null,
    account_status: account.status || null,
    account_id: account.account_id || null,
    // Include roles so the frontend can display assigned roles
    roles: account.roles || [] 
  };
};

class StaffService {
  async createStaff(data) {
    if (!data.first_name || !data.last_name) {
      throw new Error('First name and last name are required.');
    }

    // MANDATORY: Account must be provided
    if (!data.account || !data.account.email || !data.account.password) {
      throw new Error('Please provide email and password.');
    }

    if (data.phone && !validateEthiopianPhone(data.phone)) {
      throw new Error('Invalid phone number. Must follow the +251 format with 9 digits.');
    }

    // Check for existing email
    const existingAccount = await UserAccount.findOne({ where: { email: data.account.email } });
    if (existingAccount) throw new Error('System account email is already taken.');

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

      // 1. Create User Profile
      const profile = await User.create({
        first_name: data.first_name,
        middle_name: data.middle_name || null,
        last_name: data.last_name,
        gender: data.gender || null,
        date_of_birth: data.date_of_birth || null,
        phone: data.phone || null,
        photo_url: data.photo_url || null
      }, { transaction: t });

      // 2. Create Staff Record
      const createdStaff = await Staff.create({
        user_id: profile.user_id,
        staff_code: generatedStaffCode,
        occupation_id: data.occupation_id || null,
        hire_date: data.hire_date || null,
        qualification: data.qualification || null,
        specializations: data.specializations || null,
        employment_status: data.employment_status || 'ACTIVE'
      }, { transaction: t });

      // 3. Create Account (Mandatory)
      const password_hash = await argon2.hash(data.account.password, { type: argon2.argon2id });
      const account = await UserAccount.create({
        user_id: profile.user_id,
        email: data.account.email,
        password_hash,
        hash_algorithm: 'ARGON2ID',
        status: data.account.status || 'ACTIVE',
        must_change_password: data.account.must_change_password || false
      }, { transaction: t });

      // 4. Assign Roles
      if (Array.isArray(data.account.role_codes) && data.account.role_codes.length > 0) {
        const roles = await Role.findAll({ where: { role_code: data.account.role_codes }, transaction: t });
        await account.setRoles(roles, { transaction: t });
      } else {
        // Optional: Assign a default role if none provided? 
        // Currently leaving empty as per strict requirement.
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
      employment_status,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = query;

    const safeSortBy = ['created_at', 'staff_id', 'staff_code', 'employment_status'].includes(sortBy)
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
          include: [
            { 
              model: UserAccount, 
              as: 'account', 
              attributes: ['account_id', 'email', 'status', 'must_change_password', 'last_login_at'],
              // FIX: Explicitly include roles so the account object is fully populated 
              // and available in toStaffDto
              include: [{ model: Role, as: 'roles' }] 
            }
          ]
        }
      ],
      order: [[safeSortBy, safeSortOrder]],
      limit: parseInt(limit, 10),
      offset: (parseInt(page, 10) - 1) * parseInt(limit, 10),
      distinct: true,
      subQuery: false // Helps with distinct counts on deep includes
    });

    return { count: result.count, rows: result.rows.map(toStaffDto) };
  }

  async getStaffById(id) {
    const staff = await Staff.findByPk(id, {
      include: [
        { 
          model: User, 
          as: 'user', 
          include: [
            { 
              model: UserAccount, 
              as: 'account',
              include: [{ model: Role, as: 'roles' }] // Ensure roles are included for single fetch too
            } 
          ] 
        }
      ]
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

      // 1. Update Profile
      const profileUpdates = {};
      ['first_name', 'middle_name', 'last_name', 'gender', 'date_of_birth', 'phone', 'photo_url']
        .forEach((field) => {
          if (Object.prototype.hasOwnProperty.call(data, field)) {
            profileUpdates[field] = data[field];
          }
        });

      // 2. Update Staff Table
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

      // 3. Update Account (Since it is mandatory, we assume it exists)
      if (data.account) {
        const existingAccount = await UserAccount.findOne({ where: { user_id: staff.user_id }, transaction: t });
        
        if (existingAccount) {
          // Update existing account
          const accountUpdates = {};
          if (data.account.email) accountUpdates.email = data.account.email;
          if (data.account.password) {
            accountUpdates.password_hash = await argon2.hash(data.account.password, { type: argon2.argon2id });
            accountUpdates.hash_algorithm = 'ARGON2ID';
          }
          if (data.account.status !== undefined) accountUpdates.status = data.account.status;

          if (Object.keys(accountUpdates).length > 0) {
            await existingAccount.update(accountUpdates, { transaction: t });
          }

          // Update Roles
          if (Array.isArray(data.account.role_codes)) {
            const roles = await Role.findAll({ where: { role_code: data.account.role_codes }, transaction: t });
            await existingAccount.setRoles(roles, { transaction: t });
          }
        } else {
          // Fallback: Create if missing (Should ideally not happen if creation is strictly enforced, 
          // but good for data consistency)
          if (!data.account.password) throw new Error('Password required to create missing account.');
          
          const password_hash = await argon2.hash(data.account.password, { type: argon2.argon2id });
          const newAccount = await UserAccount.create({
            user_id: staff.user_id,
            email: data.account.email,
            password_hash,
            hash_algorithm: 'ARGON2ID',
            status: data.account.status || 'ACTIVE'
          }, { transaction: t });

          if (Array.isArray(data.account.role_codes) && data.account.role_codes.length > 0) {
            const roles = await Role.findAll({ where: { role_code: data.account.role_codes }, transaction: t });
            await newAccount.setRoles(roles, { transaction: t });
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