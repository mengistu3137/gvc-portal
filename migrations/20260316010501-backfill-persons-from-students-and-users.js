const splitNameFromEmail = (email) => {
  const local = (email || 'user').split('@')[0];
  const chunks = local.split(/[._-]+/).filter(Boolean);
  if (chunks.length === 0) return { first: 'Unknown', last: 'User' };
  if (chunks.length === 1) return { first: chunks[0], last: 'User' };
  return {
    first: chunks[0].charAt(0).toUpperCase() + chunks[0].slice(1),
    last: chunks.slice(1).join(' ').replace(/\b\w/g, (c) => c.toUpperCase())
  };
};

export default {
  async up(queryInterface, Sequelize) {
    const t = await queryInterface.sequelize.transaction();
    try {
      const students = await queryInterface.sequelize.query(
        `SELECT student_pk, first_name, middle_name, last_name, gender, date_of_birth, deleted_at
         FROM students
         WHERE person_id IS NULL`,
        { type: Sequelize.QueryTypes.SELECT, transaction: t }
      );

      for (const row of students) {
        const [result] = await queryInterface.sequelize.query(
          `INSERT INTO persons
           (first_name, middle_name, last_name, gender, date_of_birth, created_at, updated_at, deleted_at)
           VALUES (?, ?, ?, ?, ?, NOW(), NOW(), ?)` ,
          {
            replacements: [
              row.first_name,
              row.middle_name || null,
              row.last_name,
              row.gender || null,
              row.date_of_birth || null,
              row.deleted_at || null
            ],
            transaction: t
          }
        );

        const personId = result.insertId;

        await queryInterface.sequelize.query(
          `UPDATE students SET person_id = ? WHERE student_pk = ?`,
          { replacements: [personId, row.student_pk], transaction: t }
        );
      }

      const users = await queryInterface.sequelize.query(
        `SELECT user_id, email
         FROM user_accounts
         WHERE person_id IS NULL`,
        { type: Sequelize.QueryTypes.SELECT, transaction: t }
      );

      for (const user of users) {
        const parts = splitNameFromEmail(user.email);
        const [result] = await queryInterface.sequelize.query(
          `INSERT INTO persons
           (first_name, last_name, email, created_at, updated_at)
           VALUES (?, ?, ?, NOW(), NOW())`,
          {
            replacements: [parts.first, parts.last, user.email],
            transaction: t
          }
        );

        await queryInterface.sequelize.query(
          `UPDATE user_accounts SET person_id = ? WHERE user_id = ?`,
          { replacements: [result.insertId, user.user_id], transaction: t }
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
