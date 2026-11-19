import {
    Item,
    Place,
    Report,
    ReportComment,
    ReportCommentEdit,
    ReportResolutionReview,
    User
} from '@dis/model';
import { NotificationType } from '@dis/model/userNotificationModel.js';
import type { Includeable } from 'sequelize';
import { createUserNotification } from './notificationHelper.js';

export const USER_SUMMARY_ATTRIBUTES = ['userId', 'firstName', 'lastName', 'universityId', 'employeeId'];

export const REPORT_ACCESS_ATTRIBUTES = [
    'reportId',
    'reportName',
    'fk_user_creator',
    'fk_user_assigned',
    'fk_item',
    'fk_place'
] as const;

export const REPORT_INCLUDES: Includeable[] = [
    {
        model: Place,
        as: 'related_place',
        attributes: ['placeId', 'placeName']
    },
    {
        model: User,
        as: 'related_user_assigned',
        attributes: USER_SUMMARY_ATTRIBUTES
    },
    {
        model: User,
        as: 'related_user_creator',
        attributes: USER_SUMMARY_ATTRIBUTES
    },
    {
        model: Item,
        as: 'related_item',
        attributes: ['itemId', 'itemName']
    }
];

export const REVIEW_INCLUDES: Includeable[] = [
    {
        model: User,
        as: 'requester',
        attributes: USER_SUMMARY_ATTRIBUTES
    },
    {
        model: User,
        as: 'reviewer',
        attributes: USER_SUMMARY_ATTRIBUTES
    }
];

export const COMMENT_INCLUDES: Includeable[] = [
    {
        model: User,
        as: 'author',
        attributes: USER_SUMMARY_ATTRIBUTES
    },
    {
        model: ReportCommentEdit,
        as: 'edit_history',
        attributes: ['editId', 'fk_comment', 'fk_user_editor', 'previousContent', 'editedAt'],
        separate: true,
        order: [['editId', 'ASC']],
        include: [
            {
                model: User,
                as: 'editor',
                attributes: USER_SUMMARY_ATTRIBUTES
            }
        ]
    }
];

export interface UserSummaryData {
    userId: number;
    firstName: string;
    lastName: string;
    universityId?: string | null;
    employeeId?: number | null;
}

interface ReportResponseData {
    [key: string]: unknown;
    related_place?: { placeId: number; placeName: string } | null;
    related_user_assigned?: UserSummaryData | null;
    related_user_creator?: UserSummaryData | null;
    related_item?: { itemId: number; itemName: string } | null;
}

interface ResolutionReviewResponseData {
    [key: string]: unknown;
    requester?: UserSummaryData | null;
    reviewer?: UserSummaryData | null;
}

interface CommentEditResponseData {
    editId: number;
    fk_comment: number;
    fk_user_editor?: number | null;
    previousContent: string;
    editedAt: Date | string;
    editor?: UserSummaryData | null;
}

interface ReportCommentResponseData {
    [key: string]: unknown;
    author?: UserSummaryData | null;
    edit_history?: CommentEditResponseData[] | null;
}

export const parsePositiveId = (value: unknown) => {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

export const isValidDate = (value: unknown) => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
    }

    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
};

export const parseBoundedText = (
    value: unknown,
    maxLength: number,
    allowNull = false
): { valid: boolean; value: string | null } => {
    if (value === undefined || value === null) {
        return allowNull ? { valid: true, value: null } : { valid: false, value: null };
    }
    if (typeof value !== 'string') {
        return { valid: false, value: null };
    }

    const trimmed = value.trim();
    if (!trimmed || trimmed.length > maxLength) {
        return { valid: false, value: null };
    }

    return { valid: true, value: trimmed };
};

export const parseOptionalNote = (value: unknown, maxLength = 500) =>
    parseBoundedText(value, maxLength, true);

export const formatUserSummary = (user?: UserSummaryData | null) =>
    user
        ? {
            id: user.userId,
            firstName: user.firstName,
            lastName: user.lastName,
            universityId: user.universityId ?? null,
            employeeId: user.employeeId ?? null
        }
        : null;

export const formatReport = (reportInstance: InstanceType<typeof Report> | null) => {
    const report = reportInstance?.toJSON() as ReportResponseData | undefined;
    if (!report) {
        return null;
    }
    const { related_place, related_user_assigned, related_user_creator, related_item, ...rest } = report;

    return {
        ...rest,
        fk_place: related_place
            ? { id: related_place.placeId, name: related_place.placeName }
            : null,
        fk_user_assigned: formatUserSummary(related_user_assigned),
        fk_user_creator: formatUserSummary(related_user_creator),
        fk_item: related_item
            ? { id: related_item.itemId, itemName: related_item.itemName }
            : null
    };
};

export const formatResolutionReview = (reviewInstance: InstanceType<typeof ReportResolutionReview> | null) => {
    const review = reviewInstance?.toJSON() as ResolutionReviewResponseData | undefined;
    if (!review) {
        return null;
    }

    const { requester, reviewer, ...rest } = review;

    return {
        ...rest,
        fk_user_requested: formatUserSummary(requester),
        fk_user_reviewed: formatUserSummary(reviewer)
    };
};

export const formatReportComment = (commentInstance: InstanceType<typeof ReportComment> | null) => {
    const comment = commentInstance?.toJSON() as ReportCommentResponseData | undefined;
    if (!comment) {
        return null;
    }

    const { author, edit_history, ...rest } = comment;
    const sortedEdits = Array.isArray(edit_history)
        ? [...edit_history]
            .sort((a, b) => Number(a.editId) - Number(b.editId))
            .map((edit) => ({
                editId: edit.editId,
                previousContent: edit.previousContent,
                editedAt: edit.editedAt,
                fk_user_editor: formatUserSummary(edit.editor)
            }))
        : [];

    return {
        ...rest,
        fk_user_author: formatUserSummary(author),
        editHistory: sortedEdits
    };
};

type AssignedEmployeeValidation =
    | { valid: true }
    | { valid: false; status: 400 | 404; message: string };

/** Validates that a user selected as report assignee exists, is active, and has an employeeId. */
export const validateAssignedUserRecord = (
    assignedUser: InstanceType<typeof User> | null
): AssignedEmployeeValidation => {
    if (!assignedUser) {
        return { valid: false, status: 404, message: 'Assigned user not found' };
    }
    if (assignedUser.getDataValue('userStatus') === false) {
        return { valid: false, status: 400, message: 'Assigned user is inactive' };
    }
    if (assignedUser.getDataValue('employeeId') == null) {
        return {
            valid: false,
            status: 400,
            message: 'Assigned user must be linked to an employee (employeeId required)'
        };
    }

    return { valid: true };
};

type CommentAccessResult =
    | { allowed: true; userId: number }
    | { allowed: false; status: 401 | 403; message: string };

/** Enforces object-level access for report comments: creator, active assigned employee, or SuperAdmin. */
export const assertReportCommentAccess = async (
    foundReport: InstanceType<typeof Report>,
    jwtPayload: { userId?: unknown; role?: unknown } | undefined
): Promise<CommentAccessResult> => {
    const currentUserId = parsePositiveId(jwtPayload?.userId);
    const role = Number(jwtPayload?.role);
    if (!currentUserId || !Number.isInteger(role)) {
        return { allowed: false, status: 401, message: 'Authentication required' };
    }

    if (role === 1) {
        return { allowed: true, userId: currentUserId };
    }

    const creatorId = parsePositiveId(foundReport.getDataValue('fk_user_creator'));
    if (creatorId === currentUserId) {
        return { allowed: true, userId: currentUserId };
    }

    const assignedId = parsePositiveId(foundReport.getDataValue('fk_user_assigned'));
    if (assignedId === currentUserId) {
        const assignedUser = await User.findByPk(currentUserId, {
            attributes: ['userId', 'employeeId', 'userStatus']
        });
        if (!assignedUser || assignedUser.getDataValue('userStatus') === false) {
            return {
                allowed: false,
                status: 403,
                message: 'Assigned user is inactive'
            };
        }
        if (assignedUser.getDataValue('employeeId') == null) {
            return {
                allowed: false,
                status: 403,
                message: 'Assigned user must be linked to an employee (employeeId required) to access report comments'
            };
        }
        return { allowed: true, userId: currentUserId };
    }

    return {
        allowed: false,
        status: 403,
        message: 'Only the report creator, the assigned employee, or a SuperAdmin can access report comments'
    };
};

/** Sends a report notification once per unique target user, excluding the acting user. */
export const notifyDistinctUsers = async (
    targetUserIds: Array<number | null | undefined>,
    actorUserId: number | null | undefined,
    reportId: number,
    description: string
) => {
    const uniqueTargets = new Set<number>();
    for (const candidateId of targetUserIds) {
        const parsedId = parsePositiveId(candidateId);
        if (parsedId && parsedId !== Number(actorUserId ?? 0)) {
            uniqueTargets.add(parsedId);
        }
    }

    await Promise.all(
        Array.from(uniqueTargets).map((notifiedUserId) =>
            createUserNotification({
                notificationType: NotificationType.REPORT,
                requestDescription: description,
                fk_trigger: reportId,
                fk_user_trigger: actorUserId ?? null,
                fk_notified: notifiedUserId
            })
        )
    );
};
