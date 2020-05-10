import { Document, Model } from 'mongoose';

interface IConversationDocument<U = string, G = string> extends Document {
  user: U;
  guest: G;
  deviceId: string;
  messageCount: number;
  createdDt: Date;
  updatedDt: Date;
}

export interface IConversation<U = string, G = string> extends IConversationDocument<U, G> {

}

export interface IConversationModel extends Model<IConversation<any, any>> {
  getListForAdmin(filter: any, language: number, skip?: number, limit?: number): any[];
}