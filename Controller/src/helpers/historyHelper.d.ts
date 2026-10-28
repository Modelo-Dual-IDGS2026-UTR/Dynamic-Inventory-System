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
export declare const createHistoryLog: (params: HistoryLogParams) => Promise<void>;
export {};
//# sourceMappingURL=historyHelper.d.ts.map