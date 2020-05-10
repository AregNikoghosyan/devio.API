import * as mongoose from 'mongoose';
import { schemaReferences } from '../../constants/constants';
import { IUserPromoCodeModel, IUserPromoCode } from './model';

const Schema = mongoose.Schema;

const schema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: schemaReferences.user,
    default: null
  },
  guestUser: {
    type: Schema.Types.ObjectId,
    ref: schemaReferences.user,
    default: null
  },
  promoCode: {
    type: Schema.Types.ObjectId,
    ref: schemaReferences.promoCode,
    required: true
  },
  order: {
    type: Schema.Types.ObjectId,
    ref: schemaReferences.order,
    required: true
  }
});

export const userPromoCode: IUserPromoCodeModel = mongoose.model<IUserPromoCode<any, any, any, any>, IUserPromoCodeModel>(schemaReferences.userPromoCode, schema);
export default userPromoCode;
