import { Report, User, Item, Place } from '@dis/model';
import { NotificationType } from '@dis/model/userNotificationModel.js';
import type { Response, Request } from 'express';
import { FilterOptions } from "../helpers/filterOptions.js";
import { createHistoryLog } from '../helpers/historyHelper.js';
import { createUserNotification } from '../helpers/notificationHelper.js';

// Standard includes for Report queries
const REPORT_INCLUDES = [
    {
        model: Place,
        as: 'related_place',
        attributes: ['placeId', 'placeName']
    },
    {
        model: User,
        as: 'related_user_assigned',
        attributes: ['userId', 'firstName', 'lastName']
    },
    {
        model: User,
        as: 'related_user_creator',
        attributes: ['userId', 'firstName', 'lastName']
    },
    {
        model: Item,
        as: 'related_item',
        attributes: ['itemId', 'itemName']
    }
];

// Helper to format report JSON response
interface ReportResponseData {
    [key: string]: unknown;
    related_place?: { placeId: number; placeName: string } | null;
    related_user_assigned?: { userId: number; firstName: string; lastName: string } | null;
    related_user_creator?: { userId: number; firstName: string; lastName: string } | null;
    related_item?: { itemId: number; itemName: string } | null;
}

const formatReport = (reportInstance: InstanceType<typeof Report> | null) => {
    const report = reportInstance?.toJSON() as ReportResponseData | undefined;
    if (!report) {
        return null;
    }
    const { related_place, related_user_assigned, related_user_creator, related_item, ...rest } = report;

    return {
        ...rest,
        fk_place: related_place
            ? { id: related_place.placeId, name: related_place.placeName }
            : null,
        fk_user_assigned: related_user_assigned
            ? { id: related_user_assigned.userId, firstName: related_user_assigned.firstName, lastName: related_user_assigned.lastName }
            : null,
        fk_user_creator: related_user_creator
            ? { id: related_user_creator.userId, firstName: related_user_creator.firstName, lastName: related_user_creator.lastName }
            : null,
        fk_item: related_item
            ? { id: related_item.itemId, itemName: related_item.itemName }
            : null
    };
};

const parsePositiveId = (value: unknown) => {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const isValidDate = (value: unknown) => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
    }

    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
};

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
        const creatorId = res.locals.jwtPayloadContent?.userId;
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

        const [creator, assignedUser, item, place] = await Promise.all([
            User.findByPk(creatorId),
            assignedId ? User.findByPk(assignedId) : null,
            itemId ? Item.findByPk(itemId) : null,
            placeId ? Place.findByPk(placeId) : null
        ]);

        if (!creator) return res.status(404).json({ message: 'Creator user not found' });
        if (assignedId && !assignedUser) return res.status(404).json({ message: 'Assigned user not found' });
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
        if (!parsedReportId || !Number.isInteger(status) || status < 1 || status > 3) {
            return res.status(400).json({ message: 'Status must be an integer between 1 and 3' });
        }
        const foundReport = await Report.findByPk(parsedReportId);
        if (!foundReport) {
            return res.status(404).json({ message: 'Report not found' });
        }

        if (status === Number(foundReport.getDataValue('reportStatus'))) {
            return res.status(400).json({ message: 'The status could not change because is the same status' });
        }

        foundReport.set('reportStatus', status);
        await foundReport.save();
        await createHistoryLog({
            historyDescription: `Se actualizó el estado del reporte "${foundReport.getDataValue('reportName')}" (#${parsedReportId}) a ${status}.`,
            actionType: 'UPDATE',
            userId: res.locals.jwtPayloadContent?.userId || Number(foundReport.getDataValue('fk_user_creator')),
            itemId: foundReport.getDataValue('fk_item'),
            placeId: foundReport.getDataValue('fk_place'),
            reportId: parsedReportId,
        });

        const creatorId = foundReport.getDataValue('fk_user_creator');
        const assignedId = foundReport.getDataValue('fk_user_assigned');
        const currentUserId = res.locals.jwtPayloadContent?.userId;

        if (creatorId && Number(creatorId) !== Number(currentUserId)) {
            await createUserNotification({
                notificationType: NotificationType.REPORT,
                requestDescription: `Tu reporte "${foundReport.getDataValue('reportName')}" (#${parsedReportId}) ha cambiado a estado: ${status}.`,
                fk_trigger: parsedReportId,
                fk_user_trigger: currentUserId || null,
                fk_notified: Number(creatorId)
            });
        }
        if (assignedId && Number(assignedId) !== Number(currentUserId) && Number(assignedId) !== Number(creatorId)) {
            await createUserNotification({
                notificationType: NotificationType.REPORT,
                requestDescription: `El reporte "${foundReport.getDataValue('reportName')}" (#${parsedReportId}) asignado a ti cambió a estado: ${status}.`,
                fk_trigger: parsedReportId,
                fk_user_trigger: currentUserId || null,
                fk_notified: Number(assignedId)
            });
        }

        return res.status(200).json({ status });
    } catch (error) {
        throw error;
    }
}

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
        if (assignedUserId && !assignedUser) {
            return res.status(404).json({ message: 'Assigned user not found' });
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
    SetAssignedUser,
    SetDueDate,
    setPriority,
    deleteReport
};