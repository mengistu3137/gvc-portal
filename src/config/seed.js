import argon2 from 'argon2';
import { DataTypes } from 'sequelize';
import sequelize from './database.js';
import { UserAccount, Role, Permission } from '../modules/auth/auth.model.js';
import { Person } from '../modules/persons/person.model.js';
import {
  Sector,
  Occupation,
  Level,
  Module,
  LevelModule,
  Batch,
  AcademicYear
} from '../modules/academics/academic.model.js';
import { Student, StudentIdSequence } from '../modules/students/student.model.js';
import { Instructor } from '../modules/instructors/instructor.model.js';
import { StaffIdSequence } from '../modules/staff/staff.model.js';

const romanToNumeric = { I: 1, II: 2, III: 3, IV: 4, V: 5 };

// Simple pivot for instructor-module assignments (created here for seeding/testing)
const InstructorModule = sequelize.define('instructor_module', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  instructor_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  m_code: { type: DataTypes.STRING(60), allowNull: false }
}, { tableName: 'instructor_modules', timestamps: false });

const generateModuleCode = (occupationCode, levelName, index) => `${occupationCode}-${levelName}-${String(index).padStart(2, '0')}`;

const toNumber = (value) => {
  if (value === undefined || value === null) return 0;
  const numeric = Number(String(value).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(numeric) ? numeric : 0;
};

const normalizeHours = (entry) => {
  const theory = toNumber(entry.theory);
  const practical = toNumber(entry.practical);
  const cooperative = toNumber(entry.cooperative ?? entry.competitive ?? 0);
  let computedTotal = theory + practical + cooperative;
  const providedTotal = toNumber(entry.total_hours);
  if (computedTotal === 0 && providedTotal) {
    computedTotal = providedTotal;
  }
  const learning_hours = computedTotal;

  if (providedTotal && providedTotal !== computedTotal) {
    console.warn(`ℹ️ Adjusted total for ${entry.m_code || entry.unit_competency}: provided=${providedTotal}, computed=${computedTotal}`);
  }

  return { theory, practical, cooperative, learning_hours };
};

const curriculumData = [
  {
    sector_code: 'HLT',
    sector_name: 'Health Sector',
    occupations: [
      {
        occupation_code: 'NUR',
        occupation_name: 'Nursing',
        levels: [
          {
            level: 'III',
            modules: [
              { m_code: 'HLT NUR3 01 1221', unit_competency: 'Provide Motivated, Competent, And Compassionate Caring Service', theory: 40, practical: 0, cooperative: 0, total_hours: 40 },
              { m_code: 'HLT NUR3 02 1221', unit_competency: 'Apply Infection Prevention Techniques And Workplace OHS', theory: 32, practical: 24, cooperative: 40, total_hours: 96 },
              { m_code: 'HLT NUR3 03 1221', unit_competency: 'Provide Basic First Aid And Emergency Response', theory: 64, practical: 60, cooperative: 60, total_hours: 184 },
              { m_code: 'HLT NUR3 04 1221', unit_competency: 'Prepare And Maintain Beds', theory: 24, practical: 36, cooperative: 39, total_hours: 99 },
              { m_code: 'HLT NUR3 05 1221', unit_competency: 'Provide Basic Nursing Care', theory: 64, practical: 72, cooperative: 156, total_hours: 292 },
              { m_code: 'HLT NUR3 06 1221', unit_competency: 'Provide Wound Care', theory: 22, practical: 22, cooperative: 39, total_hours: 83 },
              { m_code: 'HLT NUR3 07 1221', unit_competency: 'Administer And Monitor Range of Medication', theory: 96, practical: 42, cooperative: 156, total_hours: 294 },
              { m_code: 'HLT NUR3 08 1221', unit_competency: 'Provide Palliative Care And Maintain Mortuary Service', theory: 20, practical: 16, cooperative: 39, total_hours: 75 },
              { m_code: 'HLT NUR3 09 1221', unit_competency: 'Provide Comprehensive Family Planning Service', theory: 32, practical: 34, cooperative: 39, total_hours: 105 },
              { m_code: 'HLT NUR3 10 1121', unit_competency: 'Provide Youth, Adolescent And Reproductive Health Service', theory: 32, practical: 39, cooperative: 0, total_hours: 71 },
              { m_code: 'HLT NUR3 11 1121', unit_competency: 'Provide Community Mobilization And Health Education', theory: 56, practical: 0, cooperative: 40, total_hours: 96 },
              { m_code: 'HLT NUR3 12 1121', unit_competency: 'Apply Computer And Mobile Technology', theory: 44, practical: 56, cooperative: 0, total_hours: 100 },
              { m_code: 'HLT NUR3 13 1221', unit_competency: 'Apply Basic Health Statistics And Survey', theory: 40, practical: 40, cooperative: 0, total_hours: 80 },
              { m_code: 'HLT NUR3 14 1221', unit_competency: 'Apply 5S Procedure', theory: 16, practical: 88, cooperative: 0, total_hours: 32 }
            ]
          },
          {
            level: 'IV',
            modules: [
              { m_code: 'HLT NUR4 01 1221', unit_competency: 'Provide advanced nursing care', theory: 64, practical: 60, cooperative: 156, total_hours: 280 },
              { m_code: 'HLT NUR4 02 1221', unit_competency: 'Perform Nursing Assessment', theory: 62, practical: 36, cooperative: 78, total_hours: 176 },
              { m_code: 'HLT NUR4 03 1221', unit_competency: 'Prevent and Manage Common Communicable and Neglected Tropical Diseases', theory: 64, practical: 40, cooperative: 39, total_hours: 103 },
              { m_code: 'HLT NUR4 04 1221', unit_competency: 'Provide Nursing Care for Medical and Surgical Health problems', theory: 184, practical: 16, cooperative: 156, total_hours: 356 },
              { m_code: 'HLT NUR4 05 1221', unit_competency: 'Prevent and Manage Common Non-communicable diseases', theory: 48, practical: 0, cooperative: 78, total_hours: 126 },
              { m_code: 'HLT NUR4 06 1221', unit_competency: 'Provide Care in the Pre/Post and Intra Operative Nursing', theory: 32, practical: 36, cooperative: 39, total_hours: 107 },
              { m_code: 'HLT NUR4 07 1221', unit_competency: 'Provide Maternal Health Care', theory: 64, practical: 70, cooperative: 78, total_hours: 212 },
              { m_code: 'HLT NUR4 08 1221', unit_competency: 'Provide Child Health Care', theory: 80, practical: 56, cooperative: 78, total_hours: 214 },
              { m_code: 'HLT NUR4 09 1221', unit_competency: 'Manage Nutritional Problems and Provide Dietary Service', theory: 32, practical: 16, cooperative: 78, total_hours: 126 },
              { m_code: 'HLT NUR4 10 1221', unit_competency: 'Provide mental health care', theory: 48, practical: 0, cooperative: 39, total_hours: 87 },
              { m_code: 'HLT NUR4 11 1221', unit_competency: 'Provide community health nursing', theory: 32, practical: 0, cooperative: 39, total_hours: 71 },
              { m_code: 'HLT NUR4 12 1221', unit_competency: 'Manage Community Health Service', theory: 50, practical: 20, cooperative: 30, total_hours: 100 },
              { m_code: 'HLT NUR4 13 1221', unit_competency: 'Prevent and Eliminate MUDA', theory: 32, practical: 0, cooperative: 0, total_hours: 32 },
              { m_code: 'HLT NUR4 14 1221', unit_competency: 'Morality and Professional Ethics', theory: 20, practical: 0, cooperative: 0, total_hours: 20 },
              { m_code: 'HLT NUR4 15 1221', unit_competency: '21st Century Skills', theory: 20, practical: 0, cooperative: 0, total_hours: 20 },
              { m_code: 'HLT NUR4 16 1221', unit_competency: 'Entrepreneurship', theory: 20, practical: 0, cooperative: 0, total_hours: 20 },
              { m_code: 'HLT NUR4 17 1221', unit_competency: 'Basic English for work place Communication Skill', theory: 20, practical: 0, cooperative: 0, total_hours: 20 }
            ]
          }
        ]
      },
      {
        occupation_code: 'PHS',
        occupation_name: 'Pharmacy',
        levels: [
          {
            level: 'III',
            modules: [
              { m_code: 'HLT PHS3 01 1121', unit_competency: 'Provide Motivated Competent and Compassionate service', theory: 40, practical: 0, cooperative: 0, total_hours: 40 },
              { m_code: 'HLT PHS3 02 1121', unit_competency: 'Provide First Aid and Emergency Response', theory: 120, practical: 60, cooperative: 0, total_hours: 180 },
              { m_code: 'HLT PHS3 03 1121', unit_competency: 'Apply Infection Prevention Techniques and Workplace OHS', theory: 32, practical: 24, cooperative: 40, total_hours: 96 },
              { m_code: 'HLT PHS3 04 1121', unit_competency: 'Use Pharmaceutical Calculation Techniques and Terminologies', theory: 90, practical: 40, cooperative: 70, total_hours: 200 },
              { m_code: 'HLT PHS3 05 1121', unit_competency: 'Detect and manage Pharmaceutical Health Hazards and Act', theory: 50, practical: 10, cooperative: 40, total_hours: 100 },
              { m_code: 'HLT PHS3 06 1121', unit_competency: 'Assist Extemporaneous Preparations', theory: 90, practical: 110, cooperative: 80, total_hours: 280 },
              { m_code: 'HLT PHS3 07 1121', unit_competency: 'Provide Information on Nutritional Supplement', theory: 80, practical: 30, cooperative: 50, total_hours: 160 },
              { m_code: 'HLT PHS3 08 1121', unit_competency: 'Apply Computer and Mobile Health Technology', theory: 44, practical: 56, cooperative: 0, total_hours: 100 },
              { m_code: 'HLT PHS3 09 1121', unit_competency: 'Perform Community Mobilization and Provide Health Education', theory: 56, practical: 0, cooperative: 40, total_hours: 96 },
              { m_code: 'HLT PHS3 10 1121', unit_competency: 'Apply Basic Health Statistics and survey', theory: 40, practical: 40, cooperative: 0, total_hours: 80 },
              { m_code: 'HLT PHS3 11 1121', unit_competency: 'Apply 5S Procedures', theory: 16, practical: 88, cooperative: 32, total_hours: 0 }
            ]
          },
          {
            level: 'IV',
            modules: [
              { m_code: 'HLT PHS4 01 1121', unit_competency: 'Dispense Pharmaceutical', theory: 396, practical: 80, cooperative: 234, total_hours: 710 },
              { m_code: 'HLT PHS4 02 1121', unit_competency: 'Apply Pharmaceuticals Supply Chain Management', theory: 121, practical: 220, cooperative: 78, total_hours: 320 },
              { m_code: 'HLT PHS4 03 1121', unit_competency: 'Apply Good Dispensing Principles', theory: 203, practical: 60, cooperative: 117, total_hours: 380 },
              { m_code: 'HLT PHS4 04 1121', unit_competency: 'Conduct Small-Scale Compounding of Pharmaceutical Products', theory: 101, practical: 80, cooperative: 39, total_hours: 220 },
              { m_code: 'HLT PHS4 05 1121', unit_competency: 'Enhance the Use of Traditional Medicines', theory: 161, practical: 40, cooperative: 39, total_hours: 240 },
              { m_code: 'HLT PHS4 06 1121', unit_competency: 'Provide Counseling Service on Beauty Care', theory: 60, practical: 20, cooperative: 0, total_hours: 80 },
              { m_code: 'HLT PHS4 07 1121', unit_competency: 'Practice Auditable Pharmaceutical Transactions and Services', theory: 191, practical: 120, cooperative: 39, total_hours: 350 },
              { m_code: 'HLT PHS4 08 1121', unit_competency: 'Manage Pharmaceutical Services', theory: 80, practical: 40, cooperative: 0, total_hours: 120 },
              { m_code: 'HLT PHS4 09 1121', unit_competency: 'Manage Community Health Service', theory: 32, practical: 0, cooperative: 40, total_hours: 72 },
              { m_code: 'HLT PHS4 10 1121', unit_competency: 'Prevent and Eliminate MUDA', theory: 24, practical: 16, cooperative: 16, total_hours: 56 },
              { m_code: 'HLT PHS4 11 1121', unit_competency: 'Morality and Professional Ethics', theory: 20, practical: 0, cooperative: 0, total_hours: 20 },
              { m_code: 'HLT PHS4 12 1121', unit_competency: '21st Century Skills', theory: 20, practical: 0, cooperative: 0, total_hours: 20 },
              { m_code: 'HLT PHS4 13 1121', unit_competency: 'Entrepreneurship', theory: 20, practical: 0, cooperative: 0, total_hours: 20 },
              { m_code: 'HLT PHS4 14 1121', unit_competency: 'Basic English for work place Communication Skill', theory: 20, practical: 0, cooperative: 0, total_hours: 20 }
            ]
          }
        ]
      },
      {
        occupation_code: 'MLT',
        occupation_name: 'Medical Laboratory',
        levels: [
          {
            level: 'III',
            modules: [
              { m_code: 'HLT MLT3 01 1121', unit_competency: 'Provide Motivated Competent and Compassionate service', theory: 40, practical: 0, cooperative: 0, total_hours: 40 },
              { m_code: 'HLT MLT3 02 1121', unit_competency: 'Apply Infection Prevention Techniques and Workplace OHS', theory: 32, practical: 24, cooperative: 40, total_hours: 96 },
              { m_code: 'HLT MLT3 03 1121', unit_competency: 'Provide First Aid and Emergency Response', theory: 60, practical: 120, cooperative: 0, total_hours: 180 },
              { m_code: 'HLT MLT3 05 1121', unit_competency: 'Perform equipment handling and maintenance', theory: 60, practical: 60, cooperative: 60, total_hours: 180 },
              { m_code: 'HLT MLT3 06 1121', unit_competency: 'Prepare Laboratory Solutions', theory: 60, practical: 60, cooperative: 60, total_hours: 180 },
              { m_code: 'HLT MLT3 04 1121', unit_competency: 'Collect and Process Medical Samples', theory: 100, practical: 120, cooperative: 80, total_hours: 300 },
              { m_code: 'HLT MLT3 09 1121', unit_competency: 'Apply Computer and Mobile Health Technology', theory: 44, practical: 56, cooperative: 0, total_hours: 100 },
              { m_code: 'HLT MLT3 07 1121', unit_competency: 'Perform Parasitological Examination', theory: 120, practical: 70, cooperative: 60, total_hours: 250 },
              { m_code: 'HLT MLT3 08 1121', unit_competency: 'Perform Urine and Body Fluid analysis', theory: 120, practical: 70, cooperative: 50, total_hours: 240 },
              { m_code: 'HLT MLT3 10 1121', unit_competency: 'Apply basic health statistics and health survey', theory: 40, practical: 40, cooperative: 0, total_hours: 80 },
              { m_code: 'HLT MLT3 11 1121', unit_competency: 'Perform Community Mobilization and Provide Health Education', theory: 56, practical: 0, cooperative: 40, total_hours: 96 },
              { m_code: 'HLT MLT3 12 1121', unit_competency: 'Apply 5S Procedures', theory: 16, practical: 88, cooperative: 32, total_hours: 0 }
            ]
          },
          {
            level: 'IV',
            modules: [
              { m_code: 'HLT MLT4 01 1121', unit_competency: 'Use Info-technology Devices in the Workplace', theory: 40, practical: 30, cooperative: 0, total_hours: 70 },
              { m_code: 'HLT MLT4 02 1121', unit_competency: 'Perform Microbiological', theory: 200, practical: 70, cooperative: 80, total_hours: 350 },
              { m_code: 'HLT MLT4 03 1121', unit_competency: 'Perform Hematological Tests', theory: 120, practical: 70, cooperative: 60, total_hours: 250 },
              { m_code: 'HLT MLT4 04 1121', unit_competency: 'Perform Serological Tests', theory: 100, practical: 50, cooperative: 50, total_hours: 200 },
              { m_code: 'HLT MLT4 05 1121', unit_competency: 'Perform Clinical Chemistry Tests', theory: 120, practical: 70, cooperative: 60, total_hours: 250 },
              { m_code: 'HLT MLT4 06 1121', unit_competency: 'Perform Immuno-Haematological Tests', theory: 90, practical: 40, cooperative: 50, total_hours: 180 },
              { m_code: 'HLT MLT4 07 1121', unit_competency: 'Prepare Histopathological Samples for Examination', theory: 80, practical: 40, cooperative: 20, total_hours: 140 },
              { m_code: 'HLT MLT4 08 1121', unit_competency: 'Implement Laboratory Quality Assurance', theory: 50, practical: 20, cooperative: 20, total_hours: 90 },
              { m_code: 'HLT MLT4 09 1121', unit_competency: 'Manage Community Health Service', theory: 32, practical: 0, cooperative: 40, total_hours: 72 },
              { m_code: 'HLT MLT4 10 1121', unit_competency: 'Prevent and Eliminate MUDA', theory: 24, practical: 16, cooperative: 16, total_hours: 56 },
              { m_code: 'HLT MLT4 11 1121', unit_competency: 'Morality and Professional Ethics', theory: 20, practical: 0, cooperative: 0, total_hours: 20 },
              { m_code: 'HLT MLT4 12 1121', unit_competency: '21st Century Skills', theory: 20, practical: 0, cooperative: 0, total_hours: 20 },
              { m_code: 'HLT MLT4 13 1121', unit_competency: 'Entrepreneurship', theory: 20, practical: 0, cooperative: 0, total_hours: 20 },
              { m_code: 'HLT MLT4 14 1121', unit_competency: 'Basic English for work place Communication Skill', theory: 20, practical: 0, cooperative: 0, total_hours: 20 }
            ]
          }
        ]
      }
    ]
  },
  {
    sector_code: 'AGR',
    sector_name: 'Agriculture Sector',
    occupations: [
      {
        occupation_code: 'ANH',
        occupation_name: 'Animal Health',
        levels: [
          {
            level: 'I',
            modules: [
              { m_code: 'AGR ANH1 01 0322', unit_competency: 'Identify and Handle Basic Veterinary Tools and Equipment', theory: 0, practical: 0, cooperative: 0, total_hours: 2 },
              { m_code: 'AGR ANH1 02 0322', unit_competency: 'Carry out Cleaning for Animal Care Work and Waste Management Activities', theory: 0, practical: 0, cooperative: 0, total_hours: 2 },
              { m_code: 'AGR ANH1 03 0322', unit_competency: 'Handle and Restrain Animals', theory: 0, practical: 0, cooperative: 0, total_hours: 2 },
              { m_code: 'AGR ANH1 04 0322', unit_competency: 'Identify Sick Animals', theory: 0, practical: 0, cooperative: 0, total_hours: 2 },
              { m_code: 'AGR ANH1 05 0322', unit_competency: 'Provide Basic Health Care for Animals', theory: 0, practical: 0, cooperative: 0, total_hours: 2 },
              { m_code: 'AGR ANH1 06 0322', unit_competency: 'Apply Agricultural Extension Service', theory: 0, practical: 0, cooperative: 0, total_hours: 2 },
              { m_code: 'AGR ANH1 07 0322', unit_competency: 'Implement Agribusiness Marketing', theory: 0, practical: 0, cooperative: 0, total_hours: 2 },
              { m_code: 'AGR ANH1 08 0322', unit_competency: 'Apply Basics of Human Nutrition Practices', theory: 0, practical: 0, cooperative: 0, total_hours: 2 },
              { m_code: 'AGR ANH1 09 0322', unit_competency: 'Apply 5S Procedures', theory: 0, practical: 0, cooperative: 0, total_hours: 2 }
            ]
          },
          {
            level: 'II',
            modules: [
              { m_code: 'AGR ANH2 01 0322', unit_competency: 'Identify basic Anatomy and Physiology of Animals', theory: 0, practical: 0, cooperative: 0, total_hours: 2 },
              { m_code: 'AGR ANH2 02 0322', unit_competency: 'Identify Pathological Lesions', theory: 0, practical: 0, cooperative: 0, total_hours: 2 },
              { m_code: 'AGR ANH2 03 0322', unit_competency: 'Carryout General Clinical Examination of Animals', theory: 0, practical: 0, cooperative: 0, total_hours: 2 },
              { m_code: 'AGR ANH2 04 0322', unit_competency: 'Apply Animal Feeding and Nutrition', theory: 0, practical: 0, cooperative: 0, total_hours: 2 },
              { m_code: 'AGR ANH2 05 0322', unit_competency: 'Identify Basic Veterinary Drugs and Chemicals', theory: 0, practical: 0, cooperative: 0, total_hours: 2 },
              { m_code: 'AGR ANH2 06 0322', unit_competency: 'Perform Reproductive Health Care and Artificial Insemination Activities', theory: 0, practical: 0, cooperative: 0, total_hours: 2 },
              { m_code: 'AGR ANH2 07 0322', unit_competency: 'Apply Knowledge of Animal Welfare and Behaviours', theory: 0, practical: 0, cooperative: 0, total_hours: 2 },
              { m_code: 'AGR ANH2 08 0322', unit_competency: 'Apply Agricultural Extension service for Rural development', theory: 0, practical: 0, cooperative: 0, total_hours: 2 },
              { m_code: 'AGR ANH2 09 0322', unit_competency: 'Prevent and Eliminate MUDA', theory: 0, practical: 0, cooperative: 0, total_hours: 2 }
            ]
          },
          {
            level: 'III',
            modules: [
              { m_code: 'AGR ANH3 01 0322', unit_competency: 'Identify and Handle Non-Infectious Animal Diseases', theory: 0, practical: 0, cooperative: 0, total_hours: 2 },
              { m_code: 'AGR ANH3 02 0322', unit_competency: 'Identify and Handle Parasitic Diseases of Animals', theory: 0, practical: 0, cooperative: 0, total_hours: 2 },
              { m_code: 'AGR ANH3 03 0322', unit_competency: 'Identify and Handle Infectious Diseases of Animal', theory: 0, practical: 0, cooperative: 0, total_hours: 2 },
              { m_code: 'AGR ANH3 04 0322', unit_competency: 'Provide Routine Veterinary Clinical Service', theory: 0, practical: 0, cooperative: 0, total_hours: 2 },
              { m_code: 'AGR ANH3 05 0322', unit_competency: 'Perform Pre-Surgical Operative Procedures and Wound Management Activities', theory: 0, practical: 0, cooperative: 0, total_hours: 2 },
              { m_code: 'AGR ANH3 06 0322', unit_competency: 'Identify and Handle Pest, Predator and Diseases of Honey Bee Colony', theory: 0, practical: 0, cooperative: 0, total_hours: 2 },
              { m_code: 'AGR ANH3 07 0322', unit_competency: 'Identify and Handle Pest, Predator and Diseases of Fish', theory: 0, practical: 0, cooperative: 0, total_hours: 2 },
              { m_code: 'AGR ANH3 08 0322', unit_competency: 'Provide First Aid and Respond to Emergencies for Animals', theory: 0, practical: 0, cooperative: 0, total_hours: 2 },
              { m_code: 'AGR ANH3 09 0322', unit_competency: 'Conduct Animal Health Extension and Community Veterinary Service', theory: 0, practical: 0, cooperative: 0, total_hours: 2 },
              { m_code: 'AGR ANH3 10 0322', unit_competency: 'Apply Digital Technology in Agriculture', theory: 0, practical: 0, cooperative: 0, total_hours: 2 }
            ]
          },
          {
            level: 'IV',
            modules: [
              { m_code: 'AGR ANH4 01 0322', unit_competency: 'Apply Veterinary Drug and Chemicals', theory: 0, practical: 0, cooperative: 0, total_hours: 2 },
              { m_code: 'AGR ANH4 02 0322', unit_competency: 'Perform Minor Surgical and Obstetrical Operations', theory: 0, practical: 0, cooperative: 0, total_hours: 2 },
              { m_code: 'AGR ANH4 03 0322', unit_competency: 'Carryout Veterinary Clinical Practices', theory: 0, practical: 0, cooperative: 0, total_hours: 2 },
              { m_code: 'AGR ANH4 04 0322', unit_competency: 'Apply General Laboratory Techniques and Procedures', theory: 0, practical: 0, cooperative: 0, total_hours: 2 },
              { m_code: 'AGR ANH4 05 0322', unit_competency: 'Carry-out Inspection of Animal Origin Food and Veterinary Public Health Activities', theory: 0, practical: 0, cooperative: 0, total_hours: 2 },
              { m_code: 'AGR ANH4 06 0322', unit_competency: 'Conduct Prevention and Control of Animal Disease', theory: 0, practical: 0, cooperative: 0, total_hours: 2 },
              { m_code: 'AGR ANH4 07 0322', unit_competency: 'Perform Animal Quarantine Operation', theory: 0, practical: 0, cooperative: 0, total_hours: 2 },
              { m_code: 'AGR ANH4 08 0322', unit_competency: 'Carryout poultry health practice', theory: 0, practical: 0, cooperative: 0, total_hours: 2 },
              { m_code: 'AGR ANH4 09 0322', unit_competency: 'Carryout Animal Husbandry and Farm Management', theory: 0, practical: 0, cooperative: 0, total_hours: 2 },
              { m_code: 'AGR ANH4 10 0322', unit_competency: 'Apply Animal Health Related Legislatives, Guidelines, Standards and Work Ethics', theory: 0, practical: 0, cooperative: 0, total_hours: 2 },
              { m_code: 'AGR ANH4 11 0322', unit_competency: 'Identify and Handle Diseases of Wild Animals', theory: 0, practical: 0, cooperative: 0, total_hours: 2 },
              { m_code: 'AGR ANH4 12 0322', unit_competency: 'Develop value chain analysis', theory: 0, practical: 0, cooperative: 0, total_hours: 2 },
              { m_code: 'AGR ANH4 13 0322', unit_competency: 'Basic English Work Place Communication Skill', theory: 0, practical: 0, cooperative: 0, total_hours: 2 },
              { m_code: 'AGR ANH4 14 0322', unit_competency: 'Morality & Professional Ethics', theory: 0, practical: 0, cooperative: 0, total_hours: 2 },
              { m_code: 'AGR ANH4 15 0322', unit_competency: '21st Century Skills', theory: 0, practical: 0, cooperative: 0, total_hours: 2 },
              { m_code: 'AGR ANH4 16 0322', unit_competency: 'Entrepreneurship', theory: 0, practical: 0, cooperative: 0, total_hours: 2 }
            ]
          }
        ]
      }
    ]
  },
  {
    sector_code: 'LSA',
    sector_name: 'Labor and Social Affairs Sector',
    occupations: [
      {
        occupation_code: 'ACF',
        occupation_name: 'Accounting and Finance',
        levels: [
          {
            level: 'I',
            modules: [
              { m_code: 'LSA ACF3 01 1221', unit_competency: 'Process Financial Transactions and Extract Interim Reports', theory: 24, practical: 78, cooperative: 36, total_hours: 160 },
              { m_code: 'LSA ACF3 02 1221', unit_competency: 'Administer, Monitor and Control General and Subsidiary Ledgers', theory: 24, practical: 130, cooperative: 34, total_hours: 168 },
              { m_code: 'LSA ACF3 03 1221', unit_competency: 'Perform Financial Calculations', theory: 24, practical: 124, cooperative: 40, total_hours: 168 },
              { m_code: 'LSA ACF3 04 1221', unit_competency: 'Administer Financial Accounts', theory: 20, practical: 120, cooperative: 32, total_hours: 86 },
              { m_code: 'LSA ACF3 05 1221', unit_competency: 'Prepare and Prepare, Match and Process Receipts', theory: 16, practical: 116, cooperative: 28, total_hours: 166 },
              { m_code: 'LSA ACF3 06 1221', unit_competency: 'Process Payment Documentation', theory: 24, practical: 124, cooperative: 32, total_hours: 167 },
              { m_code: 'LSA ACF3 07 1221', unit_competency: 'Balance Cash Holdings', theory: 20, practical: 120, cooperative: 28, total_hours: 32 },
              { m_code: 'LSA ACF3 08 1221', unit_competency: 'Process Payroll', theory: 24, practical: 126, cooperative: 42, total_hours: 321 },
              { m_code: 'LSA ACF3 09 1221', unit_competency: 'Prepare Financial Reports', theory: 24, practical: 128, cooperative: 48, total_hours: 241 },
              { m_code: 'LSA ACF3 10 1221', unit_competency: 'Calculate and Administer Taxes, Fees and Charges', theory: 20, practical: 120, cooperative: 24, total_hours: 166 },
              { m_code: 'LSA ACF3 11 1221', unit_competency: 'Handle Foreign Currency Transactions', theory: 18, practical: 118, cooperative: 24, total_hours: 287 },
              { m_code: 'LSA ACF3 12 1221', unit_competency: 'Prevent and Eliminate MUDA', theory: 12, practical: 112, cooperative: 20, total_hours: 84 }
            ]
          },
          {
            level: 'IV',
            modules: [
              { m_code: 'LSA ACF4 01 1221', unit_competency: 'Prepare Financial Statements for governmental and not for profit Entities (NFP)', theory: 24, practical: 40, cooperative: 16, total_hours: 80 },
              { m_code: 'LSA ACF4 02 1221', unit_competency: 'Set up and operate a Computerized Accounting Information System', theory: 32, practical: 116, cooperative: 32, total_hours: 180 },
              { m_code: 'LSA ACF4 03 1221', unit_competency: 'Apply principles of professional Practice to work in the financial services industry', theory: 32, practical: 16, cooperative: 32, total_hours: 80 },
              { m_code: 'LSA ACF4 04 1221', unit_competency: 'Prepare Financial Reports based international financial report standard (IFRS)', theory: 54, practical: 56, cooperative: 40, total_hours: 150 },
              { m_code: 'LSA ACF4 05 1221', unit_competency: 'Process Business Tax Requirements', theory: 22, practical: 32, cooperative: 16, total_hours: 70 },
              { m_code: 'LSA ACF4 06 1221', unit_competency: 'Develop and Use Complex Spreadsheets', theory: 20, practical: 32, cooperative: 8, total_hours: 60 },
              { m_code: 'LSA ACF4 07 1221', unit_competency: 'Produce Job order and Process Costing System', theory: 45, practical: 32, cooperative: 72, total_hours: 150 },
              { m_code: 'LSA ACF4 08 1221', unit_competency: 'Maintain Inventory Records and valuation system', theory: 36, practical: 24, cooperative: 40, total_hours: 100 },
              { m_code: 'LSA ACF4 09 1221', unit_competency: 'Establish and Maintain a Cash and Accrual Accounting System', theory: 46, practical: 56, cooperative: 48, total_hours: 150 },
              { m_code: 'LSA ACF4 10 1221', unit_competency: 'Manage Overdue Customer Accounts', theory: 32, practical: 24, cooperative: 8, total_hours: 60 },
              { m_code: 'LSA ACF4 11 1221', unit_competency: 'Provide Management Accounting Information', theory: 40, practical: 34, cooperative: 56, total_hours: 130 },
              { m_code: 'LSA ACF4 12 1221', unit_competency: 'Perform auditing and reporting', theory: 22, practical: 32, cooperative: 16, total_hours: 70 },
              { m_code: 'LSA ACF4 13 1221', unit_competency: 'Morality and Professional Ethics', theory: 20, practical: 0, cooperative: 0, total_hours: 20 },
              { m_code: 'LSA ACF4 14 1221', unit_competency: '21st Century Skills', theory: 20, practical: 0, cooperative: 0, total_hours: 20 },
              { m_code: 'LSA ACF4 15 1221', unit_competency: 'Entrepreneurship', theory: 20, practical: 0, cooperative: 0, total_hours: 20 },
              { m_code: 'LSA ACF4 16 1221', unit_competency: 'Basic English for work place Communication Skill', theory: 20, practical: 0, cooperative: 0, total_hours: 20 }
            ]
          }
        ]
      }
    ]
  },
  {
    sector_code: 'EIS',
    sector_name: 'Technology Sector',
    occupations: [
      {
        occupation_code: 'HNS',
        occupation_name: 'Hardware and Networking Services',
        levels: [
          {
            level: 'I',
            modules: [
              { m_code: 'EIS HNS1 01 1221', unit_competency: 'Connect Hardware Peripherals', theory: 11, practical: 15, cooperative: 18, total_hours: 17 },
              { m_code: 'EIS HNS1 02 1221', unit_competency: 'Operate Personal Computer', theory: 24, practical: 28, cooperative: 28, total_hours: 28 },
              { m_code: 'EIS HNS1 03 1221', unit_competency: 'Protect Application or System Software', theory: 11, practical: 15, cooperative: 18, total_hours: 17 },
              { m_code: 'EIS HNS1 04 1221', unit_competency: 'Install Software Application', theory: 9, practical: 11, cooperative: 10, total_hours: 30 },
              { m_code: 'EIS HNS1 05 1221', unit_competency: 'Develop Keyboard Skills', theory: 9, practical: 11, cooperative: 10, total_hours: 30 },
              { m_code: 'EIS HNS1 06 1221', unit_competency: 'Create and Use Spreadsheets', theory: 11, practical: 15, cooperative: 18, total_hours: 17 },
              { m_code: 'EIS HNS1 07 1221', unit_competency: 'Maintain Inventories of Equipment, Software and Documentation', theory: 6, practical: 8, cooperative: 6, total_hours: 20 },
              { m_code: 'EIS HNS1 08 1221', unit_competency: 'Identify and Use Network Hand Tools', theory: 12, practical: 14, cooperative: 14, total_hours: 40 },
              { m_code: 'EIS HNS1 09 1221', unit_competency: 'Access and Use Internet', theory: 9, practical: 11, cooperative: 10, total_hours: 30 },
              { m_code: 'EIS HNS1 10 1221', unit_competency: 'Apply 5S Procedures', theory: 12, practical: 14, cooperative: 14, total_hours: 40 }
            ]
          },
          {
            level: 'II',
            modules: [
              { unit_competency: 'Connecting Internal Hardware Component', theory: 12, practical: 14, cooperative: 14, total_hours: 40 },
              { unit_competency: 'Installing and Optimizes Operating system Software', theory: 12, practical: 14, cooperative: 14, total_hours: 40 },
              { unit_competency: 'Operating Database Application', theory: 18, practical: 22, cooperative: 20, total_hours: 60 },
              { unit_competency: 'Administrating Network and Hardware Peripherals', theory: 12, practical: 14, cooperative: 14, total_hours: 40 },
              { unit_competency: 'Caring for Network and Computer Hardware', theory: 9, practical: 11, cooperative: 10, total_hours: 30 },
              { unit_competency: 'Recording Client Support Requirements', theory: 9, practical: 11, cooperative: 10, total_hours: 30 },
              { unit_competency: 'Applying Problem-Solving Techniques to Routine Malfunction', theory: 9, practical: 11, cooperative: 10, total_hours: 30 },
              { unit_competency: 'Implementing Maintenance Procedures', theory: 12, practical: 14, cooperative: 14, total_hours: 40 },
              { unit_competency: 'Maintaining Equipment and Consumables', theory: 9, practical: 11, cooperative: 10, total_hours: 30 },
              { unit_competency: 'Preventing and Eliminate MUDA', theory: 9, practical: 11, cooperative: 10, total_hours: 30 },
              { unit_competency: 'Updating and Documenting Operational Procedures', theory: 12, practical: 14, cooperative: 14, total_hours: 40 }
            ]
          },
          {
            level: 'III',
            modules: [
              { unit_competency: 'Determine Best-Fit Topology', theory: 15, practical: 18, cooperative: 17, total_hours: 50 },
              { unit_competency: 'Configure and Administer Server', theory: 36, practical: 42, cooperative: 42, total_hours: 120 },
              { unit_competency: 'Install and Manage Network Protocols', theory: 12, practical: 14, cooperative: 14, total_hours: 40 },
              { unit_competency: 'Monitor and Administer System and Network Security', theory: 9, practical: 11, cooperative: 10, total_hours: 30 },
              { unit_competency: 'Identify and Resolve Network Problems', theory: 9, practical: 11, cooperative: 10, total_hours: 30 },
              { unit_competency: 'Provide First Level Remote Help Desk Support', theory: 6, practical: 7, cooperative: 7, total_hours: 20 },
              { unit_competency: 'Create Technical Documentation', theory: 6, practical: 7, cooperative: 7, total_hours: 20 }
            ]
          },
          {
            level: 'IV',
            modules: [
              { m_code: 'EIS HNS4 01 1221', unit_competency: 'Develop System Infrastructure Design Plan', theory: 11, practical: 15, cooperative: 20, total_hours: 15 },
              { m_code: 'EIS HNS4 02 1221', unit_competency: 'Build Internet Infrastructure', theory: 11, practical: 15, cooperative: 25, total_hours: 20 },
              { m_code: 'EIS HNS4 03 1221', unit_competency: 'Build a small wireless LAN', theory: 10, practical: 10, cooperative: 15, total_hours: 15 },
              { m_code: 'EIS HNS4 04 1221', unit_competency: 'Provide Network System Administration', theory: 10, practical: 10, cooperative: 20, total_hours: 15 },
              { m_code: 'EIS HNS4 05 1221', unit_competency: 'Manage network security', theory: 10, practical: 10, cooperative: 20, total_hours: 15 },
              { m_code: 'EIS HNS4 06 1221', unit_competency: 'Determine Maintenance Strategy', theory: 11, practical: 15, cooperative: 10, total_hours: 5 },
              { m_code: 'EIS HNS4 07 1221', unit_competency: 'Conduct/Facilitate User Training', theory: 11, practical: 15, cooperative: 10, total_hours: 5 },
              { m_code: 'EIS HNS4 08 1221', unit_competency: 'Morality and Professional Ethics', theory: 20, practical: 0, cooperative: 0, total_hours: 20 },
              { m_code: 'EIS HNS4 09 1221', unit_competency: '21st Century Skills', theory: 20, practical: 0, cooperative: 0, total_hours: 20 },
              { m_code: 'EIS HNS4 10 1221', unit_competency: 'Entrepreneurship', theory: 20, practical: 0, cooperative: 0, total_hours: 20 },
              { m_code: 'EIS HNS4 11 1221', unit_competency: 'Basic English for work place Communication Skill', theory: 20, practical: 0, cooperative: 0, total_hours: 20 }
            ]
          }
        ]
      }
    ]
  }
];

const academicYearsSeed = [
  { academic_year_label: '2025/26', start_date: '2025-09-01', end_date: '2026-07-15' },
  { academic_year_label: '2026/27', start_date: '2026-09-01', end_date: '2027-07-15' }
];

const firstNames = ['Abel', 'Amanuel', 'Biniyam', 'Dawit', 'Eden', 'Hanna', 'Lidya', 'Mekdes', 'Rahel', 'Saron', 'Selam', 'Yohannes', 'Feven', 'Kidus', 'Mulu', 'Tigist', 'Rediet', 'Tsion', 'Yonatan', 'Mikiyas'];
const lastNames = ['Abebe', 'Bekele', 'Tesfaye', 'Gebremedhin', 'Mekonnen', 'Kebede', 'Haile', 'Wondimu', 'Fikru', 'Wolde'];
const phonePrefixes = ['091', '092', '093', '094'];

const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];

const randomPhone = () => `${randomItem(phonePrefixes)}${Math.floor(1000000 + Math.random() * 9000000)}`;

const randomDate = (startYear, endYear) => {
  const start = new Date(`${startYear}-01-01`).getTime();
  const end = new Date(`${endYear}-12-31`).getTime();
  return new Date(start + Math.random() * (end - start)).toISOString().slice(0, 10);
};

const parseAdmissionYear = (label, fallbackStart) => {
  const match = String(label || '').match(/(19|20)\d{2}/);
  if (match) return Number(match[0]);
  const fallback = new Date(fallbackStart || Date.now()).getFullYear();
  return fallback;
};

const seedPermissionsAndRoles = async (transaction) => {
  const permissionsData = [
    { permission_code: 'view_users', permission_name: 'View User Accounts', module_scope: 'AUTH' },
    { permission_code: 'manage_users', permission_name: 'Create/Edit/Delete Users', module_scope: 'AUTH' },
    { permission_code: 'view_level', permission_name: 'View Levels', module_scope: 'ACADEMICS' },
    { permission_code: 'manage_level', permission_name: 'Create/Edit/Delete Levels', module_scope: 'ACADEMICS' },
    { permission_code: 'view_batch', permission_name: 'View Batches', module_scope: 'ACADEMICS' },
    { permission_code: 'manage_batch', permission_name: 'Create/Edit/Delete Batches', module_scope: 'ACADEMICS' },
    { permission_code: 'view_occupation', permission_name: 'View Occupations', module_scope: 'ACADEMICS' },
    { permission_code: 'manage_occupation', permission_name: 'Create/Edit/Delete Occupations', module_scope: 'ACADEMICS' },
    { permission_code: 'view_sector', permission_name: 'View Sectors', module_scope: 'ACADEMICS' },
    { permission_code: 'manage_sector', permission_name: 'Create/Edit/Delete Sectors', module_scope: 'ACADEMICS' },
    { permission_code: 'view_uc', permission_name: 'View Units of Competence', module_scope: 'ACADEMICS' },
    { permission_code: 'manage_uc', permission_name: 'Create/Edit/Delete Units of Competence', module_scope: 'ACADEMICS' },
    { permission_code: 'view_module', permission_name: 'View Modules', module_scope: 'ACADEMICS' },
    { permission_code: 'manage_module', permission_name: 'Create/Edit/Delete Modules', module_scope: 'ACADEMICS' },
    { permission_code: 'view_academic_year', permission_name: 'View Academic Years', module_scope: 'ACADEMICS' },
    { permission_code: 'manage_academic_year', permission_name: 'Create/Edit/Delete Academic Years', module_scope: 'ACADEMICS' },
    { permission_code: 'manage_curriculum', permission_name: 'Manage Curriculum (Level-Module Mapping)', module_scope: 'ACADEMICS' },
    { permission_code: 'view_instructors', permission_name: 'View Instructors', module_scope: 'INSTRUCTORS' },
    { permission_code: 'manage_instructors', permission_name: 'Create/Edit/Delete Instructors', module_scope: 'INSTRUCTORS' },
    { permission_code: 'view_staff', permission_name: 'View Staff List', module_scope: 'STAFF' },
    { permission_code: 'manage_staff', permission_name: 'Create/Edit/Delete Staff Records', module_scope: 'STAFF' },
    { permission_code: 'manage_grading', permission_name: 'Create/Edit Assessment Plans and Grades', module_scope: 'GRADING' },
    {permission_code:'view_grading', permission_name:'View Assessment Plans and Grades', module_scope:'GRADING'},
    { permission_code: 'approve_grades_hod', permission_name: 'Approve Grades as HOD', module_scope: 'GRADING' },
    { permission_code: 'approve_grades_qa', permission_name: 'Approve Grades as QA', module_scope: 'GRADING' },
    { permission_code: 'approve_grades_tvet', permission_name: 'Approve Grades as TVET', module_scope: 'GRADING' },
    { permission_code: 'finalize_grades_registrar', permission_name: 'Finalize Grades as Registrar', module_scope: 'GRADING' },
    { permission_code: 'manage_grading_policy', permission_name: 'Create/Edit Grading Policies and Scale Items', module_scope: 'GRADING' },
    { permission_code: 'manage_enrollment', permission_name: 'Create/Update Enrollment and Prerequisites', module_scope: 'ENROLLMENT' },
    { permission_code: 'view_academic_progress', permission_name: 'View Student GPA and Academic Progress', module_scope: 'ENROLLMENT' },
    { permission_code: 'manage_student', permission_name: 'Create/Edit/Delete Student Records', module_scope: 'STUDENTS' },
    { permission_code: 'view_students', permission_name: 'View Student List', module_scope: 'STUDENTS' },
    { permission_code: 'create_student', permission_name: 'Register Students', module_scope: 'STUDENTS' },
    { permission_code: 'manage_students', permission_name: 'Manage Student Records', module_scope: 'STUDENTS' },
    { permission_code: 'view_curriculum', permission_name: 'View Curriculum (Level-Module Mapping)', module_scope: 'ACADEMICS' }
  ];

  await Permission.bulkCreate(permissionsData, { ignoreDuplicates: true, transaction });

  const [adminRole] = await Role.findOrCreate({
    where: { role_code: 'ADMIN' },
    defaults: { role_name: 'System Administrator' },
    transaction
  });
  const [registrarRole] = await Role.findOrCreate({
    where: { role_code: 'REGISTRAR' },
    defaults: { role_name: 'College Registrar' },
    transaction
  });
  const [studentRole] = await Role.findOrCreate({
    where: { role_code: 'STUDENT' },
    defaults: { role_name: 'Student' },
    transaction
  });

  const allPerms = await Permission.findAll({ transaction });
  await adminRole.setPermissions(allPerms, { transaction });

  const registrarPerms = await Permission.findAll({
    where: {
      permission_code: [
        'create_student',
        'view_students',
        'manage_batch',
        'manage_grading',
        'finalize_grades_registrar',
        'manage_grading_policy',
        'manage_enrollment',
        'view_academic_progress'
      ]
    },
    transaction
  });
  const studentPerms = await Permission.findAll({ where: { permission_code: ['view_students'] }, transaction });
  await registrarRole.setPermissions(registrarPerms, { transaction });
  await studentRole.setPermissions(studentPerms, { transaction });

  return { adminRole, registrarRole, studentRole };
};

const seedAcademicYears = async (transaction) => {
  const years = [];
  for (const year of academicYearsSeed) {
    const created = await AcademicYear.create(year, { transaction });
    years.push(created);
  }
  const byLabel = new Map(years.map((y) => [y.academic_year_label, y.academic_year_id]));
  return { years, byLabel };
};

const seedBatches = async (occupationMap, levelMap, yearMap, transaction) => {
  const batches = [];
  for (const sectorEntry of curriculumData) {
    for (const occupationEntry of sectorEntry.occupations) {
      const occupation_id = occupationMap.get(occupationEntry.occupation_code);
      for (const levelEntry of occupationEntry.levels) {
        const level_id = levelMap.get(`${occupationEntry.occupation_code}:${levelEntry.level}`);
        const yearLabel = levelEntry.level === 'IV' ? '2026/27' : '2025/26';
        const academic_year_id = yearMap.get(yearLabel) || [...yearMap.values()][0];

        const batch = await Batch.create({
          occupation_id,
          academic_year_id,
          level_id,
          track_type: 'REGULAR',
          capacity: 40
        }, { transaction });

        batches.push({
          batch,
          occupation_code: occupationEntry.occupation_code,
          level_name: levelEntry.level,
          academic_year_label: yearLabel
        });
      }
    }
  }
  return batches;
};

const seedUsers = async (roles, transaction) => {
  const defaultPassword = await argon2.hash('password123', { type: argon2.argon2id });
  const usersToSeed = [
    { email: 'admin@gvc.edu', status: 'ACTIVE', role: roles.adminRole, password: 'admin123', first_name: 'System', last_name: 'Admin' },
    { email: 'registrar.senior@gvc.edu', status: 'ACTIVE', role: roles.registrarRole, first_name: 'Senior', last_name: 'Registrar' },
    { email: 'registrar.junior@gvc.edu', status: 'ACTIVE', role: roles.registrarRole, first_name: 'Junior', last_name: 'Registrar' },
    { email: 'finance.officer@gvc.edu', status: 'ACTIVE', role: roles.registrarRole, first_name: 'Finance', last_name: 'Officer' },
    { email: 'locked.staff@gvc.edu', status: 'LOCKED', role: roles.registrarRole, first_name: 'Locked', last_name: 'Staff' },
    { email: 'retired.staff@gvc.edu', status: 'DISABLED', role: roles.registrarRole, first_name: 'Retired', last_name: 'Staff' }
  ];

  for (const u of usersToSeed) {
    const pass = u.password ? await argon2.hash(u.password, { type: argon2.argon2id }) : defaultPassword;
    let user = await UserAccount.findOne({ where: { email: u.email }, transaction });
    if (user) {
      await user.setRoles([u.role], { transaction });
      continue;
    }

    const person = await Person.create({
      first_name: u.first_name,
      last_name: u.last_name,
      email: u.email
    }, { transaction });

    user = await UserAccount.create({ person_id: person.person_id, email: u.email, password_hash: pass, status: u.status }, { transaction });
    await user.setRoles([u.role], { transaction });
  }
};

const buildName = (offset) => {
  const first = randomItem(firstNames);
  const last = randomItem(lastNames);
  const middle = randomItem([...firstNames]);
  return { first, middle, last, suffix: offset };
};

const seedStudents = async (batches, transaction) => {
  const studentRows = [];

  for (const { batch, occupation_code, academic_year_label } of batches) {
    const regYear = parseAdmissionYear(academic_year_label, '2025-01-01');
    const trackChar = batch.track_type === 'REGULAR' ? 'R' : 'X';
    const occCode = occupation_code;

    const [seq] = await StudentIdSequence.findOrCreate({
      where: { reg_year: regYear },
      defaults: { last_seq: 0 },
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    for (let i = 0; i < 22; i += 1) {
      const name = buildName(i);
      const nextSeq = seq.last_seq + 1 + i;
      const formattedId = `GVC${occCode}${trackChar}${String(nextSeq).padStart(3, '0')}/${String(regYear).slice(-2)}`;

      const person = await Person.create({
        first_name: name.first,
        middle_name: name.middle,
        last_name: name.last,
        gender: Math.random() > 0.5 ? 'M' : 'F',
        date_of_birth: randomDate(1998, 2006),
        phone: randomPhone(),
        email: `${name.first.toLowerCase()}.${name.last.toLowerCase()}${nextSeq}@students.gvc.edu`
      }, { transaction });

      const student = await Student.create({
        person_id: person.person_id,
        student_id: formattedId,
        occupation_id: batch.occupation_id,
        level_id: batch.level_id,
        batch_id: batch.batch_id,
        admission_date: `${regYear}-10-01`,
        status: 'ACTIVE',
        reg_sequence: nextSeq,
        reg_year: regYear
      }, { transaction });

      studentRows.push(student);
    }

    await seq.update({ last_seq: seq.last_seq + 22 }, { transaction });
  }

  return studentRows.length;
};

const seedInstructors = async (occupationMap, modulesByOcc, transaction) => {
  const InstructorModuleRows = [];

  for (const [occCode, occupation_id] of occupationMap.entries()) {
    const modules = modulesByOcc.get(occCode) || [];
    for (let i = 0; i < 20; i += 1) {
      const name = buildName(i);
      const hireYear = 2018 + (i % 6);

      const [seq] = await StaffIdSequence.findOrCreate({
        where: { category: 'INST', reg_year: hireYear },
        defaults: { last_seq: 0 },
        transaction,
        lock: transaction.LOCK.UPDATE
      });
      const nextSeq = seq.last_seq + 1;
      await seq.update({ last_seq: nextSeq }, { transaction });
      const staff_code = `GVC-INST-${String(nextSeq).padStart(3, '0')}/${String(hireYear).slice(-2)}`;

      const person = await Person.create({
        first_name: name.first,
        middle_name: name.middle,
        last_name: name.last,
        gender: Math.random() > 0.5 ? 'M' : 'F',
        date_of_birth: randomDate(1980, 1995),
        phone: randomPhone(),
        email: `${name.first.toLowerCase()}.${name.last.toLowerCase()}${nextSeq}@faculty.gvc.edu`
      }, { transaction });

      const instructor = await Instructor.create({
        person_id: person.person_id,
        staff_code,
        occupation_id,
        hire_date: randomDate(2018, 2024),
        qualification: 'BSc + TVET Level IV',
        employment_status: 'ACTIVE'
      }, { transaction });

      // Assign 2 modules within the same occupation
      const assignedModules = modules.slice().sort(() => 0.5 - Math.random()).slice(0, Math.min(2, modules.length));
      for (const m_code of assignedModules) {
        InstructorModuleRows.push({ instructor_id: instructor.instructor_id, m_code });
      }
    }
  }

  if (InstructorModuleRows.length > 0) {
    await InstructorModule.bulkCreate(InstructorModuleRows, { transaction });
  }

  return InstructorModuleRows.length;
};

const clearAcademics = async (transaction) => {
  await sequelize.query('SET FOREIGN_KEY_CHECKS = 0', { transaction });
  await Promise.all([
    InstructorModule.destroy({ where: {}, truncate: true, force: true, cascade: true, transaction }),
    LevelModule.destroy({ where: {}, truncate: true, force: true, cascade: true, transaction }),
    Module.destroy({ where: {}, truncate: true, force: true, cascade: true, transaction }),
    Batch.destroy({ where: {}, truncate: true, force: true, cascade: true, transaction }),
    Level.destroy({ where: {}, truncate: true, force: true, cascade: true, transaction }),
    Occupation.destroy({ where: {}, truncate: true, force: true, cascade: true, transaction }),
    Sector.destroy({ where: {}, truncate: true, force: true, cascade: true, transaction }),
    AcademicYear.destroy({ where: {}, truncate: true, force: true, cascade: true, transaction }),
    Student.destroy({ where: {}, truncate: true, force: true, cascade: true, transaction }),
    StudentIdSequence.destroy({ where: {}, truncate: true, force: true, cascade: true, transaction }),
    Instructor.destroy({ where: {}, truncate: true, force: true, cascade: true, transaction }),
    StaffIdSequence.destroy({ where: {}, truncate: true, force: true, cascade: true, transaction })
  ]);
  await sequelize.query('SET FOREIGN_KEY_CHECKS = 1', { transaction });
};

const seedCurriculum = async (transaction) => {
  await clearAcademics(transaction);

  const occupationMap = new Map(); // occ_code -> id
  const levelMap = new Map(); // `${occ_code}:${levelName}` -> level_id
  const modulesByOcc = new Map(); // occ_code -> [m_code]

  for (const sectorEntry of curriculumData) {
    const sector = await Sector.create({ sector_code: sectorEntry.sector_code, sector_name: sectorEntry.sector_name }, { transaction });

    for (const occupationEntry of sectorEntry.occupations) {
      const occupation = await Occupation.create({
        sector_id: sector.sector_id,
        occupation_code: occupationEntry.occupation_code,
        occupation_name: occupationEntry.occupation_name
      }, { transaction });

      occupationMap.set(occupationEntry.occupation_code, occupation.occupation_id);
      modulesByOcc.set(occupationEntry.occupation_code, []);

      for (const levelEntry of occupationEntry.levels) {
        const levelId = romanToNumeric[levelEntry.level];
        if (!levelId) {
          throw new Error(`Unsupported level ${levelEntry.level} for ${occupationEntry.occupation_code}`);
        }

        await Level.create({
          level_id: levelId,
          occupation_id: occupation.occupation_id,
          level_name: levelEntry.level
        }, { transaction });

        levelMap.set(`${occupationEntry.occupation_code}:${levelEntry.level}`, levelId);

        let moduleIndex = 1;
        for (const moduleEntry of levelEntry.modules) {
          const m_code = moduleEntry.m_code || generateModuleCode(occupation.occupation_code, levelEntry.level, moduleIndex++);
          const hours = normalizeHours({ ...moduleEntry, m_code });

          await Module.create({
            m_code,
            occupation_id: occupation.occupation_id,
            unit_competency: moduleEntry.unit_competency,
            theory_hours: hours.theory,
            practical_hours: hours.practical,
            cooperative_hours: hours.cooperative,
            learning_hours: hours.learning_hours,
            credit_units: moduleEntry.credit_units ?? 0
          }, { transaction });

          modulesByOcc.get(occupationEntry.occupation_code).push(m_code);

          await LevelModule.create({
            occupation_id: occupation.occupation_id,
            level_id: levelId,
            m_code,
            semester: 1
          }, { transaction });
        }
      }
    }
  }

  return { occupationMap, levelMap, modulesByOcc };
};

const seedDatabase = async () => {
  console.log('🌱 Starting Database Seeding...');

  try {
    await sequelize.sync();
    await InstructorModule.sync();

    await sequelize.transaction(async (transaction) => {
      const roles = await seedPermissionsAndRoles(transaction);
      await seedUsers(roles, transaction);

      const { occupationMap, levelMap, modulesByOcc } = await seedCurriculum(transaction);
      const { byLabel: academicYearMap } = await seedAcademicYears(transaction);
      const batches = await seedBatches(occupationMap, levelMap, academicYearMap, transaction);

      const studentCount = await seedStudents(batches, transaction);
      const instructorAssignments = await seedInstructors(occupationMap, modulesByOcc, transaction);

      console.log(`✅ Seeded ${batches.length} batches, ${studentCount} students, ${instructorAssignments} instructor-module links`);
    });

    console.log('🚀 Seeding Completed Successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding Failed:', error);
    process.exit(1);
  }
};

seedDatabase();