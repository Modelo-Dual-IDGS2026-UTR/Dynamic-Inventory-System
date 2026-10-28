import { History, Report, Place, Item, User, Request as RequestModel } from '@dis/model'
import type { Response, Request } from 'express';

const formatHistory = (historyInstance: InstanceType<typeof History>) => {
    const history = typeof historyInstance.toJSON === 'function'
        ? historyInstance.toJSON()
        : historyInstance;
    const {
        related_user,
        related_place,
        related_report,
        related_request,
        related_item,
        ...rest
    } = history;

    return {
        ...rest,
        fk_user: related_user
            ? {
                id: related_user.userId,
                firstName: related_user.firstName,
                lastName: related_user.lastName,
                email: related_user.email
            }
            : null,
        
        fk_place: related_place
            ? { id: related_place.placeId, name: related_place.placeName }
            : null,
        fk_report: related_report
            ? {
                id: related_report.reportId,
                name: related_report.reportName,
                status: related_report.reportStatus
            }
            : null,
        fk_request: related_request
            ? {
                id: related_request.requestId,
                name: related_request.requestName,
                status: related_request.requestStatus
            }
            : null,
        fk_item: related_item
            ? {
                id: related_item.itemId,
                name: related_item.itemName,
                description: related_item.itemDescription
            }
            : rest.fk_item
    };
};

const AllItemHistory = async (req: Request, res: Response) => {
    try {
        const itemId = Number(req.params.itemId);

        if (!itemId || isNaN(itemId) || !Number.isInteger(itemId) || itemId <= 0) {
            return res.status(400).json({ message: 'Invalid Item ID' });
        }

        const foundHistory = await History.findAll({
            where: {fk_item: itemId},
            order: [['createdAt', 'DESC']],
            include: [
                {
                    model: User,
                    as: 'related_user',
                    attributes: ['userId', 'firstName', 'lastName', 'email']
                },
                 {
                    model: Place,
                    as: 'related_place',
                    attributes: ['placeId', 'placeName']
                },
                {
                    model: Report,
                    as: 'related_report',
                    attributes: ['reportId', 'reportName', 'reportStatus']
                },
                {
                    model: RequestModel,
                    as: 'related_request',
                    attributes: ['requestId', 'requestName', 'requestStatus']
                }
            ]
        });

        return res.status(200).json(foundHistory.map(formatHistory));
    } catch (error) {
        throw error;
    }
};

const AllUserHistory = async (req: Request, res: Response) => {
    try {
        const userId = Number(req.params.userId);

        if (!userId || isNaN(userId) || !Number.isInteger(userId) || userId <= 0) {
            return res.status(400).json({ message: 'Invalid User ID' });
        }

        const foundHistory = await History.findAll({
            where: {fk_user: userId},
            order: [['createdAt', 'DESC']],
            include: [
                {
                    model: User,
                    as: 'related_user',
                    attributes: ['userId', 'firstName', 'lastName', 'email']
                },
                {
                    model: Item,
                    as: 'related_item',
                    attributes: ['itemId', 'itemName', 'itemDescription']
                },
                 {
                    model: Place,
                    as: 'related_place',
                    attributes: ['placeId', 'placeName']
                },
                {
                    model: Report,
                    as: 'related_report',
                    attributes: ['reportId', 'reportName', 'reportStatus']
                },
                {
                    model: RequestModel,
                    as: 'related_request',
                    attributes: ['requestId', 'requestName', 'requestStatus']
                }
            ]
        });

        return res.status(200).json(foundHistory.map(formatHistory));
    } catch (error) {
        throw error;
    }
};

export {
    AllItemHistory,
    AllUserHistory
}