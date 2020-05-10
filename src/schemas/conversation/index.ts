import * as mongoose from 'mongoose';
import { schemaReferences, guestNames } from '../../constants/constants';
import { IConversationModel, IConversation } from './model';
import { LanguageEnum, MessageTypeEnum } from '../../constants/enums';
import { ObjectId } from 'mongodb';

const Schema = mongoose.Schema;

const schema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: schemaReferences.user,
    default: null
  },
  guest: {
    type: Schema.Types.ObjectId,
    ref: schemaReferences.guestUser,
    default: null
  },
  deviceId: {
    type: String,
    default: null
  },
  messageCount: {
    type: Number,
    default: 0
  },
  createdDt: {
    type: Date,
    default: Date.now
  },
  updatedDt: {
    type: Date,
    default: Date.now
  }
});

schema.pre('save', async function (next) {
  const _this: any = this;
  if (!_this.isNew) {
    _this.updatedDt = Date.now();
    next();
  }
});

schema.pre('updateOne', async function (next) {
  const filter = this.getQuery();
  const conversationObj = await this.findOne(filter);
  await conversationObj.save();
  next();
});

schema.statics.getListForAdmin = function (filter: any, language: number, skip: number = null, limit: number = null) {
  let guest = '';
  switch (language) {
    case LanguageEnum.hy: {
      guest = guestNames.hy;
      break;
    }
    case LanguageEnum.ru: {
      guest = guestNames.ru;
      break;
    }
    case LanguageEnum.en: {
      guest = guestNames.en;
      break;
    }
  }
  const _this: IConversationModel = this;
  const aggregation: any[] = [
    {
      $match: filter
    },
    {
      $lookup: {
        from: 'users',
        localField: 'user',
        foreignField: '_id',
        as: 'user'
      }
    },
    {
      $unwind: {
        path: '$user',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $lookup: {
        from: 'messages',
        localField: '_id',
        foreignField: 'conversation',
        as: 'message'
      }
    },
    {
      $project: {
        _id: 1,
        userId: { $cond: { if: { $not: '$user' }, then: null, else: '$user._id' } },
        userName: {
          $cond: {
            if: { $not: '$user' },
            then: guest,
            else: {
              $cond: {
                if: {
                  $and: [
                    { $eq: [false, { $eq: ['$user.firstName', null] }] },
                    { $eq: [false, { $eq: ['$user.lastName', null] }] }
                  ]
                },
                then: { $concat: ['$user.firstName', ' ', '$user.lastName'] },
                else: {
                  $cond: {
                    if: { $eq: [false, { $eq: ['$user.firstName', null] }] },
                    then: '$user.firstName',
                    else: {
                      $cond: {
                        if: { $eq: [false, { $eq: ['$user.lastName', null] }] },
                        then: '$user.lastName',
                        else: null
                      }
                    }
                  }
                }
              }
            }
          }
        },
        userEmail: { $cond: { if: { $not: '$user' }, then: null, else: '$user.email' } },
        messageCount: 1,
        updatedDt: 1,
        message: 1
      }
    },
    {
      $unwind: {
        path: '$message'
      }
    },
    {
      $group: {
        _id: '$_id',
        userId: { $first: '$userId' },
        userName: { $first: '$userName' },
        userEmail: { $first: '$userEmail' },
        messageCount: { $first: '$messageCount' },
        updatedDt: { $first: '$updatedDt' },
        message: { $last: '$message' },
      }
    },
    {
      $project: {
        _id: 1,
        userId: 1,
        userName: 1,
        userEmail: 1,
        messageCount: 1,
        updatedDt: 1,
        message: { $cond: { if: { $not: '$message.message' }, then: 'File', else: '$message.message' } },
        messageType: '$message.messageType',
        messageSeen: '$message.seen'
      }
    },
    {
      $project: {
        _id: 1,
        userId: 1,
        userName: 1,
        userEmail: 1,
        messageCount: 1,
        updatedDt: 1,
        message: 1,
        messageType: 1,
        messageSeen: { $cond: { if: { $eq: ['$messageType', MessageTypeEnum.question] }, then: '$messageSeen', else: true } }
      }
    },
    {
      $sort: { updatedDt: -1 }
    }
  ];
  if (skip) aggregation.push({ $skip: skip });
  if (limit) aggregation.push({ $limit: limit });
  const list = _this.aggregate(aggregation);
  return list;
};

export const conversation: IConversationModel = mongoose.model<IConversation<any, any>, IConversationModel>(schemaReferences.conversation, schema);
export default conversation;
