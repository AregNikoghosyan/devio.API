import * as mongoose from 'mongoose';
import { schemaReferences } from '../../constants/constants';
import { IProductTranslation, IProductTranslationModel } from './model';

import ProductSchema from '../product';
import { ProductStatusEnum } from '../../constants/enums';

const Schema = mongoose.Schema;

const schema = new Schema({
  product: {
    type     : Schema.Types.ObjectId,
    ref      : schemaReferences.product,
    required : true
  },
  language: {
    type     : Number,
    required : true
  },
  name: {
    type     : String,
    required : true
  },
  description: {
    type: String,
    required: true
  }
});

schema.index({ 'product': -1 });

schema.statics.getSearch = async function(key: string): Promise<Array<any>> {
  const _this: IProductTranslationModel = this;
  const productIdList = await ProductSchema.find({
    deleted: false,
    status: ProductStatusEnum.published,
    versionsHidden: false,
    isPrivate: false,
    categories: { $exists: true, $not: { $size: 0 } }
  }).distinct('_id');
  const aggregation = [
    {
      $match: {
        product: { $in: productIdList }
      }
    },
    {
      $project: {
        word: { $split: ['$name', ' '] }
      }
    },
    {
      $unwind: '$word'
    },
    {
      $match: {
        word: new RegExp(`^${key}`, 'i')
      }
    },
    {
      $group: {
        _id: '$word'
      }
    },
    {
      $sort: { _id: 1 }
    }
  ];
  const list = await _this.aggregate(aggregation);
  return list.map(item => item._id);
};

schema.statics.getSearchNames = async function(key: string): Promise<Array<any>> {
  const _this: IProductTranslationModel = this;
  const productIdList = await ProductSchema.find({
    deleted: false,
    status: ProductStatusEnum.published,
    versionsHidden: false,
    isPrivate: false,
    categories: { $exists: true, $not: { $size: 0 } }
  }).distinct('_id');
  const aggregation = [
    {
      $match: {
        product: { $in: productIdList },
        name: new RegExp(`^${key}`, 'i')
      }
    },
    {
      $project: {
        _id: '$product',
        name: 1
      }
    }
  ];
  const list = await _this.aggregate(aggregation);
  return list;
};

export const productTranslation: IProductTranslationModel = mongoose.model<IProductTranslation<any>, IProductTranslationModel>(schemaReferences.productTranslation, schema);
export default productTranslation;