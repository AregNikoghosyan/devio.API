import { Document, Model } from 'mongoose';

interface IWishListDocument<U = string, CP = string, M = string, WP = string> extends Document {
  creator: U;
  company: CP;
  members: Array<M>;
  name: string;
  products: Array<WP>;
  createdDt: Date;
  updatedDt: Date;
}

export interface IWishList<U = string, CP = string, M = string, WP = string> extends IWishListDocument<U, CP, M, WP> {

}

export interface IWishListModel extends Model<IWishList<any, any, any, any>> {
  getListForAppUser(filter: any, id: string, language: number, skip: number, limit: number): Promise<any[]>;
  getMainDetails(userId: string, id: string): Promise<any>;
  getShortListWithProduct(userId: string): Promise<any>;
  bulkDeleteById(id: string): Promise<void>;
  bulkDeleteByCompanyId(companyId: string): Promise<void>;
  productGoneInvisible(productId: string): Promise<void>;
}