import { Document, Model } from 'mongoose';

interface IOrderDocument<U = string, GU = string, C = string, DA = string, BA = string, PC = string, OP = string, FU = string, CU = string> extends Document {
  nid: number;
  user: U;
  guestUser: GU;
  guestName: string;
  guestPhoneNumber: string;
  status: number;
  paymentType: number;
  company: C;
  deliveryAddress: DA;
  billingAddress: BA;
  usedBonuses: number;
  promoCode: PC;
  promoCodeDiscountAmount: number;
  products: Array<OP>;
  comment: string;
  code: string;
  deliveryType: number;
  subTotal: number;
  total: number;
  discountAmount: number;
  receivingBonuses: number;
  deliveryFee: number;
  deliveryDate: Date;
  createdDt: Date;
  osType: number;
  finishedDt: Date;
  finishedBy: FU;
  canceledDt: Date;
  canceledBy: CU;
  cancelReason: string;
}

export interface IOrder<U = string, GU = string, C = string, DA = string, BA = string, PC = string, OP = string, FU = string, CU = string> extends IOrderDocument<U, GU, C, DA, BA, PC, OP, CU> {

}

export interface IOrderModel extends Model<IOrder<any, any, any, any, any, any, any, any, any>> {
  getUniqueCode(): Promise<string>;
  getListForUser(filter: any, skip: number, limit: number, language: number): Promise<any[]>;
  newCountByDateRange(body: { dateFrom: Date, dateTo: Date }): Promise<number>;
}