import * as mongoose from 'mongoose';
import { schemaReferences } from '../../constants/constants';
import { IMUModel, IMU } from './model';

import MuTranslationSchema from '../muTranslation';
import { ProductStatusEnum } from '../../constants/enums';

const Schema = mongoose.Schema;

const schema = new Schema({
  translations: [{
    type: Schema.Types.ObjectId,
    ref: schemaReferences.muTranslation
  }],
  createdDt: {
    type: Date,
    default: Date.now
  },
  updatedDt: {
    type: Date,
    default: Date.now
  },
  deleted: {
    type: Boolean,
    default: false
  }
});

schema.statics.getShortList = async function (language: number) {
  const _this: IMUModel = this;
  const aggregation: any[] = [
    {
      $match: { deleted: false }
    },
    {
      $project: {
        _id: 1,
        translations: 1
      }
    },
    {
      $lookup: {
        from: 'mutranslations',
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
        name: '$translations.name'
      }
    },
    {
      $lookup: {
        from: 'products',
        localField: '_id',
        foreignField: 'mu',
        as: 'products'
      }
    },
    {
      $project: {
        _id: 1,
        name: 1,
        products: {
          $filter: {
            input: '$products',
            as: 'p',
            cond: {
              $and: [
                { $eq: ['$$p.deleted', false] },
                {
                  $or: [
                    { $eq: ['$$p.status', ProductStatusEnum.hidden] },
                    { $eq: ['$$p.status', ProductStatusEnum.published] },
                    { $eq: ['$$p.status', ProductStatusEnum.unapproved] },
                  ]
                }
              ]
            }
          }
        }
      }
    },
    {
      $project: {
        _id: 1,
        name: 1,
        productCount: { $size: '$products' }
      }
    }
  ];
  const list = _this.aggregate(aggregation);
  return list;
};

schema.statics.getListForAdmin = async function () {
  const _this: IMUModel = this;
  const aggregation: any[] = [
    {
      $match: { deleted: false }
    },
    {
      $sort: {
        createdDt: -1
      }
    },
    {
      $project: {
        _id: 1,
        translations: 1
      }
    },
    {
      $lookup: {
        from: 'mutranslations',
        localField: 'translations',
        foreignField: '_id',
        as: 'translations'
      }
    },
    {
      $project: {
        _id: 1,
        'translations.language': 1,
        'translations.name': 1
      }
    }
  ];
  const list = _this.aggregate(aggregation);
  return list;
};

schema.statics.getNameByLanguage = async function(id: string, language: number): Promise<string> {
  const translation = await MuTranslationSchema.findOne({ mu: id, language });
  if (translation) return translation.name;
  else return null;
};

export const mu: IMUModel = mongoose.model<IMU<any>, IMUModel>(schemaReferences.mu, schema);
export default mu;