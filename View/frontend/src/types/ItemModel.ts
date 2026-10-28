import type {User,Place} from "./index"
export interface Item{
  "itemId":number,
  "itemName":string,
  "itemDescription":string,
  "manufacter":string,
  "cost":number,
  "category": string,
  "codeBar": string,
  "fk_user_responsible":User,
  "fk_place":Place,
  "createdAt":Date,
  "updatedAt":Date
}