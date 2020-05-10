import { Document, Model } from 'mongoose';

interface ICategoryTranslationDocument<C = string> extends Document {
  category: C;
  language: number;
  name: string;
}

export interface ICategoryTranslate<C = string> extends ICategoryTranslationDocument<C> {

}

export interface ICategoryTranslateModel extends Model<ICategoryTranslate<any>> {

}