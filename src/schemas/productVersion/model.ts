import { Document, Model } from 'mongoose';

interface IProductVersionDocument<P = string, A = string, O = string, PH = string> extends Document {
  product: P;
  attributes: Array<{
    attribute: A;
    option: O;
  }>;
  photo: PH;
  price: number;
  hasDefaultPrice: boolean;
  availableCount: number;
  boughtCount: number;
  hidden: boolean;
  deleted: boolean;
}

export interface IProductVersion<P = string, A = string, O = string, PH = string> extends IProductVersionDocument<P, A, O, PH> {

}

export interface IProductVersionModel extends Model<IProductVersion<any, any, any, any>> {
  getListForAdmin(filter: any): Promise<any[]>;
  getPriceRange(filter: any): Promise<{ _id: string, minPrice: number, maxPrice: number }>;
  getDefaultAvailableAttributes(productId: string): Promise<any>;
  getOptionsByAttribute(attributeId: string, productId: string): Promise<string[]>;
  popOption(optionId: string): Promise<void>;
}

