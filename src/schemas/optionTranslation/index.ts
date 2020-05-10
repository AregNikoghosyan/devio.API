import * as mongoose from 'mongoose';
import { schemaReferences } from '../../constants/constants';
import { IOptionTranslation, IOptionTranslationModel } from './model';

const Schema = mongoose.Schema;

const schema = new Schema({
  option: {
    type     : Schema.Types.ObjectId,
    ref      : schemaReferences.option,
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

export const optionTranslation: IOptionTranslationModel = mongoose.model<IOptionTranslation<any>, IOptionTranslationModel>(schemaReferences.optionTranslation, schema);
export default optionTranslation;