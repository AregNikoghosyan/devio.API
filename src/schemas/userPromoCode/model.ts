import { Document, Model } from 'mongoose';

interface IUserPromoCodeDocument<U = string, GU = string, PC = string, O = string> extends Document {
  user: U;
  guestUser: GU;
  promoCode: PC;
  order: O;
}

export interface IUserPromoCode<U = string, GU = string, PC = string, O = string> extends IUserPromoCodeDocument<U, GU, PC, O> {

}

export interface IUserPromoCodeModel extends Model<IUserPromoCode<any, any, any, any>> {

}