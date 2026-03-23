import { Op } from 'sequelize';
import sequelize from '../../config/database.js';
import { Batch, Module } from '../academics/academic.model.js';
import { Student } from '../students/student.model.js';
import { mapRowsByFieldMapping, parseSpreadsheetRowsFromFile } from '../../utils/spreadsheetImport.js';
import {
    AssessmentTask,
    StudentGrade,
    GradeSubmission,
    GradingPolicy,
    GradeScaleItem,
    ModuleEnrollment,
    GradingAuditLog
} from './grading.model.js';

const can = (actor, permission) => (actor?.permissions || []).includes(permission);
const editableSubmissionStatuses = ['DRAFT', 'REJECTED'];

class GradingService {
    _requirePermission(actor, permission) {
        if (!can(actor, permission)) {
            throw new Error('Unauthorized');
        }
    }

    _parsePFSS(input = {}, { defaultSortBy = 'created_at', maxLimit = 200, allowedSortFields = [] } = {}) {
        const page = Math.max(1, Number.parseInt(input.page, 10) || 1);
        const requestedLimit = Number.parseInt(input.limit, 10) || 20;
        const limit = Math.min(Math.max(1, requestedLimit), maxLimit);
        const normalizedSortDir = String(input.sortDir || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        const fallbackSortField = allowedSortFields[0] || defaultSortBy;
        const sortBy = allowedSortFields.includes(input.sortBy) ? input.sortBy : fallbackSortField;

        return {
            page,
            limit,
            offset: (page - 1) * limit,
            sortBy,
            sortDir: normalizedSortDir,
            search: String(input.search || '').trim()
        };
    }

    _attachSearch(where, search, searchFields) {
        if (!search || !searchFields.length) {
            return where;
        }

        return {
            ...where,
            [Op.or]: searchFields.map((field) => ({
                [field]: { [Op.like]: `%${search}%` }
            }))
        };
    }

    _paginatedResult(rows, count, pfss) {
        return {
            rows,
            count,
            page: pfss.page,
            limit: pfss.limit,
            totalPages: count === 0 ? 0 : Math.ceil(count / pfss.limit)
        };
    }

    async _resolveTaskContext(taskId, payloadBatchId, payloadModuleId, transaction) {
        const task = await AssessmentTask.findByPk(taskId, { transaction, lock: transaction?.LOCK?.UPDATE });
        if (!task) {
            throw new Error('Assessment task not found');
        }

        if (payloadBatchId && Number(payloadBatchId) !== Number(task.batch_id)) {
            throw new Error('batch_id does not match the assessment task batch');
        }

        if (payloadModuleId && Number(payloadModuleId) !== Number(task.module_id)) {
            throw new Error('module_id must be derived from the assessment task');
        }

        return {
            task,
            batchId: Number(task.batch_id),
            moduleId: Number(task.module_id)
        };
    }

    async _ensureSubmissionEditable(batchId, moduleId, transaction) {
        const [submission] = await GradeSubmission.findOrCreate({
            where: { batch_id: batchId, module_id: moduleId },
            defaults: { status: 'DRAFT' },
            transaction,
            lock: transaction?.LOCK?.UPDATE
        });

        if (!editableSubmissionStatuses.includes(submission.status)) {
            throw new Error('Grading is locked for this module submission.');
        }

        return submission;
    }

    async _validateTaskWeights(batchId, moduleId, incomingWeight, excludeTaskId, transaction) {
        const where = { batch_id: batchId, module_id: moduleId };
        if (excludeTaskId) {
            where.task_id = { [Op.ne]: excludeTaskId };
        }

        const usedWeight = Number(
            await AssessmentTask.sum('max_weight', { where, transaction, lock: transaction?.LOCK?.UPDATE }) || 0
        );

        const proposedWeight = Number(incomingWeight);
        if (Number.isNaN(proposedWeight) || proposedWeight <= 0) {
            throw new Error('max_weight must be greater than 0');
        }

        if (usedWeight + proposedWeight > 100) {
            throw new Error(`Total task weight exceeds 100 for batch ${batchId} and module ${moduleId}`);
        }
    }

    async _validateScaleRange(policyId, minScore, maxScore, excludeScaleItemId, transaction) {
        const min = Number(minScore);
        const max = Number(maxScore);

        if (Number.isNaN(min) || Number.isNaN(max) || min > max) {
            throw new Error('Invalid grade scale range');
        }

        const overlapWhere = {
            policy_id: policyId,
            min_score: { [Op.lte]: max },
            max_score: { [Op.gte]: min }
        };

        if (excludeScaleItemId) {
            overlapWhere.scale_item_id = { [Op.ne]: excludeScaleItemId };
        }

        const existing = await GradeScaleItem.findOne({ where: overlapWhere, transaction, lock: transaction?.LOCK?.UPDATE });
        if (existing) {
            throw new Error('Grade scale range overlaps with an existing scale item');
        }
    }

    _sanitizeGradePayload(input, taskContext) {
        const obtainedScore = Number(input.obtained_score);
        if (Number.isNaN(obtainedScore) || obtainedScore < 0) {
            throw new Error('obtained_score must be a positive number');
        }

        if (obtainedScore > Number(taskContext.task.max_weight)) {
            throw new Error('obtained_score cannot exceed task max_weight');
        }

        return {
            student_pk: Number(input.student_pk),
            task_id: Number(taskContext.task.task_id),
            obtained_score: obtainedScore
        };
    }

    _statusPermission(nextStatus) {
        const map = {
            DRAFT: 'manage_grading',
            SUBMITTED: 'manage_grading',
            REJECTED: 'manage_grading',
            HOD_APPROVED: 'approve_grades_hod',
            QA_APPROVED: 'approve_grades_qa',
            TVET_APPROVED: 'approve_grades_tvet',
            FINALIZED: 'finalize_grades_registrar'
        };
        return map[nextStatus];
    }

    _statusTransitionAllowed(currentStatus, nextStatus) {
        const flow = {
            DRAFT: ['SUBMITTED'],
            SUBMITTED: ['REJECTED', 'HOD_APPROVED'],
            HOD_APPROVED: ['REJECTED', 'QA_APPROVED', 'FINALIZED'],
            QA_APPROVED: ['REJECTED', 'TVET_APPROVED', 'FINALIZED'],
            TVET_APPROVED: ['REJECTED', 'FINALIZED'],
            REJECTED: ['DRAFT', 'SUBMITTED'],
            FINALIZED: []
        };
        return (flow[currentStatus] || []).includes(nextStatus);
    }

    formatSubmissionForView(submission) {
        const plain = submission?.toJSON ? submission.toJSON() : submission;
        let workflowHistory = [];

        if (plain?.note) {
            try {
                const parsed = typeof plain.note === 'string' ? JSON.parse(plain.note) : plain.note;
                workflowHistory = Array.isArray(parsed?.workflow_history) ? parsed.workflow_history : [];
            } catch {
                workflowHistory = [];
            }
        }

        if ((!workflowHistory || workflowHistory.length === 0) && Array.isArray(plain?.logs)) {
            workflowHistory = plain.logs.map((log) => ({
                status: log.to_status,
                from_status: log.from_status,
                note: log.note,
                performed_by: log.actor_id,
                completed_at: log.createdAt || log.created_at
            }));
        }

        return {
            ...plain,
            workflow_history: workflowHistory
        };
    }

    // =========================
    // AssessmentTask CRUD + PFSS
    // =========================

    async listAssessmentTasks(filters = {}, pfssInput = {}, actor) {
        this._requirePermission(actor, 'view_grading');

        const pfss = this._parsePFSS(pfssInput, {
            defaultSortBy: 'task_id',
            allowedSortFields: ['task_id', 'task_name', 'task_type', 'max_weight', 'created_at']
        });

        const where = this._attachSearch(
            {
                ...(filters.batch_id ? { batch_id: Number(filters.batch_id) } : {}),
                ...(filters.module_id ? { module_id: Number(filters.module_id) } : {}),
                ...(filters.task_type ? { task_type: filters.task_type } : {})
            },
            pfss.search,
            ['task_name', 'task_type']
        );

        const { rows, count } = await AssessmentTask.findAndCountAll({
            where,
            include: [{ model: Batch }, { model: Module }],
            order: [[pfss.sortBy, pfss.sortDir]],
            offset: pfss.offset,
            limit: pfss.limit
        });

        return this._paginatedResult(rows, count, pfss);
    }

    async getAssessmentTaskById(taskId, actor) {
        this._requirePermission(actor, 'view_grading');
        const task = await AssessmentTask.findByPk(taskId, {
            include: [{ model: Batch }, { model: Module }]
        });
        if (!task) {
            throw new Error('Assessment task not found');
        }
        return task;
    }

    async createAssessmentTask(data, actor) {
        this._requirePermission(actor, 'manage_grading');

        return sequelize.transaction(async (transaction) => {
            const batchId = Number(data.batch_id);
            const moduleId = Number(data.module_id);
            await this._validateTaskWeights(batchId, moduleId, data.max_weight, null, transaction);

            const created = await AssessmentTask.create(
                {
                    batch_id: batchId,
                    module_id: moduleId,
                    task_name: data.task_name,
                    task_type: data.task_type,
                    max_weight: Number(data.max_weight)
                },
                { transaction }
            );

            await GradeSubmission.findOrCreate({
                where: { batch_id: batchId, module_id: moduleId },
                defaults: { status: 'DRAFT' },
                transaction
            });

            return created;
        });
    }

    async updateAssessmentTask(taskId, data, actor) {
        this._requirePermission(actor, 'manage_grading');

        return sequelize.transaction(async (transaction) => {
            const task = await AssessmentTask.findByPk(taskId, { transaction, lock: transaction.LOCK.UPDATE });
            if (!task) {
                throw new Error('Assessment task not found');
            }

            const nextBatchId = Number(data.batch_id || task.batch_id);
            const nextModuleId = Number(data.module_id || task.module_id);
            const nextWeight = data.max_weight === undefined ? task.max_weight : data.max_weight;

            await this._validateTaskWeights(nextBatchId, nextModuleId, nextWeight, task.task_id, transaction);

            return task.update(
                {
                    ...(data.batch_id !== undefined ? { batch_id: nextBatchId } : {}),
                    ...(data.module_id !== undefined ? { module_id: nextModuleId } : {}),
                    ...(data.task_name !== undefined ? { task_name: data.task_name } : {}),
                    ...(data.task_type !== undefined ? { task_type: data.task_type } : {}),
                    ...(data.max_weight !== undefined ? { max_weight: Number(data.max_weight) } : {})
                },
                { transaction }
            );
        });
    }

    async deleteAssessmentTask(taskId, actor) {
        this._requirePermission(actor, 'manage_grading');
        const task = await AssessmentTask.findByPk(taskId);
        if (!task) {
            throw new Error('Assessment task not found');
        }
        await task.destroy();
        return { success: true };
    }

    // ======================
    // StudentGrade CRUD + PFSS
    // ======================

    async listStudentGrades(filters = {}, pfssInput = {}, actor) {
        this._requirePermission(actor, 'view_grading');

        const pfss = this._parsePFSS(pfssInput, {
            defaultSortBy: 'grade_id',
            allowedSortFields: ['grade_id', 'obtained_score', 'created_at', 'updated_at']
        });

        const taskInclude = {
            model: AssessmentTask,
            as: 'task',
            required: true,
            attributes: ['task_id', 'task_name', 'task_type', 'max_weight', 'module_id', 'batch_id'],
            where: {
                ...(filters.module_id ? { module_id: Number(filters.module_id) } : {}),
                ...(filters.batch_id ? { batch_id: Number(filters.batch_id) } : {})
            }
        };

        const where = {
            ...(filters.student_pk ? { student_pk: Number(filters.student_pk) } : {}),
            ...(filters.task_id ? { task_id: Number(filters.task_id) } : {})
        };

        const { rows, count } = await StudentGrade.findAndCountAll({
            where,
            include: [taskInclude, { model: Student, as: 'student' }],
            order: [[pfss.sortBy, pfss.sortDir]],
            offset: pfss.offset,
            limit: pfss.limit
        });

        return this._paginatedResult(rows, count, pfss);
    }

    async getStudentGradeById(gradeId, actor) {
        this._requirePermission(actor, 'view_grading');
        const grade = await StudentGrade.findByPk(gradeId, {
            include: [
                { model: AssessmentTask, as: 'task', attributes: ['task_id', 'task_name', 'task_type', 'module_id', 'batch_id'] },
                { model: Student, as: 'student' }
            ]
        });
        if (!grade) {
            throw new Error('Student grade not found');
        }
        return grade;
    }

    async createStudentGrade(payload, actor) {
        this._requirePermission(actor, 'manage_grading');

        return sequelize.transaction(async (transaction) => {
            const taskContext = await this._resolveTaskContext(payload.task_id, payload.batch_id, payload.module_id, transaction);
            await this._ensureSubmissionEditable(taskContext.batchId, taskContext.moduleId, transaction);
            const sanitized = this._sanitizeGradePayload(payload, taskContext);

            const gradeIdentity = {
                student_pk: sanitized.student_pk,
                task_id: sanitized.task_id
            };

            const gradeValues = {
                ...gradeIdentity,
                obtained_score: sanitized.obtained_score
            };

            const existing = await StudentGrade.findOne({
                where: gradeIdentity,
                transaction,
                lock: transaction.LOCK.UPDATE
            });

            if (existing) {
                throw new Error('Grade already exists for this student and task. Use update or upsert instead.');
            }

            const grade = await StudentGrade.create(gradeValues, { transaction });
            const finalGrade = await this.calculateStudentFinalGrade(
                sanitized.student_pk,
                taskContext.moduleId,
                taskContext.batchId,
                transaction
            );

            return { grade, final_grade: finalGrade };
        });
    }

    async updateStudentGrade(gradeId, payload, actor) {
        this._requirePermission(actor, 'manage_grading');
        return sequelize.transaction(async (transaction) => {
            const grade = await StudentGrade.findByPk(gradeId, {
                include: [{ model: AssessmentTask, as: 'task', attributes: ['batch_id', 'module_id'] }],
                transaction,
                lock: transaction.LOCK.UPDATE
            });
            if (!grade) {
                throw new Error('Student grade not found');
            }

            const nextTaskId = Number(payload.task_id || grade.task_id);
            const taskContext = await this._resolveTaskContext(
                nextTaskId,
                payload.batch_id || grade.task?.batch_id,
                payload.module_id || grade.task?.module_id,
                transaction
            );
            await this._ensureSubmissionEditable(taskContext.batchId, taskContext.moduleId, transaction);

            const nextPayload = this._sanitizeGradePayload(
                {
                    student_pk: payload.student_pk || grade.student_pk,
                    task_id: nextTaskId,
                    obtained_score: payload.obtained_score === undefined ? grade.obtained_score : payload.obtained_score
                },
                taskContext
            );

            await grade.update(nextPayload, { transaction });

            const finalGrade = await this.calculateStudentFinalGrade(
                nextPayload.student_pk,
                taskContext.moduleId,
                taskContext.batchId,
                transaction
            );

            return { grade, final_grade: finalGrade };
        });
    }

    async deleteStudentGrade(gradeId, actor) {
        this._requirePermission(actor, 'manage_grading');
        return sequelize.transaction(async (transaction) => {
            const grade = await StudentGrade.findByPk(gradeId, {
                include: [{ model: AssessmentTask, as: 'task', attributes: ['module_id', 'batch_id'] }],
                transaction,
                lock: transaction.LOCK.UPDATE
            });

            if (!grade) {
                throw new Error('Student grade not found');
            }

            const moduleId = Number(grade.task?.module_id || grade.module_id);
            const batchId = Number(grade.task?.batch_id || grade.batch_id);
            await this._ensureSubmissionEditable(batchId, moduleId, transaction);

            await grade.destroy({ transaction });
            const finalGrade = await this.calculateStudentFinalGrade(grade.student_pk, moduleId, batchId, transaction);
            return { success: true, final_grade: finalGrade };
        });
    }

    async upsertStudentGrade(payload, actor) {
        this._requirePermission(actor, 'manage_grading');
        return sequelize.transaction(async (transaction) => {
            const taskContext = await this._resolveTaskContext(payload.task_id, payload.batch_id, payload.module_id, transaction);
            await this._ensureSubmissionEditable(taskContext.batchId, taskContext.moduleId, transaction);

            const gradePayload = this._sanitizeGradePayload(payload, taskContext);
            const existing = await StudentGrade.findOne({
                where: {
                    student_pk: gradePayload.student_pk,
                    task_id: gradePayload.task_id
                },
                transaction,
                lock: transaction.LOCK.UPDATE
            });

            let grade;
            if (existing) {
                grade = await existing.update(gradePayload, { transaction });
            } else {
                grade = await StudentGrade.create(gradePayload, { transaction });
            }

            const finalGrade = await this.calculateStudentFinalGrade(
                gradePayload.student_pk,
                taskContext.moduleId,
                taskContext.batchId,
                transaction
            );

            return { grade, final_grade: finalGrade };
        });
    }

    async upsertStudentGradesBulk(rows = [], actor) {
        this._requirePermission(actor, 'manage_grading');

        return sequelize.transaction(async (transaction) => {
            const grades = [];
            const finalGradesByKey = new Map();

            for (const row of rows) {
                const taskContext = await this._resolveTaskContext(row.task_id, row.batch_id, row.module_id, transaction);
                await this._ensureSubmissionEditable(taskContext.batchId, taskContext.moduleId, transaction);
                const gradePayload = this._sanitizeGradePayload(row, taskContext);

                const existing = await StudentGrade.findOne({
                    where: {
                        student_pk: gradePayload.student_pk,
                        task_id: gradePayload.task_id
                    },
                    transaction,
                    lock: transaction.LOCK.UPDATE
                });

                const grade = existing
                    ? await existing.update(gradePayload, { transaction })
                    : await StudentGrade.create(gradePayload, { transaction });

                grades.push(grade);

                const finalGrade = await this.calculateStudentFinalGrade(
                    gradePayload.student_pk,
                    taskContext.moduleId,
                    taskContext.batchId,
                    transaction
                );

                const key = `${gradePayload.student_pk}-${taskContext.moduleId}-${taskContext.batchId}`;
                finalGradesByKey.set(key, finalGrade);
            }

            return {
                grades,
                final_grades: Array.from(finalGradesByKey.values())
            };
        });
    }

    async upsertStudentGradesBulkFromSpreadsheet(file, mapping, actor) {
        const rawRows = parseSpreadsheetRowsFromFile(file);
        const mappedRows = mapRowsByFieldMapping(rawRows, mapping);

        const normalizedRows = mappedRows.map((row) => ({
            student_pk: Number(row.student_pk),
            task_id: Number(row.task_id),
            batch_id: row.batch_id ? Number(row.batch_id) : undefined,
            module_id: row.module_id ? Number(row.module_id) : undefined,
            obtained_score: Number(row.obtained_score)
        }));

        return this.upsertStudentGradesBulk(normalizedRows, actor);
    }

    // =========================
    // GradeSubmission CRUD + PFSS
    // =========================

    async listGradeSubmissions(filters = {}, pfssInput = {}, actor) {
        this._requirePermission(actor, 'view_grading');

        const pfss = this._parsePFSS(pfssInput, {
            defaultSortBy: 'submission_id',
            allowedSortFields: ['submission_id', 'status', 'created_at', 'updated_at']
        });

        const where = {
            ...(filters.status ? { status: filters.status } : {}),
            ...(filters.batch_id ? { batch_id: Number(filters.batch_id) } : {}),
            ...(filters.module_id ? { module_id: Number(filters.module_id) } : {})
        };

        const { rows, count } = await GradeSubmission.findAndCountAll({
            where,
            include: [
                { model: Batch },
                { model: Module },
                { model: GradingAuditLog, as: 'logs' }
            ],
            order: [[pfss.sortBy, pfss.sortDir]],
            offset: pfss.offset,
            limit: pfss.limit
        });

        return this._paginatedResult(rows.map((row) => this.formatSubmissionForView(row)), count, pfss);
    }

    async getGradeSubmissionById(submissionId, actor) {
        this._requirePermission(actor, 'view_grading');

        const submission = await GradeSubmission.findByPk(submissionId, {
            include: [
                { model: Batch },
                { model: Module },
                { model: GradingAuditLog, as: 'logs' }
            ]
        });

        if (!submission) {
            throw new Error('Grade submission not found');
        }

        return this.formatSubmissionForView(submission);
    }

    async createGradeSubmission(payload, actor) {
        this._requirePermission(actor, 'manage_grading');

        const [submission] = await GradeSubmission.findOrCreate({
            where: {
                batch_id: Number(payload.batch_id),
                module_id: Number(payload.module_id)
            },
            defaults: {
                status: payload.status || 'DRAFT',
                note: payload.note || null
            }
        });

        return submission;
    }

    async updateGradeSubmission(submissionId, payload, actor) {
        this._requirePermission(actor, 'manage_grading');

        const submission = await GradeSubmission.findByPk(submissionId);
        if (!submission) {
            throw new Error('Grade submission not found');
        }

        return submission.update({
            ...(payload.note !== undefined ? { note: payload.note } : {}),
            ...(payload.status !== undefined ? { status: payload.status } : {})
        });
    }

    async deleteGradeSubmission(submissionId, actor) {
        this._requirePermission(actor, 'manage_grading');
        const submission = await GradeSubmission.findByPk(submissionId);
        if (!submission) {
            throw new Error('Grade submission not found');
        }
        await submission.destroy();
        return { success: true };
    }

    async changeSubmissionStatus(submissionId, nextStatus, actor, note) {
        this._requirePermission(actor, this._statusPermission(nextStatus));

        return sequelize.transaction(async (transaction) => {
            const submission = await GradeSubmission.findByPk(submissionId, {
                transaction,
                lock: transaction.LOCK.UPDATE
            });

            if (!submission) {
                throw new Error('Grade submission not found');
            }

            if (!this._statusTransitionAllowed(submission.status, nextStatus)) {
                throw new Error(`Invalid status transition: ${submission.status} -> ${nextStatus}`);
            }

            const previousStatus = submission.status;
            await submission.update({ status: nextStatus, ...(note !== undefined ? { note } : {}) }, { transaction });

            await GradingAuditLog.create(
                {
                    submission_id: submission.submission_id,
                    actor_id: actor?.id || null,
                    action: 'STATUS_CHANGE',
                    from_status: previousStatus,
                    to_status: nextStatus,
                    note: note || null
                },
                { transaction }
            );

            const withLogs = await GradeSubmission.findByPk(submission.submission_id, {
                include: [{ model: GradingAuditLog, as: 'logs' }],
                transaction
            });

            return this.formatSubmissionForView(withLogs);
        });
    }

    // ========================
    // GradingPolicy CRUD + PFSS
    // ========================

    async listGradingPolicies(filters = {}, pfssInput = {}, actor) {
        this._requirePermission(actor, 'manage_grading_policy');

        const pfss = this._parsePFSS(pfssInput, {
            defaultSortBy: 'policy_id',
            allowedSortFields: ['policy_id', 'policy_name', 'created_at', 'updated_at']
        });

        const where = this._attachSearch(
            {
                ...(filters.is_locked !== undefined ? { is_locked: String(filters.is_locked) === 'true' } : {})
            },
            pfss.search,
            ['policy_name']
        );

        const { rows, count } = await GradingPolicy.findAndCountAll({
            where,
            include: [{ model: GradeScaleItem, as: 'scale_items' }],
            order: [
                [pfss.sortBy, pfss.sortDir],
                [{ model: GradeScaleItem, as: 'scale_items' }, 'min_score', 'ASC']
            ],
            offset: pfss.offset,
            limit: pfss.limit
        });

        return this._paginatedResult(rows, count, pfss);
    }

    async getGradingPolicyById(policyId, actor) {
        this._requirePermission(actor, 'manage_grading_policy');
        const policy = await GradingPolicy.findByPk(policyId, {
            include: [{ model: GradeScaleItem, as: 'scale_items' }],
            order: [[{ model: GradeScaleItem, as: 'scale_items' }, 'min_score', 'ASC']]
        });
        if (!policy) {
            throw new Error('Grading policy not found');
        }
        return policy;
    }

    async createGradingPolicy(payload, actor) {
        this._requirePermission(actor, 'manage_grading_policy');
        return GradingPolicy.create({
            policy_name: payload.policy_name,
            is_locked: Boolean(payload.is_locked)
        });
    }

    async updateGradingPolicy(policyId, payload, actor) {
        this._requirePermission(actor, 'manage_grading_policy');
        const policy = await GradingPolicy.findByPk(policyId);
        if (!policy) {
            throw new Error('Grading policy not found');
        }
        return policy.update({
            ...(payload.policy_name !== undefined ? { policy_name: payload.policy_name } : {}),
            ...(payload.is_locked !== undefined ? { is_locked: Boolean(payload.is_locked) } : {})
        });
    }

    async deleteGradingPolicy(policyId, actor) {
        this._requirePermission(actor, 'manage_grading_policy');
        const policy = await GradingPolicy.findByPk(policyId);
        if (!policy) {
            throw new Error('Grading policy not found');
        }
        await policy.destroy();
        return { success: true };
    }

    // ==========================
    // GradeScaleItem CRUD + PFSS
    // ==========================

    async listGradeScaleItems(filters = {}, pfssInput = {}, actor) {
        this._requirePermission(actor, 'manage_grading_policy');

        const pfss = this._parsePFSS(pfssInput, {
            defaultSortBy: 'min_score',
            allowedSortFields: ['scale_item_id', 'letter_grade', 'min_score', 'max_score', 'grade_points']
        });

        const where = {
            ...(filters.policy_id ? { policy_id: Number(filters.policy_id) } : {})
        };

        const { rows, count } = await GradeScaleItem.findAndCountAll({
            where,
            include: [{ model: GradingPolicy, as: 'policy' }],
            order: [[pfss.sortBy, pfss.sortDir]],
            offset: pfss.offset,
            limit: pfss.limit
        });

        return this._paginatedResult(rows, count, pfss);
    }

    async getGradeScaleItemById(scaleItemId, actor) {
        this._requirePermission(actor, 'manage_grading_policy');
        const item = await GradeScaleItem.findByPk(scaleItemId, {
            include: [{ model: GradingPolicy, as: 'policy' }]
        });
        if (!item) {
            throw new Error('Grade scale item not found');
        }
        return item;
    }

    async addGradeScaleItem(policyId, payload, actor) {
        this._requirePermission(actor, 'manage_grading_policy');

        return sequelize.transaction(async (transaction) => {
            await this._validateScaleRange(policyId, payload.min_score, payload.max_score, null, transaction);

            return GradeScaleItem.create(
                {
                    policy_id: Number(policyId),
                    letter_grade: payload.letter_grade,
                    min_score: Number(payload.min_score),
                    max_score: Number(payload.max_score),
                    grade_points: Number(payload.grade_points || 0),
                    is_pass: payload.is_pass === undefined ? true : Boolean(payload.is_pass)
                },
                { transaction }
            );
        });
    }

    async addGradeScaleItemsBulk(policyId, rows, actor) {
        this._requirePermission(actor, 'manage_grading_policy');

        return sequelize.transaction(async (transaction) => {
            const created = [];
            for (const row of rows || []) {
                await this._validateScaleRange(policyId, row.min_score, row.max_score, null, transaction);
                const item = await GradeScaleItem.create(
                    {
                        policy_id: Number(policyId),
                        letter_grade: row.letter_grade,
                        min_score: Number(row.min_score),
                        max_score: Number(row.max_score),
                        grade_points: Number(row.grade_points || 0),
                        is_pass: row.is_pass === undefined ? true : Boolean(row.is_pass)
                    },
                    { transaction }
                );
                created.push(item);
            }
            return created;
        });
    }

    async updateGradeScaleItem(scaleItemId, payload, actor) {
        this._requirePermission(actor, 'manage_grading_policy');

        return sequelize.transaction(async (transaction) => {
            const item = await GradeScaleItem.findByPk(scaleItemId, { transaction, lock: transaction.LOCK.UPDATE });
            if (!item) {
                throw new Error('Grade scale item not found');
            }

            const nextMin = payload.min_score === undefined ? item.min_score : payload.min_score;
            const nextMax = payload.max_score === undefined ? item.max_score : payload.max_score;
            await this._validateScaleRange(item.policy_id, nextMin, nextMax, item.scale_item_id, transaction);

            return item.update(
                {
                    ...(payload.letter_grade !== undefined ? { letter_grade: payload.letter_grade } : {}),
                    ...(payload.min_score !== undefined ? { min_score: Number(payload.min_score) } : {}),
                    ...(payload.max_score !== undefined ? { max_score: Number(payload.max_score) } : {}),
                    ...(payload.grade_points !== undefined ? { grade_points: Number(payload.grade_points) } : {}),
                    ...(payload.is_pass !== undefined ? { is_pass: Boolean(payload.is_pass) } : {})
                },
                { transaction }
            );
        });
    }

    async deleteGradeScaleItem(scaleItemId, actor) {
        this._requirePermission(actor, 'manage_grading_policy');
        const item = await GradeScaleItem.findByPk(scaleItemId);
        if (!item) {
            throw new Error('Grade scale item not found');
        }
        await item.destroy();
        return { success: true };
    }

    // ===========================
    // ModuleEnrollment CRUD + PFSS
    // ===========================

    async listModuleEnrollments(filters = {}, pfssInput = {}, actor) {
        this._requirePermission(actor, 'view_grading');

        const pfss = this._parsePFSS(pfssInput, {
            defaultSortBy: 'enrollment_id',
            allowedSortFields: ['enrollment_id', 'student_pk', 'final_score', 'letter_grade', 'status', 'created_at']
        });

        const where = {
            ...(filters.student_pk ? { student_pk: Number(filters.student_pk) } : {}),
            ...(filters.batch_id ? { batch_id: Number(filters.batch_id) } : {}),
            ...(filters.module_id ? { module_id: Number(filters.module_id) } : {}),
            ...(filters.status ? { status: filters.status } : {})
        };

        const { rows, count } = await ModuleEnrollment.findAndCountAll({
            where,
            include: [
                { model: Student, as: 'student' },
                { model: Module, as: 'module' },
                { model: Batch, as: 'batch' }
            ],
            order: [[pfss.sortBy, pfss.sortDir]],
            offset: pfss.offset,
            limit: pfss.limit
        });

        return this._paginatedResult(rows, count, pfss);
    }

    async getModuleEnrollmentById(enrollmentId, actor) {
        this._requirePermission(actor, 'view_grading');
        const enrollment = await ModuleEnrollment.findByPk(enrollmentId, {
            include: [
                { model: Student, as: 'student' },
                { model: Module, as: 'module' },
                { model: Batch, as: 'batch' }
            ]
        });
        if (!enrollment) {
            throw new Error('Module enrollment not found');
        }
        return enrollment;
    }

    async createModuleEnrollment(payload, actor) {
        this._requirePermission(actor, 'manage_grading');
        return ModuleEnrollment.create({
            student_pk: Number(payload.student_pk),
            module_id: Number(payload.module_id),
            batch_id: Number(payload.batch_id),
            final_score: payload.final_score === undefined ? null : Number(payload.final_score),
            letter_grade: payload.letter_grade || null,
            grade_points: payload.grade_points === undefined ? null : Number(payload.grade_points),
            status: payload.status || 'PASSED'
        });
    }

    async updateModuleEnrollment(enrollmentId, payload, actor) {
        this._requirePermission(actor, 'manage_grading');
        const enrollment = await ModuleEnrollment.findByPk(enrollmentId);
        if (!enrollment) {
            throw new Error('Module enrollment not found');
        }
        return enrollment.update({
            ...(payload.final_score !== undefined ? { final_score: Number(payload.final_score) } : {}),
            ...(payload.letter_grade !== undefined ? { letter_grade: payload.letter_grade } : {}),
            ...(payload.grade_points !== undefined ? { grade_points: Number(payload.grade_points) } : {}),
            ...(payload.status !== undefined ? { status: payload.status } : {})
        });
    }

    async deleteModuleEnrollment(enrollmentId, actor) {
        this._requirePermission(actor, 'manage_grading');
        const enrollment = await ModuleEnrollment.findByPk(enrollmentId);
        if (!enrollment) {
            throw new Error('Module enrollment not found');
        }
        await enrollment.destroy();
        return { success: true };
    }

    async getBatchModuleEnrollments(batchId, moduleId, pfssInput = {}, actor) {
        return this.listModuleEnrollments(
            {
                batch_id: Number(batchId),
                module_id: Number(moduleId)
            },
            pfssInput,
            actor
        );
    }

    // =========================
    // Grade Calculation
    // =========================

    async calculateStudentFinalGrade(studentId, moduleId, batchId, transaction = null) {
        const studentPk = Number(studentId);
        const resolvedModuleId = Number(moduleId);
        const resolvedBatchId = Number(batchId);

        const batch = await Batch.findByPk(resolvedBatchId, { transaction });
        if (!batch) {
            throw new Error('Batch not found');
        }

        const gradeRows = await StudentGrade.findAll({
            where: {
                student_pk: studentPk
            },
            include: [
                {
                    model: AssessmentTask,
                    as: 'task',
                    required: true,
                    attributes: ['module_id', 'batch_id'],
                    where: { module_id: resolvedModuleId, batch_id: resolvedBatchId }
                }
            ],
            transaction
        });

        const finalScore = gradeRows.reduce((sum, row) => sum + Number(row.obtained_score || 0), 0);

        if (!batch.grading_policy_id) {
            return null;
        }

        const scaleItem = await GradeScaleItem.findOne({
            where: {
                policy_id: batch.grading_policy_id,
                min_score: { [Op.lte]: finalScore },
                max_score: { [Op.gte]: finalScore }
            },
            order: [['min_score', 'DESC']],
            transaction
        });

        if (!scaleItem) {
            throw new Error('No grade scale mapping found for final score');
        }

        const [enrollment, created] = await ModuleEnrollment.findOrCreate({
            where: {
                student_pk: studentPk,
                module_id: resolvedModuleId,
                batch_id: resolvedBatchId
            },
            defaults: {
                student_pk: studentPk,
                module_id: resolvedModuleId,
                batch_id: resolvedBatchId,
                final_score: finalScore,
                letter_grade: scaleItem.letter_grade,
                grade_points: scaleItem.grade_points,
                status: scaleItem.is_pass ? 'PASSED' : 'FAILED'
            },
            transaction
        });

        if (!created) {
            await enrollment.update(
                {
                    final_score: finalScore,
                    letter_grade: scaleItem.letter_grade,
                    grade_points: scaleItem.grade_points,
                    status: scaleItem.is_pass ? 'PASSED' : 'FAILED'
                },
                { transaction }
            );
        }

        return enrollment;
    }
}

export default new GradingService();