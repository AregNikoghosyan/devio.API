import * as mongoose from 'mongoose';
import { schemaReferences } from '../../constants/constants';
import { IPromotionModel, IPromotion } from './model';

import PromotionTranslationSchema from '../promotionTranslation';
import { LanguageEnum } from '../../constants/enums';
import mainConfig from '../../env';
import { ObjectID } from 'bson';
import { IProduct } from '../product/model';
import { ICategory } from '../category/model';
import { checkVisibility } from '../../api/product/service';

const Schema = mongoose.Schema;

const schema = new Schema({
  position: {
    type: Number,
    required: true,
  },
  type: {
    type: Number,
    required: true
  },
  translations: [{
    type : Schema.Types.ObjectId,
    ref  : schemaReferences.promotionTranslation
  }],
  cover: {
    type    : String,
    default : null
  },
  product: {
    type    : Schema.Types.ObjectId,
    ref     : schemaReferences.product,
    default : null
  },
  category: {
    type: Schema.Types.ObjectId,
    ref: schemaReferences.category,
    default: null
  },
  hidden: {
    type: Boolean,
    default: false
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

schema.statics.bulkDelete = async function(idList: string[]) {
  const _this: IPromotionModel = this;
  await Promise.all([
    await _this.deleteMany({ _id: { $in: idList } }),
    await PromotionTranslationSchema.deleteMany({ promotion: { $in: idList } })
  ]);
  const newList = await _this.find({}).sort({ position: 1 });
  for (let i = 0; i < newList.length; i++) {
    newList[i].position = i + 1;
    await newList[i].save();
  }
};

schema.statics.getListForAdmin = async function(skip: number, limit: number, language: number) {
  const _this: IPromotionModel = this;
  const aggregation: any = [
    {
      $lookup: {
        from: 'promotiontranslations',
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
        cover: {
          $concat: [ mainConfig.BASE_URL, '$cover' ]
        },
        hidden: 1,
        position: 1,
        updatedDt: 1,
        name: '$translations.name',
      }
    }
  ];
  if (skip) aggregation.push({ $skip: skip });
  if (limit) aggregation.push({ $limit: limit });
  aggregation.push({ $sort: { position: 1 } });
  const list = await _this.aggregate(aggregation);
  return await Promise.all(list.map(async item => {
    return {
      ...item,
      changeable: await _this.isValidToShow(item._id)
    };
  }));
};

schema.statics.getDetailsForAdmin = async function(id: string) {
  const _this: IPromotionModel = this;
  const aggregation: any = [
    {
      $match: {
        _id: new ObjectID(id)
      }
    },
    {
      $lookup: {
        from: 'promotiontranslations',
        localField: 'translations',
        foreignField: '_id',
        as: 'translations'
      }
    },
    {
      $project: {
        _id: 1,
        type: 1,
        cover: { $concat: [ mainConfig.BASE_URL, '$cover' ] },
        product: 1,
        category: 1,
        position: 1,
        'translations.language': 1,
        'translations.name': 1
      }
    },
    {
      $lookup: {
        from: 'categorytranslations',
        localField: 'category',
        foreignField: 'category',
        as: 'categoryTranslations'
      }
    },
    {
      $unwind: {
        path: '$categoryTranslations',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $match: {
        $or: [
          { category: null },
          { 'categoryTranslations.language': LanguageEnum.en }
        ]
      }
    },
    {
      $project: {
        _id: 1,
        type: 1,
        cover: 1,
        product: 1,
        category: 1,
        categoryName: { $cond: { if: { $eq: ['$category', null] }, then: null, else: '$categoryTranslations.name' } },
        position: 1,
        'translations.language': 1,
        'translations.name': 1
      }
    },
    {
      $lookup: {
        from: 'producttranslations',
        localField: 'product',
        foreignField: 'product',
        as: 'productTranslations'
      }
    },
    {
      $unwind: {
        path: '$productTranslations',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $match: {
        $or: [
          { product: null },
          { 'productTranslations.language': LanguageEnum.en }
        ]
      }
    },
    {
      $project: {
        _id: 1,
        type: 1,
        cover: 1,
        product: 1,
        category: 1,
        categoryName: 1,
        position: 1,
        translations: 1,
        productName: { $cond: { if: { $eq: ['$product', null] }, then: null, else: '$productTranslations.name' } },
      }
    },
    {
      $lookup: {
        from: 'files',
        localField: 'product',
        foreignField: 'product',
        as: 'productImages'
      }
    },
    {
      $project: {
        _id: 1,
        type: 1,
        cover: 1,
        product: 1,
        category: 1,
        categoryName: 1,
        position: 1,
        translations: 1,
        productName: 1,
        productImage: {
          $cond: {
            if: { $eq: ['$product', null] },
            then: null,
            else: { $arrayElemAt: [ '$productImages', 0 ] }
          }
        }
      }
    },
    {
      $project: {
        _id: 1,
        type: 1,
        cover: 1,
        category: 1,
        categoryName: 1,
        position: 1,
        translations: 1,
        product: 1,
        productName: 1,
        productImage: {
          $cond: {
            if: '$productImage',
            then: { $concat: [ mainConfig.BASE_URL, '$productImage.path' ] },
            else: null
          }
        }
      }
    }
  ];
  const list = await _this.aggregate(aggregation);
  return list[0];
};

schema.statics.getListForAll = async function(filter: any, language: number, skip: number, limit: number) {
  const _this: IPromotionModel = this;
  const aggregation: any[] = [
    {
      $match: filter
    },
    {
      $sort: {
        position: 1
      }
    },
    {
      $lookup: {
        from: 'promotiontranslations',
        localField: '_id',
        foreignField: 'promotion',
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
        cover: { $concat: [ mainConfig.BASE_URL, '$cover' ] },
        type: 1,
        product: 1,
        category: 1,
        name: '$translations.name'
      }
    }
  ];
  if (skip) aggregation.push({ $skip: skip });
  if (limit) aggregation.push({ $limit: limit });
  const list = await _this.aggregate(aggregation);
  return shuffle(list);
};

schema.statics.productGoneInvisible = async function(productId: string): Promise<void> {
  const _this: IPromotionModel = this;
  await _this.updateMany({
    product: productId
  }, { hidden: true });
};

schema.statics.isValidToShow = async function(id: string): Promise<boolean> {
  const _this: IPromotionModel = this;
  const promotion: IPromotion<string, IProduct, ICategory> = await _this.findOne({ _id: id }).populate('product category');
  if (!promotion) return false;
  if (promotion.product) {
    if (!checkVisibility(promotion.product)) return false;
  } else if (promotion.category) {
    if (promotion.category.visibleItemCount <= 0 && promotion.category.visibleItemCountInSub <= 0) return false;
  }
  return true;
};

schema.statics.updateVisibility = async function(categoryIdList: string[]): Promise<void> {
  const _this: IPromotionModel = this;
  const list = await _this.find({ category: { $in: categoryIdList } });
  await Promise.all(list.map(async item => {
    const isVisible = await _this.isValidToShow(item._id);
    if (!isVisible) {
      item.hidden = true;
      await item.save();
    }
  }));
};


const promotion: IPromotionModel = mongoose.model<IPromotion<any, any, any>, IPromotionModel>(schemaReferences.promotion, schema);
export default promotion;

function shuffle(array: any[]) {
  let currentIndex = array.length, temporaryValue, randomIndex;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}