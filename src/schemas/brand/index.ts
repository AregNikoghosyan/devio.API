import * as mongoose from 'mongoose';
import { schemaReferences } from '../../constants/constants';
import { IBrandModel, IBrand } from './model';
import { IResponseModel } from '../../api/mainModels';
import mainConfig from '../../env';
import { UserTypeEnum } from '../../constants/enums';

const Schema = mongoose.Schema;

const schema = new Schema({
  name: {
    type: String,
    required: true
  },
  upperCaseName: {
    type: String,
    required: true
  },
  logo: {
    type: Schema.Types.ObjectId,
    ref: schemaReferences.file
  },
  productCount: {
    type: Number,
    default: 0
  },
  visibleProductCount: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: schemaReferences.user
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

schema.pre('save', async function(next) {
  const _this: any = this;
  if (!_this.isNew) {
    _this.updatedDt = Date.now();
    next();
  }
});

schema.statics.getListForAll = async function(filter: any, skip: number, limit: number, userRole: number = UserTypeEnum.user): Promise<any> {
  const _this: IBrandModel = this;
  const aggregation: any[] = [
    {
      $match: filter
    },
    {
      $lookup: {
        from: 'files',
        localField: 'logo',
        foreignField: '_id',
        as: 'logo'
      }
    },
    {
      $unwind: '$logo'
    },
    {
      $project: {
        _id: 1,
        name: 1,
        logo: { $concat: [ mainConfig.BASE_URL, '$logo.path' ] },
        productCount: userRole === UserTypeEnum.user ? '$visibleProductCount' : 1,
        createdDt: 1
      }
    },
    {
      $sort: { name: 1, createdDt: -1 }
    },
    {
      $skip: skip
    },
    {
      $limit: limit
    }
  ];
  const list = _this.aggregate(aggregation);
  return list;
};

schema.statics.countByFilter = async function(filter: any): Promise<number> {
  const _this: IBrandModel = this;
  const aggregation: any[] = [
    {
      $match: filter
    }
  ];
  const list = await _this.aggregate(aggregation);
  return list.length;
};

schema.statics.newCountByDateRange = async function (body: { dateFrom: Date, dateTo: Date }): Promise<number> {
  const _this: IBrandModel = this;
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

export const brand: IBrandModel = mongoose.model<IBrand<any, any>, IBrandModel>(schemaReferences.brand, schema);
export default brand;