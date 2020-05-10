import * as mongoose from 'mongoose';
import { schemaReferences } from '../../constants/constants';
import { IPromotionTranslation, IPromotionTranslationModel } from './model';

const Schema = mongoose.Schema;

const schema = new Schema({
  promotion: {
    type     : Schema.Types.ObjectId,
    ref      : schemaReferences.promotion,
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

export const promotionTranslation: IPromotionTranslationModel = mongoose.model<IPromotionTranslation<any>, IPromotionTranslationModel>(schemaReferences.promotionTranslation, schema);
export default promotionTranslation;