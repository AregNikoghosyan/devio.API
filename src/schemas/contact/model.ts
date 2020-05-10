import { Model, Document } from 'mongoose';

interface IContactDocument extends Document {
  address: string;
  email: string;
  phone: string;
  latitude: number;
  longitude: number;
}

export interface IContact extends IContactDocument {

}

export interface IContactModel extends Model<IContactDocument> {

}