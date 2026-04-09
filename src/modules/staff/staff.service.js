import { Op } from 'sequelize';
import argon2 from 'argon2';
import sequelize from '../../config/database.js';
import { Staff, StaffIdSequence } from './staff.model.js';
import { Person } from '../persons/person.model.js';
import { UserAccount, Role } from '../auth/auth.model.js';
import { validateEthiopianPhone, validateEmail } from '../../utils/validation.js';

const toStaffDto = (staff) => {
  const row = staff.toJSON();
  const person = row.person || {};
  const fullName = [person.first_name, person.middle_name, person.last_name]
    .filter(Boolean)
    .join(' ');

  return {
    ...row,
    first_name: person.first_name || null,
    middle_name: person.middle_name || null,
    last_name: person.last_name || null,
    full_name: fullName || null,
    gender: person.gender || null,
    date_of_birth: person.date_of_birth || null,
    phone: person.phone || null,
    email: person.email || null,
    photo_url: person.photo_url || null,
    account_email: person.account?.email || null,
    account_status: person.account?.status || null,
    user_id: person.account?.user_id || null
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

  if (data.email && !validateEmail(data.email)) {
    throw new Error('Invalid email format.');
    }
    
   // NEW: Check for duplicate Personal Email
  if (data.email) {
    const existingPerson = await Person.findOne({ where: { email: data.email } });
    if (existingPerson) throw new Error('A person with this email already exists.');
  }

  // NEW: Check for duplicate Account Email
  if (data.account?.email) {
    const existingAccount = await UserAccount.findOne({ where: { email: data.account.email } });
    if (existingAccount) throw new Error('System account email is already taken.');
  }
    const t = await sequelize.transaction();
    try {
      const currentYear = new Date().getFullYear();
      const shortYear = String(currentYear).slice(-2);

      const [sequence] = await StaffIdSequence.findOrCreate({
        where: {
          category: 'STF',
          reg_year: currentYear
        },
        defaults: { last_seq: 0 },
        transaction: t,
        lock: t.LOCK.UPDATE
      });

      const nextSeq = sequence.last_seq + 1;
      await sequence.update({ last_seq: nextSeq }, { transaction: t });

      const generatedStaffCode = `GVC-STF-${String(nextSeq).padStart(3, '0')}/${shortYear}`;

      const personPayload = {
        first_name: data.first_name,
        middle_name: data.middle_name || null,
        last_name: data.last_name,
        gender: data.gender || null,
        date_of_birth: data.date_of_birth || null,
        phone: data.phone || null,
        email: data.email || null,
        photo_url: data.photo_url || null
      };

      if (!personPayload.first_name || !personPayload.last_name) {
        throw new Error('first_name and last_name are required to create staff identity.');
      }

      const person = await Person.create(personPayload, { transaction: t });

      const createdStaff = await Staff.create({
        person_id: person.person_id,
        staff_code: generatedStaffCode,
        staff_type: data.staff_type,
        employment_status: data.employment_status || 'ACTIVE'
      }, { transaction: t });

      if (data.account && data.account.email && data.account.password) {
        const password_hash = await argon2.hash(data.account.password, { type: argon2.argon2id });

        const user = await UserAccount.create({
          person_id: person.person_id,
          email: data.account.email,
          password_hash,
          hash_algorithm: 'ARGON2ID',
          status: data.account.status || 'ACTIVE',
          must_change_password: data.account.must_change_password || false
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

      const staff = await Staff.findByPk(createdStaff.staff_id, {
        include: [
          {
            model: Person,
            as: 'person',
            include: [
              {
                model: UserAccount,
                as: 'account',
                attributes: ['user_id', 'email', 'status', 'must_change_password', 'last_login_at']
              }
            ]
          }
        ]
      });

      return toStaffDto(staff);
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
                { '$person.first_name$': { [Op.like]: `%${search}%` } },
                { '$person.last_name$': { [Op.like]: `%${search}%` } },
                { '$person.email$': { [Op.like]: `%${search}%` } },
                { '$person.phone$': { [Op.like]: `%${search}%` } }
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
          model: Person,
          as: 'person',
          required: false,
          include: [
            {
              model: UserAccount,
              as: 'account',
              attributes: ['user_id', 'email', 'status', 'must_change_password', 'last_login_at']
            }
          ]
        }
      ],
      order: [[safeSortBy, safeSortOrder]],
      limit: parseInt(limit, 10),
      offset: (parseInt(page, 10) - 1) * parseInt(limit, 10),
      distinct: true
    });

    return {
      count: result.count,
      rows: result.rows.map(toStaffDto)
    };
  }

  async getStaffById(id) {
    const staff = await Staff.findByPk(id, {
      include: [
        {
          model: Person,
          as: 'person',
          include: [
            {
              model: UserAccount,
              as: 'account',
              attributes: ['user_id', 'email', 'status', 'must_change_password', 'last_login_at']
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
  if (data.email && !validateEmail(data.email)) {
    throw new Error('Invalid email format.');
  }
    const t = await sequelize.transaction();
    try {
      const staff = await Staff.findByPk(id, { transaction: t });
      if (!staff) throw new Error('Staff not found');
      
      if (data.email) {
      const emailTaken = await Person.findOne({ 
        where: { 
          email: data.email, 
          person_id: { [Op.ne]: staff.person_id } // "Not Equal" to current person
        },
        transaction: t 
      });
      if (emailTaken) throw new Error('This email is already assigned to another person.');
    }

      const personUpdates = {};
      ['first_name', 'middle_name', 'last_name', 'gender', 'date_of_birth', 'phone', 'email', 'photo_url']
        .forEach((field) => {
          if (Object.prototype.hasOwnProperty.call(data, field)) {
            personUpdates[field] = data[field];
          }
        });

      const staffUpdates = { ...data };
      Object.keys(personUpdates).forEach((k) => delete staffUpdates[k]);
      delete staffUpdates.account;
      delete staffUpdates.staff_code;

      if (Object.keys(staffUpdates).length > 0) {
        await staff.update(staffUpdates, { transaction: t });
      }

      if (Object.keys(personUpdates).length > 0) {
        const person = await Person.findByPk(staff.person_id, { transaction: t });
        if (!person) throw new Error('Person identity not found for staff');
        await person.update(personUpdates, { transaction: t });
      }

// Check if the update request includes a command to create a new account
if (data.create_account && data.account) {
  // 1. Hash the password
  const password_hash = await argon2.hash(data.account.password, { type: argon2.argon2id });

  // 2. Safety check: ensure they don't already have an account
  const existingAccount = await UserAccount.findOne({ 
    where: { person_id: staff.person_id },
    transaction: t 
  });

  if (!existingAccount) {
    // 3. Create the account tied to the staff's person_id
    const newUser = await UserAccount.create({
      person_id: staff.person_id,
      email: data.account.email,
      password_hash,
      hash_algorithm: 'ARGON2ID',
      status: 'ACTIVE'
    }, { transaction: t });

    // 4. Assign default roles if provided
    if (data.account.role_codes) {
      const roles = await Role.findAll({ where: { role_code: data.account.role_codes }, transaction: t });
      await newUser.setRoles(roles, { transaction: t });
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
    return await staff.destroy();
  }
}

export { toStaffDto };
export default new StaffService();
