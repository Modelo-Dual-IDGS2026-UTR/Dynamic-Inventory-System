import { Item, Place, Report, User } from '@dis/model';
import type { Request, Response } from 'express';

type AuthPayload = { userId: number; role: number };

const getAuthPayload = (res: Response): AuthPayload | null => {
    const payload = res.locals.jwtPayloadContent as Partial<AuthPayload> | undefined;
    return payload && typeof payload.userId === 'number' && typeof payload.role === 'number'
        ? payload as AuthPayload
        : null;
};

const parseId = (value: unknown): number | null => {
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
};

const serializeReport = (report: { toJSON: () => Record<string, unknown> }) => report.toJSON();

const CreateReport = async (req: Request, res: Response) => {
    const auth = getAuthPayload(res);
    if (!auth) return res.status(401).json({ message: 'Authentication required' });

    const body = req.body as Record<string, unknown>;
    const fkUser = parseId(body.fk_user_creator ?? (body.fk_user as { id?: unknown } | undefined)?.id ?? body.fk_user);
    const fkItem = parseId((body.fk_item as { id?: unknown; itemId?: unknown } | undefined)?.id ?? (body.fk_item as { itemId?: unknown } | undefined)?.itemId ?? body.fk_item);
    const fkPlace = parseId((body.fk_place as { id?: unknown; placeId?: unknown } | undefined)?.id ?? (body.fk_place as { placeId?: unknown } | undefined)?.placeId ?? body.fk_place);
    const reportName = String(body.reportName ?? body.name ?? '').trim();
    const reportDescription = String(body.reportDescription ?? body.description ?? '').trim();
    const reportStatus = Number(body.reportStatus ?? body.status ?? 1);
    const reportPriority = Number(body.reportPriority ?? body.priority ?? 2);
    const dueDate = body.dueDate ? String(body.dueDate) : null;

    if (!reportName || !reportDescription || !fkUser || !fkItem || !fkPlace) {
        return res.status(400).json({ message: 'name, description, fk_user, fk_item and fk_place are required' });
    }
    if (auth.role !== 1 && auth.role !== 2 && auth.userId !== fkUser) {
        return res.status(403).json({ message: 'You can only create reports for yourself' });
    }

    const [user, item, place] = await Promise.all([
        User.findByPk(fkUser),
        Item.findByPk(fkItem),
        Place.findByPk(fkPlace),
    ]);
    if (!user || !item || !place) return res.status(404).json({ message: 'User, item or place not found' });

    const report = await Report.create({
        reportName,
        reportDescription,
        reportStatus,
        reportPriority,
        dueDate,
        fk_user: fkUser,
        fk_item: fkItem,
        fk_place: fkPlace,
    });
    return res.status(201).json(serializeReport(report));
};

const SearchReportById = async (req: Request, res: Response) => {
    const auth = getAuthPayload(res);
    const reportId = parseId(req.params.id);
    if (!auth || !reportId) return res.status(400).json({ message: 'Invalid report ID' });

    const report = await Report.findByPk(reportId);
    if (!report) return res.status(404).json({ message: 'Report not found' });
    const data = report.toJSON() as { fk_user?: number };
    if (auth.role > 2 && data.fk_user !== auth.userId) {
        return res.status(403).json({ message: 'You can only access your own reports' });
    }
    return res.status(200).json(serializeReport(report));
};

const SearchReports = async (_req: Request, res: Response) => {
    const reports = await Report.findAll({ order: [['createdAt', 'DESC']] });
    return res.status(200).json(reports.map(serializeReport));
};

const SearchReportsCreatedUser = async (req: Request, res: Response) => {
    const auth = getAuthPayload(res);
    const userId = parseId(req.params.userId);
    if (!auth || !userId) return res.status(400).json({ message: 'Invalid user ID' });
    if (auth.role > 2 && auth.userId !== userId) {
        return res.status(403).json({ message: 'You can only access your own reports' });
    }
    const reports = await Report.findAll({
        where: { fk_user: userId },
        order: [['createdAt', 'DESC']],
    });
    return res.status(200).json(reports.map(serializeReport));
};

const updateReport = async (req: Request, res: Response, field: 'reportStatus' | 'reportPriority' | 'dueDate') => {
    const reportId = parseId(req.params.reportId);
    if (!reportId) return res.status(400).json({ message: 'Invalid report ID' });
    const report = await Report.findByPk(reportId);
    if (!report) return res.status(404).json({ message: 'Report not found' });

    const value = field === 'reportStatus'
        ? req.body?.status
        : field === 'reportPriority'
            ? req.body?.reportPriority ?? req.body?.priority
            : req.body?.dueDate;
    if (value === undefined || value === null || value === '') {
        return res.status(400).json({ message: `${field} is required` });
    }
    await report.update({ [field]: field === 'dueDate' ? String(value) : Number(value) });
    return res.status(200).json(serializeReport(report));
};

const SetReportStatus = (req: Request, res: Response) => updateReport(req, res, 'reportStatus');
const SetDueDate = (req: Request, res: Response) => updateReport(req, res, 'dueDate');
const setPriority = (req: Request, res: Response) => updateReport(req, res, 'reportPriority');

const deleteReport = async (req: Request, res: Response) => {
    const reportId = parseId(req.params.reportId);
    if (!reportId) return res.status(400).json({ message: 'Invalid report ID' });
    const deleted = await Report.destroy({ where: { reportId } });
    if (!deleted) return res.status(404).json({ message: 'Report not found' });
    return res.status(204).send();
};

export {
    CreateReport,
    SearchReportById,
    SearchReports,
    SearchReportsCreatedUser,
    SetReportStatus,
    SetDueDate,
    setPriority,
    deleteReport,
};
