import { Document, Model } from 'mongoose';

interface IGuestUserDocument extends Document {
  email: string;
  verificationCode: string;
  verified: boolean;
  createdDt: Date;
  updatedDt: Date;
  canceledOrderCount: number;
  finishedOrderCount: number;
}

export interface IGuestUser extends IGuestUserDocument {

}

export interface IGuestUserModel extends Model<IGuestUser> {
  newCountByDateRange(body: { dateFrom: Date, dateTo: Date }): Promise<number>;
}