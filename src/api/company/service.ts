import { ICreateCompanyBody, IUpdateCompanyBody, IGetCompanyListQuery, IAddCompanyAddressBody } from './model';
import { IResponseModel, getResponse } from '../mainModels';
import { IUser } from '../../schemas/user/model';

import CompanySchema from '../../schemas/company';
import AddressSchema from '../../schemas/address';

class CompanyServices {

  public createCompany = async(user: IUser, body: ICreateCompanyBody): Promise<IResponseModel> => {
    const company = new CompanySchema({
      user: user._id,
      name: body.name,
      tin: body.tin,
    });
    const billingAddress = new AddressSchema({
      company: company._id,
      address: body.bilAddress,
      lat: body.bilLat,
      lng: body.bilLng
    });
    if (body.bilApartment) billingAddress.apartment = body.bilApartment;
    if (body.bilHouse) billingAddress.house = body.bilHouse;
    const addresses = body.delAddresses.map(item => {
      const address: any = {
        company: company._id,
        address: item.address,
        lat: item.lat,
        lng: item.lng,
        contactName: item.contactName,
        contactPhoneNumber: item.contactPhoneNumber
      };
      if (item.apartment) address.apartment = item.apartment;
      if (item.house) address.house = item.house;
      return address;
    });
    company.deliveryAddresses = await AddressSchema.insertMany(addresses);
    company.billingAddress = billingAddress._id;
    await Promise.all([
      await company.save(),
      await billingAddress.save(),
    ]);
    return getResponse(true, 'Company created successfully', company._id);
  }

  public updateCompany = async(body: IUpdateCompanyBody): Promise<IResponseModel> => {
    const company = body.company;
    company.name = body.name;
    company.tin = body.tin;

    company.billingAddress.address = body.bilAddress;
    company.billingAddress.lat = body.bilLat;
    company.billingAddress.lng = body.bilLng;
    company.billingAddress.house = body.bilHouse ? body.bilHouse : null;
    company.billingAddress.apartment = body.bilApartment ? body.bilApartment : null;

    await AddressSchema.deleteMany({ _id: { $in: company.deliveryAddresses } });
    const addresses = body.delAddresses.map(item => {
      const address: any = {
        company: company._id,
        address: item.address,
        lat: item.lat,
        lng: item.lng,
        contactName: item.contactName,
        contactPhoneNumber: item.contactPhoneNumber
      };
      if (item.apartment) address.apartment = item.apartment;
      if (item.house) address.house = item.house;
      return address;
    });
    company.deliveryAddresses = await AddressSchema.insertMany(addresses);
    await Promise.all([
      await company.save(),
      await company.billingAddress.save()
    ]);
    return getResponse(true, 'Company updated successfully');
  }

  public deleteCompany = async(id: string): Promise<IResponseModel> => {
    await CompanySchema.bulkDelete(id);
    return getResponse(true, 'Company deleted');
  }

  public deleteUsersAllCompanies = async(userId: string): Promise<IResponseModel> => {
    const companyIdList = await CompanySchema.find({ user: userId, deleted: false }).distinct('_id');
    await Promise.all(companyIdList.map(async item => {
      await CompanySchema.bulkDelete(item);
    }));
    return getResponse(true, 'Companies deleted');
  }

  public getCompanyList = async(id: string, query: IGetCompanyListQuery): Promise<IResponseModel> => {
    const filter = {
      user: id,
      deleted: false
    };
    const itemCount = await CompanySchema.countDocuments(filter);
    if (itemCount === 0) return getResponse(true, 'Got address list', { itemList: [], pagesLeft: false });
    const pageCount = Math.ceil(itemCount / +query.limit);
    if (+query.pageNo > pageCount) return getResponse(false, 'PageNo must be less or equal than ' + pageCount);
    const skip = (+query.pageNo - 1) * +query.limit;
    const sort = {
      createdDt: -1
    };
    const list = await CompanySchema.find(filter).select({
      _id: 1,
      name: 1,
      tin: 1,
      createdDt: 1,
      billingAddress: 1
    }).sort(sort).skip(skip).limit(+query.limit).lean();
    const itemList = await Promise.all(list.map(async item => {
      const returnObj = {
        _id: item._id,
        name: item.name,
        tin: item.tin,
        createdDt: item.createdDt,
        address: ''
       };
      const bilAddress = await AddressSchema.findById(item.billingAddress);
      if (bilAddress) {
        returnObj.address = bilAddress.address;
      }
      return returnObj;
    }));
    return getResponse(true, 'Got address list', { itemList, pagesLeft: +query.pageNo !== pageCount });
  }

  public getCompanyShortList = async(userId: string): Promise<IResponseModel> => {
    const list = await CompanySchema.find({ user: userId, deleted: false }).select({ _id: 1, name: 1 });
    return getResponse(true, 'Got list', list);
  }

  public addCompanyAddress = async(body: IAddCompanyAddressBody): Promise<IResponseModel> => {
    const newAddress = new AddressSchema({
      company: body.company._id,
      address: body.address,
      lat: body.lat,
      lng: body.lng,
      contactName: body.contactName,
      contactPhoneNumber: body.contactPhoneNumber
    });
    if (body.apartment) newAddress.apartment = body.apartment;
    if (body.house) newAddress.house = body.house;
    body.company.deliveryAddresses.push(newAddress._id);
    await Promise.all([
      await newAddress.save(),
      await body.company.save()
    ]);
    return getResponse(true, 'New address added', newAddress._id);
  }

}

export default new CompanyServices();