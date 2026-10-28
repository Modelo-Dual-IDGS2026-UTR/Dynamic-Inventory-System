import { randomUUID } from 'node:crypto';
export const errorHandler = (error, _req, res, _next) => {
    const errorId = randomUUID();
    console.error(`[${errorId}] Unhandled request error`, error);
    return res.status(500).json({
        message: 'Internal server error',
        errorId
    });
};
//# sourceMappingURL=errorHandler.js.map