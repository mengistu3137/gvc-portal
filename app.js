import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import sequelize from './src/config/database.js';
import { errorHandler } from './src/middlewares/errorHandler.js';

// Ensure all models are loaded before any sync/auth call
import './src/modules/persons/person.model.js';
import './src/modules/auth/auth.model.js';
import './src/modules/academics/academic.model.js';
import './src/modules/staff/staff.model.js';
import './src/modules/instructors/instructor.model.js';
import './src/modules/students/student.model.js';
import './src/modules/finance/finance.model.js';
import './src/modules/grading/grading.model.js';
import './src/modules/enrollment/enrollment.model.js';

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
    // First, just authenticate to check connection
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');
    
    // Check if we should sync the database (only in development and when explicitly set)
    const shouldSync = process.env.NODE_ENV === 'development' && process.env.DB_SYNC === 'true';
    const shouldForceSync = process.env.NODE_ENV === 'development' && process.env.DB_FORCE_SYNC === 'true';
    
    if (shouldForceSync) {
      // WARNING: This will drop all tables and recreate them
      console.log('⚠️ WARNING: Force syncing database - this will drop all tables!');
      await sequelize.sync({ force: true });
      console.log('✅ Database force synced successfully (all tables recreated).');
    } else if (shouldSync) {
      // Normal sync without alter - this won't try to modify existing tables
      await sequelize.sync();
      console.log('✅ Database synchronized successfully (no schema changes).');
    } else {
      console.log('ℹ️ Database schema sync skipped. Using existing tables.');
      console.log('   To sync, set DB_SYNC=true in .env file');
      console.log('   To force recreate tables, set DB_FORCE_SYNC=true in .env file');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
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