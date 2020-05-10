import * as mongoose from 'mongoose';
import { schemaReferences } from '../../constants/constants';
import { IWishInvitationModel, IWishInvitation } from './model';

const Schema = mongoose.Schema;

const schema = new Schema({
  wishList: {
    type: Schema.Types.ObjectId,
    ref: schemaReferences.wishList,
    required: true
  },
  code: {
    type: String,
    required: true,
    unique: true
  },
  createdDt: {
    type: Date,
    default: Date.now
  }
});

schema.statics.getAvailableCode = async function (): Promise<string> {
  const _this: IWishInvitationModel = this;
  const length = 8;
  const code = generateCode(length);
  const exists = await _this.findOne({ code });
  if (exists) {
    return _this.getAvailableCode();
  }
  return code;
};

export const wishInvitation: IWishInvitationModel = mongoose.model<IWishInvitation<any>, IWishInvitationModel>(schemaReferences.wishInvitation, schema);
export default wishInvitation;

function generateCode (length: number) {
  const charset = 'abcdefghjklmnopqrstuvwxyzABCDEFGHJKLMNOPQRSTUVWXYZ';
  let text = '';
  for (let i = 0; i < length; i++) {
    const char = charset.charAt(Math.ceil(Math.random() * (charset.length - 1)));
    text += char;
  }
  return text;
}