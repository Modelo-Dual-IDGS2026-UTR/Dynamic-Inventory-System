import { Item, Request as InventoryRequest, User } from '@dis/model';
const getAuthPayload = (res) => {
    const payload = res.locals.jwtPayloadContent;
    if (!payload || typeof payload.userId !== 'number' || typeof payload.role !== 'number') {
        return null;
    }
    return payload;
};
const parsePositiveInteger = (value) => {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};
const serializeRequest = (request) => {
    const data = request.toJSON();
    return {
        ...data,
        name: data.requestName,
        fk_user_receiver: data.fk_user_reciver,
    };
};
const CreateRequest = async (req, res) => {
    const auth = getAuthPayload(res);
    if (!auth) {
        return res.status(401).json({ message: 'Invalid authenticated user' });
    }
    const { name, description, requestDescription, fk_item, fk_user_receiver, fk_user } = req.body;
    const itemId = parsePositiveInteger(fk_item);
    const receiverId = parsePositiveInteger(fk_user_receiver ?? fk_user);
    if (typeof name !== 'string' || !name.trim() || typeof (description ?? requestDescription) !== 'string' || !itemId || !receiverId) {
        return res.status(400).json({
            message: 'name, description, fk_item and fk_user_receiver are required',
        });
    }
    if (auth.role > 2) {
        return res.status(403).json({ message: 'Only administrators can create requests' });
    }
    const [item, receiver] = await Promise.all([
        Item.findByPk(itemId),
        User.findByPk(receiverId),
    ]);
    if (!item || !receiver) {
        return res.status(404).json({ message: 'Item or receiver not found' });
    }
    const request = await InventoryRequest.create({
        requestName: name.trim(),
        requestDescription: String(description ?? requestDescription).trim(),
        requestStatus: 1,
        fk_user_reciver: receiverId,
        fk_user_requester: auth.userId,
        fk_item: itemId,
    });
    return res.status(201).json(serializeRequest(request));
};
const GetUserRequests = async (req, res) => {
    const auth = getAuthPayload(res);
    const userId = parsePositiveInteger(req.params.userId);
    if (!auth || !userId) {
        return res.status(400).json({ message: 'Invalid user ID' });
    }
    if (auth.role > 2 && auth.userId !== userId) {
        return res.status(403).json({ message: 'You can only view your own requests' });
    }
    const requests = await InventoryRequest.findAll({
        where: { fk_user_requester: userId },
        order: [['createdAt', 'DESC']],
    });
    return res.status(200).json(requests.map(serializeRequest));
};
const GetAllRequests = async (_req, res) => {
    const requests = await InventoryRequest.findAll({
        order: [['createdAt', 'DESC']],
    });
    return res.status(200).json(requests.map(serializeRequest));
};
const GetRequest = async (req, res) => {
    const auth = getAuthPayload(res);
    const requestId = parsePositiveInteger(req.params.id);
    if (!auth || !requestId) {
        return res.status(400).json({ message: 'Invalid request ID' });
    }
    const request = await InventoryRequest.findByPk(requestId);
    if (!request) {
        return res.status(404).json({ message: 'Request not found' });
    }
    const data = request.toJSON();
    if (auth.role > 2 && data.fk_user_requester !== auth.userId) {
        return res.status(403).json({ message: 'You can only view your own requests' });
    }
    return res.status(200).json(serializeRequest(request));
};
const UpdateRequestStatus = async (req, res, status) => {
    const requestId = parsePositiveInteger(req.body?.requestId);
    if (!requestId) {
        return res.status(400).json({ message: 'A valid requestId is required' });
    }
    const request = await InventoryRequest.findByPk(requestId);
    if (!request) {
        return res.status(404).json({ message: 'Request not found' });
    }
    const data = request.toJSON();
    if (data.requestStatus !== 1) {
        return res.status(409).json({ message: 'Only pending requests can be resolved' });
    }
    await request.update({ requestStatus: status });
    return res.status(200).json(serializeRequest(request));
};
const AcceptRequest = (req, res) => UpdateRequestStatus(req, res, 2);
const RejectRequest = (req, res) => UpdateRequestStatus(req, res, 3);
const DeleteRequest = async (req, res) => {
    const requestId = parsePositiveInteger(req.params.id);
    if (!requestId) {
        return res.status(400).json({ message: 'Invalid request ID' });
    }
    const deleted = await InventoryRequest.destroy({ where: { requestId } });
    if (!deleted) {
        return res.status(404).json({ message: 'Request not found' });
    }
    return res.status(204).send();
};
export const requestController = {
    CreateRequest,
    GetUserRequests,
    GetAllRequests,
    GetRequest,
    AcceptRequest,
    RejectRequest,
    DeleteRequest,
};
//# sourceMappingURL=requestController.js.map