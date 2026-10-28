import type {User,Place} from "./index"
export interface Item{
  "itemId":number,
  "itemName":string,
  "itemDescription":string,
  "manufacter":string,
  "cost":number | null,
  "category": string | { id: number; name: string } | null,
  "codeBar": string | null,
  "fk_user_responsible":User | null,
  "fk_place":Place | null,
  "createdAt":Date,
  "updatedAt":Date
}