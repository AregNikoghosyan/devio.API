import * as mongoose from 'mongoose';
import { IUserPasswordModel, IUserPassword } from './model';
import { schemaReferences } from '../../constants/constants';

const Schema = mongoose.Schema;

const schema = new Schema({
  user: {
    type     : Schema.Types.ObjectId,
    ref      : schemaReferences.user,
    required : true
  },
  provider: {
    type     : Number,
    required : true
  },
  password: {
    type     : String,
    required : true
  },
  createdDt: {
    type    : Date,
    default : Date.now
  },
  updatedDt: {
    type    : Date,
    default : Date.now
  }
});

schema.pre('save', async function(next) {
  const _this: any = this;
  if (!_this.isNew) {
    _this.updatedDt = Date.now();
    next();
  }
});

export const userPassword: IUserPasswordModel = mongoose.model<IUserPassword<any>, IUserPasswordModel>(schemaReferences.userPassword, schema);
export default userPassword;