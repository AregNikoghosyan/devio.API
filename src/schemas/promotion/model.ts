import { Document, Model } from 'mongoose';

interface IPromotionDocument<PT = string, P = string, C = string> extends Document {
  position: number;
  type: number;
  translations: Array<PT>;
  cover: string;
  product: P;
  category: C;
  hidden: boolean;
  createdDt: Date;
  updatedDt: Date;
}

export interface IPromotion<PT = string, P = string, C = string> extends IPromotionDocument<PT, P, C> {

}

export interface IPromotionModel extends Model<IPromotion<any, any, any>> {
  bulkDelete(idList: string[]): Promise<void>;
  getListForAdmin(skip: number, limit: number, language: number): Promise<any[]>;
  getDetailsForAdmin(id: string): Promise<any>;
  getListForAll(filter: any, language: number, skip: number, limit: number): Promise<any>;
  productGoneInvisible(id: string): Promise<void>;
  isValidToShow(id: string): Promise<boolean>;
  updateVisibility(categoryIdList: string[]): Promise<void>;
}