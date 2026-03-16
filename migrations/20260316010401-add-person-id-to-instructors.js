const hasColumn = async (queryInterface, tableName, columnName) => {
  const table = await queryInterface.describeTable(tableName);
  return Boolean(table[columnName]);
};

export default {
  async up(queryInterface, Sequelize) {
    const t = await queryInterface.sequelize.transaction();
    try {
      if (!(await hasColumn(queryInterface, 'instructors', 'person_id'))) {
        await queryInterface.addColumn('instructors', 'person_id', {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: true
        }, { transaction: t });
      }

      if (!(await hasColumn(queryInterface, 'instructors', 'occupation_id'))) {
        await queryInterface.addColumn('instructors', 'occupation_id', {
          type: Sequelize.INTEGER,
          allowNull: true
        }, { transaction: t });
      }

      if (!(await hasColumn(queryInterface, 'instructors', 'hire_date'))) {
        await queryInterface.addColumn('instructors', 'hire_date', {
          type: Sequelize.DATEONLY,
          allowNull: true
        }, { transaction: t });
      }

      if (!(await hasColumn(queryInterface, 'instructors', 'qualification'))) {
        await queryInterface.addColumn('instructors', 'qualification', {
          type: Sequelize.STRING(180),
          allowNull: true
        }, { transaction: t });
      }

      await queryInterface.addConstraint('instructors', {
        fields: ['person_id'],
        type: 'foreign key',
        name: 'fk_instructors_person_id',
        references: { table: 'persons', field: 'person_id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        transaction: t
      });

      await queryInterface.addConstraint('instructors', {
        fields: ['person_id'],
        type: 'unique',
        name: 'uq_instructors_person_id',
        transaction: t
      });

      await queryInterface.addConstraint('instructors', {
        fields: ['occupation_id'],
        type: 'foreign key',
        name: 'fk_instructors_occupation_id',
        references: { table: 'occupations', field: 'occupation_id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
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
      await queryInterface.removeConstraint('instructors', 'fk_instructors_occupation_id', { transaction: t });
      await queryInterface.removeConstraint('instructors', 'uq_instructors_person_id', { transaction: t });
      await queryInterface.removeConstraint('instructors', 'fk_instructors_person_id', { transaction: t });

      if (await hasColumn(queryInterface, 'instructors', 'qualification')) {
        await queryInterface.removeColumn('instructors', 'qualification', { transaction: t });
      }
      if (await hasColumn(queryInterface, 'instructors', 'hire_date')) {
        await queryInterface.removeColumn('instructors', 'hire_date', { transaction: t });
      }
      if (await hasColumn(queryInterface, 'instructors', 'occupation_id')) {
        await queryInterface.removeColumn('instructors', 'occupation_id', { transaction: t });
      }
      if (await hasColumn(queryInterface, 'instructors', 'person_id')) {
        await queryInterface.removeColumn('instructors', 'person_id', { transaction: t });
      }
      await t.commit();
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }
};
