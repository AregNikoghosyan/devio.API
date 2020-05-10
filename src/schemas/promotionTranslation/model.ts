import { Document, Model } from 'mongoose';

interface IPromotionTranslationDocument<P = string> extends Document {
  promotion: P;
  language: number;
  name: string;
}

export interface IPromotionTranslation<P = string> extends IPromotionTranslationDocument<P> {

}

export interface IPromotionTranslationModel extends Model<IPromotionTranslation<any>> {

}