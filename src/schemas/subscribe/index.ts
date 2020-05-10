import * as mongoose from 'mongoose';
import { schemaReferences } from '../../constants/constants';
import { IEmailMessageModel, IEmailMessage } from './model';

const Schema = mongoose.Schema;

const schema = new Schema({
  email: {
    type     : String,
    required : true
  },
  createdDt: {
    type    : Date,
    default : Date.now
  }
});

const emailMessage: IEmailMessageModel = mongoose.model<IEmailMessage, IEmailMessageModel>(schemaReferences.emailMessage, schema);
export default emailMessage;