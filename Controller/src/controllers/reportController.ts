import { mySequelize } from '@dis/db/dbConection.js';
import {
    Report,
    User,
    Item,
    Place,
    ReportResolutionReview,
    ReportReviewStatus,
    ReportComment,
    ReportCommentEdit
} from '@dis/model';
import { NotificationType } from '@dis/model/userNotificationModel.js';
import type { Response, Request } from 'express';
import { FilterOptions } from '../helpers/filterOptions.js';
import { createHistoryLog } from '../helpers/historyHelper.js';
import { createUserNotification, notifyUsersByRole } from '../helpers/notificationHelper.js';
import {
    COMMENT_INCLUDES,
    REPORT_ACCESS_ATTRIBUTES,
    REPORT_INCLUDES,
    REVIEW_INCLUDES,
    assertReportCommentAccess,
    formatReport,
    formatReportComment,
    formatResolutionReview,
    isValidDate,
    notifyDistinctUsers,
    parseBoundedText,
    parseOptionalNote,
    parsePositiveId,
    validateAssignedUserRecord
} from '../helpers/reportHelper.js';

const CreateReport = async (req: Request, res: Response) => {
    try {
        const {
            reportName = req.body.name,
            reportDescription = req.body.description,
            reportStatus = req.body.status,
            reportPriority = req.body.priority,
            dueDate,
            fk_user_assigned,
            fk_item,
            fk_place
        } = req.body;
        const jwtPayload = res.locals.jwtPayloadContent;
        const creatorId = jwtPayload?.userId;
        const assignedId = fk_user_assigned == null ? null : parsePositiveId(fk_user_assigned);
        const itemId = fk_item == null ? null : parsePositiveId(fk_item);
        const placeId = fk_place == null ? null : parsePositiveId(fk_place);
        const status = Number(reportStatus);
        const priority = Number(reportPriority);

        if (
            typeof reportName !== 'string' ||
            !reportName.trim() ||
            typeof reportDescription !== 'string' ||
            !reportDescription.trim() ||
            !Number.isInteger(status) ||
            status < 1 ||
            status > 3 ||
            !Number.isInteger(priority) ||
            priority < 1 ||
            priority > 3 ||
            !isValidDate(dueDate) ||
            !creatorId ||
            (fk_user_assigned != null && !assignedId) ||
            (fk_item != null && !itemId) ||
            (fk_place != null && !placeId)
        ) {
            return res.status(400).json({ message: 'Invalid or missing report fields' });
        }
        if (status === 3 && Number(jwtPayload?.role) !== 1) {
            return res.status(403).json({
                message: 'Only SuperAdmin can create a report directly as Done'
            });
        }

        const [creator, assignedUser, item, place] = await Promise.all([
            User.findByPk(creatorId),
            assignedId ? User.findByPk(assignedId) : null,
            itemId ? Item.findByPk(itemId) : null,
            placeId ? Place.findByPk(placeId) : null
        ]);

        if (!creator) return res.status(404).json({ message: 'Creator user not found' });
        if (assignedId) {
            const assignedValidation = validateAssignedUserRecord(assignedUser);
            if (!assignedValidation.valid) {
                return res.status(assignedValidation.status).json({ message: assignedValidation.message });
            }
        }
        if (itemId && !item) return res.status(404).json({ message: 'Item not found' });
        if (placeId && !place) return res.status(404).json({ message: 'Place not found' });

        const newReport = await Report.create({
            reportName: reportName.trim(),
            reportDescription: reportDescription.trim(),
            reportStatus: status,
            reportPriority: priority,
            dueDate,
            fk_user_assigned: assignedId,
            fk_user_creator: creatorId,
            fk_item: itemId,
            fk_place: placeId
        });

        await createHistoryLog({
            historyDescription: `Se creó el reporte ${reportName}.`,
            actionType: 'REPORT',
            userId: creatorId,
            itemId,
            placeId,
            reportId: newReport.getDataValue('reportId'),
        });

        const currentUserId = creatorId;
        if (assignedId && assignedId !== currentUserId) {
            await createUserNotification({
                notificationType: NotificationType.REPORT,
                requestDescription: `Se te ha asignado el reporte "${reportName}".`,
                fk_trigger: newReport.getDataValue('reportId'),
                fk_user_trigger: currentUserId || null,
                fk_notified: assignedId
            });
        }

        const createdReport = await Report.findByPk(newReport.getDataValue('reportId'), {
            include: REPORT_INCLUDES
        });
        return res.status(201).json(formatReport(createdReport));
    } catch (error) {
        throw error;
    }
};

const SearchReportById = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        if (!id || isNaN(id) || !Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ message: 'Invalid Report ID' });
        }

        const foundReport = await Report.findByPk(id, { include: REPORT_INCLUDES });
        if (!foundReport) {
            return res.status(404).json({ message: 'Report not found' });
        }

        return res.status(200).json(formatReport(foundReport));
    } catch (error) {
        throw error;
    }
};

const SearchReports = async (req: Request, res: Response) => {
    try {
        const {
            reportId,
            reportName,
            reportDescription,
            reportStatus,
            reportPriority,
            dueDate,
            fk_user_assigned,
            fk_user_creator,
            fk_item,
            fk_place,
            sortBy = 'reportId',
            order = 'ASC'
        } = req.body || {};

        const searchOptions = FilterOptions({
            reportId,
            reportName,
            reportDescription,
            reportStatus,
            reportPriority,
            dueDate,
            fk_user_assigned,
            fk_user_creator,
            fk_item,
            fk_place
        });

        const foundReports = await Report.findAll({
            where: searchOptions,
            include: REPORT_INCLUDES,
            order: [[sortBy, String(order).toUpperCase()]]
        });

        return res.status(200).json(foundReports.map(formatReport));
    } catch (error) {
        throw error;
    }
};

const SearchReportsCreatedUser = async (req: Request, res: Response) => {
    try {
        const parsedUserId = Number(req.params.userId);
        if (isNaN(parsedUserId) || !Number.isInteger(parsedUserId) || parsedUserId <= 0) {
            return res.status(400).json({ message: 'A valid User ID is required' });
        }

        const jwtPayload = res.locals.jwtPayloadContent;
        if (!jwtPayload) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        const isAdministrator = jwtPayload.role <= 2;

        if (!isAdministrator && jwtPayload.userId !== parsedUserId) {
            return res.status(403).json({
                message: 'You can only access your own reports'
            });
        }

        const userExists = await User.findByPk(parsedUserId);
        if (!userExists) {
            return res.status(404).json({ message: 'User not found' });
        }

        const foundReports = await Report.findAll({
            where: { fk_user_creator: parsedUserId },
            include: REPORT_INCLUDES,
            order: [['createdAt', 'DESC']]
        });

        return res.status(200).json(foundReports.map(formatReport));
    } catch (error) {
        throw error;
    }
};

const SearchReportsAssignedUser = async (req: Request, res: Response) => {
    try {
        const parsedUserId = parsePositiveId(req.params.userId);
        if (!parsedUserId) {
            return res.status(400).json({ message: 'A valid User ID is required' });
        }

        const userExists = await User.findByPk(parsedUserId);
        if (!userExists) {
            return res.status(404).json({ message: 'User not found' });
        }

        const foundReports = await Report.findAll({
            where: { fk_user_assigned: parsedUserId },
            include: REPORT_INCLUDES,
            order: [['createdAt', 'DESC']]
        });

        return res.status(200).json(foundReports.map(formatReport));
    } catch (error) {
        throw error;
    }
};

const SetReportStatus = async (req: Request, res: Response) => {
    try {
        const status = Number(req.body?.status);
        const parsedReportId = parsePositiveId(req.params.reportId);
        const jwtPayload = res.locals.jwtPayloadContent;
        if (!jwtPayload) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        if (!parsedReportId || !Number.isInteger(status) || status < 1 || status > 3) {
            return res.status(400).json({ message: 'Status must be an integer between 1 and 3' });
        }
        if (status === 3 && Number(jwtPayload.role) !== 1) {
            return res.status(403).json({
                message: 'Admins cannot mark a report as Done directly. Submit a resolution review request instead.'
            });
        }

        const foundReport = await Report.findByPk(parsedReportId);
        if (!foundReport) {
            return res.status(404).json({ message: 'Report not found' });
        }

        const currentStatus = Number(foundReport.getDataValue('reportStatus'));
        if (currentStatus === 3 && Number(jwtPayload.role) !== 1) {
            return res.status(403).json({
                message: 'Only SuperAdmin can reopen a report marked as Done'
            });
        }
        if (status === currentStatus) {
            return res.status(400).json({ message: 'The status could not change because is the same status' });
        }

        const currentUserId = parsePositiveId(jwtPayload.userId);
        const transaction = await mySequelize.transaction();
        try {
            foundReport.set('reportStatus', status);
            await foundReport.save({ transaction });

            // SuperAdmin direct resolution bypasses the PR flow and closes any open pending review
            if (status === 3) {
                await ReportResolutionReview.update(
                    {
                        reviewStatus: ReportReviewStatus.APPROVED,
                        fk_user_reviewed: currentUserId,
                        reviewNote: 'Direct resolution by SuperAdmin',
                        reviewedAt: new Date()
                    },
                    {
                        where: {
                            fk_report: parsedReportId,
                            reviewStatus: ReportReviewStatus.PENDING
                        },
                        transaction
                    }
                );
            }

            await createHistoryLog({
                historyDescription: `Se actualizó el estado del reporte "${foundReport.getDataValue('reportName')}" (#${parsedReportId}) a ${status}.`,
                actionType: 'UPDATE',
                userId: currentUserId || Number(foundReport.getDataValue('fk_user_creator')),
                itemId: foundReport.getDataValue('fk_item'),
                placeId: foundReport.getDataValue('fk_place'),
                reportId: parsedReportId,
                transaction
            });

            await transaction.commit();
        } catch (txError) {
            await transaction.rollback();
            throw txError;
        }

        const creatorId = parsePositiveId(foundReport.getDataValue('fk_user_creator'));
        const assignedId = parsePositiveId(foundReport.getDataValue('fk_user_assigned'));
        await notifyDistinctUsers(
            [creatorId, assignedId],
            currentUserId,
            parsedReportId,
            `El reporte "${foundReport.getDataValue('reportName')}" (#${parsedReportId}) ha cambiado a estado: ${status}.`
        );

        return res.status(200).json({ status });
    } catch (error) {
        throw error;
    }
};

const RequestReportResolution = async (req: Request, res: Response) => {
    try {
        const parsedReportId = parsePositiveId(req.params.reportId);
        const jwtPayload = res.locals.jwtPayloadContent;
        const currentUserId = parsePositiveId(jwtPayload?.userId);
        if (!jwtPayload || !currentUserId) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        if (!parsedReportId) {
            return res.status(400).json({ message: 'Invalid Report ID' });
        }

        const noteValidation = parseOptionalNote(req.body?.requestNote ?? req.body?.note);
        if (!noteValidation.valid) {
            return res.status(400).json({
                message: 'requestNote must be a non-empty string with at most 500 characters'
            });
        }

        const transaction = await mySequelize.transaction();
        let createdReviewId: number;
        let reportName: string;

        try {
            const foundReport = await Report.findByPk(parsedReportId, {
                transaction,
                lock: transaction.LOCK.UPDATE
            });
            if (!foundReport) {
                await transaction.rollback();
                return res.status(404).json({ message: 'Report not found' });
            }
            if (Number(foundReport.getDataValue('reportStatus')) === 3) {
                await transaction.rollback();
                return res.status(409).json({ message: 'Report is already marked as Done' });
            }

            const existingPending = await ReportResolutionReview.findOne({
                where: {
                    fk_report: parsedReportId,
                    reviewStatus: ReportReviewStatus.PENDING
                },
                transaction
            });
            if (existingPending) {
                await transaction.rollback();
                return res.status(409).json({
                    message: 'A pending resolution review already exists for this report'
                });
            }

            const createdReview = await ReportResolutionReview.create(
                {
                    fk_report: parsedReportId,
                    fk_user_requested: currentUserId,
                    reviewStatus: ReportReviewStatus.PENDING,
                    requestNote: noteValidation.value
                },
                { transaction }
            );

            createdReviewId = Number(createdReview.getDataValue('reviewId'));
            reportName = String(foundReport.getDataValue('reportName'));

            await createHistoryLog({
                historyDescription: `Se solicitó revisión de cierre para el reporte "${reportName}" (#${parsedReportId}).`,
                actionType: 'UPDATE',
                userId: currentUserId,
                itemId: foundReport.getDataValue('fk_item'),
                placeId: foundReport.getDataValue('fk_place'),
                reportId: parsedReportId,
                transaction
            });

            await transaction.commit();
        } catch (txError) {
            await transaction.rollback();
            throw txError;
        }

        await notifyUsersByRole(1, {
            notificationType: NotificationType.REPORT,
            requestDescription: `El reporte "${reportName}" (#${parsedReportId}) tiene una solicitud de resolución pendiente de revisión.`,
            fk_trigger: parsedReportId,
            fk_user_trigger: currentUserId
        });

        const reviewWithUsers = await ReportResolutionReview.findByPk(createdReviewId, {
            include: REVIEW_INCLUDES
        });

        return res.status(201).json(formatResolutionReview(reviewWithUsers));
    } catch (error) {
        throw error;
    }
};

const GetReportResolutionReviews = async (req: Request, res: Response) => {
    try {
        const parsedReportId = parsePositiveId(req.params.reportId);
        if (!parsedReportId) {
            return res.status(400).json({ message: 'Invalid Report ID' });
        }

        const foundReport = await Report.findByPk(parsedReportId);
        if (!foundReport) {
            return res.status(404).json({ message: 'Report not found' });
        }

        const reviews = await ReportResolutionReview.findAll({
            where: { fk_report: parsedReportId },
            include: REVIEW_INCLUDES,
            order: [['createdAt', 'DESC'], ['reviewId', 'DESC']]
        });

        return res.status(200).json(reviews.map(formatResolutionReview));
    } catch (error) {
        throw error;
    }
};

const ReviewReportResolution = async (req: Request, res: Response) => {
    try {
        const parsedReviewId = parsePositiveId(req.params.reviewId);
        const jwtPayload = res.locals.jwtPayloadContent;
        const currentUserId = parsePositiveId(jwtPayload?.userId);
        if (!jwtPayload || !currentUserId) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        if (Number(jwtPayload.role) !== 1) {
            return res.status(403).json({ message: 'Only SuperAdmin can approve or reject resolution reviews' });
        }

        const rawDecision = typeof req.body?.decision === 'string'
            ? req.body.decision.trim().toUpperCase()
            : '';
        if (
            !parsedReviewId ||
            (rawDecision !== ReportReviewStatus.APPROVED && rawDecision !== ReportReviewStatus.REJECTED)
        ) {
            return res.status(400).json({
                message: 'Valid reviewId and decision (APPROVED or REJECTED) are required'
            });
        }

        const noteValidation = parseOptionalNote(req.body?.reviewNote ?? req.body?.note);
        if (!noteValidation.valid) {
            return res.status(400).json({
                message: 'reviewNote must be a non-empty string with at most 500 characters'
            });
        }

        const decision = rawDecision as ReportReviewStatus.APPROVED | ReportReviewStatus.REJECTED;
        const transaction = await mySequelize.transaction();

        let reportId: number;
        let reportName: string;
        let requesterId: number | null;
        let assignedId: number | null;
        let creatorId: number | null;
        let resultingReportStatus: number;

        try {
            const review = await ReportResolutionReview.findByPk(parsedReviewId, {
                transaction,
                lock: transaction.LOCK.UPDATE
            });
            if (!review) {
                await transaction.rollback();
                return res.status(404).json({ message: 'Resolution review not found' });
            }
            if (review.getDataValue('reviewStatus') !== ReportReviewStatus.PENDING) {
                await transaction.rollback();
                return res.status(409).json({ message: 'This resolution review has already been processed' });
            }

            reportId = Number(review.getDataValue('fk_report'));
            const foundReport = await Report.findByPk(reportId, { transaction });
            if (!foundReport) {
                await transaction.rollback();
                return res.status(404).json({ message: 'Report not found' });
            }

            review.set('reviewStatus', decision);
            review.set('fk_user_reviewed', currentUserId);
            review.set('reviewNote', noteValidation.value);
            review.set('reviewedAt', new Date());
            await review.save({ transaction });

            resultingReportStatus = Number(foundReport.getDataValue('reportStatus'));
            if (decision === ReportReviewStatus.APPROVED) {
                foundReport.set('reportStatus', 3);
                await foundReport.save({ transaction });
                resultingReportStatus = 3;
            }

            reportName = String(foundReport.getDataValue('reportName'));
            requesterId = parsePositiveId(review.getDataValue('fk_user_requested'));
            assignedId = parsePositiveId(foundReport.getDataValue('fk_user_assigned'));
            creatorId = parsePositiveId(foundReport.getDataValue('fk_user_creator'));

            const actionLabel = decision === ReportReviewStatus.APPROVED ? 'aprobó' : 'rechazó';
            await createHistoryLog({
                historyDescription: `SuperAdmin ${actionLabel} la solicitud de resolución del reporte "${reportName}" (#${reportId}).`,
                actionType: 'UPDATE',
                userId: currentUserId,
                itemId: foundReport.getDataValue('fk_item'),
                placeId: foundReport.getDataValue('fk_place'),
                reportId,
                transaction
            });

            await transaction.commit();
        } catch (txError) {
            await transaction.rollback();
            throw txError;
        }

        const notificationTargets = decision === ReportReviewStatus.APPROVED
            ? [requesterId, assignedId, creatorId]
            : [requesterId, assignedId];
        const notificationMessage = decision === ReportReviewStatus.APPROVED
            ? `La resolución del reporte "${reportName}" (#${reportId}) fue aprobada y marcada como resuelta.`
            : `La solicitud de resolución del reporte "${reportName}" (#${reportId}) fue rechazada.${noteValidation.value ? ` Motivo: ${noteValidation.value}` : ''}`;

        await notifyDistinctUsers(notificationTargets, currentUserId, reportId, notificationMessage);

        const updatedReview = await ReportResolutionReview.findByPk(parsedReviewId, {
            include: REVIEW_INCLUDES
        });

        return res.status(200).json({
            review: formatResolutionReview(updatedReview),
            reportStatus: resultingReportStatus
        });
    } catch (error) {
        throw error;
    }
};

const GetReportComments = async (req: Request, res: Response) => {
    try {
        const parsedReportId = parsePositiveId(req.params.reportId);
        if (!parsedReportId) {
            return res.status(400).json({ message: 'Invalid Report ID' });
        }

        const foundReport = await Report.findByPk(parsedReportId, {
            attributes: [...REPORT_ACCESS_ATTRIBUTES]
        });
        if (!foundReport) {
            return res.status(404).json({ message: 'Report not found' });
        }

        const access = await assertReportCommentAccess(foundReport, res.locals.jwtPayloadContent);
        if (!access.allowed) {
            return res.status(access.status).json({ message: access.message });
        }

        const comments = await ReportComment.findAll({
            where: { fk_report: parsedReportId },
            include: COMMENT_INCLUDES,
            order: [['createdAt', 'ASC'], ['commentId', 'ASC']]
        });

        return res.status(200).json(comments.map(formatReportComment));
    } catch (error) {
        throw error;
    }
};

const CreateReportComment = async (req: Request, res: Response) => {
    try {
        const parsedReportId = parsePositiveId(req.params.reportId);
        if (!parsedReportId) {
            return res.status(400).json({ message: 'Invalid Report ID' });
        }

        const contentValidation = parseBoundedText(req.body?.content, 1000, false);
        if (!contentValidation.valid || !contentValidation.value) {
            return res.status(400).json({
                message: 'content must be a non-empty string with at most 1000 characters'
            });
        }

        const foundReport = await Report.findByPk(parsedReportId, {
            attributes: [...REPORT_ACCESS_ATTRIBUTES]
        });
        if (!foundReport) {
            return res.status(404).json({ message: 'Report not found' });
        }

        const access = await assertReportCommentAccess(foundReport, res.locals.jwtPayloadContent);
        if (!access.allowed) {
            return res.status(access.status).json({ message: access.message });
        }

        const transaction = await mySequelize.transaction();
        let createdCommentId: number;
        const reportName = String(foundReport.getDataValue('reportName'));

        try {
            const createdComment = await ReportComment.create(
                {
                    fk_report: parsedReportId,
                    fk_user_author: access.userId,
                    content: contentValidation.value,
                    isEdited: false
                },
                { transaction }
            );
            createdCommentId = Number(createdComment.getDataValue('commentId'));

            await createHistoryLog({
                historyDescription: `Se agregó un comentario en el reporte "${reportName}" (#${parsedReportId}).`,
                actionType: 'CREATE',
                userId: access.userId,
                itemId: foundReport.getDataValue('fk_item'),
                placeId: foundReport.getDataValue('fk_place'),
                reportId: parsedReportId,
                transaction
            });

            await transaction.commit();
        } catch (txError) {
            await transaction.rollback();
            throw txError;
        }

        const creatorId = parsePositiveId(foundReport.getDataValue('fk_user_creator'));
        const assignedId = parsePositiveId(foundReport.getDataValue('fk_user_assigned'));
        await notifyDistinctUsers(
            [creatorId, assignedId],
            access.userId,
            parsedReportId,
            `Nuevo comentario en el reporte "${reportName}" (#${parsedReportId}).`
        );

        const commentWithAuthor = await ReportComment.findByPk(createdCommentId, {
            include: COMMENT_INCLUDES
        });

        return res.status(201).json(formatReportComment(commentWithAuthor));
    } catch (error) {
        throw error;
    }
};

const EditReportComment = async (req: Request, res: Response) => {
    try {
        const parsedCommentId = parsePositiveId(req.params.commentId);
        if (!parsedCommentId) {
            return res.status(400).json({ message: 'Invalid Comment ID' });
        }

        const contentValidation = parseBoundedText(req.body?.content, 1000, false);
        if (!contentValidation.valid || !contentValidation.value) {
            return res.status(400).json({
                message: 'content must be a non-empty string with at most 1000 characters'
            });
        }

        const comment = await ReportComment.findByPk(parsedCommentId);
        if (!comment) {
            return res.status(404).json({ message: 'Comment not found' });
        }

        const reportId = Number(comment.getDataValue('fk_report'));
        const foundReport = await Report.findByPk(reportId, {
            attributes: [...REPORT_ACCESS_ATTRIBUTES]
        });
        if (!foundReport) {
            return res.status(404).json({ message: 'Report not found' });
        }

        const access = await assertReportCommentAccess(foundReport, res.locals.jwtPayloadContent);
        if (!access.allowed) {
            return res.status(access.status).json({ message: access.message });
        }

        if (Number(comment.getDataValue('fk_user_author')) !== access.userId) {
            return res.status(403).json({ message: 'Only the original author can edit this comment' });
        }

        const previousContent = String(comment.getDataValue('content'));
        if (previousContent === contentValidation.value) {
            return res.status(400).json({ message: 'Comment content is unchanged' });
        }

        const reportName = String(foundReport.getDataValue('reportName'));
        const transaction = await mySequelize.transaction();

        try {
            await ReportCommentEdit.create(
                {
                    fk_comment: parsedCommentId,
                    fk_user_editor: access.userId,
                    previousContent
                },
                { transaction }
            );

            comment.set('content', contentValidation.value);
            comment.set('isEdited', true);
            await comment.save({ transaction });

            await createHistoryLog({
                historyDescription: `Se editó el comentario #${parsedCommentId} del reporte "${reportName}" (#${reportId}).`,
                actionType: 'UPDATE',
                userId: access.userId,
                itemId: foundReport.getDataValue('fk_item'),
                placeId: foundReport.getDataValue('fk_place'),
                reportId,
                transaction
            });

            await transaction.commit();
        } catch (txError) {
            await transaction.rollback();
            throw txError;
        }

        const updatedComment = await ReportComment.findByPk(parsedCommentId, {
            include: COMMENT_INCLUDES
        });

        return res.status(200).json(formatReportComment(updatedComment));
    } catch (error) {
        throw error;
    }
};

const SetAssignedUser = async (req: Request, res: Response) => {
    try {
        const parsedReportId = parsePositiveId(req.params.reportId);
        const requestedUserId = req.body?.fk_user_assigned;
        const assignedUserId = requestedUserId == null ? null : parsePositiveId(requestedUserId);

        if (!parsedReportId || (requestedUserId != null && !assignedUserId)) {
            return res.status(400).json({
                message: 'fk_user_assigned must be a positive integer or null'
            });
        }

        const foundReport = await Report.findByPk(parsedReportId);
        if (!foundReport) {
            return res.status(404).json({ message: 'Report not found' });
        }

        const currentAssignedId = foundReport.getDataValue('fk_user_assigned');
        if (Number(currentAssignedId ?? 0) === Number(assignedUserId ?? 0)) {
            return res.status(400).json({
                message: 'The assigned user is already set to that value'
            });
        }

        const assignedUser = assignedUserId
            ? await User.findByPk(assignedUserId)
            : null;
        if (assignedUserId) {
            const assignedValidation = validateAssignedUserRecord(assignedUser);
            if (!assignedValidation.valid) {
                return res.status(assignedValidation.status).json({ message: assignedValidation.message });
            }
        }

        foundReport.set('fk_user_assigned', assignedUserId);
        await foundReport.save();

        const currentUserId = res.locals.jwtPayloadContent?.userId
            || Number(foundReport.getDataValue('fk_user_creator'));
        await createHistoryLog({
            historyDescription: assignedUserId
                ? `Se asignó el reporte "${foundReport.getDataValue('reportName')}" (#${parsedReportId}) al usuario ${assignedUserId}.`
                : `Se retiró la asignación del reporte "${foundReport.getDataValue('reportName')}" (#${parsedReportId}).`,
            actionType: 'UPDATE',
            userId: currentUserId,
            itemId: foundReport.getDataValue('fk_item'),
            placeId: foundReport.getDataValue('fk_place'),
            reportId: parsedReportId,
        });

        if (assignedUserId && assignedUserId !== Number(currentUserId)) {
            await createUserNotification({
                notificationType: NotificationType.REPORT,
                requestDescription: `Se te ha asignado el reporte "${foundReport.getDataValue('reportName')}".`,
                fk_trigger: parsedReportId,
                fk_user_trigger: currentUserId || null,
                fk_notified: assignedUserId
            });
        }

        return res.status(200).json({ fk_user_assigned: assignedUserId });
    } catch (error) {
        throw error;
    }
};

const SetDueDate = async (req: Request, res: Response) => {
    try {
        const parsedReportId = parsePositiveId(req.params.reportId);
        const dueDate = req.body?.dueDate;

        if (!parsedReportId || !isValidDate(dueDate)) {
            return res.status(400).json({ message: 'dueDate must use the YYYY-MM-DD format' });
        }

        const foundReport = await Report.findByPk(parsedReportId);
        if (!foundReport) {
            return res.status(404).json({ message: "Report Not Found"});
        }

        const currentDueDate = foundReport.getDataValue('dueDate');
        if (currentDueDate && String(currentDueDate) === dueDate) {
            return res.status(400).json({ message: 'The due date could not change because is the same date' });
        }

        foundReport.set('dueDate', dueDate);
        await foundReport.save();
        await createHistoryLog({
            historyDescription: `Se actualizó la fecha límite del reporte "${foundReport.getDataValue('reportName')}" (#${parsedReportId}) a ${dueDate}.`,
            actionType: 'UPDATE',
            userId: res.locals.jwtPayloadContent?.userId || Number(foundReport.getDataValue('fk_user_creator')),
            itemId: foundReport.getDataValue('fk_item'),
            placeId: foundReport.getDataValue('fk_place'),
            reportId: parsedReportId,
        });

        return res.status(200).json({ dueDate });
    } catch (error) {
        throw error;
    }
}

const setPriority = async (req: Request, res: Response) => {
    try {
        const parsedReportId = parsePositiveId(req.params.reportId);
        const priority = Number(req.body?.reportPriority ?? req.body?.priority);

        if (!parsedReportId || !Number.isInteger(priority) || priority < 1 || priority > 3) {
            return res.status(400).json({ message: 'reportPriority must be an integer between 1 and 3' });
        }

        const foundReport = await Report.findByPk(parsedReportId);
        if (!foundReport){
            return res.status(404).json({ message: "Report Not Found"});
        }

        if (priority === Number(foundReport.getDataValue('reportPriority'))) {
            return res.status(400).json({ message: 'The priority could not change because is the same priority' });
        }

        foundReport.set('reportPriority', priority);
        await foundReport.save();
        await createHistoryLog({
            historyDescription: `Se actualizó la prioridad del reporte "${foundReport.getDataValue('reportName')}" (#${parsedReportId}) a ${priority}.`,
            actionType: 'UPDATE',
            userId: res.locals.jwtPayloadContent?.userId || Number(foundReport.getDataValue('fk_user_creator')),
            itemId: foundReport.getDataValue('fk_item'),
            placeId: foundReport.getDataValue('fk_place'),
            reportId: parsedReportId,
        });

        return res.status(200).json({ reportPriority: priority });
    } catch (error) {
        throw error;
    }
 
}

const deleteReport = async (req: Request, res: Response) => {
    try{
        const parsedReportId = Number(req.params.reportId);

        if (!parsedReportId) {
            return res.status(400).json({ message: 'All parameters must be filled in, please check documentation' });
        }

        const foundReport = await Report.findByPk(parsedReportId);
        if (!foundReport){
            return res.status(404).json({ message: "Report Not Found"})
        }
        await createHistoryLog({
            historyDescription: `Se eliminó el reporte ${parsedReportId}.`,
            actionType: 'DELETE',
            userId: res.locals.jwtPayloadContent?.userId || Number(foundReport.getDataValue('fk_user_creator')),
            itemId: foundReport.getDataValue('fk_item'),
            placeId: foundReport.getDataValue('fk_place'),
            reportId: parsedReportId,
        });
        await foundReport.destroy();

        return res.status(200).json({ message: 'Report deleted successfully' });
    } catch (error) {
        throw error;
    }
}

export {
    CreateReport,
    SearchReportById,
    SearchReports,
    SearchReportsCreatedUser,
    SearchReportsAssignedUser,
    SetReportStatus,
    RequestReportResolution,
    GetReportResolutionReviews,
    ReviewReportResolution,
    GetReportComments,
    CreateReportComment,
    EditReportComment,
    SetAssignedUser,
    SetDueDate,
    setPriority,
    deleteReport
};