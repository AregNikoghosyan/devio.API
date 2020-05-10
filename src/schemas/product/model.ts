import { Document, Model } from 'mongoose';

interface IProductDocument<M = string, T = string, File = string, A = string, V = string, C = string, F = string, B = string, U = string> extends Document {
  nid: number;
  status: number;
  versionsHidden: boolean;
  type: number;
  preparingDayCount: number;
  mu: M;
  minCount: number;
  step: number;
  multiplier: number;
  availableCount: number;
  translations: Array<T>;
  defaultPrice: number;
  discountStartDate: Date;
  discountEndDate: Date;
  images: Array<File>;
  attributes: Array<A>;
  versions: Array<V>;
  categories: Array<C>;
  mainCategories: string[];
  features: Array<F>;
  brand: B;
  boughtCount: number;
  seenCount: number;
  createdDt: Date;
  updatedDt: Date;
  isPrivate: boolean;
  deleted: boolean;
  createdBy: U;
  partner: string;
}

export interface IProduct<M = string, T = string, File = string, A = string, V = string, C = string, F = string, B = string, U = string> extends IProductDocument<M, T, File, A, V, C, F, B, U> {

}

export interface IProductModel extends Model<IProduct<any, any, any, any, any, any, any, any, any>> {
  getListForDashboard(filter: any, language: number, skip: number, limit: number, sort?: any): Promise<any[]>;
  getProductDetailsByDefault(id: string, language: number, getPriceRange: boolean): Promise<any>;
  getShortList(filter: any, skip: number, limit: number, language: number): Promise<any>;
  getShortListWithPricing(filter: any, language: number, skip?: number, limit?: number): Promise<any[]>;
  getPricing(id: string): Promise<any>;
  getMainList(filter: any, language: number, skip?: number, limit?: number): Promise<any[]>;
  getSimilarList(filter: any, language: number, count: number);
  popCategory(categoryId: string): Promise<void>;
  countMainList(filter: any, language: number, secondFilter?: any): Promise<any>;
  getMainListByFilter(filter: any, language: number, sort?: any, secondFilter?: any, skip?: number, limit?: number): Promise<any[]>;
  getMainListRange(filter: any, secondFilter?: any): Promise<any>;
  getRandomImages(filter: any): Promise<string[]>;
  getIdListByOptionName(key: string): Promise<string[]>;
  newCountByDateRange(body: { dateFrom: Date, dateTo: Date }): Promise<number>;
}