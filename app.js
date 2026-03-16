import express from 'express';
import dotenv from 'dotenv';
import sequelize from './src/config/database.js';
import { errorHandler } from './src/middlewares/errorHandler.js';
import './src/modules/persons/person.model.js';
import './src/modules/staff/staff.model.js';

// Import the Central Router
import apiRouter from './src/modules/index.routes.js';

dotenv.config();

const app = express();

// Middlewares
app.use(express.json());

// Main Route - This handles EVERYTHING under /api
app.use('/api', apiRouter);

// Global Error Handler
app.use(errorHandler);

// Database Sync & Server Start
const PORT = process.env.PORT || 3000;

sequelize.sync().then(() => {
  console.log(' Grand Valley College DB Connected');
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}).catch(err => {
  console.error('DB Connection Error:', err);
});

export default app;