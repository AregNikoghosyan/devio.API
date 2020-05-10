import * as mongoose from 'mongoose';
import { schemaReferences } from '../../constants/constants';
import { IWishProductModel, IWishProduct } from './model';
import mainConfig from '../../env';
import { ObjectID } from 'bson';
import { WishProductStatusEnum } from '../../constants/enums';

const Schema = mongoose.Schema;

const schema = new Schema({
  wishList: {
    type: Schema.Types.ObjectId,
    ref: schemaReferences.wishList,
    required: true
  },
  product: {
    type: Schema.Types.ObjectId,
    ref: schemaReferences.product,
    required: true
  },
  productVersion: {
    type: Schema.Types.ObjectId,
    ref: schemaReferences.productVersion,
    default: null
  },
  uniqueIdentifier: {
    type: Number,
    default: null
  },
  member: {
    type: Schema.Types.ObjectId,
    ref: schemaReferences.user,
    required: true
  },
  count: {
    type: Number,
    default: 0
  },
  status: {
    type: Number,
    required: true
  },
  createdDt: {
    type: Date,
    default: Date.now
  }
});

function getAggregationForList(language: number): any[] {
  return [
    {
      $sort: { createdDt: -1 }
    },
    {
      $project: {
        _id: 1,
        count: 1,
        product: 1,
        productVersion: 1
      }
    },
    {
      $lookup: {
        from: 'products',
        localField: 'product',
        foreignField: '_id',
        as: 'product'
      }
    },
    {
      $unwind: '$product'
    },
    {
      $lookup: {
        from: 'productversions',
        localField: 'productVersion',
        foreignField: '_id',
        as: 'productVersion'
      }
    },
    {
      $unwind: {
        path: '$productVersion',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $project: {
        'count': 1,
        'product': '$product._id',
        'productVersion': {
          $cond: { if: '$productVersion', then: '$productVersion._id', else: null }
        },
        minCount: '$product.minCount',
        step: '$product.step',
        translations: '$product.translations',
        images: '$product.images',
        defaultPrice: '$product.defaultPrice',
        versionPrice: {
          $cond: {
            if: '$productVersion',
            then: '$productVersion.price',
            else: null
          }
        },
        discountStartDate: '$product.discountStartDate',
        discountEndDate: '$product.discountEndDate',
        versionImage: {
          $cond: {
            if: '$productVersion',
            then: '$productVersion.photo',
            else: null
          }
        },
        attributes: {
          $cond: {
            if: '$productVersion',
            then: '$productVersion.attributes',
            else: []
          }
        }
      }
    },
    {
      $project: {
        _id: 1,
        count: 1,
        product: 1,
        productVersion: 1,
        minCount: 1,
        step: 1,
        translations: 1,
        defaultPrice: 1,
        versionPrice: 1,
        discountStartDate: 1,
        discountEndDate: 1,
        image: {
          $cond: {
            if: '$versionImage',
            then: '$versionImage',
            else: { $arrayElemAt: ['$images', 0] }
          }
        },
        attributes: 1
      }
    },
    {
      $lookup: {
        from: 'files',
        localField: 'image',
        foreignField: '_id',
        as: 'image'
      }
    },
    {
      $unwind: {
        path: '$image',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $project: {
        _id: 1,
        count: 1,
        product: 1,
        productVersion: 1,
        minCount: 1,
        step: 1,
        translations: 1,
        defaultPrice: 1,
        versionPrice: 1,
        discountStartDate: 1,
        discountEndDate: 1,
        image: {
          $cond: {
            if: '$image',
            then: { $concat: [mainConfig.BASE_URL, '$image.path'] },
            else: null
          }
        },
        attributes: 1
      }
    },
    {
      $lookup: {
        from: 'producttranslations',
        localField: 'translations',
        foreignField: '_id',
        as: 'translation'
      }
    },
    {
      $unwind: {
        path: '$translation',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $match: {
        'translation.language': language
      }
    },
    {
      $project: {
        _id: 1,
        name: {
          $cond: {
            if: '$translation',
            then: '$translation.name',
            else: ''
          }
        },
        count: 1,
        product: 1,
        productVersion: 1,
        minCount: 1,
        step: 1,
        defaultPrice: {
          $cond: {
            if: '$versionPrice',
            then: '$versionPrice',
            else: '$defaultPrice'
          }
        },
        discountStartDate: 1,
        discountEndDate: 1,
        image: 1,
        attributes: 1
      }
    },
    {
      $lookup: {
        from: 'productpricings',
        localField: 'product',
        foreignField: 'product',
        as: 'pricing'
      }
    },
    {
      $project: {
        _id: 1,
        name: 1,
        count: 1,
        product: 1,
        productVersion: 1,
        minCount: 1,
        step: 1,
        defaultPrice: 1,
        discountStartDate: 1,
        discountEndDate: 1,
        image: 1,
        attributes: 1,
        pricing: {
          $filter: {
            input: '$pricing',
            as: 'p',
            cond: { $eq: ['$$p.deleted', false] }
          }
        }
      }
    }
  ];
}

schema.statics.getList = async function (filter: any, language: number, skip: number = null, limit: number = null): Promise<any[]> {
  const _this: IWishProductModel = this;
  const aggregation: any = [
    {
      $match: filter
    },
    {
      $group: {
        _id: '$uniqueIdentifier',
        count: { $sum: '$count' },
        product: { $first: '$product' },
        productVersion: { $first: '$productVersion' },
        createdDt: { $max: '$createdDt' }
      }
    },
    ...getAggregationForList(language)
  ];
  if (skip) aggregation.push({ $skip: skip });
  if (limit) aggregation.push({ $limit: limit });
  const list = await _this.aggregate(aggregation);
  return list;
};

schema.statics.getListToExport = async function (filter: any): Promise<any[]> {
  const _this: IWishProductModel = this;
  const aggregation: any = [
    {
      $match: filter
    },
    {
      $group: {
        _id: '$uniqueIdentifier',
        count: { $sum: '$count' },
        product: { $first: '$product' },
        productVersion: { $first: '$productVersion' },
        createdDt: { $max: '$createdDt' }
      }
    },
    {
      $sort: { createdDt: -1 }
    },
    {
      $project: {
        _id: 1,
        count: 1,
        product: 1,
        productVersion: 1
      }
    }
  ];
  const list = await _this.aggregate(aggregation);
  return list;
};

schema.statics.getUnapprovedList = async function (filter: any, language: number, skip: number = null, limit: number = null): Promise<any[]> {
  const _this: IWishProductModel = this;
  const listAggregation = getAggregationForList(language).map(item => {
    if (item['$project']) item['$project'].members = 1;
    return item;
  });
  const aggregation: any = [
    {
      $match: filter
    },
    {
      $lookup: {
        from: 'users',
        localField: 'member',
        foreignField: '_id',
        as: 'member'
      }
    },
    {
      $unwind: '$member'
    },
    {
      $group: {
        _id: '$uniqueIdentifier',
        count: { $sum: '$count' },
        product: { $first: '$product' },
        productVersion: { $first: '$productVersion' },
        createdDt: { $max: '$createdDt' },
        members: { $push: { firstName: '$member.firstName', lastName: '$member.lastName', email: '$member.email' } }
      }
    },
    ...listAggregation
  ];
  if (skip) aggregation.push({ $skip: skip });
  if (limit) aggregation.push({ $limit: limit });
  const list = await _this.aggregate(aggregation);
  return list;
};

schema.statics.getApprovedListToInsert = async function(wishListId: string): Promise<Array<{ _id: number, product: string, productVersion: string }>> {
  const _this: IWishProductModel = this;
  const id = new ObjectID(wishListId);
  const aggregation = [
    {
      $match: {
        wishList: id,
        status: WishProductStatusEnum.approved
      }
    },
    {
      $group: {
        _id: '$uniqueIdentifier',
        product: { $first: '$product' },
        productVersion: { $first: '$productVersion' }
      }
    }
  ];
  const list = await _this.aggregate(aggregation);
  return list;
};

schema.statics.getIdentifier = async function (id: string): Promise<number> {
  const _this: IWishProductModel = this;
  const aggregation = [
    {
      $match: {
        wishList: new ObjectID(id)
      }
    },
    {
      $group: {
        _id: '$wishList',
        identifier: { $max: '$uniqueIdentifier' }
      }
    }
  ];
  const list = await _this.aggregate(aggregation);
  const item = list[0];
  if (!item || !item.identifier) {
    return 1;
  }
  else {
    return item.identifier + 1;
  }
};

schema.statics.getApprovedProductCountInList = async function (wishListId: string): Promise<number> {
  const aggregation = [
    {
      $match: {
        wishList: new ObjectID(wishListId),
        status: WishProductStatusEnum.approved
      }
    },
    {
      $group: {
        _id: '$uniqueIdentifier'
      }
    }
  ];
  const list = await this.aggregate(aggregation);
  return list.length;
};

schema.statics.getImages = async function (wishListId: string): Promise<number> {
  const aggregation = [
    {
      $match: {
        wishList: new ObjectID(wishListId),
        status: WishProductStatusEnum.approved
      }
    },
    {
      $group: {
        _id: '$uniqueIdentifier',
        product: { $first: '$product' },
        productVersion: { $first: '$productVersion' },
        createdDt: { $max: '$createdDt' }
      }
    },
    {
      $sort: { createdDt: -1 }
    },
    {
      $lookup: {
        from: 'products',
        localField: 'product',
        foreignField: '_id',
        as: 'product'
      }
    },
    {
      $unwind: '$product'
    },
    {
      $lookup: {
        from: 'productversions',
        localField: 'productVersion',
        foreignField: '_id',
        as: 'productVersion'
      }
    },
    {
      $unwind: {
        path: '$productVersion',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $project: {
        _id: 1,
        images: '$product.images',
        image: {
          $cond: {
            if: '$productVersion',
            then: '$productVersion.photo',
            else: null
          }
        }
      }
    },
    {
      $project: {
        _id: 1,
        image: {
          $cond: {
            if: '$image',
            then: '$image',
            else: { $arrayElemAt: ['$images', 0] }
          }
        }
      }
    },
    {
      $match: { image: { $ne: null } }
    },
    {
      $lookup: {
        from: 'files',
        localField: 'image',
        foreignField: '_id',
        as: 'image'
      }
    },
    {
      $unwind: '$image'
    },
    {
      $project: {
        _id: 1,
        image: { $concat: [mainConfig.BASE_URL, '$image.path'] }
      }
    },
    {
      $limit: 3
    }
  ];
  const list = await this.aggregate(aggregation);
  return list.map(item => item.image);
};

schema.statics.countByFilter = async function(filter: any): Promise<number> {
  const list = await this.aggregate([
    {
      $match: filter
    },
    {
      $group: {
        _id: '$uniqueIdentifier'
      }
    }
  ]);
  return list.length;
};

export const wishProduct: IWishProductModel = mongoose.model<IWishProduct<any, any, any, any>, IWishProductModel>(schemaReferences.wishProduct, schema);
export default wishProduct;