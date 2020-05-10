import { IUser } from '../../schemas/user/model';
import { ICreateAddressBody, IGetAddressMainListQuery, IUpdateAddressBody } from './model';
import { IResponseModel, getResponse } from '../mainModels';

import AddressSchema from '../../schemas/address';
import { IAddress } from '../../schemas/address/model';

class AddressServices {

  public createAddress = async(user: IUser, body: ICreateAddressBody): Promise<IResponseModel> => {
    const userAddress = new AddressSchema({
      user: user ? user._id : null,
      address: body.address,
      lat: body.lat,
      lng: body.lng,
      contactName: body.contactName,
      contactPhoneNumber: body.contactPhoneNumber
    });
    if (body.apartment) userAddress.apartment = body.apartment;
    if (body.house) userAddress.house = body.house;
    if (user) {
      if (body.isDefault) {
        userAddress.isUserDefaultAddress = true;
        await AddressSchema.updateMany({ user: user._id, _id: { $ne: userAddress._id } }, { isUserDefaultAddress: false });
      } else {
        const userAddressCount = await AddressSchema.countDocuments({ user: user._id });
        if (!userAddressCount) userAddress.isUserDefaultAddress = true;
      }
    }
    await userAddress.save();
    return getResponse(true, 'Address added successfully', userAddress._id);
  }

  public getAllAddresses = async(userId): Promise<IResponseModel> => {
    const itemList = await AddressSchema.find({
      user: userId,
      company: null
    }).select({
      _id: 1,
      address: 1,
      contactName: 1,
      contactPhoneNumber: 1
    });
    return getResponse(true, 'Got address list', itemList);
  }

  public updateAddress = async(body: IUpdateAddressBody): Promise<IResponseModel> => {
    body.addressObj.address = body.address;
    body.addressObj.lat = body.lat;
    body.addressObj.lng = body.lng;
    body.addressObj.house = body.house;
    body.addressObj.apartment = body.apartment;
    body.addressObj.contactName = body.contactName;
    body.addressObj.contactPhoneNumber = body.contactPhoneNumber;
    if (body.isDefault && !body.addressObj.isUserDefaultAddress) {
      body.addressObj.isUserDefaultAddress = true;
      await Promise.all([
        await AddressSchema.update({
            _id: { $ne: body.addressObj._id }, user: body.addressObj.user, isUserDefaultAddress: true
          }, {
            isUserDefaultAddress: false
        }),
        await body.addressObj.save()
      ]);
    } else if (!body.isDefault && body.addressObj.isUserDefaultAddress) {
      body.addressObj.isUserDefaultAddress = false;
      await Promise.all([
        await AddressSchema.updateOne({
            _id: { $ne: body.addressObj._id }, user: body.addressObj.user
          }, {
            isUserDefaultAddress: true
        }),
        await body.addressObj.save()
      ]);
    } else {
      await body.addressObj.save();
    }
    return getResponse(true, 'Address updated', body.id);
  }
  public deleteAddress = async(address: IAddress): Promise<IResponseModel> => {
    if (address.isUserDefaultAddress) {
      await Promise.all([
        await AddressSchema.updateOne({ user: address.user, _id: { $ne: address._id } }, { isUserDefaultAddress: true }),
        await AddressSchema.deleteOne({ _id: address._id })
      ]);
    } else {
      await AddressSchema.deleteOne({ _id: address._id });
    }
    return getResponse(true, 'Address deleted successfully');
  }

  public getAddressCount = async(id: string): Promise<IResponseModel> => {
    const count = await AddressSchema.countDocuments({ user: id });
    return getResponse(true, 'Got address count', count);
  }

  public getAddressMainList = async(id: string, query: IGetAddressMainListQuery): Promise<IResponseModel> => {
    const filter = {
      user: id
    };
    const itemCount = await AddressSchema.countDocuments(filter);
    if (itemCount === 0) return getResponse(true, 'Got address list', { itemList: [], pagesLeft: false });
    const pageCount = Math.ceil(itemCount / +query.limit);
    if (+query.pageNo > pageCount) return getResponse(false, 'PageNo must be less or equal than ' + pageCount);
    const skip = (+query.pageNo - 1) * +query.limit;
    const sort = {
      isUserDefaultAddress: -1,
      createdDt: -1
    };
    const itemList = await AddressSchema.find(filter).sort(sort).skip(skip).limit(+query.limit).select({
      _id: 1,
      address: 1,
      house: 1,
      apartment: 1,
      isUserDefaultAddress: 1,
      contactName: 1,
      contactPhoneNumber: 1
    });
    return getResponse(true, 'Got address list', { itemList, pagesLeft: +query.pageNo !== pageCount });
  }

  public deleteAllAddresses = async(userId: string): Promise<IResponseModel> => {
    await AddressSchema.deleteMany({ user: userId });
    return getResponse(true, 'Addresses deleted');
  }

}

export default new AddressServices();