import * as mongoose from 'mongoose';
import { ICompanyModel, ICompany } from './model';

import AddressSchema  from '../address';
import WishListSchema from '../wishList';
import { schemaReferences } from '../../constants/constants';

const Schema = mongoose.Schema;

const schema = new Schema({
  user: {
    type     : Schema.Types.ObjectId,
    ref      : schemaReferences.user,
    required : true
  },
  name: {
    type     : String,
    required : true
  },
  tin: {
    type     : String,
    required : true
  },
  billingAddress: {
    type     : Schema.Types.ObjectId,
    ref      : schemaReferences.address,
    required : true
  },
  deliveryAddresses: [{
    type     : Schema.Types.ObjectId,
    ref      : schemaReferences.address,
    required : true
  }],
  createdDt: {
    type    : Date,
    default : Date.now
  },
  updatedDt: {
    type    : Date,
    default : Date.now
  },
  deleted: {
    type: Boolean,
    default: false
  }
});

schema.pre('save', async function(next) {
  const _this: any = this;
  if (!_this.isNew) {
    _this.updatedDt = Date.now();
    next();
  }
});

schema.statics.bulkDelete = async function (id: string) {
  const _this: ICompanyModel = this;
  await Promise.all([
    await AddressSchema.deleteMany({ company: id }),
    await WishListSchema.bulkDeleteByCompanyId(id),
    await _this.updateOne({ _id: id }, { deleted: true })
  ]);
};

export const company: ICompanyModel = mongoose.model<ICompany<any, any, any>, ICompanyModel>(schemaReferences.company, schema);
export default company;