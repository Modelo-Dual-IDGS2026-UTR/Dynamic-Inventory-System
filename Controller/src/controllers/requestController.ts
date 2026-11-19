import { Employee, Item, Request as RequestModel, User } from '@dis/model';
import { NotificationType } from '@dis/model/userNotificationModel.js';
import { mySequelize } from '@dis/db/dbConection.js';
import { Op } from 'sequelize';
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
            requestStatus !== 1
        ) {
            return res.status(400).json({
                message: 'Invalid or missing request fields',
                details: {
                    name: 'required, maximum 100 characters',
                    description: 'required, maximum 1000 characters',
                    status: 'must be 1 (pending)',
                    fk_item: 'must be a positive integer',
                    fk_user: 'must be a positive integer'
                }
            });
        }

        const [requester, item] = await Promise.all([
            User.findByPk(requesterId),
            Item.findByPk(itemId)
        ]);
        const receiver = await User.findOne({ where: { employeeId: receiverReference } });
        const receiverId = receiver?.getDataValue('userId') ?? null;
        if (!requester) {
            return res.status(401).json({
                message: 'Authenticated user not found. Please sign in again.'
            });
        }
        if (!receiver || !receiverId) return res.status(404).json({ message: 'Receiver user not found' });
        if (!item) return res.status(404).json({ message: 'Item not found' });

        const requesterEmployeeId = requester.getDataValue('employeeId');
        const responsibleEmployeeId = item.getDataValue('fk_user_responsible');
        if (!requesterEmployeeId) {
            return res.status(409).json({
                message: 'The requester is not linked to an employee and cannot receive this item'
            });
        }
        if (!responsibleEmployeeId) {
            return res.status(409).json({ message: 'The item does not have a responsible employee' });
        }
        if (Number(requesterEmployeeId) === Number(responsibleEmployeeId)) {
            return res.status(409).json({ message: 'You cannot request an item from your own custody' });
        }
        if (Number(receiver.getDataValue('employeeId')) !== Number(responsibleEmployeeId)) {
            return res.status(409).json({
                message: 'The request receiver must be the employee responsible for the item'
            });
        }

        const duplicatePendingRequest = await RequestModel.findOne({
            where: {
                fk_user_requester: requesterId,
                fk_item: itemId,
                requestStatus: 1
            }
        });
        if (duplicatePendingRequest) {
            return res.status(409).json({ message: 'You already have a pending request for this item' });
        }

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
        const requestedReceiverId = parsePositiveId(req.body?.fk_user);
        if (!requestId || !requestedReceiverId) {
            return res.status(400).json({ message: 'A valid request ID and fk_user are required' });
        }

        const request = await RequestModel.findByPk(requestId);
        if (!request) return res.status(404).json({ message: 'Request not found' });
        const jwtPayload = res.locals.jwtPayloadContent;
        const requesterId = Number(request.getDataValue('fk_user_requester'));
        const currentReceiverId = Number(request.getDataValue('fk_user_reciver'));
        if (jwtPayload?.role !== 1 &&
            Number(jwtPayload?.userId) !== requesterId &&
            Number(jwtPayload?.userId) !== currentReceiverId) {
            return res.status(403).json({ message: 'Only the requester, responsible receiver, or superadmin can reassign this request' });
        }
        if (Number(request.getDataValue('requestStatus')) !== 1) {
            return res.status(409).json({ message: 'Only pending requests can be reassigned' });
        }
        if (Number(request.getDataValue('fk_user_reciver')) === requestedReceiverId) {
            return res.status(400).json({ message: 'The request is already assigned to that user' });
        }

        const receiver = await User.findByPk(requestedReceiverId);
        if (!receiver) return res.status(404).json({ message: 'Receiver user not found' });
        const item = await Item.findByPk(Number(request.getDataValue('fk_item')));
        if (!item) return res.status(404).json({ message: 'Item associated with the request not found' });
        const responsibleEmployeeId = item.getDataValue('fk_user_responsible');
        const receiverEmployeeId = receiver.getDataValue('employeeId');
        if (!receiverEmployeeId ||
            Number(receiverEmployeeId) !== Number(responsibleEmployeeId)) {
            return res.status(409).json({
                message: 'The receiver must be the employee responsible for the item'
            });
        }

        request.set('fk_user_reciver', requestedReceiverId);
        await request.save();

        const currentUserId = res.locals.jwtPayloadContent?.userId
            || requesterId;
        await createHistoryLog({
            historyDescription: `Se cambió el receptor de la solicitud #${requestId} al usuario ${requestedReceiverId}.`,
            actionType: 'UPDATE',
            userId: currentUserId,
            itemId: request.getDataValue('fk_item'),
            requestId
        });

        if (requestedReceiverId !== Number(currentUserId)) {
            await createUserNotification({
                notificationType: NotificationType.REQUEST,
                requestDescription: `Se te ha asignado la solicitud "${request.getDataValue('requestName')}".`,
                fk_trigger: requestId,
                fk_user_trigger: currentUserId,
                fk_notified: requestedReceiverId
            });
        }

        return res.status(200).json({ fk_user_reciver: requestedReceiverId });
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
        const jwtPayload = res.locals.jwtPayloadContent;
        const requesterId = Number(request.getDataValue('fk_user_requester'));
        const receiverId = Number(request.getDataValue('fk_user_reciver'));
        if (jwtPayload?.role !== 1 &&
            Number(jwtPayload?.userId) !== requesterId &&
            Number(jwtPayload?.userId) !== receiverId) {
            return res.status(403).json({ message: 'Only the requester, responsible receiver, or superadmin can update this request' });
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
        const finalItemId = Number(updates.fk_item ?? request.getDataValue('fk_item'));
        const finalReceiverId = Number(updates.fk_user_reciver ?? request.getDataValue('fk_user_reciver'));
        const [finalItem, finalReceiver, finalRequester] = await Promise.all([
            Item.findByPk(finalItemId),
            User.findByPk(finalReceiverId),
            User.findByPk(requesterId)
        ]);
        if (!finalItem || !finalReceiver || !finalRequester) {
            return res.status(404).json({ message: 'Item, receiver, or requester not found' });
        }
        const finalResponsibleId = finalItem.getDataValue('fk_user_responsible');
        if (!finalResponsibleId) {
            return res.status(409).json({ message: 'The item does not have a responsible employee' });
        }
        if (Number(finalRequester.getDataValue('employeeId')) === Number(finalResponsibleId)) {
            return res.status(409).json({ message: 'You cannot request an item from your own custody' });
        }
        if (Number(finalReceiver.getDataValue('employeeId')) !== Number(finalResponsibleId)) {
            return res.status(409).json({
                message: 'The receiver must be the employee responsible for the item'
            });
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

            let request: InstanceType<typeof RequestModel> | null = null;
            let itemId = 0;
            let requesterEmployeeId: number | null = null;
            let previousResponsible: InstanceType<typeof Employee> | null = null;
            let newResponsible: InstanceType<typeof Employee> | null = null;

            await mySequelize.transaction(async (transaction) => {
                request = await RequestModel.findByPk(requestId, {
                    transaction,
                    lock: transaction.LOCK.UPDATE
                });
                if (!request) throw new Error('Request not found');
                if (Number(request.getDataValue('requestStatus')) !== 1) {
                    throw new Error('Only pending requests can be resolved');
                }

                const jwtPayload = res.locals.jwtPayloadContent;
                if (status === 2 &&
                    Number(jwtPayload?.userId) === Number(request.getDataValue('fk_user_requester'))) {
                    throw new Error('You cannot accept your own request');
                }
                if (jwtPayload?.role !== 1 &&
                    Number(jwtPayload?.userId) !== Number(request.getDataValue('fk_user_reciver'))) {
                    throw new Error('Only the responsible receiver or a superadmin can resolve this request');
                }

                itemId = Number(request.getDataValue('fk_item'));
                if (status === 2) {
                    const requester = await User.findByPk(Number(request.getDataValue('fk_user_requester')), { transaction });
                    const item = Number.isInteger(itemId) && itemId > 0
                        ? await Item.findByPk(itemId, { transaction, lock: transaction.LOCK.UPDATE })
                        : null;
                    const receiver = await User.findByPk(Number(request.getDataValue('fk_user_reciver')), { transaction });
                    requesterEmployeeId = requester?.getDataValue('employeeId') ?? null;
                    if (!requester || !requesterEmployeeId) {
                        throw new Error('The requester is not linked to an employee and cannot receive this item');
                    }
                    if (!item) throw new Error('Item associated with the request not found');
                    if (!receiver || !receiver.getDataValue('employeeId')) {
                        throw new Error('The receiver is not linked to an employee');
                    }
                    if (Number(receiver.getDataValue('employeeId')) !== Number(item.getDataValue('fk_user_responsible'))) {
                        throw new Error('The item no longer belongs to the responsible employee assigned to this request');
                    }
                    if (Number(requesterEmployeeId) === Number(item.getDataValue('fk_user_responsible'))) {
                        throw new Error('The requester already has custody of this item');
                    }
                    previousResponsible = await Employee.findByPk(item.getDataValue('fk_user_responsible'), { transaction });
                    newResponsible = await Employee.findByPk(requesterEmployeeId, { transaction });
                    item.set('fk_user_responsible', requesterEmployeeId);
                    await item.save({ transaction });
                    await RequestModel.update(
                        { requestStatus: 3 },
                        {
                            where: {
                                fk_item: itemId,
                                requestStatus: 1,
                                requestId: { [Op.ne]: requestId }
                            },
                            transaction
                        }
                    );
                }
                request.set('requestStatus', status);
                await request.save({ transaction });
            });
            if (!request) throw new Error('Request not found');
            const completedRequest = request as InstanceType<typeof RequestModel>;
            const previousEmployee = previousResponsible as InstanceType<typeof Employee> | null;
            const newEmployee = newResponsible as InstanceType<typeof Employee> | null;
            await createHistoryLog({
                historyDescription: status === 2
                    ? `Se transfirió el resguardo del item #${itemId} de "${previousEmployee ? `${previousEmployee.getDataValue('firstName')} ${previousEmployee.getDataValue('lastName')}` : 'sin responsable'}" a "${newEmployee ? `${newEmployee.getDataValue('firstName')} ${newEmployee.getDataValue('lastName')}` : 'nuevo responsable'}".`
                    : `Se marcó la solicitud #${requestId} como ${label}.`,
                actionType: status === 2 ? 'TRANSFER' : 'UPDATE',
                userId: res.locals.jwtPayloadContent?.userId || Number(completedRequest.getDataValue('fk_user_requester')),
                itemId,
                requestId
            });

            return res.status(200).json({ requestStatus: status });
        } catch (error) {
            if (error instanceof Error && ['Request not found', 'Only pending requests can be resolved', 'You cannot accept your own request'].includes(error.message)) {
                return res.status(error.message === 'Request not found' ? 404 : 409).json({ message: error.message });
            }
            if (error instanceof Error && error.message.startsWith('Only the responsible receiver')) {
                return res.status(403).json({ message: error.message });
            }
            if (error instanceof Error && (
                error.message.includes('not linked') ||
                error.message.includes('no longer belongs') ||
                error.message.includes('already has custody') ||
                error.message.includes('associated with the request')
            )) {
                return res.status(error.message.includes('associated') ? 404 : 409).json({ message: error.message });
            }
            throw error;
        }
    };

const DeleteRequest = async (req: Request, res: Response) => {
    try {
        const requestId = findRequestId(req);
        if (!requestId) return res.status(400).json({ message: 'Invalid Request ID' });

        const request = await RequestModel.findByPk(requestId);
        if (!request) return res.status(404).json({ message: 'Request not found' });
        if (Number(request.getDataValue('requestStatus')) !== 1) {
            return res.status(409).json({ message: 'Only pending requests can be deleted' });
        }
        const jwtPayload = res.locals.jwtPayloadContent;
        if (jwtPayload?.role !== 1) {
            return res.status(403).json({ message: 'Only a superadmin can delete requests' });
        }

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
