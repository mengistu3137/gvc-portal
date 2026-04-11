import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import sequelize from './src/config/database.js';
import { ensurePermissions } from './src/config/ensurePermissions.js';
import { errorHandler } from './src/middlewares/errorHandler.js';

// Ensure all models are loaded before any sync/auth call
import './src/modules/auth/auth.model.js';
import './src/modules/academics/academic.model.js';
import './src/modules/staff/staff.model.js';
import './src/modules/students/student.model.js';
import './src/modules/finance/finance.model.js';
import './src/modules/grading/grading.model.js';
import './src/modules/enrollment/enrollment.model.js';
import './src/modules/users/users.model.js';

// Import the Central Router
import apiRouter from './src/modules/index.routes.js';

dotenv.config();

const app = express();

const defaultAllowedOrigins = ['http://localhost:5173','http://localhost:5174', 'http://127.0.0.1:5173'];
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean)
  : defaultAllowedOrigins;

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// Middlewares
app.use(cors(corsOptions));
app.use(express.json());
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

// Lightweight health check for uptime monitors
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// Main Route - This handles EVERYTHING under /api
app.use('/api', apiRouter);

// Global Error Handler
app.use(errorHandler);

// Database Sync & Server Start
const PORT = process.env.PORT || 3000;

const syncDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection established.');
    
    const isDev = process.env.NODE_ENV === 'development';
    const shouldForce = isDev && process.env.DB_FORCE_SYNC === 'true';
    const shouldAlter = isDev && process.env.DB_SYNC_ALTER === 'true';

    if (shouldForce || shouldAlter) {
      // 1. Disable foreign key checks
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
      console.log('Temporarily disabled Foreign Key checks...');

      if (shouldForce) {
        // This drops all tables and recreates them
        await sequelize.sync({ force: true });
        console.log('⚠️ Tables recreated (Data lost).');
      } else if (shouldAlter) {
        // This tries to match the model to the table without dropping
        await sequelize.sync({ alter: true });
        console.log('✅ Database schema updated (Data preserved).');
      }

      // 2. Re-enable foreign key checks
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
      console.log('Re-enabled Foreign Key checks.');
    } else {
      // Default sync (creates tables if they don't exist, does nothing if they do)
      await sequelize.sync();
      console.log('ℹ️ Standard sync completed.');
    }

    await ensurePermissions();
    console.log('✅ Permission catalog verified');
  } catch (error) {
    // Make sure to re-enable checks even if it fails
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
    console.error('❌ Sync failed:', error);
  }
};

// Start server
syncDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📡 API available at: http://localhost:${PORT}/api`);
      console.log(`🔍 Health check at: http://localhost:${PORT}/health`);
    });
  })
  .catch((err) => {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  });

export default app;