import { ModuleOffering, Enrollment } from './../enrollment/enrollment.model.js';
import { Module, Batch } from '../academics/academic.model.js';
import { Instructor } from '../instructors/instructor.model.js';

class ModuleOfferingService {
  async createOffering(payload) {
    const { module_id, batch_id, section_code, instructor_id, capacity } = payload;
    
    const existing = await ModuleOffering.findOne({
      where: { module_id, batch_id, section_code }
    });
    if (existing) throw new Error('A section with this code already exists for this module and batch');

    return await ModuleOffering.create({
      module_id,
      batch_id,
      section_code,
      instructor_id,
      capacity
    });
  }

  async getAllOfferings(filters = {}) {
    const { batch_id, module_id, instructor_id } = filters;

    return await ModuleOffering.findAll({
      where: {
        ...(batch_id && { batch_id }),
        ...(module_id && { module_id }),
        ...(instructor_id && { instructor_id }),
      },
      include: [
        { model: Module, as: 'module' },
        { model: Batch, as: 'batch' },
        { model: Instructor, as: 'instructor' }
      ],
      order: [['created_at', 'DESC']]
    });
  }

  async getOfferingById(id) {
    const offering = await ModuleOffering.findByPk(id, {
      include: [
        { model: Module, as: 'module' },
        { model: Batch, as: 'batch' },
        { model: Instructor, as: 'instructor' }
      ]
    });
    if (!offering) throw new Error('Module offering not found');
    return offering;
  }

  async updateOffering(id, payload) {
    const offering = await ModuleOffering.findByPk(id);
    if (!offering) throw new Error('Module offering not found');

    // RESTORED: Explicit whitelisting for security
    const updates = {};
    if (payload.section_code) updates.section_code = payload.section_code;
    if (payload.instructor_id) updates.instructor_id = payload.instructor_id;
    if (payload.capacity !== undefined) updates.capacity = payload.capacity;
    if (payload.batch_id) updates.batch_id = payload.batch_id;
    if (payload.module_id) updates.module_id = payload.module_id;

    return await offering.update(updates);
  }

  async deleteOffering(id) {
    const offering = await ModuleOffering.findByPk(id);
    if (!offering) throw new Error('Module offering not found');

    const enrollmentCount = await Enrollment.count({ where: { offering_id: id } });
    if (enrollmentCount > 0) {
      throw new Error('Cannot delete offering: Students are already enrolled. Drop students first.');
    }

    await offering.destroy();
    return offering;
  }
}

export default new ModuleOfferingService();