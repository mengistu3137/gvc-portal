const hasColumn = async (queryInterface, tableName, columnName) => {
  const table = await queryInterface.describeTable(tableName);
  return Boolean(table[columnName]);
};

const hasConstraint = async (queryInterface, tableName, constraintName) => {
  const [results] = await queryInterface.sequelize.query(
    `SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_NAME = ?`,
    { replacements: [tableName, constraintName] }
  );
  return results.length > 0;
};

export default {
  async up(queryInterface, Sequelize) {
    const t = await queryInterface.sequelize.transaction();
    try {
      if (!(await hasColumn(queryInterface, 'user_accounts', 'person_id'))) {
        await queryInterface.addColumn('user_accounts', 'person_id', {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: true
        }, { transaction: t });
      }

      if (!(await hasConstraint(queryInterface, 'user_accounts', 'fk_user_accounts_person_id'))) {
        await queryInterface.addConstraint('user_accounts', {
          fields: ['person_id'],
          type: 'foreign key',
          name: 'fk_user_accounts_person_id',
          references: { table: 'persons', field: 'person_id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
          transaction: t
        });
      }

      if (!(await hasConstraint(queryInterface, 'user_accounts', 'uq_user_accounts_person_id'))) {
        await queryInterface.addConstraint('user_accounts', {
          fields: ['person_id'],
          type: 'unique',
          name: 'uq_user_accounts_person_id',
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
      if (await hasConstraint(queryInterface, 'user_accounts', 'uq_user_accounts_person_id')) {
        await queryInterface.removeConstraint('user_accounts', 'uq_user_accounts_person_id', { transaction: t });
      }
      if (await hasConstraint(queryInterface, 'user_accounts', 'fk_user_accounts_person_id')) {
        await queryInterface.removeConstraint('user_accounts', 'fk_user_accounts_person_id', { transaction: t });
      }
      if (await hasColumn(queryInterface, 'user_accounts', 'person_id')) {
        await queryInterface.removeColumn('user_accounts', 'person_id', { transaction: t });
      }
      await t.commit();
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }
};
