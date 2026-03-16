const hasColumn = async (queryInterface, tableName, columnName) => {
  const table = await queryInterface.describeTable(tableName);
  return Boolean(table[columnName]);
};

export default {
  async up(queryInterface, Sequelize) {
    const t = await queryInterface.sequelize.transaction();
    try {
      if (!(await hasColumn(queryInterface, 'students', 'person_id'))) {
        await queryInterface.addColumn('students', 'person_id', {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: true
        }, { transaction: t });
      }

      await queryInterface.addConstraint('students', {
        fields: ['person_id'],
        type: 'foreign key',
        name: 'fk_students_person_id',
        references: { table: 'persons', field: 'person_id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        transaction: t
      });

      await queryInterface.addConstraint('students', {
        fields: ['person_id'],
        type: 'unique',
        name: 'uq_students_person_id',
        transaction: t
      });

      await t.commit();
    } catch (error) {
      await t.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    const t = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.removeConstraint('students', 'uq_students_person_id', { transaction: t });
      await queryInterface.removeConstraint('students', 'fk_students_person_id', { transaction: t });
      if (await hasColumn(queryInterface, 'students', 'person_id')) {
        await queryInterface.removeColumn('students', 'person_id', { transaction: t });
      }
      await t.commit();
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }
};
