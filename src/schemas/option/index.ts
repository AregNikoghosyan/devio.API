import * as mongoose from 'mongoose';
import { schemaReferences } from '../../constants/constants';
import { IOptionModel, IOption } from './model';

const Schema = mongoose.Schema;

const schema = new Schema({
  attribute: {
    type: Schema.Types.ObjectId,
    ref: schemaReferences.attribute,
    required: true
  },
  translations: [{
    type : Schema.Types.ObjectId,
    ref  : schemaReferences.optionTranslation
  }],
  position: {
    type: Number,
    default: null
  },
  colorType: {
    type: Number,
    default: 0
  },
  firstColor: {
    type: String,
    default: null
  },
  secondColor: {
    type: String,
    default: null
  },
  hidden: {
    type: Boolean,
    default: false
  },
  deleted: {
    type: Boolean,
    default: false
  }
});

export const option: IOptionModel = mongoose.model<IOption<any, any>, IOptionModel>(schemaReferences.option, schema);
export default option;