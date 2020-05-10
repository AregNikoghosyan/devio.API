import { Document, Model } from 'mongoose';

interface IRequestDocument<U = string, C = string, F = string, RP = string, MU = string, P = string> extends Document {
  user: U;
  deviceId: string;
  status: number;
  type: number;
  category: C;
  iNeed: string;
  measurementUnit: MU;
  count: number;
  description: string;
  files: Array<F>;
  requestPack: RP;
  products: Array<P>;
  createdDt: Date;
  updatedDt: Date;
}

export interface IRequestDoc<U = string, C = string, F = string, RP = string, MU = string, P = string> extends IRequestDocument<U, C, F, RP, MU, P> {

}

export interface IRequestModel extends Model<IRequestDoc<any, any, any, any, any, any>> {
  getDraftList(filter: any, language: number, skip: number, limit: number): any[];
  getListForAdmin(filter: any, language: number): any[];
}