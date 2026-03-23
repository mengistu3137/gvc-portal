import { GradeSubmission } from './grading.model.js';
import GradingService from './grading.service.js';

export const getSubmissions = async (req, res, next) => {
	try {
		const { status } = req.query;
		const where = status ? { status } : {};
		const rows = await GradeSubmission.findAll({
			where,
			order: [['created_at', 'DESC']]
		});
		res.json({
			success: true,
			count: rows.length,
			rows: rows.map((row) => GradingService.formatSubmissionForView(row))
		});
	} catch (error) { next(error); }
};

export const getSubmissionById = async (req, res, next) => {
	try {
		const data = await GradeSubmission.findByPk(req.params.id);
		if (!data) throw new Error('Submission not found');
		res.json({ success: true, data: GradingService.formatSubmissionForView(data) });
	} catch (error) { next(error); }
};

export const createSubmission = async (req, res, next) => {
	try {
		const data = await GradeSubmission.create(req.body);
		res.status(201).json({ success: true, data });
	} catch (error) { next(error); }
};

export const upsertStudentGrade = async (req, res, next) => {
	try {
		const data = await GradingService.upsertStudentGrade(req.body, req.user);
		res.json({ success: true, data });
	} catch (error) { next(error); }
};

export const upsertStudentGradesBulk = async (req, res, next) => {
	try {
		const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
		const data = await GradingService.upsertStudentGradesBulk(rows, req.user);
		res.status(201).json({ success: true, count: data.length, rows: data });
	} catch (error) { next(error); }
};

export const importStudentGradesBulk = async (req, res, next) => {
	try {
		const mapping = typeof req.body?.mapping === 'string'
			? JSON.parse(req.body.mapping || '{}')
			: (req.body?.mapping || {});

		const data = await GradingService.upsertStudentGradesBulkFromSpreadsheet(req.file, mapping, req.user);
		res.status(201).json({ success: true, count: data.length, rows: data });
	} catch (error) { next(error); }
};

export const changeSubmissionStatus = async (req, res, next) => {
	try {
		const { next_status, note } = req.body;
		const data = await GradingService.changeSubmissionStatus(req.params.id, next_status, req.user, note);
		res.json({ success: true, data });
	} catch (error) { next(error); }
};

export const createPolicy = async (req, res, next) => {
	try {
		const data = await GradingService.createGradingPolicy(req.body, req.user);
		res.status(201).json({ success: true, data });
	} catch (error) { next(error); }
};

export const calculateFinalGrade = async (req, res, next) => {
	try {
		const { studentId, moduleId, batchId } = req.params;
		const data = await GradingService.calculateStudentFinalGrade(studentId, moduleId, batchId);
		res.json({ success: true, data });
	} catch (error) { next(error); }
};
