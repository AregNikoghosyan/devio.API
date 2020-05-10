import { Document, Model } from 'mongoose';

interface IMessageDocument<C = string, U = string, F = string> extends Document {
  conversation: C;
  sender: U;
  messageType: number;
  messageMediaType: number;
  seen: boolean;
  message: string;
  file: F;
  createdDt: Date;
  updatedDt: Date;
}

export interface IMessage<C = string, U = string, F = string> extends IMessageDocument<C, U, F> {

}

export interface IMessageModel extends Model<IMessage<any, any, any>> {
  getTemplateMessage(language: number): any;
  getList(filter: any, skip: number, limit: number): any;
}