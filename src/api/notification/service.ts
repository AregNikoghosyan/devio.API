import * as fs from 'fs';

import UserNotificationSchema        from '../../schemas/userNotification';
import NotificationSchema            from '../../schemas/notification';
import NotificationTranslationSchema from '../../schemas/notificationTranslation';
import UserSchema                    from '../../schemas/user';

import { IResponseModel, getResponse } from '../mainModels';
import { UserTypeEnum, NotificationTypeEnum, NotificationStatusEnum, UserTariffTypeEnum, LanguageEnum } from '../../constants/enums';
import { IUser } from '../../schemas/user/model';
import { INotification } from '../../schemas/notification/model';
import mainConfig from '../../env';
import { ISendCustomNotificationBody } from './model';
import { getUserFilter } from '../user/service';
import { sendCustomNotificationToUsers } from '../../services/pusher';
import { INotificationTranslation } from '../../schemas/notificationTranslation/model';
import { IUserNotification } from '../../schemas/userNotification/model';

import SocketStore from '../../socketServer/store';
import { socketEventKeys } from '../../constants/constants';


class NotificationServices {

  public getNotificationBadge = async(user: IUser, deviceId: string): Promise<IResponseModel> => {
    const filter = this.getFilter(user, deviceId);
    if (!filter) return getResponse(false, 'Missing device Id');
    filter.seen = false;
    const count = await UserNotificationSchema.countDocuments(filter);
    return getResponse(true, 'Got badge', count);
  }

  public setNotificationsSeen = async(user: IUser, deviceId: string): Promise<IResponseModel> => {
    const filter = this.getFilter(user, deviceId);
    if (!filter) return getResponse(false, 'Missing device Id');
    await UserNotificationSchema.updateMany(filter, { seen: true });
    return getResponse(true, 'Notifications set to seen');
  }

  public getNotificationList = async(query: { deviceId: string, pageNo: number, limit: number, language: number }, user: IUser): Promise<IResponseModel> => {
    if (!user || user.role === UserTypeEnum.user) {
      const filter = {
        receiver: user ? user._id : null,
        deviceId: user ? null : query.deviceId,
        type: NotificationTypeEnum.custom
      };
      const itemCount = await UserNotificationSchema.countDocuments(filter);
      if (!itemCount) return getResponse(true, 'Got item list', { itemList: [], pagesLeft: false });
      const pageCount = Math.ceil(itemCount / query.limit);
      if (query.pageNo > pageCount) return getResponse(false, 'Too high pageNo');
      const skip = (query.pageNo - 1) * query.limit;
      const list: Array<IUserNotification <string, string, string, string, string, INotification>> = await UserNotificationSchema
        .find(filter)
        .populate('notification')
        .skip(skip)
        .limit(query.limit)
        .sort({ createdDt: -1 });
      const itemList = await Promise.all(list.map(async item => {
        const translation = await NotificationTranslationSchema.findOne({ notification: item.notification._id, language: query.language });
        return {
          _id      : item._id,
          title    : translation ? translation.title : null,
          body     : translation ? translation.body : null,
          image    : item.notification.image ? mainConfig.BASE_URL + item.notification.image : null,
          createdDt: item.createdDt,
          seen     : item.seen
        };
      }));
      await UserNotificationSchema.updateMany({ _id: itemList.map(item => item._id) }, { seen: true });
      return getResponse(true, 'Got item list', { itemList, pagesLeft: query.pageNo !== pageCount });
    } else if (user && ( user.role === UserTypeEnum.admin || user.role === UserTypeEnum.superAdmin)) {
      const filter = {
        receiver: null,
        deviceId: null
      };
      const itemCount = await UserNotificationSchema.countDocuments(filter);
      if (!itemCount) return getResponse(true, 'Got item list', { itemList: [], pageCount: 0, itemCount: 0 });
      const pageCount = Math.ceil(itemCount / query.limit);
      if (query.pageNo > pageCount) return getResponse(false, 'Too high pageNo');
      const skip = (query.pageNo - 1) * query.limit;
      const list = await UserNotificationSchema
        .find(filter)
        .populate('sender')
        .sort({ createdDt: -1 })
        .skip(skip)
        .limit(query.limit);
      const itemList = await Promise.all(list.map(async item => {
        let userName = null;
        if (item.sender) {
          if (item.sender.fullName) userName = item.sender.fullName;
          else userName = item.sender.email;
        }
        return {
          _id: item._id,
          userName,
          type: item.type,
          request: item.request,
          order: item.order,
          seen: item.seen,
          sender: item.sender ? item.sender._id : null,
          createdDt: item.createdDt
        };
      }));
      await UserNotificationSchema.updateMany({ _id: itemList.map(item => item._id) }, { seen: true });
      return getResponse(true, 'Got item list', { itemList, itemCount, pageCount });
    }
  }

  public deleteNotification = async(id: string): Promise<IResponseModel> => {
    await UserNotificationSchema.deleteOne({ _id: id });
    return getResponse(true, 'Notification deleted');
  }

  public deleteAllNotifications = async(user: IUser, deviceId: string): Promise<IResponseModel> => {
    const filter = this.getFilter(user, deviceId);
    if (!filter) return getResponse(false, 'Missing device Id');
    await UserNotificationSchema.deleteMany(filter);
    return getResponse(true, 'Deleted');
  }

  public setNotificationData = async(body: { translations: Array<{ language: number, title: string, body: string }> }): Promise<IResponseModel> => {
    const notification = new NotificationSchema();
    notification.translations = await NotificationTranslationSchema.insertMany(body.translations.map(item => {
      return {
        notification: notification._id,
        language: item.language,
        title: item.title,
        body: item.body
      };
    }));
    await notification.save();
    return getResponse(true, 'Main set', notification._id);
  }

  public setNotificationImage = async(notification: INotification, file: Express.Multer.File): Promise<IResponseModel> => {
    const newPath = `${Date.now()}-${notification._id}${this.getMimeType(file.originalname)}`;
    fs.renameSync(file.path, mainConfig.MEDIA_PATH + newPath);
    notification.image = newPath;
    await notification.save();
    return getResponse(true, 'Image set');
  }

  public sendCustomNotification = async(body: ISendCustomNotificationBody): Promise<IResponseModel> => {
    let isAll = false;
    const mainFilter = { $or: [] };
    if (!body.filters.length) {
      isAll = true;
    } else {
      for (let i = 0; i < body.filters.length; i++) {
        if (!body.filters[i]) {
          isAll = true;
          break;
        }
        mainFilter.$or.push(getUserFilter(body.filters[i], true));
      }
    }
    let userIdList = [];
    if (isAll) {
      userIdList = await UserSchema.countDocuments({ blocked: false }).distinct('_id');
    } else {
      userIdList = await UserSchema.countDocuments(mainFilter).distinct('_id');
    }
    body.notification.userCount = userIdList.length;
    body.notification.status = NotificationStatusEnum.sent;
    await Promise.all([
      await body.notification.save(),
      await UserNotificationSchema.insertMany(userIdList.map(item => {
        return {
          type: NotificationTypeEnum.custom,
          notification: body.notification._id,
          receiver: item
        };
      }))
    ]);
    sendCustomNotificationToUsers(userIdList, body.notification).catch(e => console.log(e));
    const translations = await NotificationTranslationSchema.find({ notification: body.id }).select({
      _id: 0,
      language: 1,
      title: 1,
      body: 1
    });
    SocketStore.emitUsers(userIdList, socketEventKeys.notification, {
      type    : NotificationTypeEnum.custom,
      translations
    });
    return getResponse(true, 'Sent');
  }

  public getSentNotificationList = async(query: { language: number, pageNo: number, limit: number }): Promise<IResponseModel> => {
    const filter = { status: NotificationStatusEnum.sent };
    const itemCount = await NotificationSchema.countDocuments(filter);
    if (!itemCount) return getResponse(true, 'Got item list');
    const pageCount = Math.ceil(itemCount / query.limit);
    if (query.pageNo > pageCount) return getResponse(false, 'Too high pageNo');
    const skip = (query.pageNo - 1) * query.limit;
    const list: Array<INotification<INotificationTranslation>> = await NotificationSchema.find(filter).populate('translations').skip(skip).limit(query.limit).sort({ createdDt: -1 });
    const itemList = list.map(item => {
      const translation = item.translations.find(tItem => tItem.language === query.language);
      return {
        _id      : item._id,
        title    : translation ? translation.title : null,
        image    : item.image ? mainConfig.BASE_URL + item.image : null,
        userCount: item.userCount,
        createdDt: item.createdDt
      };
    });
    return getResponse(true, 'Got item list', { itemList, pageCount, itemCount });
  }

  private getFilter(user: IUser, deviceId: string): any {
    let filter;
    if (user) {
      if (user.role === UserTypeEnum.admin || user.role === UserTypeEnum.superAdmin) {
        filter = ({ receiver: null, deviceId: null });
      } else {
        filter = ({ receiver: user._id });
      }
    } else {
      if (!deviceId) return;
      filter = ({ receiver: null, deviceId: deviceId });
    }
    return filter;
  }

  private getMimeType(fileName: string) {
    const split = fileName.split('.');
    return '.' + split[split.length - 1];
  }

}

export default new NotificationServices();