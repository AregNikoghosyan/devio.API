import { Model, Document } from 'mongoose';

interface IRequestPackDocument<U = string, R = string> extends Document {
  nid: number;
  shortCode: string;
  status: number;
  user: U;
  deviceId: string;
  requestList: Array<R>;
  requestCount: number;
  userPhoneNumber: string;
  userEmail: string;
  userFirstName: string;
  userLastName: string;
  adminSeen: boolean;
  osType: number;
  createdDt: Date;
  updatedDt: Date;
}

export interface IRequestPack<U = string, R = string> extends IRequestPackDocument<U, R> {

}

export interface IRequestPackModel extends Model<IRequestPack<any, any>> {
  getPackListForAppUser(filter: any, language: number, skip: number, limit: number): any[];
  getPackDetailsForUser(filter: any, language: number): any;
  countByFilter(filter: any): Promise<number>;
  getAdminList(filter: any, sort: any, skip: number, limit: number): Promise<any[]>;
  newCountByDateRange(body: { dateFrom: Date, dateTo: Date }): Promise<number>;
}