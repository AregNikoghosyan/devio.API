import * as mongoose from 'mongoose';
import { schemaReferences } from '../../constants/constants';
import { IMUTranslation, IMUTranslationModel } from './model';

const Schema = mongoose.Schema;

const schema = new Schema({
  mu: {
    type     : Schema.Types.ObjectId,
    ref      : schemaReferences.mu,
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

export const muTranslation: IMUTranslationModel = mongoose.model<IMUTranslation<any>, IMUTranslationModel>(schemaReferences.muTranslation, schema);
export default muTranslation;