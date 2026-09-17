import { Report, User, Item, Place } from '@dis/model';
import type { Response, Request } from 'express';
import { type WhereOptions } from 'sequelize';

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

        await Report.create({
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

        return res.status(200).json({ message: 'Item successfully created' });
    } catch (error) {
        return res.status(500).json({ message: 'Internal server error, not your fault :D', error });
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
        return res.status(500).json({ message: 'Internal server error, not your fault :D', error });
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
        return res.status(500).json({ message: 'Internal server error, not your fault :D', error });
    }
};

const SearchReportsCreatedUser = async (req: Request, res: Response) => {
    try {
        const parsedUserId = Number(req.params.userId);
        if (isNaN(parsedUserId) || !Number.isInteger(parsedUserId) || parsedUserId <= 0) {
            return res.status(400).json({ message: 'A valid User ID is required' });
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
        return res.status(500).json({ message: 'Internal server error, not your fault :D', error });
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
        foundReport.set('reportStatus', status);
        await foundReport.save();
        return res.status(200).json({ message: 'Report status successfully updated' });
    } catch (error) {
        return res.status(500).json({ message: 'Internal server error, not your fault :D', error });
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
            res.status(404).json({ message: "Report Not Found"})
        }
        foundReport?.set('dueDate', dueDate);
        await foundReport?.save()   

        return res.status(200).json({ message: 'Report Due Date successfully updated' });
    } catch (error) {
        return res.status(500).json({ message: 'Internal server error, not your fault :D', error });
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
            res.status(404).json({ message: "Report Not Found"})
        }
        foundReport?.set('reportPriority', priority);
        foundReport?.save();

        return res.status(200).json({ message: 'Report priority successfully updated' });
    } catch (error) {
        return res.status(500).json({ message: 'Internal server error, not your fault :D', error });
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
            res.status(404).json({ message: "Report Not Found"})
        }
        foundReport?.destroy();

        return res.status(200).json({ message: 'Report deleted successfully' });
    } catch (error) {
        return res.status(500).json({ message: 'Internal erver error, not your fault :D', error });
    }
}

function FilterOptions<T extends object = Record<string, unknown>>(filter: Record<string, unknown>): WhereOptions<T> {
    const whereClause: WhereOptions<T> = {};
    Object.entries(filter).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            (whereClause as Record<string, unknown>)[key] = value;
        }
    });
    return whereClause;
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