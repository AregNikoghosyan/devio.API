import { Document, Model } from 'mongoose';

interface IAttributeTranslationDocument<A = string> extends Document {
  attribute: A;
  language: number;
  name: string;
}

export interface IAttributeTranslate<A = string> extends IAttributeTranslationDocument<A> {

}

export interface IAttributeTranslateModel extends Model<IAttributeTranslate<any>> {

}