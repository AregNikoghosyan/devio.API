import * as mongoose from 'mongoose';
import { schemaReferences } from '../../constants/constants';
import { IOrderProductAttributeModel, IOrderProductAttribute } from './model';

const Schema = mongoose.Schema;

const schema = new Schema({
  orderProduct: {
    type: Schema.Types.ObjectId,
    ref: schemaReferences.orderProduct,
    required: true
  },
  attributeId: {
    type: Schema.Types.ObjectId,
    ref: schemaReferences.attribute,
    required: true
  },
  optionId: {
    type: Schema.Types.ObjectId,
    ref: schemaReferences.option,
    required: true
  },
  translations: [{
    language: {
      type: Number,
      required: true
    },
    attributeName: {
      type: String,
      required: true
    },
    optionName: {
      type: String,
      required: true
    }
  }]
});

const orderProductAttribute: IOrderProductAttributeModel = mongoose.model<IOrderProductAttribute<any, any, any>, IOrderProductAttributeModel>(schemaReferences.orderProductAttribute, schema);
export default orderProductAttribute;