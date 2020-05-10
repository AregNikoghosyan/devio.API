import { Model, Document } from 'mongoose';

interface IEmailMessageDocument extends Document {
  email: string;
}

export interface IEmailMessage extends IEmailMessageDocument {

}

export interface IEmailMessageModel extends Model<IEmailMessage> {

}