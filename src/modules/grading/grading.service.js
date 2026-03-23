import { Op } from 'sequelize';
import sequelize from '../../config/database.js';
import { Batch } from '../academics/academic.model.js';
import { StudentGrade, GradeSubmission, GradingPolicy, ModuleEnrollment } from './grading.model.js';
import { mapRowsByFieldMapping, parseSpreadsheetRowsFromFile } from '../../utils/spreadsheetImport.js';

const can = (actor, permission) => (actor?.permissions || []).includes(permission);

function validateGradeScale(scale) {
	if (!Array.isArray(scale)) {
		throw new Error('grade_scale must be an array');
	}

	for (const item of scale) {
		if (item == null || typeof item !== 'object') {
			throw new Error('grade_scale items must be objects');
		}

		const min = Number(item.min_score);
		const max = Number(item.max_score);

		if (Number.isNaN(min) || Number.isNaN(max)) {
			throw new Error('grade_scale items require numeric min_score and max_score');
		}

		if (min < 0 || max > 100 || min > max) {
			throw new Error('grade_scale scores must be between 0 and 100 with min_score <= max_score');
		}

		if (!item.letter_grade) {
			throw new Error('grade_scale items require letter_grade');
		}
	}
}

class GradingService {
	parseSubmissionNote(note) {
		if (!note) {
			return { note_text: null, workflow_history: [] };
		}

		try {
			const parsed = JSON.parse(note);
			if (parsed && typeof parsed === 'object') {
				return {
					note_text: parsed.note_text || null,
					workflow_history: Array.isArray(parsed.workflow_history) ? parsed.workflow_history : []
				};
			}
		} catch {
			return { note_text: note, workflow_history: [] };
		}

		return { note_text: note, workflow_history: [] };
	}

	serializeSubmissionNote(noteText, workflowHistory) {
		if (!noteText && (!workflowHistory || workflowHistory.length === 0)) {
			return null;
		}

		return JSON.stringify({
			note_text: noteText || null,
			workflow_history: workflowHistory || []
		});
	}

	formatSubmissionForView(submission) {
		const row = submission.toJSON();
		const parsed = this.parseSubmissionNote(row.note);

		return {
			...row,
			note: parsed.note_text,
			workflow_history: parsed.workflow_history
		};
	}

	async assertPolicyNotLocked(policyId, transaction) {
		const policy = await GradingPolicy.findByPk(policyId, { transaction, lock: transaction ? transaction.LOCK.UPDATE : undefined });
		if (!policy) throw new Error('Grading policy not found');
		if (policy.is_locked) throw new Error('Grading policy is locked and cannot be modified.');

		const batches = await Batch.findAll({
			where: { grading_policy_id: policyId },
			attributes: ['batch_id'],
			transaction
		});

		if (batches.length > 0) {
			const batchIds = batches.map((b) => b.batch_id);
			const finalized = await GradeSubmission.findOne({
				where: { batch_id: { [Op.in]: batchIds }, status: 'FINALIZED' },
				transaction
			});
			if (finalized) {
				throw new Error('Grading policy cannot be edited because related grade submissions are FINALIZED.');
			}
		}

		return policy;
	}

	async createGradingPolicy(data, actor) {
		if (!can(actor, 'manage_grading_policy')) {
			throw new Error('Forbidden: missing manage_grading_policy permission.');
		}

		validateGradeScale(data.grade_scale || []);

		const payload = {
			policy_name: data.policy_name,
			is_locked: false,
			grade_scale: Array.isArray(data.grade_scale) ? data.grade_scale : []
		};

		return GradingPolicy.create(payload);
	}

	async listPolicies() {
		return GradingPolicy.findAll({ order: [['policy_name', 'ASC']] });
	}

	async getPolicy(policyId) {
		const policy = await GradingPolicy.findByPk(policyId);
		if (!policy) throw new Error('Grading policy not found');
		return policy;
	}

	async updateGradingPolicy(policyId, data, actor) {
		if (!can(actor, 'manage_grading_policy')) {
			throw new Error('Forbidden: missing manage_grading_policy permission.');
		}

		validateGradeScale(data.grade_scale || []);

		const t = await sequelize.transaction();
		try {
			const policy = await this.assertPolicyNotLocked(policyId, t);
			await policy.update({
				policy_name: data.policy_name ?? policy.policy_name,
				grade_scale: Array.isArray(data.grade_scale) ? data.grade_scale : policy.grade_scale
			}, { transaction: t });
			await t.commit();
			return policy;
		} catch (error) {
			await t.rollback();
			throw error;
		}
	}

	async upsertStudentGradeInternal(data, transaction = null) {
		const submission = await GradeSubmission.findOne({
			where: { batch_id: data.batch_id, module_id: data.module_id },
			transaction,
			lock: transaction ? transaction.LOCK.UPDATE : undefined
		});

		if (!submission) throw new Error('Grade submission record not found for this batch/module.');
		if (!['DRAFT', 'REJECTED'].includes(submission.status)) {
			throw new Error('Grades can only be edited while submission is in DRAFT or REJECTED status.');
		}

		const where = {
			student_pk: data.student_pk,
			module_id: data.module_id,
			batch_id: data.batch_id
		};

		const defaults = {
			assessment_scores: data.assessment_scores || [],
			total_score: data.total_score ?? null,
			final_score: data.final_score ?? null,
			letter_grade: data.letter_grade ?? null,
			grade_points: data.grade_points ?? null,
			status: data.status || 'PENDING',
			submitted_by: data.submitted_by || null,
			submitted_at: data.submitted_at || null,
			approved_by: data.approved_by || null,
			approved_at: data.approved_at || null
		};

		const [grade, created] = await StudentGrade.findOrCreate({ where, defaults, transaction, lock: transaction ? transaction.LOCK.UPDATE : undefined });

		if (!created) {
			await grade.update(defaults, { transaction });
		}

		return grade;
	}

	async upsertStudentGrade(data, actor) {
		if (!can(actor, 'manage_grading')) {
			throw new Error('Forbidden: missing manage_grading permission.');
		}

		return this.upsertStudentGradeInternal(data);
	}

	async upsertStudentGradesBulk(rows, actor) {
		if (!can(actor, 'manage_grading')) {
			throw new Error('Forbidden: missing manage_grading permission.');
		}

		if (!Array.isArray(rows) || rows.length === 0) {
			throw new Error('rows array is required for bulk grade import.');
		}

		const t = await sequelize.transaction();
		try {
			const results = [];
			for (const row of rows) {
				const data = {
					student_pk: Number(row.student_pk),
					batch_id: Number(row.batch_id),
					module_id: Number(row.module_id),
					assessment_scores: row.assessment_scores ?? [],
					total_score: row.total_score,
					final_score: row.final_score,
					letter_grade: row.letter_grade,
					grade_points: row.grade_points,
					status: row.status
				};
				results.push(await this.upsertStudentGradeInternal(data, t));
			}
			await t.commit();
			return results;
		} catch (error) {
			await t.rollback();
			throw error;
		}
	}

	async upsertStudentGradesBulkFromSpreadsheet(file, mapping = {}, actor) {
		const parsedRows = parseSpreadsheetRowsFromFile(file);
		const rows = mapRowsByFieldMapping(parsedRows, mapping);

		if (!Array.isArray(rows) || rows.length === 0) {
			throw new Error('No import rows were found in the uploaded spreadsheet.');
		}

		return this.upsertStudentGradesBulk(rows, actor);
	}

	async changeSubmissionStatus(submissionId, nextStatus, actor, note = null) {
		const t = await sequelize.transaction();
		try {
			const submission = await GradeSubmission.findByPk(submissionId, { transaction: t, lock: t.LOCK.UPDATE });
			if (!submission) throw new Error('Grade submission not found');

			if (submission.status === 'FINALIZED') {
				throw new Error('Submission is FINALIZED and cannot be changed.');
			}

			const current = submission.status;
			const transitions = {
				DRAFT: ['SUBMITTED', 'REJECTED'],
				REJECTED: ['DRAFT', 'SUBMITTED'],
				SUBMITTED: ['HOD_APPROVED', 'REJECTED'],
				HOD_APPROVED: ['QA_APPROVED', 'TVET_APPROVED', 'FINALIZED'],
				QA_APPROVED: ['TVET_APPROVED', 'FINALIZED'],
				TVET_APPROVED: ['FINALIZED']
			};

			if (!transitions[current] || !transitions[current].includes(nextStatus)) {
				throw new Error(`Invalid workflow transition: ${current} -> ${nextStatus}`);
			}

			if (nextStatus === 'HOD_APPROVED' && !can(actor, 'approve_grades_hod')) {
				throw new Error('Forbidden: missing approve_grades_hod permission.');
			}
			if (nextStatus === 'QA_APPROVED' && !can(actor, 'approve_grades_qa')) {
				throw new Error('Forbidden: missing approve_grades_qa permission.');
			}
			if (nextStatus === 'TVET_APPROVED' && !can(actor, 'approve_grades_tvet')) {
				throw new Error('Forbidden: missing approve_grades_tvet permission.');
			}

			const skippingOptional = nextStatus === 'FINALIZED' && ['HOD_APPROVED', 'QA_APPROVED'].includes(current);
			if (nextStatus === 'FINALIZED') {
				if (current === 'TVET_APPROVED' && !can(actor, 'finalize_grades_registrar')) {
					throw new Error('Forbidden: missing finalize_grades_registrar permission.');
				}

				if (skippingOptional) {
					if (!note || !note.trim()) {
						throw new Error('A note is required when QA/TVET steps are skipped before finalization.');
					}
					const canFinalizeBySkip = can(actor, 'finalize_grades_registrar') || can(actor, 'approve_grades_hod');
					if (!canFinalizeBySkip) {
						throw new Error('Forbidden: only Registrar or HOD can finalize when optional steps are skipped.');
					}
				}
			}

			const parsed = this.parseSubmissionNote(submission.note);
			const currentNote = (typeof note === 'string' && note.trim()) ? note.trim() : parsed.note_text;
			const workflowHistory = [
				...parsed.workflow_history,
				{
					status: nextStatus,
					completed_at: new Date().toISOString(),
					performed_by: actor?.email || `user:${actor?.id || 'unknown'}`
				}
			];

			await submission.update({
				status: nextStatus,
				note: this.serializeSubmissionNote(currentNote, workflowHistory)
			}, { transaction: t });

			if (nextStatus === 'FINALIZED') {
				const batch = await Batch.findByPk(submission.batch_id, { transaction: t, lock: t.LOCK.UPDATE });
				if (batch?.grading_policy_id) {
					await GradingPolicy.update(
						{ is_locked: true },
						{ where: { policy_id: batch.grading_policy_id }, transaction: t }
					);
				}
			}

			await t.commit();
			return this.formatSubmissionForView(submission);
		} catch (error) {
			await t.rollback();
			throw error;
		}
	}

	async calculateStudentFinalGrade(studentId, moduleId, batchId) {
		const batch = await Batch.findByPk(batchId);
		if (!batch) throw new Error('Batch not found');
		if (!batch.grading_policy_id) throw new Error('Batch has no grading policy assigned.');

		const grade = await StudentGrade.findOne({ where: { student_pk: studentId, module_id: moduleId, batch_id: batchId } });
		if (!grade) throw new Error('Student grade not found for module/batch.');

		const policy = await GradingPolicy.findByPk(batch.grading_policy_id);
		const scaleItems = Array.isArray(policy?.grade_scale) ? policy.grade_scale : [];
		const totalScore = Number(grade.final_score ?? grade.total_score ?? 0);

		const scale = scaleItems.find((item) => {
			const min = Number(item.min_score);
			const max = Number(item.max_score);
			return totalScore >= min && totalScore <= max;
		});

		if (!scale) {
			throw new Error(`No grade scale range matched score ${totalScore} for batch policy.`);
		}

		const [enrollment] = await ModuleEnrollment.findOrCreate({
			where: {
				student_pk: studentId,
				module_id: moduleId,
				batch_id: batchId
			},
			defaults: {
				final_score: totalScore,
				letter_grade: scale.letter_grade,
				grade_points: scale.grade_points,
				credits_earned: scale.is_pass ? null : null,
				status: scale.is_pass ? 'PASSED' : 'FAILED'
			}
		});

		if (!enrollment.isNewRecord) {
			await enrollment.update({
				final_score: totalScore,
				letter_grade: scale.letter_grade,
				grade_points: scale.grade_points,
				status: scale.is_pass ? 'PASSED' : 'FAILED'
			});
		}

		return {
			student_pk: studentId,
			module_id: moduleId,
			batch_id: batchId,
			total_score: totalScore,
			letter_grade: scale.letter_grade,
			grade_points: Number(scale.grade_points),
			is_pass: !!scale.is_pass,
			module_status: scale.is_pass ? 'PASSED' : 'FAILED'
		};
	}
}

export default new GradingService();
