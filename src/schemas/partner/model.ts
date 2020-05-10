import { Model, Document } from 'mongoose';

interface IPartnerDocument<U = string> extends Document {
    user: U;
    name: string;
    email: string;
    vatid: string;
    message: string;
    phoneNumber: string;
    hidden: boolean;
    deleted: boolean;
}

export interface IPartner<U = string> extends IPartnerDocument {

}

export interface IPartnerModel extends Model<IPartner<any>> {

}