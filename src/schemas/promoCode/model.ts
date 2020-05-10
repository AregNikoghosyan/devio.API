import { Document, Model } from 'mongoose';

interface IPromoCodeDocument extends Document {
  type: number;
  amount: number;
  freeShipping: boolean;
  title: string;
  code: string;
  startDate: Date;
  endDate: Date;
  minPrice: number;
  maxPrice: number;
  usageCount: number;
  usedCount: number;
  deprecated: boolean;
  createdDt: Date;
  deleted: boolean;
}

export interface IPromoCode extends IPromoCodeDocument {

}

export interface IPromoCodeModel extends Model<IPromoCode> {
  getAvailableCode(): Promise<string>;
  getListByFilter(filter: any, skip: number, limit: number): Promise<any[]>;
}