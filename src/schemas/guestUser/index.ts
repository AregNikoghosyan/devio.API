import * as mongoose from 'mongoose';
import { schemaReferences } from '../../constants/constants';
import { IGuestUserModel, IGuestUser } from './model';

const Schema = mongoose.Schema;

const schema = new Schema({
  email: {
    type: String,
    default: null
  },
  verificationCode: {
    type: String,
    default: null
  },
  verified: {
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
  },
  canceledOrderCount: {
    type: Number,
    default: 0
  },
  finishedOrderCount: {
    type: Number,
    default: 0
  }
});

schema.statics.newCountByDateRange = async function (body: { dateFrom: Date, dateTo: Date }): Promise<number> {
  const _this: IGuestUserModel = this;
  const filter: any = {
    verified: true,
    createdDt: {
      $gt: new Date(body.dateFrom)
    }
  };
  if (body.dateTo) {
    filter.createdDt.$lt = new Date(body.dateTo);
  }
  return await _this.countDocuments(filter);
};

export const guestUser: IGuestUserModel = mongoose.model<IGuestUser, IGuestUserModel>(schemaReferences.guestUser, schema);
export default guestUser;