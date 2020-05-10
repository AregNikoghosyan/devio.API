import { Document, Model } from 'mongoose';

interface IWishInvitationDocument<W = string> extends Document {
  wishList: W;
  code: string;
  createdDt: Date;
}

export interface IWishInvitation<W = string> extends IWishInvitationDocument<W> {

}

export interface IWishInvitationModel extends Model<IWishInvitation<any>> {
  getAvailableCode(): Promise<string>;
}