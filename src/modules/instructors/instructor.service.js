import { Op } from 'sequelize';
import sequelize from '../../config/database.js';
import { Instructor } from './instructor.model.js';
import { Person } from '../persons/person.model.js';
import { Occupation } from '../academics/academic.model.js';
import { UserAccount, Role } from '../auth/auth.model.js';
import argon2 from 'argon2';

const toLegacyInstructorDto = (instructor) => {
  const row = instructor.toJSON();
  const person = row.person || {};
  const full_name = [person.first_name, person.middle_name, person.last_name]
    .filter(Boolean)
    .join(' ');

  return {
    ...row,
    first_name: person.first_name || null,
    middle_name: person.middle_name || null,
    last_name: person.last_name || null,
    full_name: full_name || null,
    gender: person.gender || null,
    date_of_birth: person.date_of_birth || null,
    phone: person.phone || null,
    email: person.email || null,
    photo_url: person.photo_url || null,
    account_email: person.account?.email || null
  };
};

class InstructorService {
  async createInstructor(data) {
    const t = await sequelize.transaction();
    try {
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
        throw new Error('first_name and last_name are required to create instructor identity.');
      }

      const person = await Person.create(personPayload, { transaction: t });

      const instructor = await Instructor.create({
        person_id: person.person_id,
        staff_code: data.staff_code,
        occupation_id: data.occupation_id || null,
        hire_date: data.hire_date || null,
        qualification: data.qualification || null,
        employment_status: data.employment_status || 'ACTIVE'
      }, { transaction: t });

      if (data.account && data.account.email && data.account.password) {
        const password_hash = await argon2.hash(data.account.password, { type: argon2.argon2id });
        const user = await UserAccount.create({
          person_id: person.person_id,
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

      const created = await Instructor.findByPk(instructor.instructor_id, {
        include: [
          { model: Person, as: 'person', include: [{ model: UserAccount, as: 'account', attributes: ['user_id', 'email', 'status'] }] },
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
            { '$person.first_name$': { [Op.like]: `%${search}%` } },
            { '$person.last_name$': { [Op.like]: `%${search}%` } }
          ]
        } : {},
        status ? { employment_status: status } : {},
        occupation_id ? { occupation_id } : {}
      ]
    };

    const result = await Instructor.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Person,
          as: 'person',
          required: false,
          include: [{ model: UserAccount, as: 'account', attributes: ['user_id', 'email', 'status'] }]
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

  async updateInstructor(id, data) {
    const t = await sequelize.transaction();
    try {
      const inst = await Instructor.findByPk(id, { transaction: t });
      if (!inst) throw new Error('Instructor not found');

      const personUpdates = {};
      ['first_name', 'middle_name', 'last_name', 'gender', 'date_of_birth', 'phone', 'email', 'photo_url']
        .forEach((field) => {
          if (Object.prototype.hasOwnProperty.call(data, field)) {
            personUpdates[field] = data[field];
          }
        });

      const instructorUpdates = { ...data };
      Object.keys(personUpdates).forEach((k) => delete instructorUpdates[k]);

      if (Object.keys(instructorUpdates).length > 0) {
        await inst.update(instructorUpdates, { transaction: t });
      }

      if (Object.keys(personUpdates).length > 0) {
        const person = await Person.findByPk(inst.person_id, { transaction: t });
        if (!person) throw new Error('Person identity not found for instructor');
        await person.update(personUpdates, { transaction: t });
      }

      await t.commit();
      const updated = await Instructor.findByPk(id, {
        include: [
          { model: Person, as: 'person', include: [{ model: UserAccount, as: 'account', attributes: ['user_id', 'email', 'status'] }] },
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
    const inst = await Instructor.findByPk(id);
    if (!inst) throw new Error('Instructor not found');
    return await inst.destroy();
  }
}

export default new InstructorService();