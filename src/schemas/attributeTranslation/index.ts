import * as mongoose from 'mongoose';
import { schemaReferences } from '../../constants/constants';
import { IAttributeTranslateModel, IAttributeTranslate } from './model';

const Schema = mongoose.Schema;

const schema = new Schema({
  attribute: {
    type     : Schema.Types.ObjectId,
    ref      : schemaReferences.attribute,
    required : true
  },
  language: {
    type     : Number,
    required : true
  },
  name: {
    type     : String,
    required : true
  }
});

export const attributeTranslation: IAttributeTranslateModel = mongoose.model<IAttributeTranslate<any>, IAttributeTranslateModel>(schemaReferences.attributeTranslation, schema);
export default attributeTranslation;