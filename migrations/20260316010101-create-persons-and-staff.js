export default {
  async up(queryInterface, Sequelize) {
    const t = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.createTable('persons', {
        person_id: {
          type: Sequelize.BIGINT.UNSIGNED,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false
        },
        first_name: { type: Sequelize.STRING(80), allowNull: false },
        middle_name: { type: Sequelize.STRING(80), allowNull: true },
        last_name: { type: Sequelize.STRING(80), allowNull: false },
        gender: { type: Sequelize.ENUM('M', 'F'), allowNull: true },
        date_of_birth: { type: Sequelize.DATEONLY, allowNull: true },
        phone: { type: Sequelize.STRING(30), allowNull: true },
        email: { type: Sequelize.STRING(190), allowNull: true },
        photo_url: { type: Sequelize.STRING(255), allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
        deleted_at: { type: Sequelize.DATE, allowNull: true }
      }, { transaction: t });

      await queryInterface.addIndex('persons', ['email'], {
        name: 'idx_persons_email',
        transaction: t
      });

      await queryInterface.createTable('staff', {
        staff_id: {
          type: Sequelize.BIGINT.UNSIGNED,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false
        },
        person_id: {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: false,
          unique: true,
          references: { model: 'persons', key: 'person_id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT'
        },
        staff_type: {
          type: Sequelize.ENUM('FINANCE', 'REGISTRAR', 'QA', 'ADMIN'),
          allowNull: false
        },
        employment_status: {
          type: Sequelize.ENUM('ACTIVE', 'ON_LEAVE', 'INACTIVE'),
          allowNull: false,
          defaultValue: 'ACTIVE'
        },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
        deleted_at: { type: Sequelize.DATE, allowNull: true }
      }, { transaction: t });

      await t.commit();
    } catch (error) {
      await t.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    const t = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.dropTable('staff', { transaction: t });
      await queryInterface.dropTable('persons', { transaction: t });
      await t.commit();
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }
};
