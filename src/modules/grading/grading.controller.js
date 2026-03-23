import GradingService from './grading.service.js';

const pickPFSS = (query = {}) => ({
    page: query.page,
    limit: query.limit,
    sortBy: query.sortBy,
    sortDir: query.sortDir,
    search: query.search
});

// =============================
// Assessment Tasks
// =============================

export const listAssessmentTasks = async (req, res, next) => {
    try {
        const result = await GradingService.listAssessmentTasks(
            {
                batch_id: req.query.batch_id,
                module_id: req.query.module_id,
                task_type: req.query.task_type
            },
            pickPFSS(req.query),
            req.user
        );
        res.json({ success: true, ...result });
    } catch (error) {
        next(error);
    }
};

export const getAssessmentTaskById = async (req, res, next) => {
    try {
        const data = await GradingService.getAssessmentTaskById(req.params.taskId, req.user);
        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
};

export const createAssessmentTask = async (req, res, next) => {
    try {
        const data = await GradingService.createAssessmentTask(req.body, req.user);
        res.status(201).json({ success: true, data });
    } catch (error) {
        next(error);
    }
};

export const updateAssessmentTask = async (req, res, next) => {
    try {
        const data = await GradingService.updateAssessmentTask(req.params.taskId, req.body, req.user);
        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
};

export const deleteAssessmentTask = async (req, res, next) => {
    try {
        const data = await GradingService.deleteAssessmentTask(req.params.taskId, req.user);
        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
};

// =============================
// Student Grades
// =============================

export const listStudentGrades = async (req, res, next) => {
    try {
        const result = await GradingService.listStudentGrades(
            {
                student_pk: req.query.student_pk,
                batch_id: req.query.batch_id,
                module_id: req.query.module_id,
                task_id: req.query.task_id
            },
            pickPFSS(req.query),
            req.user
        );
        res.json({ success: true, ...result });
    } catch (error) {
        next(error);
    }
};

export const getStudentGradeById = async (req, res, next) => {
    try {
        const data = await GradingService.getStudentGradeById(req.params.gradeId, req.user);
        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
};

export const createStudentGrade = async (req, res, next) => {
    try {
        const data = await GradingService.createStudentGrade(req.body, req.user);
        res.status(201).json({ success: true, data: data.grade, final_grade: data.final_grade });
    } catch (error) {
        next(error);
    }
};

export const updateStudentGrade = async (req, res, next) => {
    try {
        const data = await GradingService.updateStudentGrade(req.params.gradeId, req.body, req.user);
        res.json({ success: true, data: data.grade, final_grade: data.final_grade });
    } catch (error) {
        next(error);
    }
};

export const deleteStudentGrade = async (req, res, next) => {
    try {
        const data = await GradingService.deleteStudentGrade(req.params.gradeId, req.user);
        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
};

export const upsertStudentGrade = async (req, res, next) => {
    try {
        const data = await GradingService.upsertStudentGrade(req.body, req.user);
        res.json({ success: true, data: data.grade, final_grade: data.final_grade });
    } catch (error) {
        next(error);
    }
};

export const upsertStudentGradesBulk = async (req, res, next) => {
    try {
        const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
        const result = await GradingService.upsertStudentGradesBulk(rows, req.user);
        res.status(201).json({
            success: true,
            count: result.grades.length,
            rows: result.grades,
            final_grades: result.final_grades
        });
    } catch (error) {
        next(error);
    }
};

export const importStudentGradesBulk = async (req, res, next) => {
    try {
        const mapping = typeof req.body?.mapping === 'string'
            ? JSON.parse(req.body.mapping || '{}')
            : (req.body?.mapping || {});

        const result = await GradingService.upsertStudentGradesBulkFromSpreadsheet(req.file, mapping, req.user);
        res.status(201).json({
            success: true,
            count: result.grades.length,
            rows: result.grades,
            final_grades: result.final_grades
        });
    } catch (error) {
        next(error);
    }
};

// =============================
// Grade Submissions
// =============================

export const getSubmissions = async (req, res, next) => {
    try {
        const result = await GradingService.listGradeSubmissions(
            {
                status: req.query.status,
                batch_id: req.query.batch_id,
                module_id: req.query.module_id
            },
            pickPFSS(req.query),
            req.user
        );

        res.json({ success: true, ...result });
    } catch (error) {
        next(error);
    }
};

export const getSubmissionById = async (req, res, next) => {
    try {
        const data = await GradingService.getGradeSubmissionById(req.params.id, req.user);
        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
};

export const createSubmission = async (req, res, next) => {
    try {
        const data = await GradingService.createGradeSubmission(req.body, req.user);
        res.status(201).json({ success: true, data });
    } catch (error) {
        next(error);
    }
};

export const updateSubmission = async (req, res, next) => {
    try {
        const data = await GradingService.updateGradeSubmission(req.params.id, req.body, req.user);
        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
};

export const deleteSubmission = async (req, res, next) => {
    try {
        const data = await GradingService.deleteGradeSubmission(req.params.id, req.user);
        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
};

export const changeSubmissionStatus = async (req, res, next) => {
    try {
        const { next_status, note } = req.body;
        const data = await GradingService.changeSubmissionStatus(req.params.id, next_status, req.user, note);
        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
};

// =============================
// Grading Policies
// =============================

export const listPolicies = async (req, res, next) => {
    try {
        const result = await GradingService.listGradingPolicies(
            {
                is_locked: req.query.is_locked
            },
            pickPFSS(req.query),
            req.user
        );

        res.json({ success: true, ...result });
    } catch (error) {
        next(error);
    }
};

export const getPolicyById = async (req, res, next) => {
    try {
        const data = await GradingService.getGradingPolicyById(req.params.policyId, req.user);
        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
};

export const createPolicy = async (req, res, next) => {
    try {
        const data = await GradingService.createGradingPolicy(req.body, req.user);
        res.status(201).json({ success: true, data });
    } catch (error) {
        next(error);
    }
};

export const updatePolicy = async (req, res, next) => {
    try {
        const data = await GradingService.updateGradingPolicy(req.params.policyId, req.body, req.user);
        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
};

export const deletePolicy = async (req, res, next) => {
    try {
        const data = await GradingService.deleteGradingPolicy(req.params.policyId, req.user);
        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
};

// =============================
// Grade Scale Items
// =============================

export const listScaleItems = async (req, res, next) => {
    try {
        const result = await GradingService.listGradeScaleItems(
            {
                policy_id: req.params.policyId || req.query.policy_id
            },
            pickPFSS(req.query),
            req.user
        );
        res.json({ success: true, ...result });
    } catch (error) {
        next(error);
    }
};

export const getScaleItemById = async (req, res, next) => {
    try {
        const data = await GradingService.getGradeScaleItemById(req.params.scaleItemId, req.user);
        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
};

export const addScaleItem = async (req, res, next) => {
    try {
        const data = await GradingService.addGradeScaleItem(req.params.policyId, req.body, req.user);
        res.status(201).json({ success: true, data });
    } catch (error) {
        next(error);
    }
};

export const addScaleItemsBulk = async (req, res, next) => {
    try {
        const rows = await GradingService.addGradeScaleItemsBulk(req.params.policyId, req.body, req.user);
        res.status(201).json({ success: true, count: rows.length, rows });
    } catch (error) {
        next(error);
    }
};

export const updateScaleItem = async (req, res, next) => {
    try {
        const data = await GradingService.updateGradeScaleItem(req.params.scaleItemId, req.body, req.user);
        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
};

export const deleteScaleItem = async (req, res, next) => {
    try {
        const data = await GradingService.deleteGradeScaleItem(req.params.scaleItemId, req.user);
        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
};

// =============================
// Module Enrollments (Outcomes)
// =============================

export const listModuleEnrollments = async (req, res, next) => {
    try {
        const result = await GradingService.listModuleEnrollments(
            {
                student_pk: req.query.student_pk,
                batch_id: req.query.batch_id,
                module_id: req.query.module_id,
                status: req.query.status
            },
            pickPFSS(req.query),
            req.user
        );
        res.json({ success: true, ...result });
    } catch (error) {
        next(error);
    }
};

export const getModuleEnrollmentById = async (req, res, next) => {
    try {
        const data = await GradingService.getModuleEnrollmentById(req.params.enrollmentId, req.user);
        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
};

export const createModuleEnrollment = async (req, res, next) => {
    try {
        const data = await GradingService.createModuleEnrollment(req.body, req.user);
        res.status(201).json({ success: true, data });
    } catch (error) {
        next(error);
    }
};

export const updateModuleEnrollment = async (req, res, next) => {
    try {
        const data = await GradingService.updateModuleEnrollment(req.params.enrollmentId, req.body, req.user);
        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
};

export const deleteModuleEnrollment = async (req, res, next) => {
    try {
        const data = await GradingService.deleteModuleEnrollment(req.params.enrollmentId, req.user);
        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
};

export const getBatchModuleEnrollments = async (req, res, next) => {
    try {
        const result = await GradingService.getBatchModuleEnrollments(
            req.params.batchId,
            req.params.moduleId,
            pickPFSS(req.query),
            req.user
        );

        res.json({ success: true, ...result });
    } catch (error) {
        next(error);
    }
};

// =============================
// Calculation
// =============================

export const calculateFinalGrade = async (req, res, next) => {
    try {
        const { studentId, moduleId, batchId } = req.params;
        const data = await GradingService.calculateStudentFinalGrade(studentId, moduleId, batchId);
        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
};
