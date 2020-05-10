import { Document, Model } from 'mongoose';

interface INotificationTranslationDocument<N = string> extends Document {
  notification: N;
  language: number;
  title: string;
  body: string;
}

export interface INotificationTranslation<N = string> extends INotificationTranslationDocument<N> {

}

export interface INotificationTranslationModel extends Model<INotificationTranslation<any>> {

}