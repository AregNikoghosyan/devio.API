import { Document, Model } from 'mongoose';

interface IProductPricingDocument<P = string> extends Document {
  product: P;
  fromCount: number;
  discount: number;
  bonus: number;
  deleted: boolean;
}

export interface IProductPricing<P = string> extends IProductPricingDocument<P> {

}

export interface IProductPricingModel extends Model<IProductPricing<any>> {

}