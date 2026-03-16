const hasColumn = async (queryInterface, tableName, columnName) => {
  const table = await queryInterface.describeTable(tableName);
  return Boolean(table[columnName]);
};

export default {
  async up(queryInterface, Sequelize) {
    const t = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.changeColumn('user_accounts', 'person_id', {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false
      }, { transaction: t });

      await queryInterface.changeColumn('students', 'person_id', {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false
      }, { transaction: t });

      await queryInterface.changeColumn('instructors', 'person_id', {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false
      }, { transaction: t });

      if (await hasColumn(queryInterface, 'students', 'first_name')) {
        await queryInterface.removeColumn('students', 'first_name', { transaction: t });
      }
      if (await hasColumn(queryInterface, 'students', 'middle_name')) {
        await queryInterface.removeColumn('students', 'middle_name', { transaction: t });
      }
      if (await hasColumn(queryInterface, 'students', 'last_name')) {
        await queryInterface.removeColumn('students', 'last_name', { transaction: t });
      }
      if (await hasColumn(queryInterface, 'students', 'gender')) {
        await queryInterface.removeColumn('students', 'gender', { transaction: t });
      }
      if (await hasColumn(queryInterface, 'students', 'date_of_birth')) {
        await queryInterface.removeColumn('students', 'date_of_birth', { transaction: t });
      }

      if (await hasColumn(queryInterface, 'instructors', 'full_name')) {
        await queryInterface.removeColumn('instructors', 'full_name', { transaction: t });
      }

      await t.commit();
    } catch (error) {
      await t.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const t = await queryInterface.sequelize.transaction();
    try {
      if (!(await hasColumn(queryInterface, 'students', 'first_name'))) {
        await queryInterface.addColumn('students', 'first_name', {
          type: Sequelize.STRING(80),
          allowNull: false,
          defaultValue: 'Unknown'
        }, { transaction: t });
      }

      if (!(await hasColumn(queryInterface, 'students', 'middle_name'))) {
        await queryInterface.addColumn('students', 'middle_name', {
          type: Sequelize.STRING(80),
          allowNull: true
        }, { transaction: t });
      }

      if (!(await hasColumn(queryInterface, 'students', 'last_name'))) {
        await queryInterface.addColumn('students', 'last_name', {
          type: Sequelize.STRING(80),
          allowNull: false,
          defaultValue: 'Unknown'
        }, { transaction: t });
      }

      if (!(await hasColumn(queryInterface, 'students', 'gender'))) {
        await queryInterface.addColumn('students', 'gender', {
          type: Sequelize.ENUM('M', 'F'),
          allowNull: false,
          defaultValue: 'M'
        }, { transaction: t });
      }

      if (!(await hasColumn(queryInterface, 'students', 'date_of_birth'))) {
        await queryInterface.addColumn('students', 'date_of_birth', {
          type: Sequelize.DATEONLY,
          allowNull: true
        }, { transaction: t });
      }

      if (!(await hasColumn(queryInterface, 'instructors', 'full_name'))) {
        await queryInterface.addColumn('instructors', 'full_name', {
          type: Sequelize.STRING(180),
          allowNull: false,
          defaultValue: 'Unknown Instructor'
        }, { transaction: t });
      }

      await queryInterface.changeColumn('user_accounts', 'person_id', {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: true
      }, { transaction: t });

      await queryInterface.changeColumn('students', 'person_id', {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: true
      }, { transaction: t });

      await queryInterface.changeColumn('instructors', 'person_id', {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: true
      }, { transaction: t });

      await t.commit();
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }
};
