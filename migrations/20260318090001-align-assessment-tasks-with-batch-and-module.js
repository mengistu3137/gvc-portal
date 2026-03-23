export default {
  async up(queryInterface, Sequelize) {
    const t = await queryInterface.sequelize.transaction();
    try {
      const table = await queryInterface.describeTable('assessment_tasks');

      if (!table.batch_id) {
        await queryInterface.addColumn(
          'assessment_tasks',
          'batch_id',
          {
            type: Sequelize.BIGINT.UNSIGNED,
            allowNull: true
          },
          { transaction: t }
        );
      }

      if (!table.module_id) {
        await queryInterface.addColumn(
          'assessment_tasks',
          'module_id',
          {
            type: Sequelize.INTEGER,
            allowNull: true
          },
          { transaction: t }
        );
      }

      const refreshed = await queryInterface.describeTable('assessment_tasks');
      if (refreshed.batch_id && refreshed.module_id) {
        await queryInterface.addIndex('assessment_tasks', ['batch_id', 'module_id'], {
          name: 'idx_assessment_tasks_batch_module',
          transaction: t
        });
      }

      await t.commit();
    } catch (error) {
      await t.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    const t = await queryInterface.sequelize.transaction();
    try {
      const table = await queryInterface.describeTable('assessment_tasks');

      if (table.batch_id && table.module_id) {
        try {
          await queryInterface.removeIndex('assessment_tasks', 'idx_assessment_tasks_batch_module', { transaction: t });
        } catch {
          // Ignore if index does not exist.
        }
      }

      if (table.batch_id) {
        await queryInterface.removeColumn('assessment_tasks', 'batch_id', { transaction: t });
      }

      if (table.module_id) {
        await queryInterface.removeColumn('assessment_tasks', 'module_id', { transaction: t });
      }

      await t.commit();
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }
};
