import type {Place} from "./index"

export interface ItemResponsible {
  id: number;
  employeeId?: number;
  firstName: string;
  lastName: string;
  email?: string;
  area?: string;
}

export interface Item{
  "itemId":number,
  "itemName":string,
  "itemDescription":string,
  "itemStatus":"In Use" | "In Stock" | "Damaged",
  "manufacter":string,
  "cost":number | null,
  "category": string | { id: number; name: string } | null,
  "codeBar": string | null,
  "fk_user_responsible":ItemResponsible | null,
  "fk_place":Place | null,
  "createdAt":Date,
  "updatedAt":Date
}