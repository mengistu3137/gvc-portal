import { Op } from 'sequelize';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { UserAccount, Role, Permission } from './auth.model.js';

class AuthService {
  // --- AUTH OPERATIONS ---
 // src/modules/auth/auth.service.js

async login(email, password) {
  const user = await UserAccount.findOne({
    where: { email, status: 'ACTIVE' },
    include: [{ 
      model: Role, 
      as: 'roles', // Use the same alias here
      include: [{ 
        model: Permission, 
        as: 'permissions' // Use the same alias here
      }] 
    }]
  });

  if (!user) throw new Error('Authentication failed');

  const isMatch = await argon2.verify(user.password_hash, password);
  if (!isMatch) throw new Error('Authentication failed');

  user.last_login_at = new Date();
  await user.save();

  // Safety first: Use lowercase and check if they exist before mapping
  const userRoles = user.roles || [];
  console.log('User Roles:', userRoles.map(r => r.role_code)); // Debugging line
  
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

  return { token, user: { email: user.email } };
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

    // 1. Searching & Filtering logic
    let whereClause = {
      [Op.and]: [
        search ? { email: { [Op.like]: `%${search}%` } } : {},
        status ? { status } : {}
      ]
    };

    // 2. Execute Query
    const { count, rows } = await UserAccount.findAndCountAll({
      where: whereClause,
      attributes: { exclude: ['password_hash'] },
      include: [Role],
      order: [[sortBy, sortOrder]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    return {
      totalItems: count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      users: rows
    };
  }

  async createUser(data) {
    const hashedPassword = await argon2.hash(data.password, { type: argon2.argon2id });
    return await UserAccount.create({ ...data, password_hash: hashedPassword });
  }

// ... existing imports ...

async updateUser(id, data) {
  const user = await UserAccount.findByPk(id);
  if (!user) throw new Error('User not found');

  // Security Check: If password is being updated, hash it
  if (data.password) {
    data.password_hash = await argon2.hash(data.password, { type: argon2.argon2id });
    // Remove the plain text password from the data object before updating
    delete data.password;
  }

  // Update the user record
  await user.update(data);

  // Return the updated user without the sensitive password hash
  const updatedUser = await UserAccount.findByPk(id, {
    attributes: { exclude: ['password_hash'] }
  });

  return updatedUser;
}
  async deleteUser(id) {
    const user = await UserAccount.findByPk(id);
    if (!user) throw new Error('User not found');
    return await user.destroy(); // Soft delete via paranoid: true
  }
}

export default new AuthService();