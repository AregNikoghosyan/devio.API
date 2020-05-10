import * as mongoose from 'mongoose';
import { schemaReferences } from '../../constants/constants';
import { IFeatureTranslation, IFeatureTranslationModel } from './model';

const Schema = mongoose.Schema;

const schema = new Schema({
  feature: {
    type     : Schema.Types.ObjectId,
    ref      : schemaReferences.productFeature,
    required : true
  },
  language: {
    type     : Number,
    required : true
  },
  name: {
    type     : String,
    required : true
  },
  value: {
    type: String,
    required: true
  }
});

export const featureTranslation: IFeatureTranslationModel = mongoose.model<IFeatureTranslation<any>, IFeatureTranslationModel>(schemaReferences.featureTranslation, schema);
export default featureTranslation;