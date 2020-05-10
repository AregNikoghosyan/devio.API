import { Document, Model } from 'mongoose';

interface IUserDocument<UP = string> extends Document {
  nid: number;
  email: string;
  passwords: Array<UP>;
  role: number;
  firstName: string;
  lastName: string;
  fullName: string;
  phoneNumber: string;
  profilePicture: string;
  verificationCode: string;
  restoreCode: string;
  points: number;
  phoneVerificationCode;
  phoneVerified: boolean;
  webLanguage: number;
  tariffPlan: number;
  canceledOrderCount: number;
  finishedOrderCount: number;
  orderCount: number;
  requestCount: number;
  blocked: boolean;
  loginBonusReceived: boolean;
  createdDt: Date;
  updatedDt: Date;
}

export interface IUser<UP = string> extends IUserDocument<UP> {}

export interface IUserModel extends Model<IUser<any>> {
  findByName(key: string): Promise<string[]>;
  newCountByDateRange(body: { dateFrom: Date, dateTo: Date }): Promise<number>;
}