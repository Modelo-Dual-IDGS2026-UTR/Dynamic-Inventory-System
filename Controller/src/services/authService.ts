import { UserSession } from '@dis/model';
import { Op } from 'sequelize';
import { createHash, randomUUID } from 'node:crypto';
import {
    GenerateJWT,
    generateRefreshToken
} from '../middleware/jwtUtils.js';

const REFRESH_TOKEN_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

export const createSessionTokens = async (userId: number, role: number) => {
    await cleanUserSessions(userId);

    const sessionId = randomUUID();
    const refreshToken = generateRefreshToken({ userId, sessionId });
    
    const refreshTokenHash = createHash('sha256')
        .update(refreshToken)
        .digest('hex');

    await UserSession.create({
        sessionId,
        userId,
        refreshTokenHash,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_DURATION_MS)
    });

    return {
        accessToken: GenerateJWT({ userId, role }),
        refreshToken
    };
};

const cleanUserSessions = async (userId: number) => {
    await UserSession.destroy({
        where: {
            userId,
            [Op.or]: [
                {
                    expiresAt: {
                        [Op.lt]: new Date()
                    }
                },
                {
                    revokedAt: {
                        [Op.not]: null
                    }
                }
            ]
        }
    });
};