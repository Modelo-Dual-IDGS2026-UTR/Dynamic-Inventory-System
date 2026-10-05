import { History } from '@dis/model/historyModel.js';

interface HistoryLogParams {
    historyDescription: string;
    actionType: 'CREATE' | 'UPDATE' | 'DELETE' | 'TRANSFER' | 'REQUEST' | 'REPORT' | 'OTHER';
    userId: number; 
    itemId?: number | null;
    placeId?: number | null;
    reportId?: number | null;
    requestId?: number | null;
}

export const createHistoryLog = async (params: HistoryLogParams): Promise<void> => {
    try {
        await History.create({
            historyDescription: params.historyDescription,
            actionType: params.actionType,
            fk_user: params.userId,
            fk_item: params.itemId || null,
            fk_place: params.placeId || null,
            fk_report: params.reportId || null,
            fk_request: params.requestId || null
        });
    } catch (error) {
        console.error("Error al guardar el registro en History:", error);
    }
};
