import { Item, Request as RequestModel, User } from '@dis/model';
import { NotificationType } from '@dis/model/userNotificationModel.js';
import type { Request, Response } from 'express';
import { createHistoryLog } from '../helpers/historyHelper.js';
import { createUserNotification } from '../helpers/notificationHelper.js';

const REQUEST_INCLUDES = [
    {
        model: User,
        as: 'requester',
        attributes: ['userId', 'firstName', 'lastName']
    },
    {
        model: User,
        as: 'receiver',
        attributes: ['userId', 'firstName', 'lastName']
    },
    {
        model: Item,
        as: 'related_item',
        attributes: ['itemId', 'itemName']
    }
];

const parsePositiveId = (value: unknown) => {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const formatRequest = (requestInstance: any) => {
    const request = typeof requestInstance.toJSON === 'function'
        ? requestInstance.toJSON()
        : requestInstance;
    const { requester, receiver, related_item, ...rest } = request;

    return {
        ...rest,
        fk_user_requester: requester
            ? { id: requester.userId, firstName: requester.firstName, lastName: requester.lastName }
            : null,
        fk_user_reciver: receiver
            ? { id: receiver.userId, firstName: receiver.firstName, lastName: receiver.lastName }
            : null,
        fk_item: related_item
            ? { id: related_item.itemId, itemName: related_item.itemName }
            : null
    };
};

const findRequestId = (req: Request) => parsePositiveId(req.params.id ?? req.params.requestId);

const CreateRequest = async (req: Request, res: Response) => {
    try {
        const { name, description, status, fk_item, fk_user } = req.body ?? {};
        const requesterId = res.locals.jwtPayloadContent?.userId;
        const receiverId = parsePositiveId(fk_user);
        const itemId = parsePositiveId(fk_item);
        const requestStatus = Number(status);

        if (
            typeof name !== 'string' ||
            !name.trim() ||
            typeof description !== 'string' ||
            !description.trim() ||
            !requesterId ||
            !receiverId ||
            !itemId ||
            !Number.isInteger(requestStatus) ||
            requestStatus < 1 ||
            requestStatus > 3
        ) {
            return res.status(400).json({ message: 'Invalid or missing request fields' });
        }

        const [receiver, item] = await Promise.all([
            User.findByPk(receiverId),
            Item.findByPk(itemId)
        ]);
        if (!receiver) return res.status(404).json({ message: 'Receiver user not found' });
        if (!item) return res.status(404).json({ message: 'Item not found' });

        const newRequest = await RequestModel.create({
            requestName: name.trim(),
            requestDescription: description.trim(),
            requestStatus,
            fk_user_requester: requesterId,
            fk_user_reciver: receiverId,
            fk_item: itemId
        });

        await createHistoryLog({
            historyDescription: `Se creó la solicitud ${name}.`,
            actionType: 'CREATE',
            userId: requesterId,
            itemId,
            requestId: (newRequest as any).requestId
        });

        if (receiverId !== Number(requesterId)) {
            await createUserNotification({
                notificationType: NotificationType.REQUEST,
                requestDescription: `Se te ha enviado la solicitud "${name}".`,
                fk_trigger: (newRequest as any).requestId,
                fk_user_trigger: requesterId,
                fk_notified: receiverId
            });
        }

        const createdRequest = await RequestModel.findByPk((newRequest as any).requestId, {
            include: REQUEST_INCLUDES
        });
        return res.status(201).json(formatRequest(createdRequest));
    } catch (error) {
        throw error;
    }
};

const SearchUserRequests = async (req: Request, res: Response) => {
    try {
        const userId = parsePositiveId(req.params.userId);
        const jwtPayload = res.locals.jwtPayloadContent;
        if (!userId) return res.status(400).json({ message: 'A valid User ID is required' });
        if (!jwtPayload) return res.status(401).json({ message: 'Authentication required' });
        if (jwtPayload.role > 2 && Number(jwtPayload.userId) !== userId) {
            return res.status(403).json({ message: 'You can only access your own requests' });
        }

        const user = await User.findByPk(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const requests = await RequestModel.findAll({
            where: { fk_user_requester: userId },
            attributes: ['requestId', 'requestName', 'requestStatus', 'createdAt'],
            include: REQUEST_INCLUDES,
            order: [['createdAt', 'DESC']]
        });
        return res.status(200).json(requests.map(formatRequest));
    } catch (error) {
        throw error;
    }
};

const SearchReceivedRequests = async (req: Request, res: Response) => {
    try {
        const userId = parsePositiveId(req.params.userId);
        const jwtPayload = res.locals.jwtPayloadContent;
        if (!userId) return res.status(400).json({ message: 'A valid User ID is required' });
        if (!jwtPayload) return res.status(401).json({ message: 'Authentication required' });
        if (jwtPayload.role > 2 && Number(jwtPayload.userId) !== userId) {
            return res.status(403).json({ message: 'You can only access your own received requests' });
        }

        const user = await User.findByPk(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const requests = await RequestModel.findAll({
            where: { fk_user_reciver: userId },
            include: REQUEST_INCLUDES,
            order: [['createdAt', 'DESC']]
        });
        return res.status(200).json(requests.map(formatRequest));
    } catch (error) {
        throw error;
    }
};

const SearchAllRequests = async (_req: Request, res: Response) => {
    try {
        const requests = await RequestModel.findAll({
            include: REQUEST_INCLUDES,
            order: [['createdAt', 'DESC']]
        });

        return res.status(200).json(requests.map(formatRequest));
    } catch (error) {
        throw error;
    }
};

const SetRequestReceiver = async (req: Request, res: Response) => {
    try {
        const requestId = findRequestId(req);
        const receiverId = parsePositiveId(req.body?.fk_user);
        if (!requestId || !receiverId) {
            return res.status(400).json({ message: 'A valid request ID and fk_user are required' });
        }

        const request = await RequestModel.findByPk(requestId);
        if (!request) return res.status(404).json({ message: 'Request not found' });
        if (Number(request.getDataValue('fk_user_reciver')) === receiverId) {
            return res.status(400).json({ message: 'The request is already assigned to that user' });
        }

        const receiver = await User.findByPk(receiverId);
        if (!receiver) return res.status(404).json({ message: 'Receiver user not found' });

        request.set('fk_user_reciver', receiverId);
        await request.save();

        const currentUserId = res.locals.jwtPayloadContent?.userId
            || Number(request.getDataValue('fk_user_requester'));
        await createHistoryLog({
            historyDescription: `Se cambió el receptor de la solicitud #${requestId} al usuario ${receiverId}.`,
            actionType: 'UPDATE',
            userId: currentUserId,
            itemId: request.getDataValue('fk_item'),
            requestId
        });

        if (receiverId !== Number(currentUserId)) {
            await createUserNotification({
                notificationType: NotificationType.REQUEST,
                requestDescription: `Se te ha asignado la solicitud "${request.getDataValue('requestName')}".`,
                fk_trigger: requestId,
                fk_user_trigger: currentUserId,
                fk_notified: receiverId
            });
        }

        return res.status(200).json({ fk_user_reciver: receiverId });
    } catch (error) {
        throw error;
    }
};

const UpdatePendingRequest = async (req: Request, res: Response) => {
    try {
        const requestId = findRequestId(req);
        if (!requestId) return res.status(400).json({ message: 'Invalid Request ID' });

        const request = await RequestModel.findByPk(requestId);
        if (!request) return res.status(404).json({ message: 'Request not found' });
        if (Number(request.getDataValue('requestStatus')) !== 1) {
            return res.status(409).json({ message: 'Only pending requests can be updated' });
        }

        const { name, description, fk_item, fk_user } = req.body ?? {};
        const updates: Record<string, unknown> = {};
        if (name !== undefined) {
            if (typeof name !== 'string' || !name.trim()) {
                return res.status(400).json({ message: 'name must be a non-empty string' });
            }
            updates.requestName = name.trim();
        }
        if (description !== undefined) {
            if (typeof description !== 'string' || !description.trim()) {
                return res.status(400).json({ message: 'description must be a non-empty string' });
            }
            updates.requestDescription = description.trim();
        }
        if (fk_item !== undefined) {
            const itemId = parsePositiveId(fk_item);
            if (!itemId) return res.status(400).json({ message: 'fk_item must be a positive integer' });
            if (!await Item.findByPk(itemId)) return res.status(404).json({ message: 'Item not found' });
            updates.fk_item = itemId;
        }
        if (fk_user !== undefined) {
            const receiverId = parsePositiveId(fk_user);
            if (!receiverId) return res.status(400).json({ message: 'fk_user must be a positive integer' });
            if (!await User.findByPk(receiverId)) return res.status(404).json({ message: 'Receiver user not found' });
            updates.fk_user_reciver = receiverId;
        }
        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ message: 'At least one field must be provided' });
        }

        await request.update(updates);
        await createHistoryLog({
            historyDescription: `Se actualizó la solicitud #${requestId}.`,
            actionType: 'UPDATE',
            userId: res.locals.jwtPayloadContent?.userId || Number(request.getDataValue('fk_user_requester')),
            itemId: (updates.fk_item as number | undefined) || request.getDataValue('fk_item'),
            requestId
        });

        const updatedRequest = await RequestModel.findByPk(requestId, { include: REQUEST_INCLUDES });
        return res.status(200).json(formatRequest(updatedRequest));
    } catch (error) {
        throw error;
    }
};

const RequestSummary = async (_req: Request, res: Response) => {
    try {
        const requests = await RequestModel.findAll({
            attributes: ['requestStatus']
        });
        const summary = requests.reduce(
            (counts, request) => {
                const status = Number(request.getDataValue('requestStatus'));
                if (status === 1) counts.pending += 1;
                if (status === 2) counts.accepted += 1;
                if (status === 3) counts.rejected += 1;
                return counts;
            },
            { pending: 0, accepted: 0, rejected: 0, total: 0 }
        );
        summary.total = requests.length;
        return res.status(200).json(summary);
    } catch (error) {
        throw error;
    }
};

const SearchRequestById = async (req: Request, res: Response) => {
    try {
        const requestId = findRequestId(req);
        if (!requestId) return res.status(400).json({ message: 'Invalid Request ID' });

        const request = await RequestModel.findByPk(requestId, { include: REQUEST_INCLUDES });
        if (!request) return res.status(404).json({ message: 'Request not found' });

        const jwtPayload = res.locals.jwtPayloadContent;
        const requesterId = request.getDataValue('fk_user_requester');
        const receiverId = request.getDataValue('fk_user_reciver');
        if (
            jwtPayload?.role > 2 &&
            Number(jwtPayload.userId) !== Number(requesterId) &&
            Number(jwtPayload.userId) !== Number(receiverId)
        ) {
            return res.status(403).json({ message: 'You cannot access this request' });
        }

        return res.status(200).json(formatRequest(request));
    } catch (error) {
        throw error;
    }
};

const SetRequestStatus = (status: number, label: string) =>
    async (req: Request, res: Response) => {
        try {
            const requestId = findRequestId(req);
            if (!requestId) return res.status(400).json({ message: 'Invalid Request ID' });

            const request = await RequestModel.findByPk(requestId);
            if (!request) return res.status(404).json({ message: 'Request not found' });
            if (Number(request.getDataValue('requestStatus')) === status) {
                return res.status(400).json({ message: `Request is already ${label}` });
            }

            request.set('requestStatus', status);
            await request.save();
            await createHistoryLog({
                historyDescription: `Se marcó la solicitud #${requestId} como ${label}.`,
                actionType: 'UPDATE',
                userId: res.locals.jwtPayloadContent?.userId || Number(request.getDataValue('fk_user_requester')),
                itemId: request.getDataValue('fk_item'),
                requestId
            });

            return res.status(200).json({ requestStatus: status });
        } catch (error) {
            throw error;
        }
    };

const DeleteRequest = async (req: Request, res: Response) => {
    try {
        const requestId = findRequestId(req);
        if (!requestId) return res.status(400).json({ message: 'Invalid Request ID' });

        const request = await RequestModel.findByPk(requestId);
        if (!request) return res.status(404).json({ message: 'Request not found' });

        await createHistoryLog({
            historyDescription: `Se eliminó la solicitud #${requestId}.`,
            actionType: 'DELETE',
            userId: res.locals.jwtPayloadContent?.userId || Number(request.getDataValue('fk_user_requester')),
            itemId: request.getDataValue('fk_item'),
            requestId
        });
        await request.destroy();
        return res.status(200).json({ message: 'Request deleted successfully' });
    } catch (error) {
        throw error;
    }
};

const AcceptRequest = SetRequestStatus(2, 'accepted');
const RejectRequest = SetRequestStatus(3, 'rejected');

export {
    CreateRequest,
    SearchUserRequests,
    SearchReceivedRequests,
    SearchAllRequests,
    SetRequestReceiver,
    UpdatePendingRequest,
    RequestSummary,
    SearchRequestById,
    AcceptRequest,
    RejectRequest,
    DeleteRequest
};
