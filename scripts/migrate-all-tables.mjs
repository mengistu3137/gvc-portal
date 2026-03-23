import dotenv from 'dotenv';
import sequelize from '../src/config/database.js';

// Register all models and associations before sync.
import '../src/modules/persons/person.model.js';
import '../src/modules/staff/staff.model.js';
import '../src/modules/academics/academic.model.js';
import '../src/modules/auth/auth.model.js';
import '../src/modules/students/student.model.js';
import '../src/modules/instructors/instructor.model.js';
import '../src/modules/grading/grading.model.js';
import '../src/modules/enrollment/enrollment.model.js';

dotenv.config();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForDatabase(maxAttempts = 30, delayMs = 2000) {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await sequelize.authenticate();
      console.log('Database connection established.');
      return;
    } catch (error) {
      console.log(`Waiting for database (${attempt}/${maxAttempts})...`);
      if (attempt === maxAttempts) {
        throw error;
      }
      await sleep(delayMs);
    }
  }
}

async function migrateAllTables() {
  try {
    await waitForDatabase();
    const forceSync = process.env.SYNC_FORCE === 'true';
    const alterSync = process.env.SYNC_ALTER === 'true';
    await sequelize.sync({ alter: alterSync, force: forceSync });
    console.log('All tables migrated successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Table migration failed:', error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

migrateAllTables();
