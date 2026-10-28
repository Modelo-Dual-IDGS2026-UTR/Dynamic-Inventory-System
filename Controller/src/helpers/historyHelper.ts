import { History } from '@dis/model/historyModel.js';
import { emitNotification } from '../services/socketService.js';
import type { Transaction } from 'sequelize';

interface HistoryLogParams {
    historyDescription: string;
    actionType: 'CREATE' | 'UPDATE' | 'DELETE' | 'TRANSFER' | 'REQUEST' | 'REPORT' | 'OTHER';
    userId: number; 
    itemId?: number | null;
    placeId?: number | null;
    reportId?: number | null;
    requestId?: number | null;
    transaction?: Transaction;
}

export const    createHistoryLog = async (params: HistoryLogParams): Promise<void> => {
    try {
        const historyRecord = await History.create({
            historyDescription: params.historyDescription,
            actionType: params.actionType,
            fk_user: params.userId,
            fk_item: params.itemId || null,
            fk_place: params.placeId || null,
            fk_report: params.reportId || null,
            fk_request: params.requestId || null
        }, params.transaction ? { transaction: params.transaction } : undefined);

        const notification = {
            historyId: (historyRecord as unknown as { historyId?: number })?.historyId,
            actionType: params.actionType,
            description: params.historyDescription,
            userId: params.userId,
            itemId: params.itemId || null,
            placeId: params.placeId || null,
            reportId: params.reportId || null,
            requestId: params.requestId || null,
            timestamp: new Date()
        };

        if (params.transaction) {
            params.transaction.afterCommit(() => {
                emitNotification('inventory_change', notification);
            });
        } else {
            emitNotification('inventory_change', notification);
        }
    } catch (error) {
        console.error("Error al guardar el registro en History:", error);

        if (params.transaction) {
            throw error;
        }
    }
};
