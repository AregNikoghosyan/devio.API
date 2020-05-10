import * as mongoose from 'mongoose';
import { schemaReferences } from '../../constants/constants';
import { IRequestModel, IRequestDoc } from './model';

import { RequestStatusEnum } from '../../constants/enums';
import mainConfig from '../../env';

const Schema = mongoose.Schema;

const schema = new Schema({
  status: {
    type    : Number,
    default : RequestStatusEnum.preparing
  },
  type: {
    type: Number,
    default: null
  },
  user: {
    type    : Schema.Types.ObjectId,
    ref     : schemaReferences.user,
    default : null
  },
  deviceId: {
    type    : String,
    default : null
  },
  category: {
    type    : Schema.Types.ObjectId,
    ref     : schemaReferences.category,
    default : null
  },
  iNeed: {
    type    : String,
    default : null
  },
  measurementUnit: {
    type     : Schema.Types.ObjectId,
    ref      : schemaReferences.mu,
    default : null
  },
  count: {
    type    : Number,
    default : null
  },
  description: {
    type    : String,
    default : null
  },
  files: [{
    type : Schema.Types.ObjectId,
    ref  : schemaReferences.file
  }],
  requestPack: {
    type    : Schema.Types.ObjectId,
    ref     : schemaReferences.requestPack,
    default : null
  },
  products: [{
    type: Schema.Types.ObjectId,
    ref: schemaReferences.product
  }],
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
  if (!_this.isNew) {
    _this.updatedDt = Date.now();
    next();
  }
});

schema.statics.getDraftList = function(filter: any, language: number, skip: number = null, limit: number = null) {
  const _this: IRequestModel = this;
  const aggregation: any[] = [
    {
      $match: filter
    },
    {
      $project: {
        _id: 1,
        category: 1,
        iNeed: 1,
        files: 1,
        createdDt: 1
      }
    },
    {
      $lookup: {
        from: 'categories',
        localField: 'category',
        foreignField: '_id',
        as: 'category'
      }
    },
    {
      $unwind: {
        path: '$category',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $project: {
        _id: 1,
        category: { $cond: { if: '$category._id', then: '$category._id', else: null } },
        categoryIcon: { $concat: [ mainConfig.BASE_URL, '$category.icon' ] },
        iNeed: 1,
        files: 1,
        createdDt: 1
      }
    },
    {
      $lookup: {
        from: 'categorytranslations',
        localField: 'category',
        foreignField: 'category',
        as: 'translations'
      }
    },
    {
      $unwind: {
        path: '$translations',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $match: {
        $or: [{
          'translations.language': language
        }, {
          'category': null
        }]
      }
    },
    {
      $project: {
        _id: 1,
        categoryIcon: 1,
        categoryName: { $cond: { if: '$translations.name', then: '$translations.name', else: null } },
        iNeed: 1,
        fileCount: { $size: '$files' },
        createdDt: 1
      }
    },
    {
      $sort: { createdDt: -1 }
    }
  ];
  if (skip) aggregation.push({ $skip: skip });
  if (limit) aggregation.push({ $limit: limit });
  const list = _this.aggregate(aggregation);
  return list;
};

schema.statics.getListForAdmin = function(filter: any, language: number) {
  const _this: IRequestModel = this;
  const aggregation: any[] = [
    {
      $match: filter
    },
    {
      $sort: { createdDt: -1 }
    },
    {
      $project: {
        _id: 1,
        status: 1,
        type: 1,
        category: 1,
        description: 1,
        products: 1,
        iNeed: 1,
        measurementUnit: 1,
        count: 1,
        files: 1
      }
    },
    {
      $lookup: {
        from: 'categories',
        localField: 'category',
        foreignField: '_id',
        as: 'category'
      }
    },
    {
      $unwind: {
        path: '$category',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $project: {
        _id: 1,
        type: 1,
        category: { $cond: { if: '$category._id', then: '$category._id', else: null } },
        categoryIcon: { $concat: [ mainConfig.BASE_URL, '$category.icon' ] },
        status: 1,
        description: 1,
        products: 1,
        iNeed: 1,
        measurementUnit: 1,
        count: 1,
        files: 1
      }
    },
    {
      $lookup: {
        from: 'categorytranslations',
        localField: 'category',
        foreignField: 'category',
        as: 'translations'
      }
    },
    {
      $unwind: {
        path: '$translations',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $match: {
        $or: [{
          'translations.language': language
        }, {
          'category': null
        }]
      }
    },
    {
      $lookup: {
        from: 'files',
        localField: 'files',
        foreignField: '_id',
        as: 'files'
      }
    },
    {
      $project: {
        _id: 1,
        type: 1,
        categoryIcon: 1,
        categoryName: { $cond: { if: '$translations.name', then: '$translations.name', else: null } },
        status: 1,
        description: 1,
        iNeed: 1,
        measurementUnit: 1,
        count: 1,
        products: 1,
        files: {
          $map: {
            input: '$files',
            as: 'f',
            in: {
              _id: '$$f._id',
              originalName: '$$f.originalName',
              type: '$$f.type',
              path: { $concat: [ mainConfig.BASE_URL, '$$f.path' ] }
            }
          }
        }
      }
    },
    {
      $lookup: {
        from: 'mutranslations',
        localField: 'measurementUnit',
        foreignField: 'mu',
        as: 'mutranslations'
      }
    },
    {
      $unwind: {
        path: '$mutranslations',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $match: {
        $or: [{
          'mutranslations.language': language
        }, {
          'measurementUnit': null
        }]
      }
    },
    {
      $project: {
        _id: 1,
        type: 1,
        categoryIcon: 1,
        categoryName: 1,
        status: 1,
        description: 1,
        iNeed: 1,
        measurementUnit: { $cond: { if: '$mutranslations.name', then: '$mutranslations.name', else: null } },
        count: 1,
        products: 1,
        files: 1
      }
    }
  ];
  const list = _this.aggregate(aggregation);
  return list;
};

export const request: IRequestModel = mongoose.model<IRequestDoc<any, any, any, any, any>, IRequestModel>(schemaReferences.request, schema);
export default request;