import { Document, Model } from 'mongoose';

interface IAddressDocument<U = string, C = string, O = string> extends Document {
  user: U;
  company: C;
  order: O;
  address: string;
  lat: number;
  lng: number;
  house: number;
  apartment: number;
  contactName: string;
  contactPhoneNumber: string;
  isUserDefaultAddress: boolean;
  createdDt: Date;
  updatedDt: Date;
}

export interface IAddress<U = string, C = string, O = string> extends IAddressDocument<U, C, O> {

}

export interface IAddressModel extends Model<IAddress<any, any, any>> {

}