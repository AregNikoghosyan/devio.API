import * as mongoose from 'mongoose';
import { schemaReferences } from '../../constants/constants';
import { ProductStatusEnum, CounterReferenceEnum, ProductTypeEnum, LanguageEnum } from '../../constants/enums';

import CounterSchema from '../counter';
import ProductVersionSchema from '../productVersion';
import ProductTranslationSchema from '../productTranslation';
import CategoryTranslationSchema from '../categoryTranslation';
import OptionTranslationSchema from '../optionTranslation';

import CategorySchema from '../category';
import { IProductModel, IProduct } from './model';
import mainConfig from '../../env';
import { ObjectID } from 'bson';
import { IFile } from '../file/model';

const Schema = mongoose.Schema;

const schema = new Schema({
  nid: {
    type: Number,
    default: 0
  },
  status: {
    type: Number,
    default: ProductStatusEnum.preparing
  },
  type: {
    type: Number,
    default: ProductTypeEnum.usual
  },
  preparingDayCount: {
    type: Number,
    default: null
  },
  versionsHidden: {
    type: Boolean,
    default: false
  },
  mu: {
    type: Schema.Types.ObjectId,
    ref: schemaReferences.mu,
    default: null
  },
  minCount: {
    type: Number,
    default: null
  },
  step: {
    type: Number,
    default: null
  },
  availableCount: {
    type: Number,
    default: 0
  },
  multiplier: {
    type: Number,
    default: null
  },
  translations: [{
    type : Schema.Types.ObjectId,
    ref  : schemaReferences.productTranslation
  }],
  defaultPrice: {
    type: Number,
    default: 0
  },
  discountStartDate: {
    type: Date,
    default: null
  },
  discountEndDate: {
    type: Date,
    default: null
  },
  images: [{
    type: Schema.Types.ObjectId,
    ref: schemaReferences.file
  }],
  attributes: [{
    type: Schema.Types.ObjectId,
    ref: schemaReferences.attribute
  }],
  versions: [{
    type: Schema.Types.ObjectId,
    ref: schemaReferences.productVersion
  }],
  categories: [{
    type: Schema.Types.ObjectId,
    ref: schemaReferences.category
  }],
  mainCategories: [{
    type: Schema.Types.ObjectId,
    ref: schemaReferences.category
  }],
  features: [{
    type: Schema.Types.ObjectId,
    ref: schemaReferences.productFeature
  }],
  brand: {
    type: Schema.Types.ObjectId,
    ref: schemaReferences.brand,
    default: null
  },
  isPrivate: {
    type: Boolean,
    default: false
  },
  boughtCount: {
    type: Number,
    default: 0
  },
  seenCount: {
    type: Number,
    default: 0
  },
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
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: schemaReferences.user,
    required: true
  },
  partner: {
    type: Schema.Types.ObjectId,
    ref: schemaReferences.user,
    default: null
  }
});

schema.index({ 'boughtCount': -1 });

schema.pre('save', async function(next) {
  const _this: any = this;
  if (!_this.isNew) {
    _this.updatedDt = Date.now();
    if (_this.status !== ProductStatusEnum.preparing && _this.nid === 0) {
      const counter = await CounterSchema.findOneAndUpdate({ reference: CounterReferenceEnum.product }, { $inc: { count: 1 } }, { new: true });
      if (counter) {
        _this.nid = counter.count;
        next();
      } else {
        next(new Error('Missing product counter'));
      }
    }
    next();
  }
});

const discountCondition = {
  $cond: {
    if: {
      $or: [
        { $and: [ { $eq: [ '$discountStartDate', null ] }, { $eq: [ '$discountEndDate', null ] } ] },
        { $and: [ { $eq: [ '$discountStartDate', null ] }, { $gte: [ '$discountEndDate', new Date() ] } ] },
        { $and: [ { $lte: [ '$discountStartDate', new Date() ] }, { $eq: [ '$discountEndDate', null ] } ] },
        { $and: [ { $lte: [ '$discountStartDate', new Date() ] }, { $gte: [ '$discountEndDate', new Date() ] } ] }
      ]
    },
    then: true,
    else: false
  }
};

schema.statics.getListForDashboard = async function (filter: any, language: number, skip: number, limit: number, sort: any = { createdDt: -1 }) {
  const _this: IProductModel = this;
  const list: Array<IProduct<string, string, IFile, string, string, string, string, string, string>> = await _this.find(filter)
    .sort({ createdDt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('images');
  const itemList = await Promise.all(list.map(async item => {
    const [ translation, categoryTranslations ] = await Promise.all([
      await ProductTranslationSchema.findOne({ product: item._id, language: language }),
      await CategoryTranslationSchema.find({ category: { $in: item.categories }, language: language })
    ]);
    return {
      _id: item._id,
      createdDt: item.createdDt,
      defaultPrice: item.defaultPrice,
      status: item.status,
      categories: categoryTranslations.map(tr => tr.name),
      name: translation ? translation.name : null,
      image: item.images[0] ? mainConfig.BASE_URL + item.images[0].path : null
    };
  }));
  return itemList;
};

schema.statics.getProductDetailsByDefault = async function(id: string, language: number, getPriceRange: boolean): Promise<any> {
  const _this: IProductModel = this;
  let aggregation: any[] = [
    {
      $match: {
        _id: id
      }
    },
    {
      $lookup: {
        from: 'producttranslations',
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
      $lookup: {
        from: 'files',
        localField: 'images',
        foreignField: '_id',
        as: 'images'
      }
    },
    {
      $lookup: {
        from: 'brands',
        localField: 'brand',
        foreignField: '_id',
        as: 'brand'
      }
    },
    {
      $unwind: {
        path: '$brand',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $project: {
        name: '$translations.name',
        description: '$translations.description',
        price: '$defaultPrice',
        type: 1,
        preparingDayCount: 1,
        minCount: 1,
        step: 1,
        discounted: discountCondition,
        images: {
          $map: {
            input: '$images',
            as: 'i',
            in: {
              _id: '$$i._id',
              path: { $concat: [ mainConfig.BASE_URL, '$$i.path' ] }
            }
          }
        },
        versions: 1,
        brand: { $cond: { if: { $not: '$brand' }, then: null , else: '$brand.name' } },
      }
    },
    {
      $lookup: {
        from: 'productpricings',
        localField: '_id',
        foreignField: 'product',
        as: 'pricing'
      }
    },
    {
      $project: {
        _id: 1,
        name: 1,
        description: 1,
        price: 1,
        type: 1,
        preparingDayCount: 1,
        images: 1,
        discounted: 1,
        brand: 1,
        minCount: 1,
        step: 1,
        versions: 1,
        pricing: {
          $filter: {
            input: '$pricing',
            as: 'p',
            cond: { $eq: [ '$$p.deleted', false ] }
          }
        }
      }
    },
    {
      $project: {
        _id: 1,
        name: 1,
        description: 1,
        price: 1,
        type: 1,
        preparingDayCount: 1,
        images: 1,
        discounted: 1,
        brand: 1,
        minCount: 1,
        step: 1,
        versions: 1,
        'pricing.discount': 1,
        'pricing.bonus': 1,
        'pricing.fromCount': 1,
        currentPricing: {
          $filter: {
            input: '$pricing',
            as: 'p',
            cond: { $eq: [ '$minCount', '$$p.fromCount' ] }
          }
        }
      }
    },
    {
      $unwind: {
        path: '$currentPricing',
        preserveNullAndEmptyArrays: true
      }
    }
  ];
  if (getPriceRange) {
    const subAggregation = [
      {
        $lookup: {
          from: 'productversions',
          localField: 'versions',
          foreignField: '_id',
          as: 'versions'
        }
      },
      {
        $project: {
          _id               : 1,
          name              : 1,
          description       : 1,
          type              : 1,
          preparingDayCount : 1,
          images            : 1,
          discounted        : 1,
          brand             : 1,
          pricing           : 1,
          price             : 1,
          minCount          : 1,
          step              : 1,
          currentPricing    : 1,
          versions: {
            $filter: {
              input: '$versions',
              as: 'v',
              cond: { $eq: [ '$$v.hidden', false ] }
            }
          }
        }
      },
      {
        $unwind: {
          path: '$versions'
        }
      },
      {
        $group: {
          _id               : '$_id',
          name              : { $first: '$name' },
          description       : { $first: '$description' },
          type              : { $first: '$type' },
          preparingDayCount : { $first: '$preparingDayCount' },
          images            : { $first: '$images' },
          discounted        : { $first: '$discounted' },
          brand             : { $first: '$brand' },
          pricing           : { $first: '$pricing' },
          price             : { $first: '$price' },
          minPrice          : { $min: '$versions.price' },
          maxPrice          : { $max: '$versions.price' },
          minCount          : { $first: '$minCount' },
          step              : { $first: '$step' },
          currentPricing    : { $first: '$currentPricing' },
        }
      }
    ];
    aggregation = aggregation.concat(subAggregation);
  } else {
    aggregation.push({
      $project: {
        _id: 1,
        name: 1,
        description: 1,
        price: 1,
        type: 1,
        preparingDayCount: 1,
        images: 1,
        discounted: 1,
        brand: 1,
        currentPricing: 1,
        minCount: 1,
        step: 1,
        'pricing.discount': 1,
        'pricing.bonus': 1,
        'pricing.fromCount': 1
      }
    });
  }
  const list = await _this.aggregate(aggregation);
  return list[0];
};

schema.statics.getShortList = async function(filter: any, skip: number, limit: number, language: number): Promise<any> {
  const _this: IProductModel = this;
  const aggregation: any[] = [
    {
      $match: filter
    },
    {
      $lookup: {
        from: 'producttranslations',
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
      $lookup: {
        from: 'files',
        localField: 'images',
        foreignField: '_id',
        as: 'images'
      }
    },
    {
      $project: {
        _id: 1,
        name: '$translations.name',
        image: { $arrayElemAt: [ '$images', 0 ] },
      }
    },
    {
      $project: {
        _id: 1,
        name: 1,
        image: { $concat: [ mainConfig.BASE_URL, '$image.path' ] },
      }
    }
  ];
  if (skip) aggregation.push({ $skip: skip });
  if (limit) aggregation.push({ $limit: limit });
  const list = _this.aggregate(aggregation);
  return list;
};

schema.statics.getShortListWithPricing = async function(filter: any, language: number, skip: number = null, limit: number = null): Promise<any[]> {
  const _this: IProductModel = this;
  const aggregation: any[] = [
    {
      $match: filter
    },
    {
      $lookup: {
        from: 'producttranslations',
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
      $lookup: {
        from: 'files',
        localField: 'images',
        foreignField: '_id',
        as: 'images'
      }
    },
    {
      $project: {
        _id: 1,
        status: 1,
        price: '$defaultPrice',
        discountedPrice: 1,
        discountStartDate: 1,
        discountEndDate: 1,
        versions: 1,
        name: '$translations.name',
        image: { $arrayElemAt: [ '$images', 0 ] },
      }
    },
    {
      $project: {
        _id: 1,
        name: 1,
        status: 1,
        price: 1,
        versions: 1,
        discounted: discountCondition,
        discountedPrice: 1,
        image: { $concat: [ mainConfig.BASE_URL, '$image.path' ] }
      }
    },
    {
      $lookup: {
        from: 'productversions',
        localField: 'versions',
        foreignField: '_id',
        as: 'versions'
      }
    },
    {
      $unwind: {
        path: '$versions',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $group: {
        _id: '$_id',
        name: { $first: '$name' },
        status: { $first: '$status' },
        price: { $first: '$price' },
        discounted: { $first: '$discounted' },
        discountedPrice: { $first: '$discountedPrice' },
        image: { $first: '$image' },
        minPrice: { '$min': '$versions.price' },
        maxPrice: { '$max': '$versions.price' },
        minDiscountedPrice: { '$min': '$versions.discountedPrice' },
        maxDiscountedPrice: { '$max': '$versions.discountedPrice' }
      }
    }
  ];
  if (skip) aggregation.push({ $skip: skip });
  if (limit) aggregation.push({ $limit: limit });
  const list = _this.aggregate(aggregation);
  return list;
};

schema.statics.getPricing = async function(id): Promise<any> {
  const _this: IProductModel = this;
  const aggregation = [
    {
      $match: {
        _id: new ObjectID(id)
      }
    },
    {
      $lookup: {
        from: 'productpricings',
        localField: '_id',
        foreignField: 'product',
        as: 'pricing'
      }
    },
    {
      $project: {
        minCount: 1,
        discounted: discountCondition,
        pricing: {
          $filter: {
            input: '$pricing',
            as: 'p',
            cond: { $eq: [ '$$p.deleted', false ] },
          }
        }
      }
    },
    {
      $project: {
        minCount: 1,
        discounted: 1,
        pricing: {
          $map: {
            input: '$pricing',
            as: 'p',
            in: {
              fromCount: '$$p.fromCount',
              bonus: '$$p.bonus',
              discount: '$$p.discount'
            }
          }
        }
      }
    }
  ];
  const list = await _this.aggregate(aggregation);
  return list[0];
};

schema.statics.getMainList = async function(filter: any, language: number, skip: number = null, limit: number = null): Promise<any[]> {
  const _this: IProductModel = this;
  const aggregation: any[] = [
    {
      $match: filter
    },
    {
      $project: {
        _id: 1,
        translations: 1,
        type: 1,
        preparingDayCount: 1,
        minCount : 1,
        defaultPrice: 1,
        image: { $arrayElemAt: ['$images', 0] },
        versions: 1,
        discounted: discountCondition
      }
    },
    {
      $lookup: {
        from: 'producttranslations',
        localField: 'translations',
        foreignField: '_id',
        as: 'translations'
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
        name: '$translations.name',
        type: 1,
        preparingDayCount: 1,
        minCount : 1,
        defaultPrice: 1,
        image: 1,
        versions: 1,
        discounted: 1
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
        path: '$image'
      }
    },
    {
      $project: {
        _id: 1,
        name: 1,
        type: 1,
        preparingDayCount: 1,
        minCount : 1,
        defaultPrice: 1,
        imagePath: {
          $cond: {
            if: '$image.path',
            then: { $concat: [ mainConfig.BASE_URL, '$image.path' ] },
            else: null
          }
        },
        discounted: 1,
        versions: 1
      }
    },
    {
      $lookup: {
        from: 'productpricings',
        localField: '_id',
        foreignField: 'product',
        as: 'pricing'
      }
    },
    {
      $project: {
       _id: 1,
        name: 1,
        type: 1,
        preparingDayCount: 1,
        minCount : 1,
        defaultPrice: 1,
        imagePath: 1,
        versions: 1,
        discounted: 1,
        pricing: {
          $filter: {
            input: '$pricing',
            as: 'p',
            cond: {
              $and: [
                { $eq: [ '$$p.deleted', false ] },
                { $eq: [ '$$p.fromCount', '$minCount' ] }
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
        type: 1,
        preparingDayCount: 1,
        defaultPrice: 1,
        imagePath: 1,
        versions: 1,
        discounted: 1,
        pricing: {
          $cond: {
            if: { $arrayElemAt: [ '$pricing', 0 ] },
            then: { $arrayElemAt: [ '$pricing', 0 ] },
            else: null
          }
        }
      }
    }
  ];
  if (skip) aggregation.push({ $skip: skip });
  if (limit) aggregation.push({ $limit: limit });
  const list = await _this.aggregate(aggregation);
  const itemList = await Promise.all(list.map(async item => {
    const hasVersions = !!item.versions.length;
    if (hasVersions) {
      const range = await ProductVersionSchema.getPriceRange({ _id: { $in: item.versions }, hidden: false, deleted: false });
      const returnObj: any = {
        _id : item._id,
        hasVersions,
        type              : item.type,
        preparingDayCount : item.preparingDayCount,
        name              : item.name,
        imagePath         : item.imagePath,
        defaultPrice      : range.minPrice,
        discount          : item.pricing && item.discounted && item.pricing.discount ? item.pricing.discount : null,
        bonus             : item.pricing && item.pricing.bonus ? item.pricing.bonus : null,
      };
      returnObj.bonusAmount = returnObj.bonus ? Math.round((range.maxPrice * returnObj.bonus) / 100) : null;
      returnObj.discountedPrice = returnObj.discount ? getDiscountedPrice(range.minPrice, returnObj.discount) : null;
      return returnObj;
    } else {
      const returnObj: any = {
        _id : item._id,
        hasVersions,
        type              : item.type,
        preparingDayCount : item.preparingDayCount,
        name              : item.name,
        imagePath         : item.imagePath,
        defaultPrice      : item.defaultPrice,
        discount          : item.pricing && item.discounted && item.pricing.discount ? item.pricing.discount : null,
        bonus             : item.pricing && item.pricing.bonus ? item.pricing.bonus : null,
      };
      returnObj.bonusAmount = returnObj.bonus ? Math.round((item.defaultPrice * returnObj.bonus) / 100) : null;
      returnObj.discountedPrice = returnObj.discount ? getDiscountedPrice(item.defaultPrice, returnObj.discount) : null;
      return returnObj;
    }
  }));
  return itemList;
};

schema.statics.popCategory = async function(categoryId: string): Promise<void> {
  const _this: IProductModel = this;
  const productList = await _this.find({ categories: categoryId });
  const categoryString = categoryId.toString();
  await Promise.all(productList.map(async item => {
    const categories = item.categories.map(item => item.toString());
    const index = categories.indexOf(categoryString);
    if (index > -1) {
      categories.splice(index, 1);
      let mainCategoryIds = await Promise.all(categories.map(async id => {
        const mainId = await CategorySchema.getMainCategory(id);
        return mainId.toString();
      }));
      mainCategoryIds = mainCategoryIds.filter((value, index, self) => {
        return self.indexOf(value) === index;
      });
      item.mainCategories = mainCategoryIds;
    }
    item.categories = categories;
    await item.save();
  }));
};

schema.statics.countMainList = async function(filter: any, language: number, secondFilter: any = null): Promise<any> {
  let lastFilter: any = {};
  if (secondFilter) {
    const { priceFrom, priceTo, minBonus, maxDiscount } = secondFilter;
    if (priceFrom && priceTo) {
      lastFilter = {
        $and: [
          { minPrice: { $gte: priceFrom } },
          { minPrice: { $lte: priceTo } }
        ]
      };
    } else if (priceFrom && !priceTo) {
      lastFilter = {
        minPrice: { $gte: priceFrom }
      };
    } else if (priceTo && !priceFrom) {
      lastFilter = {
        minPrice: { $lte: priceTo }
      };
    }
    if (minBonus) lastFilter.minBonus = minBonus;
    if (maxDiscount) lastFilter.maxDiscount = maxDiscount;
  }
  const _this: IProductModel = this;
  const aggregation = getAggregationForMainList(filter, language);
  if (lastFilter) {
    aggregation.push({ $match: lastFilter });
  }
  // aggregation.push({ $count: 'count' });
  const list = await _this.aggregate(aggregation);
  return list.length;
};

schema.statics.getMainListByFilter = async function(filter: any, language: number, sort: any = null, secondFilter: any = null, skip: number = null, limit: number = null): Promise<any[]> {
  const _this: IProductModel = this;
  let lastFilter: any = {};
  if (secondFilter) {
    const { priceFrom, priceTo, minBonus, maxDiscount } = secondFilter;
    if (priceFrom && priceTo) {
      lastFilter = {
        $and: [
          { minPrice: { $gte: priceFrom } },
          { minPrice: { $lte: priceTo } }
        ]
      };
    } else if (priceFrom && !priceTo) {
      lastFilter = {
        minPrice: { $gte: priceFrom }
      };
    } else if (priceTo && !priceFrom) {
      lastFilter = {
        minPrice: { $lte: priceTo }
      };
    }
    if (minBonus) lastFilter.minBonus = minBonus;
    if (maxDiscount) lastFilter.maxDiscount = maxDiscount;
  }
  const aggregation = getAggregationForMainList(filter, language);
  if (lastFilter) {
    aggregation.push({ $match: lastFilter });
  }
  if (sort) aggregation.push({ $sort: sort });
  if (skip) aggregation.push({ $skip: skip });
  if (limit) aggregation.push({ $limit: limit });
  const list = await _this.aggregate(aggregation).option({ allowDiskUse: true });
  return list;
};

schema.statics.getMainListRange = async function(filter: any, secondFilter?: any): Promise<any> {
  const _this: IProductModel = this;
  const lastFilter: any = {};
  if (secondFilter) {
    const { minBonus, maxDiscount } = secondFilter;
    if (minBonus) lastFilter.minBonus = minBonus;
    if (maxDiscount) lastFilter.maxDiscount = maxDiscount;
  }
  const aggregation = getAggregationForMainList(filter, LanguageEnum.en);
  if (lastFilter) {
    aggregation.push({ $match: lastFilter });
  }
  aggregation.push({
    $project: {
      id: 1,
      minPrice: 1,
      maxPrice: 1
    }
  });
  aggregation.push({
    $group: {
      _id: '$id',
      minPrice: { $min: '$minPrice' },
      maxPrice: { $max: '$maxPrice' },
    }
  });
  const list = await _this.aggregate(aggregation).option({ allowDiskUse: true });
  return list[0];
  // return aggregation;
};

schema.statics.getRandomImages = async function (filter: any): Promise<string[]> {
  const _this: IProductModel = this;
  const aggregation = [
    {
      $match: filter
    },
    {
      $project: {
        image: { $arrayElemAt: [ '$images', 0] }
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
        path: '$image'
      }
    },
    {
      $sample: { size: 4 }
    },
    {
      $project: {
        image: { $concat: [ mainConfig.BASE_URL, '$image.path' ] }
      }
    }
  ];
  const list = await _this.aggregate(aggregation);
  return list.map(item => item.image);
};

schema.statics.getSimilarList = async function(filter: any, language: number, count: number): Promise<any[]> {
  const _this: IProductModel = this;
  const aggregation = getAggregationForMainList(filter, language);
  aggregation.push({ $sample: { size: count } });
  const list = await _this.aggregate(aggregation);
  return list;
};

schema.statics.getIdListByOptionName = async function(key: string) {
  const optionIdList = await OptionTranslationSchema.find({ name: new RegExp(key, 'i') }).distinct('option');
  const productIdList = await ProductVersionSchema.find({
    deleted: false,
    hidden: false,
    attributes: {
      $elemMatch: {
        option: { $in: optionIdList }
      }
    }
  }).distinct('product');
  return productIdList;
};

schema.statics.newCountByDateRange = async function (body: { dateFrom: Date, dateTo: Date }): Promise<number> {
  const _this: IProductModel = this;
  const filter: any = {
    deleted: false,
    status: { $nin: [ ProductStatusEnum.preparing ] },
    createdDt: {
      $gt: new Date(body.dateFrom)
    }
  };
  if (body.dateTo) {
    filter.createdDt.$lt = new Date(body.dateTo);
  }
  return await _this.countDocuments(filter);
};
export const product: IProductModel = mongoose.model<IProduct<any, any, any, any, any, any, any, any, any>, IProductModel>(schemaReferences.product, schema);
export default product;

function getDiscountedPrice(price: number, discount: number) {
  let discountedPrice = price - (Math.round((price * discount) / 100));
  const pre = discountedPrice % 10;
  if (pre >= 5) {
    discountedPrice += (10 - pre);
  } else {
    discountedPrice -= pre;
  }
  return discountedPrice;
}

function getAggregationForMainList(filter: any, language: number) {
  const aggregation: any[] = [
    {
      $match: filter
    },
    {
      $project: {
        _id: 1,
        translations: 1,
        type: 1,
        minCount : 1,
        defaultPrice: 1,
        createdDt: 1,
        boughtCount: 1,
        images: 1,
        versions: 1,
        discounted: discountCondition
      }
    },
    {
      $lookup: {
        from: 'producttranslations',
        as: 'translations',
        localField: 'translations',
        foreignField: '_id',
        // unwinding: { preserveNullAndEmptyArrays: false }
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
        name: '$translations.name',
        type: 1,
        createdDt: 1,
        boughtCount: 1,
        minCount : 1,
        defaultPrice: 1,
        images: 1,
        versions: 1,
        discounted: 1
      }
    },
    {
      $lookup: {
        from: 'files',
        localField: 'images',
        foreignField: '_id',
        as: 'images'
      }
    },
    {
      $project: {
        _id: 1,
        name: 1,
        type: 1,
        minCount : 1,
        createdDt: 1,
        boughtCount: 1,
        defaultPrice: 1,
        image: { $arrayElemAt: ['$images', 0] },
        discounted: 1,
        versions: 1
      }
    },
    {
      $project: {
        _id: 1,
        name: 1,
        type: 1,
        minCount : 1,
        createdDt: 1,
        boughtCount: 1,
        defaultPrice: 1,
        imagePath: {
          $cond: {
            if: '$image.path',
            then: { $concat: [ mainConfig.BASE_URL, '$image.path', '/300/300' ] },
            else: null
          }
        },
        discounted: 1,
        versions: 1
      }
    },
    {
      $lookup: {
        from: 'productpricings',
        localField: '_id',
        foreignField: 'product',
        as: 'pricing'
      }
    },
    {
      $project: {
        _id: 1,
        name: 1,
        type: 1,
        minCount : 1,
        defaultPrice: 1,
        createdDt: 1,
        boughtCount: 1,
        imagePath: 1,
        versions: 1,
        discounted: 1,
        pricing: {
          $filter: {
            input: '$pricing',
            as: 'p',
            cond: {
              $eq: [ '$$p.deleted', false ]
            }
          }
        }
      }
    },
    {
      $project: {
        _id: 1,
        name: 1,
        type: 1,
        minCount : 1,
        defaultPrice: 1,
        createdDt: 1,
        boughtCount: 1,
        imagePath: 1,
        versions: 1,
        discounted: 1,
        pricing: {
          $map: {
            input: '$pricing',
            as: 'p',
            in: {
              product: '$$p.product',
              fromCount: '$$p.fromCount',
              discount: {
                $cond: {
                  if: { $eq: ['$$p.discount', null] },
                  then: 0,
                  else: '$$p.discount'
                }
              },
              bonus: '$$p.bonus',
              deleted: '$$p.deleted'
            }
          }
        }
      }
    },
    {
      $project: {
        _id: 1,
        name: 1,
        type: 1,
        defaultPrice: 1,
        imagePath: 1,
        versions: 1,
        minCount : 1,
        discounted: 1,
        createdDt: 1,
        boughtCount: 1,
        pricing: 1,
        minPricing: {
          $filter: {
            input: '$pricing',
            as: 'p',
            cond: {
              $eq: [ '$$p.fromCount', '$minCount' ]
            }
          }
        }
      }
    },
    {
      $project: {
        _id: 1,
        name: 1,
        type: 1,
        defaultPrice: 1,
        imagePath: 1,
        versions: 1,
        createdDt: 1,
        boughtCount: 1,
        discounted: 1,
        pricing: 1,
        minPricing: {
          $cond: {
            if: { $arrayElemAt: [ '$minPricing', 0 ] },
            then: { $arrayElemAt: [ '$minPricing', 0 ] },
            else: null
          }
        }
      }
    },
    {
      $unwind: {
        path: '$pricing',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $group: {
        _id: '$_id',
        name: { $first: '$name' },
        type: { $first: '$type' },
        createdDt: { $first: '$createdDt' },
        boughtCount: { $first: '$boughtCount' },
        defaultPrice: { $first: '$defaultPrice' },
        imagePath: { $first: '$imagePath' },
        versions: { $first: '$versions' },
        discounted: { $first: '$discounted' },
        minPricing: { $first: '$minPricing' },
        minBonus: { $min: '$pricing.bonus' },
        maxBonus: { $max: '$pricing.bonus' },
        maxDiscount: { $max: '$pricing.discount' },
        minDiscount: { $min: '$pricing.discount' }
      }
    },
    {
      $lookup: {
        from: 'productversions',
        foreignField: '_id',
        localField: 'versions',
        as: 'versions'
      }
    },
    {
      $project: {
        _id: 1,
        name: 1,
        type: 1,
        defaultPrice: 1,
        imagePath: 1,
        discounted: 1,
        minPricing: 1,
        createdDt: 1,
        boughtCount: 1,
        minBonus: 1,
        maxBonus: 1,
        maxDiscount: 1,
        minDiscount: 1,
        versionLength: { $size: '$versions' },
        versions: {
          $filter: {
            input: '$versions',
            as: 'v',
            cond: {
              $and: [
                { $eq: [ '$$v.deleted', false ] },
                { $eq: [ '$$v.hidden', false ] }
              ]
            }
          }
        }
      }
    },
    {
      $unwind: {
        path: '$versions',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $group: {
        _id: '$_id',
        name: { $first: '$name' },
        type: { $first: '$type' },
        defaultPrice: { $first: '$defaultPrice' },
        imagePath: { $first: '$imagePath' },
        discounted: { $first: '$discounted' },
        versionLength: { $first: '$versionLength' },
        minPricing: { $first: '$minPricing' },
        minBonus: { $first: '$minBonus' },
        createdDt: { $first: '$createdDt' },
        boughtCount: { $first: '$boughtCount' },
        maxBonus: { $first: '$maxBonus' },
        maxDiscount: { $first: '$maxDiscount' },
        minDiscount: { $first: '$minDiscount' },
        minPrice: { $min: '$versions.price' },
        maxPrice: { $max: '$versions.price' }
      }
    },
    {
      $project: {
        _id: 1,
        name: 1,
        type: 1,
        preparingDayCount: 1,
        defaultPrice: 1,
        imagePath: 1,
        discounted: 1,
        createdDt: 1,
        boughtCount: 1,
        minPricing:  {
          $cond: {
            if: { $or: [
              { $eq: ['$minPricing', null ] },
              { $eq: ['$minPricing.discount', 0 ] },
            ]},
            then: null,
            else: '$minPricing'
          }
        },
        minBonus: 1,
        maxBonus: 1,
        maxDiscount: 1,
        minDiscount: 1,
        minPrice: {
          $cond: {
            if: '$minPrice',
            then: '$minPrice',
            else: '$defaultPrice'
          }
        },
        maxPrice: {
          $cond: {
            if: '$maxPrice',
            then: '$maxPrice',
            else: '$defaultPrice'
          }
        },
        hasVersions: { $gt: [ '$versionLength', 0 ] }
      }
    },
    {
      $project: {
        _id: 1,
        name: 1,
        type: 1,
        preparingDayCount: 1,
        imagePath: 1,
        discounted: 1,
        defaultPrice: 1,
        createdDt: 1,
        boughtCount: 1,
        minPricing: 1,
        minBonus: 1,
        maxBonus: 1,
        maxDiscount: 1,
        minDiscount: 1,
        minPrice: 1,
        maxPrice: 1,
        multipliedMinPrice: {
          $cond: {
            if: '$minPricing',
            then: { $multiply: ['$minPrice', '$minPricing.discount'] },
            else: null
          }
        },
        multipliedMaxPrice: {
          $cond: {
            if: '$minPricing',
            then: { $multiply: ['$maxPrice', '$minPricing.discount'] },
            else: null
          }
        },
        hasVersions: 1
      }
    },
    {
      $project: {
        _id: 1,
        name: 1,
        type: 1,
        preparingDayCount: 1,
        defaultPrice: 1,
        imagePath: 1,
        discounted: 1,
        createdDt: 1,
        boughtCount: 1,
        minBonus: 1,
        maxBonus: 1,
        maxDiscount: 1,
        minDiscount: 1,
        minPrice: 1,
        maxPrice: 1,
        minPricing: 1,
        minPriceDiscount: {
          $cond: {
            if: { $eq: ['$multipliedMinPrice', null] },
            then: null,
            else: { $divide: ['$multipliedMinPrice', 100] }
          }
        },
        maxPriceDiscount: {
          $cond: {
            if: { $eq: ['$multipliedMaxPrice', null] },
            then: null,
            else: { $divide: ['$multipliedMaxPrice', 100] },
          }
        },
        hasVersions: 1
      }
    },
    {
      $project: {
        _id: 1,
        name: 1,
        type: 1,
        imagePath: 1,
        discounted: {
          $cond: {
            if: {
              $or: [ { $eq: ['$minPriceDiscount', null] }, { $eq: ['$maxPriceDiscount', null] } ]
            },
            then: false,
            else: true
          }
        },
        minBonus: 1,
        maxBonus: 1,
        createdDt: 1,
        boughtCount: 1,
        maxDiscount: 1,
        sameDiscount: {
          $and: [
            { $not: [ { $eq: ['$minPricing', null] } ] },
            { $eq: ['$minPricing.discount', '$maxDiscount'] },
            { $eq: ['$maxDiscount', '$minDiscount'] }
          ]
        },
        minPrice: {
          $cond: {
            if: { $eq: ['$minPriceDiscount', null] },
            then: round('$minPrice'),
            else: round({ $subtract: ['$minPrice', '$minPriceDiscount'] }),
          }
        },
        maxPrice: {
          $cond: {
            if: { $eq: ['$maxPriceDiscount', null] },
            then: round('$maxPrice'),
            else: round({ $subtract: ['$maxPrice', '$maxPriceDiscount'] }),
          }
        },
        hasVersions: 1
      }
    }
  ];
  return aggregation;
}

function round(valueExpression: any, decimals: number = 0) {
	const multiplier = Math.pow(10, decimals);
	if (multiplier === 1) { // zero decimals
		return {
			$let: {
				vars: {
					valAdjusted: {
						$add: [
							valueExpression,
							{$cond: [{$gte: [valueExpression, 0]}, 0.5, -0.5]}
						]
					}
				},
				in: {
					$subtract: ['$$valAdjusted', {$mod: ['$$valAdjusted', 1]}]
				}
			}
		};
	}

	return {
		$let: {
			vars: {
				valAdjusted: {
					$add: [
						{$multiply: [valueExpression, multiplier]},
						{$cond: [{$gte: [valueExpression, 0]}, 0.5, -0.5]}
					]
				}
			},
			in: {
				$divide: [
					{$subtract: ['$$valAdjusted', {$mod: ['$$valAdjusted', 1]}]},
					multiplier
				]
			}
		}
	};
}