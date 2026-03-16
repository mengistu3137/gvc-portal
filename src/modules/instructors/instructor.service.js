import { Op } from 'sequelize';
import { Instructor } from './instructor.model.js';
import { UserAccount } from '../auth/auth.model.js';

class InstructorService {
  async createInstructor(data) {
    // data should include user_id and department_id
    return await Instructor.create(data);
  }

  async getInstructors(query) {
    const { 
      page = 1, limit = 10, search = '', 
      status, department_id, sortBy = 'full_name', sortOrder = 'ASC' 
    } = query;

    const whereClause = {
      [Op.and]: [
        search ? {
          [Op.or]: [
            { full_name: { [Op.like]: `%${search}%` } },
            { staff_code: { [Op.like]: `%${search}%` } }
          ]
        } : {},
        status ? { employment_status: status } : {},
        department_id ? { department_id } : {}
      ]
    };

    return await Instructor.findAndCountAll({
      where: whereClause,
      include: ['department', { model: UserAccount, as: 'account', attributes: ['email'] }],
      order: [[sortBy, sortOrder]],
      limit: parseInt(limit),
      offset: (page - 1) * limit
    });
  }

  async updateInstructor(id, data) {
    const inst = await Instructor.findByPk(id);
    if (!inst) throw new Error('Instructor not found');
    return await inst.update(data);
  }

  async deleteInstructor(id) {
    const inst = await Instructor.findByPk(id);
    if (!inst) throw new Error('Instructor not found');
    return await inst.destroy();
  }
}

export default new InstructorService();