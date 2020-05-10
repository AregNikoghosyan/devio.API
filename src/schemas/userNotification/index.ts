import * as mongoose from 'mongoose';
import { schemaReferences, socketEventKeys } from '../../constants/constants';
import { IUserNotificationModel, IUserNotification } from './model';

import SocketStore from '../../socketServer/store';
import { sendSystemNotification, sendSystemNotificationToUsers } from '../../services/pusher';

const Schema = mongoose.Schema;

const schema = new Schema({
  type: {
    type: Number,
    default: null
  },
  receiver: {
    type: Schema.Types.ObjectId,
    ref: schemaReferences.user,
    default: null               // Being null means that receiver is admin
  },
  deviceId: {
    type: String,
    default: null               // Means guest push has been sent
  },
  sender: {
    type: Schema.Types.ObjectId,
    ref: schemaReferences.user,
    default: null
  },
  request: {
    type: Schema.Types.ObjectId,
    ref: schemaReferences.request,
    default: null
  },
  order: {
    type: Schema.Types.ObjectId,
    ref: schemaReferences.order,
    default: null
  },
  wishList: {
    type: Schema.Types.ObjectId,
    ref: schemaReferences.wishList,
    default: null
  },
  notification: {
    type: Schema.Types.ObjectId,
    ref: schemaReferences.notification,
    default: null               // Exists at custom type
  },
  createdDt: {
    type: Date,
    default: Date.now
  },
  seen: {
    type: Boolean,
    default: false
  }
});

schema.statics.sendAdminNotification = async function(body: { type: number, sender?: string, request?: string, order?: string }): Promise<void> {
  const _this: IUserNotificationModel = this;
  const notification = await _this.create({
    type    : body.type,
    sender  : body.sender || null,
    request : body.request || null,
    order   : body.order || null
  });
  SocketStore.emitAllAdmins(socketEventKeys.notification, {
    _id: notification._id,
    type: notification.type,
    request: notification.request,
    order: notification.order,
    seen: notification.seen,
    createdDt: notification.createdDt
  });
};

schema.statics.sendUserNotification = async function(body: { type: number, userId?: string, deviceId?: string, order?: string, request?: string, wishList?: string }): Promise<void> {
  // const _this: IUserNotificationModel = this;
  // const notification = await _this.create({
  //   type: body.type,
  //   receiver: body.userId || null,
  //   deviceId: body.deviceId || null,
  //   request: body.request || null,
  //   order: body.order || null,
  //   wishList: body.wishList || null
  // });
  sendSystemNotification({
    type    : body.type,
    receiver: body.userId || null,
    deviceId: body.deviceId || null,
    request : body.request || null,
    order   : body.order || null,
    wishList: body.wishList || null
  }).catch(e => console.log(e));
  if (body.userId) {
    SocketStore.emitUsers([body.userId], socketEventKeys.notification, {
      type    : body.type,
      request : body.request || null,
      order   : body.order || null,
      wishList: body.wishList || null
    });
  }
};

schema.statics.sendByUserIdList = async function(body: { idList: string[], type: number, wishList?: string, order?: string, request?: string }): Promise<void> {
  const _this: IUserNotificationModel = this;
  // await _this.insertMany(body.idList.map(item => {
  //   return {
  //     type: body.type,
  //     receiver: item,
  //     request: body.request || null,
  //     order: body.order || null,
  //     wishList: body.wishList || null
  //   };
  // }));
  sendSystemNotificationToUsers({
    userIdList: body.idList,
    type      : body.type,
    order     : body.order,
    wishList  : body.wishList,
    request   : body.request
  }).catch(e => console.log(e));
};

const notification: IUserNotificationModel = mongoose.model<IUserNotification<any, any, any, any, any, any>, IUserNotificationModel>(schemaReferences.userNotification, schema);
export default notification;