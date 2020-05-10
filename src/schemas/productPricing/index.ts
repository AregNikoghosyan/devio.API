import * as mongoose from 'mongoose';
import { schemaReferences } from '../../constants/constants';
import { IProductPricingModel, IProductPricing } from './model';

const Schema = mongoose.Schema;

const schema = new Schema({
  product: {
    type     : Schema.Types.ObjectId,
    ref      : schemaReferences.product,
    required : true
  },
  fromCount: {
    type: Number,
    required: true
  },
  discount: {
    type: Number,
    default: null
  },
  bonus: {
    type: Number,
    default: null
  },
  deleted: {
    type: Boolean,
    default: false
  }
});

schema.index({ 'product': -1 });

const productPricing: IProductPricingModel = mongoose.model<IProductPricing<any>, IProductPricingModel>(schemaReferences.productPricing, schema);
export default productPricing;

