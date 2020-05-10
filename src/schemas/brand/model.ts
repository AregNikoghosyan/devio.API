import { Document, Model } from 'mongoose';

interface IBrandDocument<F = string, U = string> extends Document {
  name: string;
  upperCaseName: string;
  logo: F;
  productCount: number;
  visibleProductCount: number;
  createdBy: U;
  createdDt: Date;
  updatedDt: Date;
}

export interface IBrand<F = string, U = string> extends IBrandDocument<F, U> {

}

export interface IBrandModel extends Model<IBrand<any, any>> {
  getListForAll(filter: any, skip: number, limit: number, userRole?: number): Promise<any>;
  countByFilter(filter: any): Promise<number>;
  newCountByDateRange(body: { dateFrom: Date, dateTo: Date }): Promise<number>;
}