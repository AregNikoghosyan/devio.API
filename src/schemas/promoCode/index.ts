import * as mongoose from 'mongoose';
import { schemaReferences } from '../../constants/constants';
import { IPromoCodeModel, IPromoCode } from './model';
import { PromoCodeStatusEnum, UserPromoCodeStatusEnum } from '../../constants/enums';

const Schema = mongoose.Schema;

const schema = new Schema({
  type: {
    type: Number,
    required: true
  },
  amount: {
    type: Number,
    default: null
  },
  freeShipping: {
    type: Boolean,
    required: true
  },
  title: {
    type: String,
    required: true,
  },
  code: {
    type: String,
    required: true
  },
  startDate: {
    type: Date,
    default: null
  },
  endDate: {
    type: Date,
    default: null
  },
  minPrice: {
    type: Number,
    default: null
  },
  maxPrice: {
    type: Number,
    default: null
  },
  usageCount: {
    type: Number,
    default: null
  },
  usedCount: {
    type: Number,
    default : 0
  },
  deprecated: {
    type: Boolean,
    default: false
  },
  createdDt: {
    type: Date,
    default: Date.now
  },
  deleted: {
    type: Boolean,
    default: false
  }
});

schema.statics.getAvailableCode = async function(): Promise<string> {
  const _this: IPromoCodeModel = this;
  const length = 8;
  const code = generateCode(length);
  const exists = await _this.findOne({ code, deleted: false });
  if (exists) {
    return _this.getAvailableCode();
  }
  return code;
};

schema.statics.getListByFilter = async function (filter: any, skip: number, limit: number): Promise<any[]> {
  const _this: IPromoCodeModel = this;
  const aggregation: any = [
    {
      $match: filter
    },
    {
      $project: {
        _id: 1,
        type: 1,
        amount: 1,
        createdDt: 1,
        title: 1,
        code: 1,
        startDate: 1,
        endDate: 1,
        usedCount: 1,
        deprecated: 1
      }
    },
    {
      $sort: { createdDt: -1 }
    }
  ];
  if (skip) aggregation.push({ $skip: skip });
  if (limit) aggregation.push({ $limit: limit });
  const list = await _this.aggregate(aggregation);
  const itemList = list.map(item => {
    const startDate = item.startDate;
    const endDate = item.endDate;
    let status;
    if (item.deprecated) {
      status = PromoCodeStatusEnum.finished;
    } else {
      if (startDate && startDate > new Date()) status = PromoCodeStatusEnum.draft;
      else if (!startDate && !endDate) status = PromoCodeStatusEnum.active;
      else if (!startDate && endDate > new Date()) status = PromoCodeStatusEnum.active;
      else if (!endDate && startDate < new Date()) status = PromoCodeStatusEnum.active;
      else if (startDate < new Date() && endDate > new Date()) status = PromoCodeStatusEnum.active;
      else if (endDate < new Date()) status = PromoCodeStatusEnum.finished;
    }
    const returnObj = {
      _id       : item._id,
      amount    : item.amount,
      type      : item.type,
      title     : item.title,
      code      : item.code,
      createdDt : item.createdDt,
      usedCount : item.usedCount,
      status
    };
    return returnObj;
  });
  return itemList;
};

export const promoCode: IPromoCodeModel = mongoose.model<IPromoCode, IPromoCodeModel>(schemaReferences.promoCode, schema);
export default promoCode;


function generateCode (length: number) {
  const charset = 'ABCDEFGHJKLMNOPQRSTUVWXYZ0123456789';
  let text = '';
  for (let i = 0; i < length; i++) {
    const char = charset.charAt(Math.ceil(Math.random() * (charset.length - 1)));
    text += char;
  }
  return text;
}