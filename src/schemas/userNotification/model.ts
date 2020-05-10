import { Document, Model } from 'mongoose';

interface IUserNotificationDocument<RR = string, SR = string, R = string, O = string, W = string, N = string> extends Document {
  type: number;
  receiver: RR;
  sender: SR;
  request: R;
  order: O;
  wishList: W;
  notification: N;
  seen: boolean;
  deviceId: string;
  createdDt: Date;
}

export interface IUserNotification<RR = string, SR = string, R = string, O = string, W = string, N = string> extends IUserNotificationDocument<RR, SR, R, O, W, N> {

}

export interface IUserNotificationModel extends Model<IUserNotification<any, any, any, any, any, any>> {
  sendAdminNotification (body: { type: number, sender?: string, request?: string, order?: string }): Promise<void>;
  sendUserNotification(body: { type: number, userId?: string, deviceId?: string, order?: string, request?: string, wishList?: string }): Promise<void>;
  sendByUserIdList(body: { idList: string[], type: number, wishList?: string, order?: string, request?: string }): Promise<void>;
}