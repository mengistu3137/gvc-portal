const splitFullName = (fullName) => {
  const parts = (fullName || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first_name: 'Unknown', middle_name: null, last_name: 'Instructor' };
  if (parts.length === 1) return { first_name: parts[0], middle_name: null, last_name: 'Instructor' };
  if (parts.length === 2) return { first_name: parts[0], middle_name: null, last_name: parts[1] };

  return {
    first_name: parts[0],
    middle_name: parts.slice(1, -1).join(' '),
    last_name: parts[parts.length - 1]
  };
};

export default {
  async up(queryInterface, Sequelize) {
    const t = await queryInterface.sequelize.transaction();
    try {
      const instructors = await queryInterface.sequelize.query(
        `SELECT instructor_id, full_name, deleted_at
         FROM instructors
         WHERE person_id IS NULL`,
        { type: Sequelize.QueryTypes.SELECT, transaction: t }
      );

      for (const row of instructors) {
        const split = splitFullName(row.full_name);

        const [result] = await queryInterface.sequelize.query(
          `INSERT INTO persons
           (first_name, middle_name, last_name, created_at, updated_at, deleted_at)
           VALUES (?, ?, ?, NOW(), NOW(), ?)`,
          {
            replacements: [
              split.first_name,
              split.middle_name,
              split.last_name,
              row.deleted_at || null
            ],
            transaction: t
          }
        );

        await queryInterface.sequelize.query(
          `UPDATE instructors SET person_id = ? WHERE instructor_id = ?`,
          { replacements: [result.insertId, row.instructor_id], transaction: t }
        );
      }

      await t.commit();
    } catch (error) {
      await t.rollback();
      throw error;
    }
  },

  async down() {
    // Data backfill is intentionally irreversible.
  }
};
