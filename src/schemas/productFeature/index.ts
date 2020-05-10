import * as mongoose from 'mongoose';
import { schemaReferences } from '../../constants/constants';
import { IProductFeatureModel, IProductFeature } from './model';

const Schema = mongoose.Schema;

const schema = new Schema({
  product: {
    type: Schema.Types.ObjectId,
    ref: schemaReferences.product
  },
  translations: [{
    type: Schema.Types.ObjectId,
    ref: schemaReferences.featureTranslation
  }]
});

schema.statics.getTranslatedList = async function(idList: string[], language: number): Promise<any> {
  const _this: IProductFeatureModel = this;
  const aggregation: any[] = [
    {
      $match: {
        _id: { $in: idList }
      }
    },
    {
      $lookup: {
        from: 'featuretranslations',
        localField: 'translations',
        foreignField: '_id',
        as: 'translations'
      }
    },
    {
      $unwind: '$translations'
    },
    {
      $match: {
        'translations.language': language
      }
    },
    {
      $project: {
        _id: 1,
        title: '$translations.name',
        description: '$translations.value',
      }
    }
  ];
  const list = _this.aggregate(aggregation);
  return list;
};

export const productFeature: IProductFeatureModel = mongoose.model<IProductFeature<any, any>, IProductFeatureModel>(schemaReferences.productFeature, schema);
export default productFeature;