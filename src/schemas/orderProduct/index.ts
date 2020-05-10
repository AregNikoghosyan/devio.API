import * as mongoose from 'mongoose';
import { schemaReferences } from '../../constants/constants';
import { string } from 'joi';
import { IOrderProduct, IOrderProductModel } from './model';
import { ObjectID } from 'bson';
import mainConfig from '../../env';

const Schema = mongoose.Schema;

const schema = new Schema({
  order: {
    type: Schema.Types.ObjectId,
    ref: schemaReferences.order,
    required: true
  },
  productId: {
    type: Schema.Types.ObjectId,
    ref: schemaReferences.product,
    required: true
  },
  productVersionId: {
    type: Schema.Types.ObjectId,
    ref: schemaReferences.productVersion,
    default: null
  },
  translations: [{
    language: {
      type: Number,
      required: true
    },
    name: {
      type: String,
      required: true
    }
  }],
  step: {
    type: Number,
    required: true
  },
  count: {
    type: Number,
    required: true
  },
  stepCount: {
    type: Number,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  discountedPrice: {
    type: Number,
    default: null
  },
  discount: {
    type: Number,
    default: null
  },
  image: {
    type: String,
    default: null
  },
  partner: {
    type: Schema.Types.ObjectId,
    ref: schemaReferences.partner,
    default: null
  },
  attributes: [{
    type: Schema.Types.ObjectId,
    ref: schemaReferences.orderProductAttribute,
  }]
});

schema.statics.getListForAdmin = async function (productIdList: string[], language: number): Promise<any[]> {
  const _this: IOrderProductModel = this;
  const aggregation: any[] = [
    {
      $match: {
        _id: { $in: productIdList.map(item => new ObjectID(item)) }
      }
    },
    {
      $unwind: {
        path: '$translations'
      }
    },
    {
      $match: {
        'translations.language': language
      }
    },
    {
      $project: {
        _id: 1,
        image: {
          $cond: {
            if: '$image',
            then: { $concat: [ mainConfig.BASE_URL, '$image' ] },
            else: null
          }
        },
        productId: 1,
        productVersionId: 1,
        count: '$stepCount',
        price: 1,
        total: { $multiply: ['$stepCount', '$price'] },
        name: '$translations.name',
        attributes: 1
      }
    },
    {
      $lookup: {
        from: 'orderproductattributes',
        localField: 'attributes',
        foreignField: '_id',
        as: 'attributes'
      }
    },
    {
      $unwind: {
        path: '$attributes',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $unwind: {
        path: '$attributes.translations',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $project: {
        _id: 1,
        image: 1,
        productId: 1,
        productVersionId: 1,
        count: 1,
        price: 1,
        total: 1,
        name: 1,
        attributes: {
          $cond: {
            if: '$attributes',
            then: '$attributes',
            else: null
          }
        }
      }
    },
    {
      $match: {
        $or: [
          { 'attributes.translations.language': language },
          { 'attributes': null }
        ]
      }
    },
    {
      $project: {
        _id: 1,
        image: 1,
        productId: 1,
        productVersionId: 1,
        count: 1,
        price: 1,
        total: 1,
        name: 1,
        'attributes.attributeName': '$attributes.translations.attributeName',
        'attributes.optionName': '$attributes.translations.optionName',
        'attributes.optionId': 1,
        'attributes.attributeId': 1,
      }
    },
    {
      $project: {
        _id: 1,
        image: 1,
        count: 1,
        price: 1,
        productId: 1,
        productVersionId: 1,
        total: 1,
        name: 1,
        attributes: {
          $cond: {
            if: '$attributes.attributeName',
            then: '$attributes',
            else: null
          }
        }
      }
    },
    {
      $group: {
        _id: '$_id',
        image: { $first: '$image' },
        productId: { $first: '$productId' },
        productVersionId: { $first: '$productVersionId' },
        count: { $first: '$count' },
        price: { $first: '$price' },
        total: { $first: '$total' },
        name: { $first: '$name' },
        attributes: { $push: '$attributes' }
      }
    },
    {
      $project: {
        _id: 1,
        image: 1,
        productId: 1,
        productVersionId: 1,
        count: 1,
        price: 1,
        total: 1,
        name: 1,
        attributes: {
          $filter: {
            input: '$attributes',
            as: 'i',
            cond: { $eq: [{ $eq: ['$$i', null] }, false] }
          }
        }
      }
    }
  ];
  const list = await _this.aggregate(aggregation);
  return list;
};

export const orderProduct: IOrderProductModel = mongoose.model<IOrderProduct<any, any>, IOrderProductModel>(schemaReferences.orderProduct, schema);
export default orderProduct;