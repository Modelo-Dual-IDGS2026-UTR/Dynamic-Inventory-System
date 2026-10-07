import rateLimit from 'express-rate-limit';

export const publicCatalogLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 120,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
        message: 'Too many catalog requests, please try again later'
    }
});
