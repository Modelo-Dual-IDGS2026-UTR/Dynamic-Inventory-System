import { Employee, Item, Request as RequestModel, User } from '@dis/model';
import { NotificationType } from '@dis/model/userNotificationModel.js';
import { mySequelize } from '@dis/db/dbConection.js';
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

interface RequestResponseData {
    [key: string]: unknown;
    requester?: { userId: number; firstName: string; lastName: string } | null;
    receiver?: { userId: number; firstName: string; lastName: string } | null;
    related_item?: { itemId: number; itemName: string } | null;
}

const formatRequest = (requestInstance: InstanceType<typeof RequestModel> | null) => {
    const request = requestInstance?.toJSON() as RequestResponseData | undefined;
    if (!request) {
        return null;
    }
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
        const requesterId = parsePositiveId(res.locals.jwtPayloadContent?.userId);
        const receiverReference = parsePositiveId(fk_user);
        const itemId = parsePositiveId(fk_item);
        const requestStatus = Number(status);
        const requestName = typeof name === 'string' ? name.trim() : '';
        const requestDescription = typeof description === 'string' ? description.trim() : '';

        if (
            !requestName ||
            !requestDescription ||
            requestName.length > 100 ||
            requestDescription.length > 1000 ||
            !requesterId ||
            !receiverReference ||
            !itemId ||
            !Number.isInteger(requestStatus) ||
            requestStatus < 1 ||
            requestStatus > 3
        ) {
            return res.status(400).json({
                message: 'Invalid or missing request fields',
                details: {
                    name: 'required, maximum 100 characters',
                    description: 'required, maximum 1000 characters',
                    status: 'must be an integer between 1 and 3',
                    fk_item: 'must be a positive integer',
                    fk_user: 'must be a positive integer'
                }
            });
        }

        const [requester, item] = await Promise.all([
            User.findByPk(requesterId),
            Item.findByPk(itemId)
        ]);
        const receiver = await User.findByPk(receiverReference)
            || await User.findOne({ where: { employeeId: receiverReference } });
        const receiverId = receiver?.getDataValue('userId') ?? null;
        if (!requester) {
            return res.status(401).json({
                message: 'Authenticated user not found. Please sign in again.'
            });
        }
        if (!receiver || !receiverId) return res.status(404).json({ message: 'Receiver user not found' });
        if (!item) return res.status(404).json({ message: 'Item not found' });

        const newRequest = await RequestModel.create({
            requestName,
            requestDescription,
            requestStatus,
            fk_user_requester: requesterId,
            fk_user_reciver: receiverId,
            fk_item: itemId
        });

        await createHistoryLog({
            historyDescription: `Se creó la solicitud ${requestName}.`,
            actionType: 'CREATE',
            userId: requesterId,
            itemId,
            requestId: newRequest.getDataValue('requestId')
        });

        if (receiverId !== Number(requesterId)) {
            await createUserNotification({
                notificationType: NotificationType.REQUEST,
                requestDescription: `Se te ha enviado la solicitud "${requestName}".`,
                fk_trigger: newRequest.getDataValue('requestId'),
                fk_user_trigger: requesterId,
                fk_notified: receiverId
            });
        }

        const createdRequest = await RequestModel.findByPk(newRequest.getDataValue('requestId'), {
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
        if (jwtPayload.role > 1 && Number(jwtPayload.userId) !== userId) {
            return res.status(403).json({ message: 'You can only access your own created requests' });
        }

        const user = await User.findByPk(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const requests = await RequestModel.findAll({
            where: { fk_user_requester: userId },
            attributes: ['requestId', 'requestName', 'requestDescription', 'requestStatus', 'createdAt'],
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
        if (jwtPayload.role > 1 && Number(jwtPayload.userId) !== userId) {
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
        if (jwtPayload?.role > 1 &&
            Number(jwtPayload.userId) !== Number(requesterId) &&
            Number(jwtPayload.userId) !== Number(receiverId)) {
            return res.status(403).json({ message: 'You can only access your own or received requests' });
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
            const jwtPayload = res.locals.jwtPayloadContent;
            if (status === 2 &&
                Number(jwtPayload?.userId) === Number(request.getDataValue('fk_user_requester'))) {
                return res.status(403).json({ message: 'You cannot accept your own request' });
            }
            if (jwtPayload?.role === 2 &&
                Number(jwtPayload.userId) !== Number(request.getDataValue('fk_user_requester')) &&
                Number(jwtPayload.userId) !== Number(request.getDataValue('fk_user_reciver'))) {
                return res.status(403).json({ message: 'You can only resolve your own or received requests' });
            }
            if (Number(request.getDataValue('requestStatus')) === status) {
                return res.status(400).json({ message: `Request is already ${label}` });
            }

            const itemId = Number(request.getDataValue('fk_item'));
            let requesterEmployeeId: number | null = null;
            if (status === 2) {
                const requester = await User.findByPk(Number(request.getDataValue('fk_user_requester')));
                const item = Number.isInteger(itemId) && itemId > 0 ? await Item.findByPk(itemId) : null;
                requesterEmployeeId = requester?.getDataValue('employeeId') ?? null;
                if (!requester || !requesterEmployeeId) {
                    return res.status(409).json({
                        message: 'The requester is not linked to an employee and cannot receive this item'
                    });
                }
                if (!item) return res.status(404).json({ message: 'Item associated with the request not found' });
            }
            const previousResponsible = status === 2
                ? await Employee.findByPk((await Item.findByPk(itemId))?.getDataValue('fk_user_responsible'))
                : null;
            const newResponsible = status === 2 && requesterEmployeeId
                ? await Employee.findByPk(requesterEmployeeId)
                : null;

            await mySequelize.transaction(async (transaction) => {
                if (status === 2 && requesterEmployeeId) {
                    const item = await Item.findByPk(itemId, { transaction });
                    if (!item) throw new Error('Item associated with the request not found');
                    item.set('fk_user_responsible', requesterEmployeeId);
                    await item.save({ transaction });
                }
                request.set('requestStatus', status);
                await request.save({ transaction });
            });
            await createHistoryLog({
                historyDescription: status === 2
                    ? `Se transfirió el resguardo del item #${itemId} de "${previousResponsible ? `${previousResponsible.getDataValue('firstName')} ${previousResponsible.getDataValue('lastName')}` : 'sin responsable'}" a "${newResponsible ? `${newResponsible.getDataValue('firstName')} ${newResponsible.getDataValue('lastName')}` : 'nuevo responsable'}".`
                    : `Se marcó la solicitud #${requestId} como ${label}.`,
                actionType: status === 2 ? 'TRANSFER' : 'UPDATE',
                userId: res.locals.jwtPayloadContent?.userId || Number(request.getDataValue('fk_user_requester')),
                itemId,
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
