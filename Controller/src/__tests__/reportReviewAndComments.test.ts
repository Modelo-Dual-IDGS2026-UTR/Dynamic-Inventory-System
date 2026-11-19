import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import type { Request, Response } from 'express';

const makeModelInstance = <T extends Record<string, unknown>>(initialData: T) => {
    const data: Record<string, unknown> = { ...initialData };
    return {
        getDataValue: jest.fn((key: string) => data[key]),
        set: jest.fn((key: string, value: unknown) => {
            data[key] = value;
        }),
        save: jest.fn(async () => undefined),
        toJSON: jest.fn(() => ({ ...data }))
    };
};

type AsyncFnMock = jest.Mock<(...args: unknown[]) => Promise<unknown>>;
const asyncMock = (): AsyncFnMock => jest.fn<(...args: unknown[]) => Promise<unknown>>();

const mockTransaction = {
    commit: jest.fn(async () => undefined),
    rollback: jest.fn(async () => undefined),
    afterCommit: jest.fn(),
    LOCK: { UPDATE: 'UPDATE' }
};

const mockSequelize = {
    transaction: jest.fn(async () => mockTransaction)
};

const mockReport = {
    findByPk: asyncMock(),
    create: asyncMock(),
    findAll: asyncMock()
};

const mockUser = {
    findByPk: asyncMock()
};

const mockItem = {
    findByPk: asyncMock()
};

const mockPlace = {
    findByPk: asyncMock()
};

const mockReportResolutionReview = {
    findOne: asyncMock(),
    create: asyncMock(),
    findByPk: asyncMock(),
    findAll: asyncMock(),
    update: asyncMock()
};

const mockReportComment = {
    findAll: asyncMock(),
    create: asyncMock(),
    findByPk: asyncMock()
};

const mockReportCommentEdit = {
    create: asyncMock()
};

const mockCreateHistoryLog = jest.fn(async () => undefined);
const mockCreateUserNotification = jest.fn(async () => null);
const mockNotifyUsersByRole = jest.fn(async () => []);
const mockVerifyJWT = jest.fn((requiredRole?: number) =>
    Object.assign((_req: unknown, _res: unknown, next: () => void) => next(), { requiredRole })
);

jest.unstable_mockModule('@dis/db/dbConection.js', () => ({
    mySequelize: mockSequelize
}));

jest.unstable_mockModule('@dis/model', () => ({
    Report: mockReport,
    User: mockUser,
    Item: mockItem,
    Place: mockPlace,
    ReportResolutionReview: mockReportResolutionReview,
    ReportReviewStatus: {
        PENDING: 'PENDING',
        APPROVED: 'APPROVED',
        REJECTED: 'REJECTED'
    },
    ReportComment: mockReportComment,
    ReportCommentEdit: mockReportCommentEdit
}));

jest.unstable_mockModule('@dis/model/userNotificationModel.js', () => ({
    NotificationType: {
        REQUEST: 'Request',
        REPORT: 'Report',
        ITEM: 'item'
    }
}));

jest.unstable_mockModule('../helpers/historyHelper.js', () => ({
    createHistoryLog: mockCreateHistoryLog
}));

jest.unstable_mockModule('../helpers/notificationHelper.js', () => ({
    createUserNotification: mockCreateUserNotification,
    notifyUsersByRole: mockNotifyUsersByRole
}));

jest.unstable_mockModule('../middleware/jwtUtils.js', () => ({
    VerifyJWT: mockVerifyJWT
}));

const { reportRouter } = await import('../routes/reportRoutes.js');

const {
    CreateReport,
    SetAssignedUser,
    SetReportStatus,
    RequestReportResolution,
    GetReportResolutionReviews,
    ReviewReportResolution,
    GetReportComments,
    CreateReportComment,
    EditReportComment
} = await import('../controllers/reportController.js');

const createMockRes = (jwtPayloadContent?: { userId: number; role: number }) => {
    const res = {
        locals: jwtPayloadContent ? { jwtPayloadContent } : {},
        status: jest.fn(),
        json: jest.fn()
    } as unknown as Response;

    (res.status as jest.Mock).mockReturnValue(res);
    (res.json as jest.Mock).mockReturnValue(res);
    return res;
};

const createMockReq = (options: {
    params?: Record<string, string>;
    body?: Record<string, unknown>;
} = {}) => ({
    params: options.params ?? {},
    body: options.body ?? {}
}) as unknown as Request;

describe('Report assignment, PR-style resolution review, and comments', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockSequelize.transaction.mockResolvedValue(mockTransaction);
    });

    describe('Employee assignment validation (employeeId required)', () => {
        it('rejects CreateReport with 400 when assigned user has no employeeId', async () => {
            mockUser.findByPk
                .mockResolvedValueOnce(makeModelInstance({ userId: 10, employeeId: null }))
                .mockResolvedValueOnce(makeModelInstance({ userId: 20, employeeId: null }));

            const req = createMockReq({
                body: {
                    reportName: 'Monitor roto',
                    reportDescription: 'No enciende',
                    reportStatus: 1,
                    reportPriority: 2,
                    dueDate: '2026-12-01',
                    fk_user_assigned: 20
                }
            });
            const res = createMockRes({ userId: 10, role: 3 });

            await CreateReport(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Assigned user must be linked to an employee (employeeId required)'
            });
            expect(mockReport.create).not.toHaveBeenCalled();
        });

        it('rejects SetAssignedUser with 400 when target user has no employeeId', async () => {
            mockReport.findByPk.mockResolvedValueOnce(
                makeModelInstance({
                    reportId: 1,
                    reportName: 'Monitor roto',
                    fk_user_assigned: null,
                    fk_user_creator: 10,
                    fk_item: null,
                    fk_place: null
                })
            );
            mockUser.findByPk.mockResolvedValueOnce(makeModelInstance({ userId: 25, employeeId: null }));

            const req = createMockReq({
                params: { reportId: '1' },
                body: { fk_user_assigned: 25 }
            });
            const res = createMockRes({ userId: 1, role: 1 });

            await SetAssignedUser(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Assigned user must be linked to an employee (employeeId required)'
            });
        });

        it('rejects SetAssignedUser with 400 when target user is inactive', async () => {
            mockReport.findByPk.mockResolvedValueOnce(
                makeModelInstance({
                    reportId: 1,
                    reportName: 'Monitor roto',
                    fk_user_assigned: null,
                    fk_user_creator: 10,
                    fk_item: null,
                    fk_place: null
                })
            );
            mockUser.findByPk.mockResolvedValueOnce(
                makeModelInstance({ userId: 25, employeeId: 1001, userStatus: false })
            );

            const req = createMockReq({
                params: { reportId: '1' },
                body: { fk_user_assigned: 25 }
            });
            const res = createMockRes({ userId: 1, role: 1 });

            await SetAssignedUser(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Assigned user is inactive'
            });
        });

        it('blocks non-SuperAdmin from creating a report directly with status 3 (Done)', async () => {
            const req = createMockReq({
                body: {
                    reportName: 'Monitor roto',
                    reportDescription: 'No enciende',
                    reportStatus: 3,
                    reportPriority: 2,
                    dueDate: '2026-12-01'
                }
            });
            const res = createMockRes({ userId: 10, role: 2 });

            await CreateReport(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(mockReport.create).not.toHaveBeenCalled();
        });
    });

    describe('PR-style resolution review flow', () => {
        it('blocks Admin (role 2) from marking report directly as Done (status 3)', async () => {
            const req = createMockReq({
                params: { reportId: '5' },
                body: { status: 3 }
            });
            const res = createMockRes({ userId: 2, role: 2 });

            await SetReportStatus(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(mockReport.findByPk).not.toHaveBeenCalled();
        });

        it('blocks Admin (role 2) from reopening a report already marked as Done (status 3)', async () => {
            mockReport.findByPk.mockResolvedValueOnce(
                makeModelInstance({ reportId: 5, reportStatus: 3 })
            );

            const req = createMockReq({
                params: { reportId: '5' },
                body: { status: 2 }
            });
            const res = createMockRes({ userId: 2, role: 2 });

            await SetReportStatus(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Only SuperAdmin can reopen a report marked as Done'
            });
        });

        it('allows SuperAdmin (role 1) to mark status 3 directly and closes pending reviews', async () => {
            const reportInstance = makeModelInstance({
                reportId: 5,
                reportName: 'Proyector',
                reportStatus: 2,
                fk_user_creator: 10,
                fk_user_assigned: 2,
                fk_item: 3,
                fk_place: 4
            });
            mockReport.findByPk.mockResolvedValueOnce(reportInstance);
            mockReportResolutionReview.update.mockResolvedValueOnce([1]);

            const req = createMockReq({
                params: { reportId: '5' },
                body: { status: 3 }
            });
            const res = createMockRes({ userId: 1, role: 1 });

            await SetReportStatus(req, res);

            expect(mockReportResolutionReview.update).toHaveBeenCalledTimes(1);
            expect(mockTransaction.commit).toHaveBeenCalledTimes(1);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ status: 3 });
        });

        it('allows any Admin (role 2) to submit a resolution review request', async () => {
            const reportInstance = makeModelInstance({
                reportId: 5,
                reportName: 'Proyector',
                reportStatus: 2,
                fk_item: 3,
                fk_place: 4
            });
            const createdReview = makeModelInstance({
                reviewId: 11,
                fk_report: 5,
                fk_user_requested: 99,
                reviewStatus: 'PENDING',
                requestNote: 'Listo para revisar'
            });
            const hydratedReview = makeModelInstance({
                reviewId: 11,
                fk_report: 5,
                reviewStatus: 'PENDING',
                requestNote: 'Listo para revisar',
                requester: { userId: 99, firstName: 'Ana', lastName: 'Admin', universityId: null, employeeId: 101 },
                reviewer: null
            });

            mockReport.findByPk.mockResolvedValueOnce(reportInstance);
            mockReportResolutionReview.findOne.mockResolvedValueOnce(null);
            mockReportResolutionReview.create.mockResolvedValueOnce(createdReview);
            mockReportResolutionReview.findByPk.mockResolvedValueOnce(hydratedReview);

            const req = createMockReq({
                params: { reportId: '5' },
                body: { requestNote: 'Listo para revisar' }
            });
            const res = createMockRes({ userId: 99, role: 2 });

            await RequestReportResolution(req, res);

            expect(mockTransaction.commit).toHaveBeenCalledTimes(1);
            expect(mockNotifyUsersByRole).toHaveBeenCalledWith(1, expect.objectContaining({ fk_trigger: 5 }));
            expect(res.status).toHaveBeenCalledWith(201);
        });

        it('returns 409 when a pending resolution review already exists', async () => {
            mockReport.findByPk.mockResolvedValueOnce(
                makeModelInstance({ reportId: 5, reportStatus: 2 })
            );
            mockReportResolutionReview.findOne.mockResolvedValueOnce(
                makeModelInstance({ reviewId: 11, reviewStatus: 'PENDING' })
            );

            const req = createMockReq({
                params: { reportId: '5' },
                body: { requestNote: 'Otro intento' }
            });
            const res = createMockRes({ userId: 99, role: 2 });

            await RequestReportResolution(req, res);

            expect(mockTransaction.rollback).toHaveBeenCalledTimes(1);
            expect(res.status).toHaveBeenCalledWith(409);
        });

        it('rejects ReviewReportResolution with 403 for non-SuperAdmin', async () => {
            const req = createMockReq({
                params: { reviewId: '11' },
                body: { decision: 'APPROVED' }
            });
            const res = createMockRes({ userId: 2, role: 2 });

            await ReviewReportResolution(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
        });

        it('allows SuperAdmin to approve review and marks report as Done (3)', async () => {
            const pendingReview = makeModelInstance({
                reviewId: 11,
                fk_report: 5,
                fk_user_requested: 2,
                reviewStatus: 'PENDING'
            });
            const reportInstance = makeModelInstance({
                reportId: 5,
                reportName: 'Proyector',
                reportStatus: 2,
                fk_user_assigned: 2,
                fk_user_creator: 10,
                fk_item: 3,
                fk_place: 4
            });
            const updatedHydrated = makeModelInstance({
                reviewId: 11,
                fk_report: 5,
                reviewStatus: 'APPROVED',
                reviewNote: 'Aprobado',
                requester: { userId: 2, firstName: 'Ana', lastName: 'Admin', universityId: null, employeeId: 101 },
                reviewer: { userId: 1, firstName: 'Root', lastName: 'Super', universityId: null, employeeId: 1 }
            });

            mockReportResolutionReview.findByPk
                .mockResolvedValueOnce(pendingReview)
                .mockResolvedValueOnce(updatedHydrated);
            mockReport.findByPk.mockResolvedValueOnce(reportInstance);

            const req = createMockReq({
                params: { reviewId: '11' },
                body: { decision: 'APPROVED', reviewNote: 'Aprobado' }
            });
            const res = createMockRes({ userId: 1, role: 1 });

            await ReviewReportResolution(req, res);

            expect(reportInstance.set).toHaveBeenCalledWith('reportStatus', 3);
            expect(mockTransaction.commit).toHaveBeenCalledTimes(1);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ reportStatus: 3 })
            );
        });

        it('allows SuperAdmin to reject review while keeping reportStatus unchanged (2)', async () => {
            const pendingReview = makeModelInstance({
                reviewId: 12,
                fk_report: 5,
                fk_user_requested: 2,
                reviewStatus: 'PENDING'
            });
            const reportInstance = makeModelInstance({
                reportId: 5,
                reportName: 'Proyector',
                reportStatus: 2,
                fk_user_assigned: 2,
                fk_user_creator: 10,
                fk_item: 3,
                fk_place: 4
            });

            mockReportResolutionReview.findByPk
                .mockResolvedValueOnce(pendingReview)
                .mockResolvedValueOnce(makeModelInstance({ reviewId: 12, reviewStatus: 'REJECTED' }));
            mockReport.findByPk.mockResolvedValueOnce(reportInstance);

            const req = createMockReq({
                params: { reviewId: '12' },
                body: { decision: 'REJECTED', reviewNote: 'Falta evidencia' }
            });
            const res = createMockRes({ userId: 1, role: 1 });

            await ReviewReportResolution(req, res);

            expect(reportInstance.set).not.toHaveBeenCalledWith('reportStatus', 3);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ reportStatus: 2 })
            );
        });

        it('lists resolution reviews for a report', async () => {
            mockReport.findByPk.mockResolvedValueOnce(makeModelInstance({ reportId: 5 }));
            mockReportResolutionReview.findAll.mockResolvedValueOnce([
                makeModelInstance({ reviewId: 12, reviewStatus: 'REJECTED' })
            ]);

            const req = createMockReq({ params: { reportId: '5' } });
            const res = createMockRes({ userId: 2, role: 2 });

            await GetReportResolutionReviews(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
        });
    });

    describe('Report comments access control and edit history', () => {
        const baseReport = () =>
            makeModelInstance({
                reportId: 7,
                reportName: 'Switch aula A101',
                fk_user_creator: 10,
                fk_user_assigned: 20,
                fk_item: 1,
                fk_place: 2
            });

        it('denies another non-assigned Admin (403) from viewing comments', async () => {
            mockReport.findByPk.mockResolvedValueOnce(baseReport());

            const req = createMockReq({ params: { reportId: '7' } });
            const res = createMockRes({ userId: 99, role: 2 });

            await GetReportComments(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(mockReportComment.findAll).not.toHaveBeenCalled();
        });

        it('denies assigned user without employeeId (403) from commenting', async () => {
            mockReport.findByPk.mockResolvedValueOnce(baseReport());
            mockUser.findByPk.mockResolvedValueOnce(makeModelInstance({ userId: 20, employeeId: null }));

            const req = createMockReq({
                params: { reportId: '7' },
                body: { content: 'Revisando equipo' }
            });
            const res = createMockRes({ userId: 20, role: 2 });

            await CreateReportComment(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Assigned user must be linked to an employee (employeeId required) to access report comments'
            });
            expect(mockReportComment.create).not.toHaveBeenCalled();
        });

        it('allows assigned employee with employeeId to view and create comments', async () => {
            mockReport.findByPk.mockResolvedValueOnce(baseReport());
            mockUser.findByPk.mockResolvedValueOnce(makeModelInstance({ userId: 20, employeeId: 5001 }));
            mockReportComment.create.mockResolvedValueOnce(makeModelInstance({ commentId: 30 }));
            mockReportComment.findByPk.mockResolvedValueOnce(
                makeModelInstance({
                    commentId: 30,
                    fk_report: 7,
                    content: 'Cable reemplazado',
                    isEdited: false,
                    author: { userId: 20, firstName: 'Luis', lastName: 'Tec', universityId: null, employeeId: 5001 },
                    edit_history: []
                })
            );

            const req = createMockReq({
                params: { reportId: '7' },
                body: { content: 'Cable reemplazado' }
            });
            const res = createMockRes({ userId: 20, role: 2 });

            await CreateReportComment(req, res);

            expect(mockTransaction.commit).toHaveBeenCalledTimes(1);
            expect(res.status).toHaveBeenCalledWith(201);
        });

        it('allows report creator and SuperAdmin to view comments', async () => {
            mockReport.findByPk.mockResolvedValueOnce(baseReport());
            mockReportComment.findAll.mockResolvedValueOnce([]);

            const creatorReq = createMockReq({ params: { reportId: '7' } });
            const creatorRes = createMockRes({ userId: 10, role: 3 });
            await GetReportComments(creatorReq, creatorRes);
            expect(creatorRes.status).toHaveBeenCalledWith(200);

            mockReport.findByPk.mockResolvedValueOnce(baseReport());
            mockReportComment.findAll.mockResolvedValueOnce([]);

            const superReq = createMockReq({ params: { reportId: '7' } });
            const superRes = createMockRes({ userId: 1, role: 1 });
            await GetReportComments(superReq, superRes);
            expect(superRes.status).toHaveBeenCalledWith(200);
        });

        it('prevents editing someone else comment even for SuperAdmin (403)', async () => {
            mockReportComment.findByPk.mockResolvedValueOnce(
                makeModelInstance({ commentId: 30, fk_report: 7, fk_user_author: 20, content: 'Texto original' })
            );
            mockReport.findByPk.mockResolvedValueOnce(baseReport());

            const req = createMockReq({
                params: { commentId: '30' },
                body: { content: 'Intento externo' }
            });
            const res = createMockRes({ userId: 1, role: 1 });

            await EditReportComment(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(mockReportCommentEdit.create).not.toHaveBeenCalled();
        });

        it('edits own comment and stores previousContent in ReportCommentEdit', async () => {
            const commentInstance = makeModelInstance({
                commentId: 30,
                fk_report: 7,
                fk_user_author: 10,
                content: 'Texto original',
                isEdited: false
            });
            const updatedHydrated = makeModelInstance({
                commentId: 30,
                fk_report: 7,
                content: 'Texto corregido',
                isEdited: true,
                author: { userId: 10, firstName: 'Mia', lastName: 'User', universityId: 'U1', employeeId: null },
                edit_history: [
                    {
                        editId: 1,
                        fk_comment: 30,
                        previousContent: 'Texto original',
                        editedAt: '2026-11-18T12:00:00Z',
                        editor: { userId: 10, firstName: 'Mia', lastName: 'User', universityId: 'U1', employeeId: null }
                    }
                ]
            });

            mockReportComment.findByPk
                .mockResolvedValueOnce(commentInstance)
                .mockResolvedValueOnce(updatedHydrated);
            mockReport.findByPk.mockResolvedValueOnce(baseReport());

            const req = createMockReq({
                params: { commentId: '30' },
                body: { content: 'Texto corregido' }
            });
            const res = createMockRes({ userId: 10, role: 3 });

            await EditReportComment(req, res);

            expect(mockReportCommentEdit.create).toHaveBeenCalledWith(
                {
                    fk_comment: 30,
                    fk_user_editor: 10,
                    previousContent: 'Texto original'
                },
                { transaction: mockTransaction }
            );
            expect(commentInstance.set).toHaveBeenCalledWith('content', 'Texto corregido');
            expect(commentInstance.set).toHaveBeenCalledWith('isEdited', true);
            expect(mockTransaction.commit).toHaveBeenCalledTimes(1);
            expect(res.status).toHaveBeenCalledWith(200);
        });
    });

    describe('Report routes middleware and immutability', () => {
        it('registers PR-style review and comment routes with expected roles and no DELETE for comments', () => {
            const layers = (reportRouter as unknown as {
                stack: Array<{
                    route?: {
                        path: string;
                        methods: Record<string, boolean>;
                        stack: Array<{ handle: { requiredRole?: number } }>;
                    };
                }>;
            }).stack.filter((layer) => layer.route);

            const findRoute = (path: string, method: string) =>
                layers.find((layer) => layer.route?.path === path && Boolean(layer.route.methods[method]))?.route;

            const postResolution = findRoute('/resolution-requests/:reportId', 'post');
            const getResolution = findRoute('/resolution-requests/:reportId', 'get');
            const patchReview = findRoute('/resolution-reviews/:reviewId', 'patch');
            const getComments = findRoute('/comments/:reportId', 'get');
            const postComment = findRoute('/comments/:reportId', 'post');
            const patchComment = findRoute('/comments/:commentId', 'patch');

            expect(postResolution?.stack[0]?.handle.requiredRole).toBe(2);
            expect(getResolution?.stack[0]?.handle.requiredRole).toBe(2);
            expect(patchReview?.stack[0]?.handle.requiredRole).toBe(1);
            expect(getComments).toBeDefined();
            expect(getComments?.stack[0]?.handle.requiredRole).toBeUndefined();
            expect(postComment).toBeDefined();
            expect(postComment?.stack[0]?.handle.requiredRole).toBeUndefined();
            expect(patchComment).toBeDefined();
            expect(patchComment?.stack[0]?.handle.requiredRole).toBeUndefined();

            const hasCommentDelete = layers.some(
                (layer) => Boolean(layer.route?.path.includes('/comments')) && Boolean(layer.route?.methods.delete)
            );
            expect(hasCommentDelete).toBe(false);
        });
    });
});
