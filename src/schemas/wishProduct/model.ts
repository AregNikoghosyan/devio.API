import { Document, Model } from 'mongoose';

interface IWishProductDocument<WL = string, P = string, PV = string, US = string> extends Document {
  wishList: WL;
  product: P;
  productVersion: PV;
  uniqueIdentifier: number;
  count: number;
  status: number;
  member: US;
  createdDt: Date;
}

export interface IWishProduct<WL = string, P = string, PV = string, US = string> extends IWishProductDocument<WL, P, PV, US> {

}

export interface IWishProductModel extends Model<IWishProduct<any, any, any, any>> {
  getList(filter: any, language: number, skip?: number, limit?: number): Promise<any[]>;
  getUnapprovedList(filter: any, language: number, skip?: number, limit?: number): Promise<any[]>;
  getImages(id: string): Promise<string[]>;
  getIdentifier(id: string): Promise<number>;
  getApprovedProductCountInList(wishListId: string): Promise<number>;
  countByFilter(filter: any): Promise<number>;
  getApprovedListToInsert(wishListId: string): Promise<Array<{ _id: number, product: string, productVersion: string }>>;
  getListToExport(filter: any): Promise<any[]>;
}