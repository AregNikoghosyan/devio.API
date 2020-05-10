import * as mongoose from 'mongoose';
import { schemaReferences } from '../../constants/constants';
import { ISupportMessageModel, ISupportMessage } from './model';

const Schema = mongoose.Schema;

const schema = new Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    default: null
  },
  message: {
    type: String,
    required: true
  },
  createdDt: {
    type: Date,
    default: Date.now
  }
});

const supportMessage: ISupportMessageModel = mongoose.model<ISupportMessage, ISupportMessageModel>(schemaReferences.supportMessage, schema);
export default supportMessage;