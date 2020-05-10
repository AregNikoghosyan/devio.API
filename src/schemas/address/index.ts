import * as mongoose from 'mongoose';
import { IAddressModel, IAddress } from './model';
import { schemaReferences } from '../../constants/constants';

const Schema = mongoose.Schema;

const schema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: schemaReferences.user,
    default: null
  },
  company: {
    type: Schema.Types.ObjectId,
    ref: schemaReferences.company,
    default: null
  },
  order: {
    type: Schema.Types.ObjectId,
    ref: schemaReferences.order,
    default: null
  },
  address: {
    type: String,
    required: true
  },
  lat: {
    type: Number,
    required: true
  },
  lng: {
    type: Number,
    required: true
  },
  house: {
    type: Number,
    default: null
  },
  apartment: {
    type: Number,
    default: null
  },
  contactName: {
    type: String,
    default: null
  },
  contactPhoneNumber: {
    type: String,
    default: null
  },
  isUserDefaultAddress: {
    type: Boolean,
    default: false
  },
  createdDt: {
    type: Date,
    default: Date.now
  },
  updatedDt: {
    type: Date,
    default: Date.now
  }
});

schema.pre('save', async function (next) {
  const _this: any = this;
  if (!_this.isNew) {
    _this.updatedDt = Date.now();
    next();
  }
});

export const address: IAddressModel = mongoose.model<IAddress<any, any, any>, IAddressModel>(schemaReferences.address, schema);
export default address;