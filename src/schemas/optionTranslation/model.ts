import { Document, Model } from 'mongoose';

interface IOptionTranslationDocument<O = string> extends Document {
  option: O;
  language: number;
  name: string;
}

export interface IOptionTranslation<O = string> extends IOptionTranslationDocument<O> {

}

export interface IOptionTranslationModel extends Model<IOptionTranslation<any>> {

}