import { ICompany } from '../../schemas/company/model';
import { IAddress } from '../../schemas/address/model';
import { IIdInQuery, IPaginationQuery } from '../mainModels';

export interface ICreateCompanyBody {
  name: string;
  tin: string;
  bilAddress: string;
  bilLat: number;
  bilLng: number;
  bilHouse: number;
  bilApartment: number;
  delAddresses: Array<IAddressObj>;
}

interface IAddressObj {
  address: string;
  lat: number;
  lng: number;
  house: number;
  apartment: number;
  contactName: string;
  contactPhoneNumber: string;
}

export interface IUpdateCompanyBody extends ICreateCompanyBody {
  id: string;
  company: ICompany<string, IAddress, any>;
}

export interface IGetCompanyDetailsQuery extends IIdInQuery {}

export interface IDeleteCompanyQuery extends IIdInQuery {}

export interface IGetCompanyListQuery extends IPaginationQuery {}

export interface IAddCompanyAddressBody extends IAddressObj {
  id: string;
  company: ICompany;
}