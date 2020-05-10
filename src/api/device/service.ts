import DeviceSchema from '../../schemas/device';
import WishListSchema from '../../schemas/wishList';

import { IUser } from '../../schemas/user/model';
import { IChangePermissionBody, ICreateDeviceBody, IChangeLanguageBody, ISetDeviceTokenBody } from './model';
import { IResponseModel, getResponse } from '../mainModels';
import { NotificationPermissionsEnum } from '../../constants/enums';
import { IDevice } from '../../schemas/device/model';

class DeviceServices {

  public createDevice = async(body: ICreateDeviceBody, user: IUser): Promise<IResponseModel> => {
    const oldDevice = await DeviceSchema.findOne({
      user: user ? user._id : null,
      deviceId: body.deviceId
    });
    if (oldDevice) {
      oldDevice.language = body.language;
      await oldDevice.save();
    } else {
      const newDevice = new DeviceSchema({
        user        : user ? user._id          : null,
        deviceId    : body.deviceId,
        deviceToken : body.deviceToken || null,
        osType      : body.osType,
        language    : body.language
      });
      await Promise.all([
        await DeviceSchema.deleteMany({ deviceId: body.deviceId, id: { $ne: newDevice._id } }),
        await newDevice.save()
      ]);
    }
    return getResponse(true, 'Device created');
  }

  public setDeviceToken = async(body: ISetDeviceTokenBody): Promise<IResponseModel> => {
    body.device.deviceToken = body.deviceToken;
    await body.device.save();
    return getResponse(true, 'Token set');
  }

  public getDeviceSettings = async(device: IDevice): Promise<IResponseModel> => {
    const returnObj = {
      language: device.language,
      newOffersAllowed: device.newOffersAllowed,
      bonusesAllowed: device.bonusesAllowed,
      deliveryStatusAllowed: device.deliveryStatusAllowed,
    };
    return getResponse(true, 'Got settings', returnObj);
  }

  public changePermission = async(user: IUser, body: IChangePermissionBody): Promise<IResponseModel> => {
    if (user) {
      const firstDevice = await DeviceSchema.findOne({ user: user._id });
      if (firstDevice) {
        let updateBody;
        switch (body.type) {
          case NotificationPermissionsEnum.deliveryStatus: {
            updateBody = { deliveryStatusAllowed: !firstDevice.deliveryStatusAllowed };
            break;
          }
          case NotificationPermissionsEnum.newOffers: {
            updateBody = { newOffersAllowed: !firstDevice.newOffersAllowed };
            break;
          }
          case NotificationPermissionsEnum.bonuses: {
            updateBody = { bonusesAllowed: !firstDevice.bonusesAllowed };
            break;
          }
        }
        await DeviceSchema.updateMany({ user: user._id }, updateBody);
      } else {
        await DeviceSchema.reversePermission([user._id], body.type);
      }
      return getResponse(true, 'Permission updated');
    } else {
      const device = body.device;
      device.user = null;
      switch (body.type) {
        case NotificationPermissionsEnum.deliveryStatus: {
          device.deliveryStatusAllowed = !device.deliveryStatusAllowed;
          break;
        }
        case NotificationPermissionsEnum.newOffers: {
          device.newOffersAllowed = !device.newOffersAllowed;
          break;
        }
        case NotificationPermissionsEnum.bonuses: {
          device.bonusesAllowed = !device.bonusesAllowed;
          break;
        }
      }
      await device.save();
      return getResponse(true, 'Permission set');
    }
  }

  public changeLanguage = async(user: IUser, body: IChangeLanguageBody): Promise<IResponseModel> => {
    if (user) {
      await DeviceSchema.updateMany({ user: user._id }, { language: body.language });
      return getResponse(true, 'Language updated');
    } else {
      const device = body.device;
      device.user = null;
      device.language = body.language;
      await device.save();
      return getResponse(true, 'Language updated');
    }
  }

}

export default new DeviceServices();