import { Op } from 'sequelize';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import sequelize from '../../config/database.js';
import { UserAccount, Role, Permission } from './auth.model.js';
import { User } from '../users/users.model.js';

const toLegacyUserDto = (user) => {
  const row = user.toJSON();
  const profile = row.user || {};
  const full_name = [profile.first_name, profile.middle_name, profile.last_name]
    .filter(Boolean)
    .join(' ');

  return {
    ...row,
    first_name: profile.first_name || null,
    middle_name: profile.middle_name || null,
    last_name: profile.last_name || null,
    full_name: full_name || null
  };
};

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
let mailTransporter;

const buildResetEmailHtml = ({ fullName, resetUrl, expiresMinutes = 60 }) => `
  <div style="font-family: Arial, sans-serif; background:#f6f7fb; padding:32px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:640px; margin:0 auto; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 12px 30px rgba(0,0,0,0.06);">
      <tr>
        <td style="background:#0a4da3; color:#fff; padding:24px 28px;">
          <div style="font-size:18px; font-weight:700;">Grand Valley College</div>
          <div style="font-size:13px; opacity:0.9;">Secure password reset</div>
        </td>
      </tr>
      <tr>
        <td style="padding:28px 28px 6px; color:#111827;">
          <div style="font-size:16px; font-weight:600; margin-bottom:8px;">Hello${fullName ? ` ${fullName}` : ''},</div>
          <div style="font-size:14px; line-height:1.6; color:#374151;">We received a request to reset your GVC Portal password. Use the button below to set a new password. This link will expire in ${expiresMinutes} minutes.</div>
        </td>
      </tr>
      <tr>
        <td style="padding:18px 28px 12px; text-align:center;">
          <a href="${resetUrl}" style="display:inline-block; background:#0a4da3; color:#ffffff; text-decoration:none; padding:12px 22px; border-radius:8px; font-weight:600;">Reset your password</a>
        </td>
      </tr>
      <tr>
        <td style="padding:0 28px 22px; color:#4b5563; font-size:13px; line-height:1.6;">
          If the button does not work, copy and paste this URL into your browser:<br/>
          <span style="word-break:break-all; color:#0a4da3;">${resetUrl}</span>
        </td>
      </tr>
      <tr>
        <td style="padding:0 28px 28px; font-size:12px; color:#9ca3af;">If you did not request this change, you can safely ignore this email. Your password will remain unchanged.</td>
      </tr>
    </table>
  </div>
`;

const getMailTransporter = () => {
  if (mailTransporter) return mailTransporter;

  // Gmail SMTP requires 2-Step Verification enabled and a 16-character App Password generated from Google Account settings
  mailTransporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASS
    },
    connectionTimeout: 10000
  });

  return mailTransporter;
};

class AuthService {
  // --- AUTH OPERATIONS ---
  async login(email, password) {
  const user = await UserAccount.findOne({
    where: { email, status: 'ACTIVE' },
    include: [
      { model: User, as: 'user' },
      {
        model: Role,
        as: 'roles',
        include: [{
          model: Permission,
            as: 'granted_permissions'
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
    (role.granted_permissions || []).map(p => p.permission_code)
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
      account_id: user.account_id,
      email: user.email,
      first_name: user.user?.first_name || null,
      last_name: user.user?.last_name || null,
      full_name: [user.user?.first_name, user.user?.middle_name, user.user?.last_name].filter(Boolean).join(' ') || null
    },
    roles: userRoles.map(r => r.role_code),
    permissions: permissions
  };
}

  async requestPasswordReset(email) {
    if (!email) throw new Error('Email is required');

    const user = await UserAccount.findOne({
      where: { email },
      include: [{ model: User, as: 'user' }]
    });

    if (!user) {
      // Requirement: check existence; returning explicit error keeps API behavior clear to callers
      throw new Error('User not found');
    }

    const rawToken = crypto.randomBytes(48).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

    await user.update({
      reset_token_hash: tokenHash,
      reset_token_expires_at: expiresAt,
      reset_token_sent_at: new Date()
    });

    const baseUrl = process.env.PASSWORD_RESET_URL || process.env.FRONTEND_URL || 'https://portal.gvc.edu/reset-password';
    const resetUrl = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}token=${rawToken}`;

    const transporter = getMailTransporter();
    await transporter.sendMail({
      to: user.email,
      from: process.env.GMAIL_FROM_EMAIL || process.env.GMAIL_USER || 'no-reply@gvc.edu',
      subject: 'GVC Portal password reset',
      html: buildResetEmailHtml({
        fullName: [user.user?.first_name, user.user?.last_name].filter(Boolean).join(' '),
        resetUrl,
        expiresMinutes: Math.round(RESET_TOKEN_TTL_MS / (60 * 1000))
      })
    });

    return { message: 'Password reset email sent' };
  }

  async resetPasswordWithToken(token, newPassword) {
    if (!token || !newPassword) throw new Error('Token and new password are required');

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const now = new Date();

    const user = await UserAccount.findOne({
      where: {
        reset_token_hash: tokenHash,
        reset_token_expires_at: { [Op.gt]: now }
      }
    });

    if (!user) throw new Error('Invalid or expired token');

    const t = await sequelize.transaction();
    try {
      const hashedPassword = await argon2.hash(newPassword, { type: argon2.argon2id });

      await user.update({
        password_hash: hashedPassword,
        hash_algorithm: 'ARGON2ID',
        must_change_password: false,
        reset_token_hash: null,
        reset_token_expires_at: null,
        reset_token_sent_at: null
      }, { transaction: t });

      await t.commit();
      return { message: 'Password updated successfully' };
    } catch (error) {
      await t.rollback();
      throw error;
    }
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
            { '$user.first_name$': { [Op.like]: `%${search}%` } },
            { '$user.last_name$': { [Op.like]: `%${search}%` } }
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
          model: User,
          as: 'user',
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
      let userId = data.user_id;

      if (!userId) {
        if (!data.first_name || !data.last_name) {
          throw new Error('user_id is required, or provide first_name and last_name to create user identity.');
        }

        const profile = await User.create({
          first_name: data.first_name,
          middle_name: data.middle_name || null,
          last_name: data.last_name,
          gender: data.gender || null,
          date_of_birth: data.date_of_birth || null,
          phone: data.phone || null,
          photo_url: data.photo_url || null
        }, { transaction: t });
        userId = profile.user_id;
      }

      const hashedPassword = await argon2.hash(data.password, { type: argon2.argon2id });
      const user = await UserAccount.create({
        user_id: userId,
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

      const created = await UserAccount.findByPk(user.account_id, {
        attributes: { exclude: ['password_hash'] },
        include: [
          { model: User, as: 'user' },
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
            if (field !== 'email') {
              personUpdates[field] = data[field];
            }
          }
        });

      const userUpdates = { ...data };
      Object.keys(personUpdates).forEach((k) => delete userUpdates[k]);
      delete userUpdates.role_codes;

      if (Object.keys(userUpdates).length > 0) {
        await user.update(userUpdates, { transaction: t });
      }

      if (Object.keys(personUpdates).length > 0) {
        const profile = await User.findByPk(user.user_id, { transaction: t });
        if (!profile) throw new Error('User identity not found for account');
        await profile.update(personUpdates, { transaction: t });
      }

      if (data.role_codes && data.role_codes.length > 0) {
        const roles = await Role.findAll({ where: { role_code: data.role_codes }, transaction: t });
        await user.setRoles(roles, { transaction: t });
      }

      await t.commit();

      const updatedUser = await UserAccount.findByPk(id, {
        attributes: { exclude: ['password_hash'] },
        include: [
          { model: User, as: 'user' },
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

  // --- ROLE / PERMISSION MANAGEMENT ---
  async createRole(payload) {
    const role = await Role.create({
      role_code: payload.role_code,
      role_name: payload.role_name,
      permissions: payload.permissions || null
    });
    return role;
  }

  async listRoles() {
    return Role.findAll({ include: [{ model: Permission, as: 'granted_permissions' }] });
  }

  async getRoleById(roleId) {
    const role = await Role.findByPk(roleId, { include: [{ model: Permission, as: 'granted_permissions' }] });
    if (!role) throw new Error('Role not found');
    return role;
  }

  async updateRole(roleId, payload) {
    const role = await Role.findByPk(roleId);
    if (!role) throw new Error('Role not found');
    await role.update(payload);
    return this.getRoleById(roleId);
  }

  async deleteRole(roleId) {
    const role = await Role.findByPk(roleId);
    if (!role) throw new Error('Role not found');
    await role.destroy();
    return { message: 'Role deleted' };
  }

  async assignRolesToAccount(accountId, roleCodes = []) {
    const account = await UserAccount.findByPk(accountId);
    if (!account) throw new Error('User account not found');

    const roles = await Role.findAll({ where: { role_code: roleCodes } });
    await account.setRoles(roles);

    return this.getUserWithRoles(accountId);
  }

  async unassignRolesFromAccount(accountId, roleCodes = []) {
    const account = await UserAccount.findByPk(accountId);
    if (!account) throw new Error('User account not found');

    if (roleCodes.length === 0) {
      await account.setRoles([]);
      return this.getUserWithRoles(accountId);
    }

    const roles = await Role.findAll({ where: { role_code: roleCodes } });
    await account.removeRoles(roles);

    return this.getUserWithRoles(accountId);
  }

  async assignPermissionsToRole(roleId, permissionCodes = []) {
    const role = await Role.findByPk(roleId);
    if (!role) throw new Error('Role not found');

    const permissions = await Permission.findAll({ where: { permission_code: permissionCodes } });
    await role.setGranted_permissions(permissions);

    return this.getRoleById(roleId);
  }

  async unassignPermissionsFromRole(roleId, permissionCodes = []) {
    const role = await Role.findByPk(roleId);
    if (!role) throw new Error('Role not found');

    if (permissionCodes.length === 0) {
      await role.setGranted_permissions([]);
      return this.getRoleById(roleId);
    }

    const permissions = await Permission.findAll({ where: { permission_code: permissionCodes } });
    await role.removeGranted_permissions(permissions);

    return this.getRoleById(roleId);
  }

  async getUserWithRoles(accountId) {
    const account = await UserAccount.findByPk(accountId, {
      attributes: { exclude: ['password_hash'] },
      include: [
        { model: User, as: 'user' },
        {
          model: Role,
          as: 'roles',
          include: [{ model: Permission, as: 'granted_permissions' }]
        }
      ]
    });
    if (!account) throw new Error('User account not found');
    return toLegacyUserDto(account);
  }
}

export default new AuthService();