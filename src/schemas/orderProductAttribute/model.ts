import { Document, Model } from 'mongoose';

interface IOrderProductAttributeDocument<OP = string, A = string, O = string> extends Document {
  orderProduct: OP;
  attributeId: A;
  optionId: O;
  translations: Array<{
    language: string;
    attributeName: string;
    optionName: string;
  }>;
}

export interface IOrderProductAttribute<OP = string, A = string, O = string> extends IOrderProductAttributeDocument<OP, A, O> {

}

export interface IOrderProductAttributeModel extends Model<IOrderProductAttribute<any, any, any>> {

}