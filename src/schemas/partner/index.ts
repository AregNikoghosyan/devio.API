import * as mongoose from 'mongoose';
import { schemaReferences } from '../../constants/constants';
import { IPartnerModel, IPartner } from './model';

const Schema = mongoose.Schema;

const schema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: schemaReferences.user,
        default: null
    },
    name: {
        type: String,
        default: null
    },
    email: {
        type: String,
        default: 0
    },
    phoneNumber: {
        type: String,
        default: null
    },
    message: {
        type: String,
        default: null
    },
    vatid: {
        type: String,
        default: null
    },
    hidden: {
        type: Boolean,
        default: false
    },
    deleted: {
        type: Boolean,
        default: false
    }
});

export const partner: IPartnerModel = mongoose.model<IPartner<any>, IPartnerModel>(schemaReferences.partner, schema);
export default partner;