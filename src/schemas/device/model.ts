import { Document, Model } from 'mongoose';

interface IDeviceDocument<U = string> extends Document {
  user: U;
  deviceId: string;
  deviceToken: string;
  osType: number;
  language: number;
  newOffersAllowed: boolean;
  deliveryStatusAllowed: boolean;
  bonusesAllowed: boolean;
  createdDt: Date;
  updatedDt: Date;
}

export interface IDevice<U = string> extends IDeviceDocument<U> {
  reversePermission(type: number): Promise<void>;
}

export interface IDeviceModel extends Model<IDevice<any>> {
  reversePermission(idList: string[], type: number): Promise<void>;
}