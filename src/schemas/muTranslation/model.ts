import { Document, Model } from 'mongoose';

interface IMUTranslationDocument<M = string> extends Document {
  mu: M;
  language: number;
  name: string;
}

export interface IMUTranslation<M = string> extends IMUTranslationDocument<M> {

}

export interface IMUTranslationModel extends Model<IMUTranslation<any>> {

}