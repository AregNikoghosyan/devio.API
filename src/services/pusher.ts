import fetch from 'node-fetch';

import DeviceSchema from '../schemas/device';
import NotificationTranslationSchema from '../schemas/notificationTranslation';

import { fireBaseKeys } from '../constants/constants';
import { LanguageEnum, OsTypeEnum, NotificationTypeEnum, NotificationPermissionsEnum } from '../constants/enums';
import { IUserNotification } from '../schemas/userNotification/model';
import { getStaticNotificationData } from '../constants/notifications';
import { getImagesForProduct } from '../api/product/validation';
import { INotification } from '../schemas/notification/model';

const sendAndroidGroupNotification = (tokenList: string[], data: { title: string, description: string, type: number, id?: string }): void => {
  const objNotification = {
    registration_ids: [],
    data: data
  };
  if (tokenList.length >= 1000) {
    objNotification.registration_ids = tokenList.splice(0, 999);
    sendNotificationToFireBase(objNotification).catch(e => console.log(e));
    sendAndroidGroupNotification(tokenList.slice(0, 999), data);
  } else {
    objNotification.registration_ids = tokenList;
    sendNotificationToFireBase(objNotification).catch(e => console.log(e));
  }
};

const sendIOSGroupNotification = (tokenList: string[], data: { title: string, description: string, type: number, id?: string }): void => {
  const objNotification = {
    registration_ids: [],
    notification: {
      ...data,
      body: data.description,
      badge: 1,
      'mutable-content': 1,
      sound: 'default'
    }
  };
  if (tokenList.length >= 1000) {
    objNotification.registration_ids = tokenList.splice(0, 999);
    sendNotificationToFireBase(objNotification).catch(e => console.log(e));
    sendIOSGroupNotification(tokenList.slice(0, 999), data);
  } else {
    objNotification.registration_ids = tokenList;
    sendNotificationToFireBase(objNotification).catch(e => console.log(e));
  }
};

/**
 * This function stringifies notification json object, and requests firebase to send notification
 * @param   {*} data
 * @returns {Promise<void>}
 */
async function sendNotificationToFireBase(data: any): Promise<void> {
  const body = JSON.stringify(data);
  const res = await fetch('https://fcm.googleapis.com/fcm/send', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'Authorization': `key=${fireBaseKeys.serverKey}`,
      'Sender': `id=${fireBaseKeys.senderId}`
    },
    body
  }).then(res => res.json());
  if (res) {
    console.log(`Send notification success: ${res.success}, failure: ${res.failure}`);
  }
}

export const sendSystemNotification = async(notification: { type: number, receiver: string, order: string, request: string, wishList: string, deviceId: string }): Promise<void> => {
  const permissionType = getNotificationPermissionType(notification.type);
  const data = {
    type: notification.type,
    id: ''
  };
  if (notification.receiver) {
    const userDevice = await DeviceSchema.findOne({ user: notification.receiver });
    const notificationData = getStaticNotificationData(notification.type);
    if (userDevice && notificationData) {
      const [ iosHy, isoRu, iosEn, andHy, andRu, andEn ] = await Promise.all([
        await DeviceSchema.find({ deviceToken: { $ne: null }, user: notification.receiver, language: LanguageEnum.hy, osType: OsTypeEnum.ios }).distinct('deviceToken'),
        await DeviceSchema.find({ deviceToken: { $ne: null }, user: notification.receiver, language: LanguageEnum.ru, osType: OsTypeEnum.ios }).distinct('deviceToken'),
        await DeviceSchema.find({ deviceToken: { $ne: null }, user: notification.receiver, language: LanguageEnum.en, osType: OsTypeEnum.ios }).distinct('deviceToken'),
        await DeviceSchema.find({ deviceToken: { $ne: null }, user: notification.receiver, language: LanguageEnum.hy, osType: OsTypeEnum.android }).distinct('deviceToken'),
        await DeviceSchema.find({ deviceToken: { $ne: null }, user: notification.receiver, language: LanguageEnum.ru, osType: OsTypeEnum.android }).distinct('deviceToken'),
        await DeviceSchema.find({ deviceToken: { $ne: null }, user: notification.receiver, language: LanguageEnum.en, osType: OsTypeEnum.android }).distinct('deviceToken')
      ]);
      const en = notificationData.find(item => item.language === LanguageEnum.en);
      const ru = notificationData.find(item => item.language === LanguageEnum.ru);
      const hy = notificationData.find(item => item.language === LanguageEnum.hy);
      if (notification.order) data.id = notification.order;
      else if (notification.request) data.id = notification.request;
      else if (notification.wishList) data.id = notification.wishList;
      if (en) {
        if (iosEn.length) sendIOSGroupNotification(iosEn, { title: en.title, description: en.body, ...data });
        if (andEn.length) sendAndroidGroupNotification(andEn, { title: en.title, description: en.body, ...data });
      }
      if (ru) {
        if (isoRu.length) sendIOSGroupNotification(isoRu, { title: ru.title, description: ru.body, ...data });
        if (andRu.length) sendAndroidGroupNotification(andRu, { title: ru.title, description: ru.body, ...data });
      }
      if (hy) {
        if (iosHy.length) sendIOSGroupNotification(iosHy, { title: hy.title, description: hy.body, ...data });
        if (andHy.length) sendAndroidGroupNotification(andHy, { title: hy.title, description: hy.body, ...data });
      }
    }
  } else {
    const device = await DeviceSchema.findOne({
      deviceToken: { $ne: null },
      deviceId: notification.deviceId
    });
    if (device) {
      const body = getStaticNotificationData(notification.type);
      if (body) {
        const translated = body.find(item => item.language === device.language);
        if (translated) {
          if (device.osType === OsTypeEnum.android) sendAndroidGroupNotification([device.deviceToken], { title : translated.title, description: translated.body, ...data });
          if (device.osType === OsTypeEnum.ios) sendIOSGroupNotification([device.deviceToken], { title : translated.title, description: translated.body, ...data });
        }
      }
    }
  }
};

export const sendSystemNotificationToUsers = async(body: { userIdList: string[], type: number, wishList?: string, order?: string, request?: string}) => {
  const filter: any = {
    user: { $in: body.userIdList },
    deviceToken: { $ne: null },
  };
  const permissionType = getNotificationPermissionType(body.type);
  if (permissionType) filter[permissionType] = true;
  const [ iosHy, isoRu, iosEn, andHy, andRu, andEn ] = await Promise.all([
    await DeviceSchema.find({ ...filter, language: LanguageEnum.hy, osType: OsTypeEnum.ios }).distinct('deviceToken'),
    await DeviceSchema.find({ ...filter, language: LanguageEnum.ru, osType: OsTypeEnum.ios }).distinct('deviceToken'),
    await DeviceSchema.find({ ...filter, language: LanguageEnum.en, osType: OsTypeEnum.ios }).distinct('deviceToken'),
    await DeviceSchema.find({ ...filter, language: LanguageEnum.hy, osType: OsTypeEnum.android }).distinct('deviceToken'),
    await DeviceSchema.find({ ...filter, language: LanguageEnum.ru, osType: OsTypeEnum.android }).distinct('deviceToken'),
    await DeviceSchema.find({ ...filter, language: LanguageEnum.en, osType: OsTypeEnum.android }).distinct('deviceToken')
  ]);
  const notificationData = getStaticNotificationData(body.type);
  const data = {
    type: body.type,
    id: ''
  };
  const en = notificationData.find(item => item.language === LanguageEnum.en);
  const ru = notificationData.find(item => item.language === LanguageEnum.ru);
  const hy = notificationData.find(item => item.language === LanguageEnum.hy);
  if (body.order) data.id = body.order;
  else if (body.request) data.id = body.request;
  else if (body.wishList) data.id = body.wishList;
  if (en) {
    if (iosEn.length) sendIOSGroupNotification(iosEn, { title: en.title, description: en.body, ...data });
    if (andEn.length) sendAndroidGroupNotification(andEn, { title: en.title, description: en.body, ...data });
  }
  if (ru) {
    if (isoRu.length) sendIOSGroupNotification(isoRu, { title: ru.title, description: ru.body, ...data });
    if (andRu.length) sendAndroidGroupNotification(andRu, { title: ru.title, description: ru.body, ...data });
  }
  if (hy) {
    if (iosHy.length) sendIOSGroupNotification(iosHy, { title: hy.title, description: hy.body, ...data });
    if (andHy.length) sendAndroidGroupNotification(andHy, { title: hy.title, description: hy.body, ...data });
  }
};

export const sendCustomNotificationToUsers = async(userIdList: string[], notification: INotification) => {
  const [ iosHy, isoRu, iosEn, andHy, andRu, andEn, dataHy, dataRu, dataEn ] = await Promise.all([
    await DeviceSchema.find({ deviceToken: { $ne: null }, user: { $in: userIdList }, language: LanguageEnum.hy, osType: OsTypeEnum.ios }).distinct('deviceToken'),
    await DeviceSchema.find({ deviceToken: { $ne: null }, user: { $in: userIdList }, language: LanguageEnum.ru, osType: OsTypeEnum.ios }).distinct('deviceToken'),
    await DeviceSchema.find({ deviceToken: { $ne: null }, user: { $in: userIdList }, language: LanguageEnum.en, osType: OsTypeEnum.ios }).distinct('deviceToken'),
    await DeviceSchema.find({ deviceToken: { $ne: null }, user: { $in: userIdList }, language: LanguageEnum.hy, osType: OsTypeEnum.android }).distinct('deviceToken'),
    await DeviceSchema.find({ deviceToken: { $ne: null }, user: { $in: userIdList }, language: LanguageEnum.ru, osType: OsTypeEnum.android }).distinct('deviceToken'),
    await DeviceSchema.find({ deviceToken: { $ne: null }, user: { $in: userIdList }, language: LanguageEnum.en, osType: OsTypeEnum.android }).distinct('deviceToken'),
    await NotificationTranslationSchema.findOne({ notification: notification._id, language: LanguageEnum.hy }),
    await NotificationTranslationSchema.findOne({ notification: notification._id, language: LanguageEnum.ru }),
    await NotificationTranslationSchema.findOne({ notification: notification._id, language: LanguageEnum.en })
  ]);
  if (dataEn) {
    if (iosEn.length) sendIOSGroupNotification(iosEn, { title: dataEn.title, description: dataEn.body, type: NotificationTypeEnum.custom });
    if (andEn.length) sendAndroidGroupNotification(andEn, { title: dataEn.title, description: dataEn.body, type: NotificationTypeEnum.custom });
  }
  if (dataRu) {
    if (isoRu.length) sendIOSGroupNotification(isoRu, { title: dataRu.title, description: dataRu.body, type: NotificationTypeEnum.custom });
    if (andRu.length) sendAndroidGroupNotification(andRu, { title: dataRu.title, description: dataRu.body, type: NotificationTypeEnum.custom });
  }
  if (dataHy) {
    if (iosHy.length) sendIOSGroupNotification(iosHy, { title: dataHy.title, description: dataHy.body, type: NotificationTypeEnum.custom });
    if (andHy.length) sendAndroidGroupNotification(andHy, { title: dataHy.title, description: dataHy.body, type: NotificationTypeEnum.custom });
  }
};


function getNotificationPermissionType(type: number): string {
  let permissionType;
  switch (type) {
    case NotificationTypeEnum.requestFailed:
    case NotificationTypeEnum.requestSucceeded:
    case NotificationTypeEnum.orderCanceled:
    case NotificationTypeEnum.orderFinished:
    case NotificationTypeEnum.requestFailed: {
      permissionType = 'deliveryStatusAllowed';
      break;
    }
    default: {
      break;
    }
  }
  return permissionType;
}