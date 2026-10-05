import { History, Report, Place, User, Request as RequestModel } from '@dis/model'
import type { Response, Request } from 'express';

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

        return res.status(200).json(foundHistory);
    } catch (error) {
        return res.status(500).json({ message: 'Internal server error, not your fault :D', error });
    }
};

export {
    AllItemHistory
}