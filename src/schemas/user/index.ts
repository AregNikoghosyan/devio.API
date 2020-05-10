import * as mongoose from 'mongoose';
import { IUserModel, IUser } from './model';

import CounterSchema from '../counter';
import { CounterReferenceEnum, UserTariffTypeEnum } from '../../constants/enums';
import { schemaReferences } from '../../constants/constants';

const Schema = mongoose.Schema;

const schema = new Schema({
  nid: {
    type : Number
  },
  email: {
    type    : String,
    default : null
  },
  role: {
    type     : Number,
    required : true
  },
  passwords: [
    {
      type : Schema.Types.ObjectId,
      ref  : schemaReferences.userPassword
    }
  ],
  firstName: {
    type    : String,
    default : null
  },
  lastName: {
    type    : String,
    default : null
  },
  fullName: {
    type    : String,
    default : null
  },
  phoneNumber: {
    type    : String,
    default : null
  },
  profilePicture: {
    type    : String,
    default : null
  },
  verificationCode: {
    type    : String,
    default : null
  },
  restoreCode: {
    type    : String,
    default : null
  },
  phoneVerificationCode: {
    type    : String,
    default : null
  },
  phoneVerified: {
    type: Boolean,
    default: false
  },
  webLanguage: {
    type    : Number,
    default : null
  },
  points: {
    type: Number,
    default: 0
  },
  tariffPlan: {
    type: Number,
    default: UserTariffTypeEnum.usual
  },
  canceledOrderCount: {
    type: Number,
    default: 0
  },
  finishedOrderCount: {
    type: Number,
    default: 0
  },
  orderCount: {
    type: Number,
    default: 0
  },
  requestCount: {
    type: Number,
    default: 0
  },
  blocked: {
    type: Boolean,
    default: false
  },
  loginBonusReceived: {
    type: Boolean,
    default: false
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
  if (_this.isNew) {
    const counter = await CounterSchema.findOneAndUpdate({ reference: CounterReferenceEnum.user }, { $inc: { count: 1 } }, { new: true });
    if (counter) {
      _this.nid = counter.count;
      next();
    } else {
      next(new Error('Missing user counter'));
    }
  } else {
    _this.updatedDt = Date.now();
    next();
  }
});

schema.statics.findByName = async function(key: string): Promise<string[]> {
  const _this: IUserModel = this;
  const aggregation = [
    {
      $match: {
        $or: [
          { fullName: new RegExp(key, 'i') },
          { email: new RegExp(key, 'i') },
          { phoneNumber: new RegExp(key, 'i') }
        ]
      }
    }
  ];
  const list = await _this.aggregate(aggregation);
  return list.map(item => item._id);
};

schema.statics.newCountByDateRange = async function (body: { dateFrom: Date, dateTo: Date }): Promise<number> {
  const _this: IUserModel = this;
  const filter: any = {
    'passwords.0': { $exists: true },
    createdDt: {
      $gt: new Date(body.dateFrom)
    }
  };
  if (body.dateTo) {
    filter.createdDt.$lt = new Date(body.dateTo);
  }
  return await _this.countDocuments(filter);
};

export const user: IUserModel = mongoose.model<IUser<any>, IUserModel>(schemaReferences.user, schema);
export default user;