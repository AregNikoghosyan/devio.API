import * as mongoose from 'mongoose';
import { schemaReferences } from '../../constants/constants';
import { MessageMediaTypeEnum, LanguageEnum, MessageTypeEnum } from '../../constants/enums';
import { IMessageModel, IMessage } from './model';
import mainConfig from '../../env';

const Schema = mongoose.Schema;

const schema = new Schema({
  conversation: {
    type     : Schema.Types.ObjectId,
    ref      : schemaReferences.conversation,
    required : true
  },
  sender: {
    type    : Schema.Types.ObjectId,
    ref     : schemaReferences.user,
    default : null
  },
  messageType: {
    type     : Number,
    required : true
  },
  messageMediaType: {
    type    : Number,
    default : MessageMediaTypeEnum.text
  },
  seen: {
    type    : Boolean,
    default : false
  },
  message: {
    type    : String,
    default : null
  },
  file: {
    type    : Schema.Types.ObjectId,
    ref     : schemaReferences.file,
    default : null
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

schema.statics.getTemplateMessage = (language: number) => {
  let message = '';
  switch (language) {
    case LanguageEnum.en: {
      message = 'Hi! How can we help you today?';
      break;
    }
    case LanguageEnum.ru: {
      message = 'Здравствуйте. Чем мы можем вам помочь?';
      break;
    }
    case LanguageEnum.hy: {
      message = 'Բարև Ձեզ։ Ինչո՞վ կարող ենք օգնել։';
      break;
    }
  }
  const template = {
    messageType      : MessageTypeEnum.answer,
    messageMediaType : MessageMediaTypeEnum.text,
    filePath         : null,
    createdDt        : new Date(),
    message
  };
  return template;
};

schema.statics.getList = function(filter: any, skip: number = null, limit: number = null) {
  const _this: IMessageModel = this;
  const aggregation: any[] = [
    {
      $match: filter
    },
    {
      $lookup: {
        from: 'files',
        localField: 'file',
        foreignField: '_id',
        as: 'file'
      }
    },
    {
      $unwind: {
        path: '$file',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $project: {
        _id: 1,
        messageMediaType: 1,
        message: 1,
        filePath: { $cond: { if: { $not: '$file' }, then: null , else: { $concat: [mainConfig.BASE_URL, '$file.path'] } } },
        messageType: 1,
        createdDt: 1
      }
    },
    {
      $sort: {
        createdDt: -1
      }
    }
  ];
  if (skip) aggregation.push({ $skip: skip });
  if (limit) aggregation.push({ $limit: limit });
  const list = _this.aggregate(aggregation);
  return list;
};

const message: IMessageModel = mongoose.model<IMessage<any, any, any>, IMessageModel>(schemaReferences.message, schema);
export default message;