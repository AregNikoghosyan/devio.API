import * as mongoose from 'mongoose';
import { schemaReferences } from '../../constants/constants';
import { ICategoryTranslateModel, ICategoryTranslate } from './model';

const Schema = mongoose.Schema;

const schema = new Schema({
  category: {
    type     : Schema.Types.ObjectId,
    ref      : schemaReferences.category,
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

schema.index({ 'category': -1 });


export const categoryTranslation: ICategoryTranslateModel = mongoose.model<ICategoryTranslate<any>, ICategoryTranslateModel>(schemaReferences.categoryTranslation, schema);
export default categoryTranslation;