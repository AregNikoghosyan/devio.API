import * as mongoose from 'mongoose';

import { CounterReferenceEnum, RequestPackStatusEnum, LanguageEnum } from '../../constants/enums';
import { schemaReferences, otherCategoryNames, guestNames } from '../../constants/constants';

import CounterSchema from '../counter';
import { IRequestPackModel, IRequestPack } from './model';
import mainConfig from '../../env';

const Schema = mongoose.Schema;

const schema = new Schema({
  nid: {
    type: Number
  },
  shortCode: {
    type: String
  },
  status: {
    type: Number,
    default: RequestPackStatusEnum.active
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: schemaReferences.user,
    default: null
  },
  deviceId: {
    type: String,
    default: null
  },
  requestList: [{
    type: Schema.Types.ObjectId,
    ref: schemaReferences.request
  }],
  requestCount: {
    type: Number
  },
  userPhoneNumber: {
    type: String,
    required: true
  },
  userEmail: {
    type: String,
    required: true
  },
  userFirstName: {
    type: String,
    required: true
  },
  userLastName: {
    type: String,
    default: null
  },
  adminSeen: {
    type: Boolean,
    default: false
  },
  osType: {
    type: Number,
    default: null
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
  } else {
    const counter = await CounterSchema.findOneAndUpdate({ reference: CounterReferenceEnum.requestPack }, { $inc: { count: 1 } }, { new: true });
    if (counter) {
      _this.nid = counter.count;
      const code = await createUniqueShortCode(counter.count, _this._id);
      _this.shortCode = code;
      next();
    } else {
      next(new Error('Missing user counter'));
    }
  }
});

schema.statics.getPackListForAppUser = function (filter: any, language: number, skip: number = null, limit: number = null) {
  const _this: IRequestPackModel = this;
  const aggregation: any[] = [
    {
      $match: filter
    },
    {
      $project: {
        _id: 1,
        status: 1,
        request: { $arrayElemAt: ['$requestList', 0] },
        requestCount: 1,
        nid: 1,
        createdDt: 1
      }
    },
    {
      $lookup: {
        from: 'requests',
        localField: 'request',
        foreignField: '_id',
        as: 'request'
      }
    },
    {
      $unwind: '$request'
    },
    {
      $project: {
        _id: 1,
        nid: 1,
        status: 1,
        createdDt: 1,
        requestCount: 1,
        type: '$request.type',
        fileCount: { $size: '$request.files' }
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

schema.statics.getPackDetailsForUser = async function (filter: any, language: number) {
  const _this: IRequestPackModel = this;
  let emptyCategory = '';
  switch (language) {
    case LanguageEnum.hy: {
      emptyCategory = otherCategoryNames.hy;
      break;
    }
    case LanguageEnum.ru: {
      emptyCategory = otherCategoryNames.ru;
      break;
    }
    case LanguageEnum.en: {
      emptyCategory = otherCategoryNames.en;
      break;
    }
  }
  const aggregation = [
    {
      $match: filter
    },
    {
      $lookup: {
        from: 'requests',
        localField: 'requestList',
        foreignField: '_id',
        as: 'requestList'
      }
    },
    {
      $unwind: {
        path: '$requestList',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $lookup: {
        from: 'files',
        localField: 'requestList.files',
        foreignField: '_id',
        as: 'requestList.files'
      }
    },
    {
      $lookup: {
        from: 'categorytranslations',
        localField: 'requestList.category',
        foreignField: 'category',
        as: 'requestList.translations'
      }
    },
    {
      $unwind: {
        path: '$requestList.translations',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $match: {
        $or: [{
          'requestList.translations.language': language
        }, {
          'requestList.category': null
        }]
      }
    },
    {
      $lookup: {
        from: 'mutranslations',
        localField: 'requestList.measurementUnit',
        foreignField: 'mu',
        as: 'requestList.mutranslations'
      }
    },
    {
      $unwind: {
        path: '$requestList.mutranslations',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $match: {
        $or: [{
          'requestList.mutranslations.language': language
        }, {
          'requestList.measurementUnit': null
        }]
      }
    },
    {
      $project: {
        _id: 1,
        status: 1,
        userPhoneNumber: 1,
        userEmail: 1,
        createdDt: 1,
        nid: 1,
        userFirstName: 1,
        userLastName: 1,
        'requestList._id': 1,
        'requestList.status': 1,
        'requestList.type': 1,
        'requestList.category': { $cond: { if: '$requestList.translations.name', then: '$requestList.translations.name', else: emptyCategory } },
        'requestList.description': 1,
        'requestList.iNeed': 1,
        'requestList.measurementUnit': { $cond: { if: '$requestList.mutranslations.name', then: '$requestList.mutranslations.name', else: null } },
        'requestList.count': 1,
        'requestList.products': 1,
        'requestList.files': {
          $map: {
            input: '$requestList.files',
            as: 'f',
            in: {
              _id: '$$f._id',
              originalName: '$$f.originalName',
              type: '$$f.type',
              path: { $concat: [mainConfig.BASE_URL, '$$f.path'] }
            }
          }
        }
      }
    },
    {
      $group: {
        _id: '$_id',
        status: { $first: '$status' },
        phoneNumber: { $first: '$userPhoneNumber' },
        email: { $first: '$userEmail' },
        firstName: { $first: '$userFirstName' },
        lastName: { $first: '$userLastName' },
        createdDt: { $first: '$createdDt' },
        nid: { $first: '$nid' },
        requestList: {
          $push: {
            _id: '$requestList._id',
            status: '$requestList.status',
            type: '$requestList.type',
            category: '$requestList.category',
            description: '$requestList.description',
            products: '$requestList.products',
            iNeed: '$requestList.iNeed',
            measurementUnit: '$requestList.measurementUnit',
            count: '$requestList.count',
            files: '$requestList.files'
          }
        }
      }
    }
  ];
  const itemList = await _this.aggregate(aggregation);
  return itemList[0];
};

schema.statics.countByFilter = async function (filter: any): Promise<number> {
  const _this: IRequestPackModel = this;
  const aggregation = [
    {
      $project: {
        nid: 1,
        shortCode: 1,
        status: 1,
        user: 1,
        deviceId: 1,
        requestList: 1,
        requestCount: 1,
        userPhoneNumber: 1,
        userEmail: 1,
        userFirstName: 1,
        userLastName: 1,
        name: {
          $cond: {
            if: {
              $and: [
                { $eq: [false, { $eq: ['$userFirstName', null] }] },
                { $eq: [false, { $eq: ['$userLastName', null] }] }
              ]
            },
            then: {
              $concat: ['$userFirstName', ' ', '$userLastName']
            },
            else: {
              $cond: {
                if: { $eq: [false, { $eq: ['$userFirstName', null] }] },
                then: '$userFirstName',
                else: {
                  $cond: {
                    if: { $eq: [false, { $eq: ['$userLastName', null] }] },
                    then: '$userLastName',
                    else: null
                  }
                }
              }
            }
          }
        },
        adminSeen: 1,
        createdDt: 1,
        updatedDt: 1
      }
    },
    {
      $match: filter
    }
  ];
  const list = await _this.aggregate(aggregation);
  return list.length;
};

schema.statics.getAdminList = async function (filter: any, sort: any, skip: number, limit: number): Promise<any[]> {
  const _this: IRequestPackModel = this;
  const aggregation: any = [
    {
      $project: {
        nid: 1,
        shortCode: 1,
        status: 1,
        user: 1,
        deviceId: 1,
        requestList: 1,
        requestCount: 1,
        userPhoneNumber: 1,
        userEmail: 1,
        userFirstName: 1,
        userLastName: 1,
        name: {
          $cond: {
            if: {
              $and: [
                { $eq: [false, { $eq: ['$userFirstName', null] }] },
                { $eq: [false, { $eq: ['$userLastName', null] }] }
              ]
            },
            then: {
              $concat: ['$userFirstName', ' ', '$userLastName']
            },
            else: {
              $cond: {
                if: { $eq: [false, { $eq: ['$userFirstName', null] }] },
                then: '$userFirstName',
                else: {
                  $cond: {
                    if: { $eq: [false, { $eq: ['$userLastName', null] }] },
                    then: '$userLastName',
                    else: null
                  }
                }
              }
            }
          }
        },
        adminSeen: 1,
        createdDt: 1,
        updatedDt: 1
      }
    },
    {
      $match: filter
    },
    {
      $project: {
        _id: 1,
        nid: 1,
        status: 1,
        createdDt: 1,
        requestCount: 1,
        adminSeen: 1,
        userFirstName: 1,
        userLastName: 1,
        user: 1,
      }
    },
    {
      $sort: sort
    }
  ];
  if (skip) aggregation.push({ $skip: skip });
  if (limit) aggregation.push({ $limit: limit });
  const list = await _this.aggregate(aggregation);
  return list;
};


schema.statics.newCountByDateRange = async function (body: { dateFrom: Date, dateTo: Date }): Promise<number> {
  const _this: IRequestPackModel = this;
  const filter: any = {
    createdDt: {
      $gt: new Date(body.dateFrom)
    }
  };
  if (body.dateTo) {
    filter.createdDt.$lt = new Date(body.dateTo);
  }
  return await _this.countDocuments(filter);
};

export const requestPack: IRequestPackModel = mongoose.model<IRequestPack<any, any>, IRequestPackModel>(schemaReferences.requestPack, schema);
export default requestPack;

function generateShortCode(nid: number) {
  const charset = 'ABCDEFGHJKLMNOPQRSTUVWXYZ';
  let text = '';
  for (let i = 0; i < 2; i++) {
    const char = charset.charAt(Math.ceil(Math.random() * (charset.length - 1)));
    text += char;
  }
  const shortCode = `${text}-${nid}`;
  return shortCode;
}

async function createUniqueShortCode(nid: number, _id: string) {
  const code = generateShortCode(nid);
  const check = await requestPack.findOne({ code, _id: { $ne: _id } });
  if (check) {
    createUniqueShortCode(nid, _id);
  } else {
    return code;
  }
}