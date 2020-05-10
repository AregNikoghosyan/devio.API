import * as mongoose from 'mongoose';
import { schemaReferences } from '../../constants/constants';
import { CounterReferenceEnum, OrderStatusEnum } from '../../constants/enums';

import CounterSchema from '../counter';
import { IOrderModel, IOrder } from './model';
import mainConfig from '../../env';

const Schema = mongoose.Schema;

const schema = new Schema({
  nid: {
    type: Number
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: schemaReferences.user,
    default: null
  },
  guestUser: {
    type: Schema.Types.ObjectId,
    ref: schemaReferences.guestUser,
    default: null
  },
  guestName: {
    type: String,
    default: null
  },
  guestPhoneNumber: {
    type: String,
    default: null
  },
  status: {
    type: Number,
    default: OrderStatusEnum.draft
  },
  company: {
    type: Schema.Types.ObjectId,
    ref: schemaReferences.company,
    default: null
  },
  paymentType: {
    type: Number,
    required: true
  },
  deliveryAddress: {
    type: Schema.Types.ObjectId,
    ref: schemaReferences.address,
    default: null,
  },
  billingAddress: {
    type: Schema.Types.ObjectId,
    ref: schemaReferences.address,
    default: null
  },
  usedBonuses: {
    type: Number,
    default: null
  },
  promoCode: {
    type: Schema.Types.ObjectId,
    ref: schemaReferences.promoCode,
    default: null
  },
  promoCodeDiscountAmount: {
    type: Number,
    default: 0
  },
  products: [{
    type: Schema.Types.ObjectId,
    ref: schemaReferences.orderProduct
  }],
  comment: {
    type: String,
    default: null
  },
  code: {
    type: String,
    unique: true
  },
  deliveryType: {
    type: Number,
    required: true
  },
  deliveryFee: {
    type: Number,
    default: null
  },
  deliveryDate: {
    type: Date,
    default: null
  },
  subTotal: {
    type: Number,
    default: null
  },
  total: {
    type: Number,
    default: null,
  },
  discountAmount: {
    type: Number,
    default: null
  },
  receivingBonuses: {
    type: Number,
    default: null
  },
  osType: {
    type: Number,
    default: null
  },
  createdDt: {
    type: Date,
    default: Date.now
  },
  finishedDt: {
    type: Date,
    default: Date.now
  },
  finishedBy: {
    type: Schema.Types.ObjectId,
    red: schemaReferences.user,
    default: null
  },
  canceledDt: {
    type: Date,
    default: null
  },
  canceledBy: {
    type: Schema.Types.ObjectId,
    ref: schemaReferences.user,
    default: null
  },
  cancelReason: {
    type: String,
    default: null
  }
});

schema.pre('save', async function (next) {
  const _this: any = this;
  if (this.isNew) {
    const counter = await CounterSchema.findOneAndUpdate({ reference: CounterReferenceEnum.order }, { $inc: { count: 1 } }, { new: true });
    if (counter) {
      _this.nid = counter.count;
      next();
    } else {
      next(new Error('Missing product counter'));
    }
    next();
  }
});

schema.statics.getUniqueCode = async function() {
  const _this: IOrderModel = this;
  const length = 8;
  const code = generateCode(length);
  const exists = await _this.findOne({ code, deleted: false });
  if (exists) {
    return _this.getUniqueCode();
  }
  return code;
};

schema.statics.getListForUser = async function(filter: any, skip: number, limit: number, language: number) {
  const _this: IOrderModel = this;
  const aggregation: any = [
    {
      $match: filter
    },
    {
      $project: {
        _id: 1,
        nid: 1,
        total: 1,
        receivingBonuses: 1,
        deliveryDate: 1,
        status: 1,
        productCount: { $size: '$products' },
        products: { $slice: [ '$products', 0, 2 ] },
        createdDt: 1
      }
    },
    {
      $lookup: {
        from: 'orderproducts',
        localField: 'products',
        foreignField: '_id',
        as: 'products'
      }
    },
    {
      $unwind: {
        path: '$products'
      }
    },
    {
      $project: {
        _id: 1,
        nid: 1,
        total: 1,
        deliveryDate: 1,
        status: 1,
        receivingBonuses: 1,
        productCount: 1,
        createdDt: 1,
        'products._id': 1,
        'products.image': 1,
        'products.count': '$products.stepCount',
        'products.price': {
          $cond: {
            if: { $eq: ['$products.discountedPrice', null] },
            then: '$products.price',
            else: '$products.discountedPrice'
          }
        },
        'products.translations': 1
      }
    },
    {
      $unwind: {
        path: '$products.translations'
      }
    },
    {
      $match: {
        'products.translations.language': language
      }
    },
    {
      $project: {
        _id: 1,
        nid: 1,
        total: 1,
        deliveryDate: 1,
        status: 1,
        receivingBonuses: 1,
        productCount: 1,
        createdDt: 1,
        'products._id': 1,
        'products.image': {
          $cond: {
            if: '$products.image',
            then: { $concat: [ mainConfig.BASE_URL, '$products.image' ] },
            else: null
          }
        },
        'products.count': 1,
        'products.price': 1,
        'products.name': '$products.translations.name'
      }
    },
    {
      $group: {
        _id: '$_id',
        nid: { $first: '$nid' },
        total: { $first: '$total' },
        receivingBonuses: { $first: '$receivingBonuses' },
        deliveryDate: { $first: '$deliveryDate' },
        status: { $first: '$status' },
        productCount: { $first: '$productCount' },
        products: { $push: '$products' },
        createdDt: { $first: '$createdDt' }
      }
    },
    {
      $sort: { createdDt: -1 }
    }
  ];
  if (skip) aggregation.push({ $skip: skip });
  if (limit) aggregation.push({ $limit: limit });
  const list = await _this.aggregate(aggregation);
  return list;
};

schema.statics.newCountByDateRange = async function (body: { dateFrom: Date, dateTo: Date }): Promise<number> {
  const _this: IOrderModel = this;
  const filter: any = {
    status: { $nin: [ OrderStatusEnum.draft ] },
    createdDt: {
      $gt: new Date(body.dateFrom)
    }
  };
  if (body.dateTo) {
    filter.createdDt.$lt = new Date(body.dateTo);
  }
  return await _this.countDocuments(filter);
};

export const order: IOrderModel = mongoose.model<IOrder<any, any, any, any, any, any, any, any, any>, IOrderModel>(schemaReferences.order, schema);
export default order;

function generateCode (length: number) {
  const charset = 'ABCDEFGHJKLMNOPQRSTUVWXYZ0123456789';
  let text = '';
  for (let i = 0; i < length; i++) {
    const char = charset.charAt(Math.ceil(Math.random() * (charset.length - 1)));
    text += char;
  }
  return text;
}