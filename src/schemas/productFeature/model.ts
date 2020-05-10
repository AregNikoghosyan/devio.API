import { Document, Model } from 'mongoose';

interface IProductFeatureDocument<P = string, PFT = string> extends Document {
  product: P;
  translations: Array<PFT>;
}

export interface IProductFeature<P = string, PFT = string> extends IProductFeatureDocument<P, PFT> {

}

export interface IProductFeatureModel extends Model<IProductFeature<any, any>> {
  getTranslatedList(idList: string[], language: number): Promise<any[]>;
}