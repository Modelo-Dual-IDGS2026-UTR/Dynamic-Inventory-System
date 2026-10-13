import { Report, User, Item, Place } from '@dis/model';
import { NotificationType } from '@dis/model/userNotificationModel.js';
import type { Response, Request } from 'express';
import { type WhereOptions } from 'sequelize';
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
const formatReport = (reportInstance: any) => {
    const report = typeof reportInstance.toJSON === 'function' ? reportInstance.toJSON() : reportInstance;
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

const CreateReport = async (req: Request, res: Response) => {
    try {
        const {
            reportName,
            reportDescription,
            reportStatus,
            reportPriority,
            dueDate,
            fk_user_assigned,
            fk_user_creator,
            fk_item,
            fk_place
        } = req.body;

        if (
            !reportName ||
            !reportDescription ||
            !reportStatus ||
            !reportPriority ||
            !dueDate ||
            !fk_user_assigned ||
            !fk_user_creator ||
            !fk_item ||
            !fk_place
        ) {
            return res.status(400).json({ message: 'All parameters must be filled in, please check documentation' });
        }

        const [item, place] = await Promise.all([
            Item.findByPk(fk_item),
            Place.findByPk(fk_place)
        ]);

        if (!item) return res.status(404).json({ message: 'Item not found' });
        if (!place) return res.status(404).json({ message: 'Place not found' });

        const newReport = await Report.create({
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

        await createHistoryLog({
            historyDescription: `Se creó el reporte ${reportName}.`,
            actionType: 'REPORT',
            userId: res.locals.jwtPayloadContent?.userId || Number(fk_user_creator),
            itemId: fk_item,
            placeId: fk_place,
            reportId: (newReport as any).reportId,
        });

        const currentUserId = res.locals.jwtPayloadContent?.userId || Number(fk_user_creator);
        if (fk_user_assigned && Number(fk_user_assigned) !== Number(currentUserId)) {
            await createUserNotification({
                notificationType: NotificationType.REPORT,
                requestDescription: `Se te ha asignado el reporte "${reportName}".`,
                fk_trigger: (newReport as any).reportId,
                fk_user_trigger: currentUserId || null,
                fk_notified: Number(fk_user_assigned)
            });
        }

        return res.status(200).json({ message: 'Item successfully created' });
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
            return res.status(404).json({ message: 'Item not found' });
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

const SetReportStatus = async (req: Request, res: Response) => {
    try {
        const {status} = req.body;
        const parsedReportId = Number(req.params.reportId);
        if (!parsedReportId || !status) {
            return res.status(400).json({ message: 'All parameters must be filled in, please check documentation' });
        }
        const foundReport = await Report.findByPk(parsedReportId);
        if (!foundReport) {
            return res.status(404).json({ message: 'Report not found' });
        }

        if (status === foundReport.getDataValue('reportStatus')) {
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

        return res.status(200).json({ message: 'Report status successfully updated' });
    } catch (error) {
        throw error;
    }
}

const SetDueDate = async (req: Request, res: Response) => {
    try {
        const parsedReportId = Number(req.params.reportId);
        const dueDate = req.body;

        if (!parsedReportId || !dueDate) {
            return res.status(400).json({ message: 'All parameters must be filled in, please check documentation' });
        }

        const foundReport = await Report.findByPk(parsedReportId);
        if (!foundReport) {
            return res.status(404).json({ message: "Report Not Found"});
        }

        const currentDueDate = foundReport.getDataValue('dueDate');
        if (currentDueDate && new Date(dueDate).getTime() === new Date(currentDueDate).getTime()) {
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

        return res.status(200).json({ message: 'Report Due Date successfully updated' });
    } catch (error) {
        throw error;
    }
}

const setPriority = async (req: Request, res: Response) => {
    try {
        const parsedReportId = Number(req.params.reportId);
        const priority = req.body;

        if (!parsedReportId || !priority) {
            return res.status(400).json({ message: 'All parameters must be filled in, please check documentation' });
        }

        const foundReport = await Report.findByPk(parsedReportId);
        if (!foundReport){
            return res.status(404).json({ message: "Report Not Found"});
        }

        if (priority === foundReport.getDataValue('reportPriority')) {
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

        return res.status(200).json({ message: 'Report priority successfully updated' });
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
    SetReportStatus,
    SetDueDate,
    setPriority,
    deleteReport
};