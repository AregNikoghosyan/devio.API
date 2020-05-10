import { Document, Model } from 'mongoose';

interface ICompanyDocument<U = string, BA = string, DA = string> extends Document {
  user: U;
  name: string;
  tin: string;
  billingAddress: BA;
  deliveryAddresses: Array<DA>;
  createdDt: Date;
  updatedDt: Date;
  deleted: boolean;
}

export interface ICompany<U = string, BA = string, DA = string> extends ICompanyDocument<U, BA, DA> {

}

export interface ICompanyModel extends Model<ICompany<any, any, any>> {
  bulkDelete(id: string): Promise<void>;
}