import { IIdInQuery, IPaginationQuery } from '../mainModels';
import { IAddress } from '../../schemas/address/model';

export interface ICreateAddressBody {
  address: string;
  lat: number;
  lng: number;
  house: number;
  apartment: number;
  contactName: string;
  contactPhoneNumber: string;
  isDefault?: boolean;
}

export interface IUpdateAddressBody extends ICreateAddressBody {
  id: string;
  addressObj: IAddress;
}

export interface IDeleteAddressQuery extends IIdInQuery {}

export interface IGetAddressDetailsQuery extends IIdInQuery {}

export interface IGetAddressMainListQuery extends IPaginationQuery {}