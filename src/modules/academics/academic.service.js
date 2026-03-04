import { Department, Program, Batch, AcademicYear } from './academic.model.js';

class AcademicService {
  // Department logic
  async createDepartment(data) {
    return await Department.create(data);
  }

  async getAllDepartments() {
    return await Department.findAll({ where: { is_active: true } });
  }

  // Program logic
  async createProgram(deptId, data) {
    return await Program.create({ ...data, department_id: deptId });
  }

  // Batch logic
  async createBatch(data) {
    // Business rule: Ensure start_date < end_date is handled by DB CHECK constraint, 
    // but we can add validation here too.
    return await Batch.create(data);
  }

  async getActiveBatches() {
    return await Batch.findAll({
      include: [Program, AcademicYear],
      where: { is_active: true }
    });
  }
}

export default new AcademicService();