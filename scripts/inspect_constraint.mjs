import dotenv from 'dotenv';
import { Sequelize } from 'sequelize';

dotenv.config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: 'mysql',
    logging: false,
  }
);

async function run() {
  try {
    await sequelize.authenticate();
    const [rows] = await sequelize.query("SHOW CREATE TABLE modules");
    console.log(JSON.stringify(rows, null, 2));
  } catch (err) {
    console.error('ERROR', err.message || err);
    process.exitCode = 2;
  } finally {
    await sequelize.close();
  }
}

run();
