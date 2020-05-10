import * as bcrypt from 'bcrypt';

import { IResponseModel, getResponse } from '../mainModels';

import { IUser } from '../../schemas/user/model';
import { IUpdateUserProfileBody, IVerifyPhoneBody, IGetUserListBody, ISetUserTariffBody, IGetUserListFilter } from './model';
import { verificationCodeLength } from '../../constants/constants';

import UserSchema             from '../../schemas/user';
import OrderSchema            from '../../schemas/order';
import RequestPackSchema      from '../../schemas/requestPack';
import UserNotificationSchema from '../../schemas/userNotification';
import ConversationSchema     from '../../schemas/conversation';
import MessageSchema          from '../../schemas/message';
import CompanySchema          from '../../schemas/company';
import AddressSchema          from '../../schemas/address';

import OrderServices   from '../order/service';
import RequestServices from '../request/service';

import { UserTypeEnum, RequestPackStatusEnum, OrderStatusEnum, MessageTypeEnum } from '../../constants/enums';
import { sendVerificationCodeViaSMS } from '../../services/smsSender';
import { regexpEscape } from '../mainValidation';

class WishListServices {

  public getUserProfile = async(user: IUser, short: boolean): Promise<IResponseModel> => {
    const profile: any = {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email
    };
    const badges = await this.getUserBadgeCounts(user._id);
    if (short) return getResponse(true, 'Got user profile', { ...profile, ...badges });
    profile.points = user.points;
    profile.tariffPlan = user.tariffPlan;
    profile.phoneNumber = user.phoneNumber && user.phoneVerified ? user.phoneNumber : null;
    return getResponse(true, 'Got user profile', { ...profile, ...badges });
  }

  public updateUserProfile = async(user: IUser, body: IUpdateUserProfileBody): Promise<IResponseModel> => {
    user.firstName = body.firstName || null;
    user.lastName = body.lastName || null;
    user.fullName = getName(body.firstName, body.lastName);
    user.email = body.email;
    await user.save();
    return getResponse(true, 'Profile updated');
  }

  public updateUserPhone = async(user: IUser, phoneNumber: string): Promise<IResponseModel> => {
    if (phoneNumber) {
      user.phoneNumber = phoneNumber;
      user.phoneVerified = false;
      const verificationCode = this.generateVerificationCode(verificationCodeLength);
      user.phoneVerificationCode = bcrypt.hashSync(verificationCode, 12);
      const message = `Your verification code for ineed - ${verificationCode}. Use it to save your phone number`;
      sendVerificationCodeViaSMS(message, phoneNumber).catch(e => console.log(e));
      await user.save();
      return getResponse(true, 'Sms sent');
    } else {
      user.phoneNumber = phoneNumber;
      user.phoneVerified = false;
      user.phoneVerificationCode = null;
      await user.save();
      return getResponse(true, 'Phone detached', null);
    }
  }

  public verifyPhone = async(user: IUser, body: IVerifyPhoneBody): Promise<IResponseModel> => {
    if (bcrypt.compareSync(body.code, user.phoneVerificationCode)) {
      user.phoneVerified = true;
      await user.save();
      return getResponse(true, 'Phone number verified');
    } else {
      return getResponse(false, 'Wrong code');
    }
  }

  public getUserList = async(body: IGetUserListBody): Promise<IResponseModel> => {
    const filter = getUserFilter(body);
    const itemCount = await UserSchema.countDocuments(filter);
    if (itemCount === 0) return getResponse(true, 'Got user list', { itemList: [], pageCount: 0, itemCount : 0 });
    const pageCount = Math.ceil(itemCount / body.limit);
    if (body.pageNo > pageCount) return getResponse(false, 'PageNo must be less or equal than ' + pageCount);
    const skip = (body.pageNo - 1) * body.limit;
    const list = await UserSchema.find(filter).select({
      _id: 1,
      nid: 1,
      fullName: 1,
      email: 1,
      phoneNumber: 1,
      orderCount: 1,
      requestCount: 1,
      tariffPlan: 1,
      createdDt: 1
    }).skip(skip).limit(body.limit).sort({ createdDt: -1 });
    const itemList = list.map(item => {
      return {
        _id: item._id,
        nid: item.nid,
        name: item.fullName,
        email: item.email,
        phoneNumber: item.phoneNumber,
        orderCount: item.orderCount,
        requestCount: item.requestCount,
        tariffPlan: item.tariffPlan,
        createdDt: item.createdDt
      };
    });
    return getResponse(true, 'Got user list', { itemList, pageCount, itemCount });
  }

  public setUserTariff = async(body: ISetUserTariffBody): Promise<IResponseModel> => {
    body.user.tariffPlan = body.tariffPlan;
    await body.user.save();
    return getResponse(true, 'Tariff plan set');
  }

  public getUserDetails = async(user: IUser): Promise<IResponseModel> => {
    const details: any = {
      _id: user._id,
      name: getName(user.firstName, user.lastName),
      email: user.email,
      phoneNumber: user.phoneNumber,
      iBonus: user.points,
      blocked: user.blocked,
      tariffPlan: user.tariffPlan,
      createdDt: user.createdDt,
      canceledOrderCount: user.canceledOrderCount,
      finishedOrderCount: user.finishedOrderCount,
      orderCount: 0,
      requestCount: 0
    };
    const [ orderCount, requestCount, companyList ] = await Promise.all([
      await OrderSchema.countDocuments({ user: user._id }),
      await RequestPackSchema.countDocuments({ user: user._id }),
      await CompanySchema.find({ deleted: false, user: user._id })
    ]);
    details.orderCount = orderCount;
    details.requestCount = requestCount;
    details.companyList = await Promise.all(companyList.map(async item => {
      const delAddress = await AddressSchema.findById(item.deliveryAddresses[0]);
      return {
        companyName        : item.name,
        companyTin         : item.tin,
        companyContactName : delAddress ? delAddress.contactName : null,
        companyContactPhone: delAddress ? delAddress.contactPhoneNumber : null
      };
    }));
    return getResponse(true, 'Got details', details);
  }

  public getUserOrders = async(query: any): Promise<IResponseModel> => {
    const response = await OrderServices.getListForAdmin({ pageNo: query.pageNo, limit: query.limit, userId: query.id });
    return response;
  }

  public getUserRequests = async(query: any): Promise<IResponseModel> => {
    const response = await RequestServices.getRequestPackListForAdmin({ pageNo: query.pageNo, limit: query.limit, userId: query.id, language: query.language });
    return response;
  }

  public getUserCountByFilter = async(filters: Array<IGetUserListFilter>): Promise<IResponseModel> => {
    let isAll = false;
    const mainFilter = { $or: [] };
    if (!filters.length) {
      isAll = true;
    } else {
      for (let i = 0; i < filters.length; i++) {
        if (!filters[i]) {
          isAll = true;
          break;
        }
        mainFilter.$or.push(getUserFilter(filters[i], true));
      }
    }
    let count;
    if (isAll) {
      count = await UserSchema.countDocuments({ blocked: false });
    } else {
      count = await UserSchema.countDocuments(mainFilter);
    }
    return getResponse(true, 'Got item count', count);
  }

  public blockOrUnBlockUser = async(user: IUser): Promise<IResponseModel> => {
    user.blocked = !user.blocked;
    await user.save();
    return getResponse(true, 'ok');
  }

  public getUserBadges = async(userId: string): Promise<IResponseModel> => {
    const data = await this.getUserBadgeCounts(userId);
    return getResponse(true, 'Got badges', { message: !!data.message, notification: !!data.notification });
  }

  private getUserBadgeCounts = async(userId: string) => {
    const conversation = await ConversationSchema.findOne({ user: userId });
    if (conversation) {
      const [ notificationCount, messageCount ] = await Promise.all([
        await UserNotificationSchema.countDocuments({ receiver: userId, seen: false }),
        await MessageSchema.countDocuments({ conversation: conversation._id, messageType: MessageTypeEnum.answer, seen: false })
      ]);
      return { notification: notificationCount, message: messageCount };
    } else {
      const notificationCount = await UserNotificationSchema.countDocuments({ receiver: userId, seen: false });
      return { notification: notificationCount, message: 0 };
    }
  }

  private generateVerificationCode = (length: number) => {
    const charset = '0123456789';
    let text = '';
    for (let i = 0; i < length; i++) {
      const char = charset.charAt(Math.ceil(Math.random() * (charset.length - 1)));
      text += char;
    }
    return text;
  }

}

function getName(firstName: string, lastName) {
  if (firstName && lastName) return `${firstName} ${lastName}`;
  if (firstName) return firstName;
  if (lastName) return lastName;
  return null;
}

export function getUserFilter (body: IGetUserListFilter, forPush: boolean = false): any {
  const filter: any = {
    role: UserTypeEnum.user,
    passwords: { $exists: true, $not: { $size: 0 } }
  };
  if (forPush) filter.blocked = false;
  if (body.tariffPlan) filter.tariffPlan = body.tariffPlan;
  if (body.orderFrom) {
    filter.orderCount = { $gte: body.orderFrom };
  }
  if (body.orderTo) {
    if (filter.orderCount) filter.orderCount.$lte = body.orderTo;
    else filter.orderCount = { $lte: body.orderTo };
  }
  if (body.requestFrom) {
    filter.requestCount = { $gte: body.requestFrom };
  }
  if (body.requestTo) {
    if (filter.requestCount) filter.requestCount.$lte = body.requestTo;
    else filter.requestCount = { $lte: body.requestTo };
  }
  if (body.search) {
    const key = regexpEscape(body.search);
    filter.$or = [
      { email: new RegExp(key, 'i') },
      { fullName: new RegExp(key, 'i') }
    ];
    if (!isNaN(+key)) {
      filter.$or.push({ nid: +key });
      filter.$or.push({ phoneNumber: new RegExp(key, 'i') });
    }
  }
  return filter;
}

export default new WishListServices();