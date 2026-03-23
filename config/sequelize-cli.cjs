'use strict';
/**
 * Sequelize CLI database configuration.
 *
 * This file is intentionally CommonJS (.cjs) so that sequelize-cli can
 * load it with require() even when the project root uses ES modules
 * ("type": "module" in package.json).
 *
 * Connection details are read from environment variables (populated by
 * the .env file at the project root).  dotenv is loaded here so that
 * the CLI works correctly without any pre-loading wrapper.
 */

require('dotenv').config();

const shared = {
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || null,
  database: process.env.DB_NAME || 'gvc_portal',
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  dialect: 'mysql',
  dialectOptions: {
    connectTimeout: 60000
  },
  define: {
    timestamps: true,
    underscored: true,
    engine: 'InnoDB'
  }
};

module.exports = {
  development: { ...shared },
  test: { ...shared, database: process.env.DB_NAME_TEST || 'gvc_portal_test' },
  production: { ...shared }
};
