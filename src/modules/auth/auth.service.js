import { Op } from 'sequelize';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import sequelize from '../../config/database.js';
import { UserAccount, Role, Permission } from './auth.model.js';
import { Person } from '../persons/person.model.js';

const toLegacyUserDto = (user) => {
  const row = user.toJSON();
  const person = row.person || {};
  const full_name = [person.first_name, person.middle_name, person.last_name]
    .filter(Boolean)
    .join(' ');

  return {
    ...row,
    first_name: person.first_name || null,
    middle_name: person.middle_name || null,
    last_name: person.last_name || null,
    full_name: full_name || null
  };
};

class AuthService {
  // --- AUTH OPERATIONS ---
async login(email, password) {
  const user = await UserAccount.findOne({
    where: { email, status: 'ACTIVE' },
    include: [
      { model: Person, as: 'person' },
      {
        model: Role,
        as: 'roles',
        include: [{
          model: Permission,
          as: 'permissions'
        }]
      }
    ]
  });

  if (!user) throw new Error('Authentication failed');

  const isMatch = await argon2.verify(user.password_hash, password);
  if (!isMatch) throw new Error('Authentication failed');

  user.last_login_at = new Date();
  await user.save();

  const userRoles = user.roles || [];

  const permissions = userRoles.flatMap(role =>
    (role.permissions || []).map(p => p.permission_code)
  );

  const token = jwt.sign(
    {
      userId: user.user_id,
      email: user.email,
      roles: userRoles.map(r => r.role_code),
      permissions
    },
    process.env.JWT_SECRET,
    { expiresIn: '12h' }
  );

  return {
    token,
    user: {
      user_id: user.user_id,
      person_id: user.person_id,
      email: user.email,
      first_name: user.person?.first_name || null,
      last_name: user.person?.last_name || null,
      full_name: [user.person?.first_name, user.person?.middle_name, user.person?.last_name].filter(Boolean).join(' ') || null
    }
  };
}

  // --- CRUD OPERATIONS WITH PFSS ---
  async getAllUsers(query) {
    const {
      page = 1,
      limit = 10,
      search = '',
      status,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = query;

    const offset = (page - 1) * limit;

    let whereClause = {
      [Op.and]: [
        search ? {
          [Op.or]: [
            { email: { [Op.like]: `%${search}%` } },
            { '$person.first_name$': { [Op.like]: `%${search}%` } },
            { '$person.last_name$': { [Op.like]: `%${search}%` } }
          ]
        } : {},
        status ? { status } : {}
      ]
    };

    const { count, rows } = await UserAccount.findAndCountAll({
      where: whereClause,
      attributes: { exclude: ['password_hash'] },
      include: [
        {
          model: Person,
          as: 'person',
          required: true
        },
        { model: Role, as: 'roles' }
      ],
      order: [[sortBy, sortOrder]],
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
      distinct: true
    });

    return {
      totalItems: count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page, 10),
      users: rows.map(toLegacyUserDto)
    };
  }

  async createUser(data) {
    const t = await sequelize.transaction();
    try {
      let personId = data.person_id;

      if (!personId) {
        if (!data.first_name || !data.last_name) {
          throw new Error('person_id is required, or provide first_name and last_name to create person identity.');
        }

        const person = await Person.create({
          first_name: data.first_name,
          middle_name: data.middle_name || null,
          last_name: data.last_name,
          gender: data.gender || null,
          date_of_birth: data.date_of_birth || null,
          phone: data.phone || null,
          email: data.email || null,
          photo_url: data.photo_url || null
        }, { transaction: t });
        personId = person.person_id;
      }

      const hashedPassword = await argon2.hash(data.password, { type: argon2.argon2id });
      const user = await UserAccount.create({
        person_id: personId,
        email: data.email,
        password_hash: hashedPassword,
        status: data.status,
        must_change_password: data.must_change_password,
        hash_algorithm: 'ARGON2ID'
      }, { transaction: t });

      if (data.role_codes && data.role_codes.length > 0) {
        const roles = await Role.findAll({ where: { role_code: data.role_codes }, transaction: t });
        await user.setRoles(roles, { transaction: t });
      }

      await t.commit();

      const created = await UserAccount.findByPk(user.user_id, {
        attributes: { exclude: ['password_hash'] },
        include: [
          { model: Person, as: 'person' },
          { model: Role, as: 'roles' }
        ]
      });

      return toLegacyUserDto(created);
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  async updateUser(id, data) {
    const t = await sequelize.transaction();
    try {
      const user = await UserAccount.findByPk(id, { transaction: t });
      if (!user) throw new Error('User not found');

      if (data.password) {
        data.password_hash = await argon2.hash(data.password, { type: argon2.argon2id });
        data.hash_algorithm = 'ARGON2ID';
        delete data.password;
      }

      const personUpdates = {};
      ['first_name', 'middle_name', 'last_name', 'gender', 'date_of_birth', 'phone', 'email', 'photo_url']
        .forEach((field) => {
          if (Object.prototype.hasOwnProperty.call(data, field)) {
            personUpdates[field] = data[field];
          }
        });

      const userUpdates = { ...data };
      Object.keys(personUpdates).forEach((k) => delete userUpdates[k]);
      delete userUpdates.role_codes;

      if (Object.keys(userUpdates).length > 0) {
        await user.update(userUpdates, { transaction: t });
      }

      if (Object.keys(personUpdates).length > 0) {
        const person = await Person.findByPk(user.person_id, { transaction: t });
        if (!person) throw new Error('Person identity not found for user');
        await person.update(personUpdates, { transaction: t });
      }

      if (data.role_codes && data.role_codes.length > 0) {
        const roles = await Role.findAll({ where: { role_code: data.role_codes }, transaction: t });
        await user.setRoles(roles, { transaction: t });
      }

      await t.commit();

      const updatedUser = await UserAccount.findByPk(id, {
        attributes: { exclude: ['password_hash'] },
        include: [
          { model: Person, as: 'person' },
          { model: Role, as: 'roles' }
        ]
      });

      return toLegacyUserDto(updatedUser);
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }
  async deleteUser(id) {
    const user = await UserAccount.findByPk(id);
    if (!user) throw new Error('User not found');
    return await user.destroy(); // Soft delete via paranoid: true
  }
}

export default new AuthService();