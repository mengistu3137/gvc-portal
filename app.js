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

const defaultAllowedOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'];
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

// Main Route - This handles EVERYTHING under /api
app.use('/api', apiRouter);

// Global Error Handler
app.use(errorHandler);

// Database Sync & Server Start
const PORT = process.env.PORT || 3000;

const syncDatabase = async () => {
  const shouldAlterSchema = process.env.NODE_ENV === 'development' && process.env.DB_SYNC_ALTER === 'true';

  if (shouldAlterSchema) {
    await sequelize.sync({ alter: true });
    console.log('Database synchronized successfully (development mode, alter=true).');
    return;
  }

  await sequelize.authenticate();
  console.log('Database connection established (no schema alteration outside development).');
};

syncDatabase()
  .then(() => {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('DB initialization error:', err);
  });

export default app;