import * as mongoose from 'mongoose';
import { schemaReferences } from '../../constants/constants';
import { IContact, IContactModel } from './model';

const Schema = mongoose.Schema;

const schema = new Schema({
  address: {
    type     : String,
    required : true
  },
  email: {
    type     : String,
    required : true
  },
  phone: {
    type    : String,
    default : null
  },
  latitude: {
    type     : Number,
    required : true
  },
  longitude: {
    type     : Number,
    required : true
  },
  createdDt: {
    type    : Date,
    default : Date.now
  }
});

const contact: IContactModel = mongoose.model<IContact, IContactModel>(schemaReferences.contact, schema);
export default contact;