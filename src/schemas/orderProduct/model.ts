import { Document, Model } from 'mongoose';

interface IOrderProductDocument<O = string, OPA = string> extends Document {
  order: O;
  productId: string;
  translations: Array<{
    language: number,
    name: string
  }>;
  productVersionId: string;
  name: string;
  step: number;
  stepCount: number;
  count: number;
  price: number;
  discountedPrice: number;
  discount: number;
  totalPrice: number;
  totalDiscountedPrice: number;
  totalDiscount: number;
  image: string;
  partner: string;
  attributes: Array<OPA>;
}

export interface IOrderProduct<O = string, OPA = string> extends IOrderProductDocument<O, OPA> {

}

export interface IOrderProductModel extends Model<IOrderProduct<any, any>> {
  getListForAdmin(productIdList: string[], language: number): Promise<any[]>;
}