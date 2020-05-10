import { Document, Model } from 'mongoose';

interface INotificationDocument<T = string> extends Document {
  image: string;
  translations: Array<T>;
  userCount: number;
  status: number;
  createdDt: Date;
}

export interface INotification<T = string> extends INotificationDocument<T> {

}

export interface INotificationModel extends Model<INotification<any>> {

}