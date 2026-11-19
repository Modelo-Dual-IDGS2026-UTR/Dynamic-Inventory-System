export type RequestStatus = 1 | 2 | 3;

export interface InventoryRequest {
  requestId: number;
  name: string;
  requestDescription: string;
  requestStatus: RequestStatus;
  createdAt: string;
  updatedAt: string;
  fk_item: number | null;
  itemName?: string;
  fk_user_receiver: number | null;
  receiverName?: string;
  fk_user_requester: number | null;
  requesterName?: string;
}
