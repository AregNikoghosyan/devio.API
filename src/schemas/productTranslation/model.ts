import { Document, Model } from 'mongoose';

interface IProductTranslationDocument<P = string> extends Document {
  product: P;
  language: number;
  name: string;
  description: string;
}

export interface IProductTranslation<P = string> extends IProductTranslationDocument<P> {

}

export interface IProductTranslationModel extends Model<IProductTranslation<any>> {
  getSearch(key: string): Promise<Array<any>>;
  getSearchNames(key: string): Promise<Array<any>>;
}