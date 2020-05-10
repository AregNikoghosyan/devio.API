import { Model, Document } from 'mongoose';

interface ISupportMessageDocument extends Document {
  name: string;
  email: string;
  phone: string;
  message: string;
  createdDt: Date;
}

export interface ISupportMessage extends ISupportMessageDocument {

}

export interface ISupportMessageModel extends Model<ISupportMessage> {

}