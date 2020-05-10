import * as mongoose from 'mongoose';
import { schemaReferences } from '../../constants/constants';
import { ICategoryModel, ICategory } from './model';

import CategoryTranslateSchema from '../categoryTranslation';
import ProductSchema           from '../product';
import ProductVersionSchema    from '../productVersion';
import AttributeSchema         from '../attribute';
import PromotionSchema         from '../promotion';
import FileSchema              from '../file';

import mainConfig from '../../env';
import { deleteFiles } from '../../services/fileManager';
import { ObjectID } from 'bson';
import { ProductStatusEnum } from '../../constants/enums';

const Schema = mongoose.Schema;

const schema = new Schema({
  icon: {
    type    : String,
    default : null
  },
  cover: {
    type    : String,
    default: null
  },
  translations: [{
    type : Schema.Types.ObjectId,
    ref  : schemaReferences.categoryTranslation
  }],
  pid: {
    type    : Schema.Types.ObjectId,
    ref     : schemaReferences.category,
    default : null
  },
  subCategoryCount: {
    type    : Number,
    default : 0
  },
  itemCount: {
    type    : Number,
    default : 0
  },
  itemCountInSub: {
    type    : Number,
    default : 0
  },
  visibleItemCount: {
    type: Number,
    default: 0
  },
  visibleItemCountInSub: {
    type: Number,
    default: 0
  },
  isHidden: {
    type    : Boolean,
    default : false
  },
  position: {
    type     : Number,
    required : true
  },
  url: {
    type     : String,
    default  : null
  },
  createdDt: {
    type    : Date,
    default : Date.now
  },
  updatedDt: {
    type    : Date,
    default : Date.now
  },
  deleted: {
    type: Boolean,
    default: false
  }
});

schema.index({ 'pid': -1 });

schema.pre('save', async function(next) {
  const _this: any = this;
  if (!_this.isNew) {
    _this.updatedDt = Date.now();
    next();
  }
});

schema.statics.bulkDelete = async function (id: string): Promise<void> {
  const _this: ICategoryModel = this;
  const category = await _this.findById(id);
  if (category) {
    if (category.itemCount > 0) {
      await detachCategoryFromProducts(_this, category);
    } else if (category.subCategoryCount > 0) {
      let subList = await getSubIdList(_this, category._id);
      subList = subList.map(item => item.toString());
      const index = subList.indexOf(id);
      if (index > -1) subList.splice(index, 1);
      for (let i = 0; i < subList.length; i++) {
        await _this.bulkDelete(subList[i]);
      }
    }
    category.deleted = true;
    category.url = null;
    await Promise.all([
      await category.save(),
      await _this.updateMany({ position: { $gt: category.position }, deleted: false, pid: category.pid }, { $inc: { position: -1 } }),
      await _this.updateOne({ _id: category.pid }, { $inc: { subCategoryCount: -1 } })
    ]);
    if (category.icon) {
      deleteFiles([ category.icon ], true);
    }
    if (category.cover) {
      deleteFiles([ category.cover ], true);
    }
    const [promotionIdList, attributeIdList] = await Promise.all([
      await PromotionSchema.find({ category: id }).distinct('_id'),
      await AttributeSchema.find({ category: id }).distinct('_id')
    ]);
    AttributeSchema.bulkDelete(attributeIdList).catch(e => console.log(e));
    PromotionSchema.bulkDelete(promotionIdList).catch(e => console.log(e));
  }
};

schema.statics.getListForAdmin = async function(filter: any, language: number) {
  const _this: ICategoryModel = this;
  const aggregation: any[] = [
    {
      $match: filter
    },
    {
      $project: {
        _id: 1,
        icon: 1,
        translations: 1,
        itemCount: 1,
        subCategoryCount: 1,
        url: 1,
        position: 1
      }
    },
    {
      $lookup: {
        from: 'categorytranslations',
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
        icon: { $concat: [ mainConfig.BASE_URL, '$icon' ] },
        name: '$translations.name',
        itemCount: 1,
        subCategoryCount: 1,
        url: 1,
        position: 1
      }
    },
    {
      $sort: { position: 1 }
    }
  ];
  const list = await _this.aggregate(aggregation);
  return list;
};

schema.statics.getListByLanguage = function(filter: any, language: number, skip: number = null, limit: number = null) {
  const _this: ICategoryModel = this;
  const aggregation: any[] = [
    {
      $match: filter
    },
    {
      $project: {
        _id: 1,
        icon: 1,
        translations: 1,
        itemCount: 1,
        subCategoryCount: 1,
        url: 1,
        position: 1
      }
    },
    {
      $lookup: {
        from: 'categorytranslations',
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
        icon: { $concat: [ mainConfig.BASE_URL, '$icon' ] },
        name: '$translations.name',
        // itemCount: 1,
        // subCategoryCount: 1,
        // url: 1,
        position: 1
      }
    },
    {
      $sort: { position: 1 }
    }
  ];
  if (skip) aggregation.push({ $skip: skip });
  if (limit) aggregation.push({ $limit: limit });
  const list = _this.aggregate(aggregation);
  return list;
};

schema.statics.getNameByLanguage = async function(id: string, language: number): Promise<string> {
  const translation = await CategoryTranslateSchema.findOne({ category: id, language });
  if (translation) return translation.name;
  else return null;
};

schema.statics.getMainCategory = async function(id: string): Promise<string> {
  const _this: ICategoryModel = this;
  const category = await _this.findById(id);
  if (!category.pid) return category._id;
  else return _this.getMainCategory(category.pid);
};

schema.statics.incrementItemCounters = async function(idList: string[]): Promise<void> {
  const mainList = await getAllParents(idList);
  await Promise.all([
    await category.updateMany({ _id: { $in: idList } }, { $inc: { itemCount: 1 } }),
    await category.updateMany({ _id: { $in: mainList } }, { $inc: { itemCountInSub: 1 } })
  ]);
};

schema.statics.decrementItemCounters = async function(idList: string[]): Promise<void> {
  const mainList = await getAllParents(idList);
  await Promise.all([
    await category.updateMany({ _id: { $in: idList } }, { $inc: { itemCount: -1 } }),
    await category.updateMany({ _id: { $in: mainList } }, { $inc: { itemCountInSub: -1 } })
  ]);
};

schema.statics.incrementVisibleCounters = async function(idList: string[]): Promise<void> {
  const mainList = await getAllParents(idList);
  await Promise.all([
    await category.updateMany({ _id: { $in: idList } }, { $inc: { visibleItemCount: 1 } }),
    await category.updateMany({ _id: { $in: mainList } }, { $inc: { visibleItemCountInSub: 1 } }),
    await PromotionSchema.updateVisibility([ ...idList, ...mainList ])
  ]);
};

schema.statics.decrementVisibleCounters = async function(idList: string[]): Promise<void> {
  const mainList = await getAllParents(idList);
  await Promise.all([
    await category.updateMany({ _id: { $in: idList } }, { $inc: { visibleItemCount: -1 } }),
    await category.updateMany({ _id: { $in: mainList } }, { $inc: { visibleItemCountInSub: -1 } }),
    await PromotionSchema.updateVisibility([ ...idList, ...mainList ])
  ]);
};

schema.statics.incrementBothCounters = async function(idList: string[]): Promise<void> {
  const mainList = await getAllParents(idList);
  await Promise.all([
    await category.updateMany({ _id: { $in: idList } }, { $inc: { visibleItemCount: 1, itemCount: 1 } }),
    await category.updateMany({ _id: { $in: mainList } }, { $inc: { visibleItemCountInSub: 1, itemCountInSub: 1 } }),
    await PromotionSchema.updateVisibility([ ...idList, ...mainList ])
  ]);
};

schema.statics.decrementBothCounters = async function(idList: string[]): Promise<void> {
  const mainList = await getAllParents(idList);
  await Promise.all([
    await category.updateMany({ _id: { $in: idList } }, { $inc: { visibleItemCount: -1, itemCount: -1 } }),
    await category.updateMany({ _id: { $in: mainList } }, { $inc: { visibleItemCountInSub: -1, itemCountInSub: -1 } }),
    await PromotionSchema.updateVisibility([ ...idList, ...mainList ])
  ]);
};

schema.statics.getAllParents = async function(idList: string[]): Promise<string[]> {
  const list = await getAllParents(idList);
  return list;
};

schema.statics.getListForDevice = async function(filter: any, language: number): Promise<any[]> {
  const _this: ICategoryModel = this;
  const aggregation: any[] = [
    {
      $match: filter
    },
    {
      $project: {
        _id: 1,
        icon: 1,
        cover: 1,
        translations: 1,
        itemCount: 1,
        subCategoryCount: 1,
        position: 1
      }
    },
    {
      $lookup: {
        from: 'categorytranslations',
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
        cover: 1,
        icon: { $concat: [ mainConfig.BASE_URL, '$icon' ] },
        name: '$translations.name',
        itemCount: 1,
        subCategoryCount: 1,
        position: 1
      }
    },
    {
      $sort: { position: 1 }
    }
  ];
  const list = _this.aggregate(aggregation);
  return list;
};

schema.statics.getSubIdList = async function(id: string): Promise<string[]> {
  const list = getSubIdList(this, id);
  return list;
};

schema.statics.getHomeTree = async function(language: number): Promise<any[]> {
  const _this: ICategoryModel = this;
  const idList = await _this.find({
    deleted: false,
    isHidden: false,
    visibleItemCount: { $gt: 0 }
  }).distinct('_id');
  const aggregation = [
    {
      $match: {
        _id: { $in: idList.map(item => new ObjectID(item)) },
        isHidden: false,
        deleted: false
      }
    },
    {
      $group: {
        _id: '$pid',
        itemCount: { $sum: '$itemCount' },
        createdDt: { $first: '$createdDt' },
        subIdList: { $push: '$_id' }
      }
    },
    {
      $sort: {
        itemCount: -1,
        createdDt: -1
      }
    },
    {
      $project: {
        _id: 1,
        subIdList: 1
      }
    },
    {
      $limit: 5
    },
    {
      $lookup: {
        from: 'categorytranslations',
        localField: '_id',
        foreignField: 'category',
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
        subIdList: 1,
        name: '$translations.name'
      }
    },
    {
      $unwind: '$subIdList'
    },
    {
      $lookup: {
        from: 'categorytranslations',
        localField: 'subIdList',
        foreignField: 'category',
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
        subIdList: 1,
        name: 1,
        subName: '$translations.name',
      }
    },
    {
      $lookup: {
        from: 'categories',
        localField: 'subIdList',
        foreignField: '_id',
        as: 'subCategory'
      }
    },
    {
      $unwind: '$subCategory'
    },
    {
      $project: {
        _id: 1,
        subIdList: 1,
        name: 1,
        subName: 1,
        subItemCount: '$subCategory.itemCount'
      }
    },
    {
      $sort: {
        subItemCount: -1
      }
    },
    {
      $group: {
        _id: '$_id',
        name: { $first: '$name' },
        itemList: {
          $push: {
            _id: '$subIdList',
            name: '$subName',
            itemCount: '$subItemCount'
          }
        },
        itemCount: { $sum: '$subItemCount' }
      }
    },
    {
      $sort: { itemCount: -1 }
    },
    {
      $project: {
        _id: 1,
        name: 1,
        itemList: { $slice: [ '$itemList', 6 ] }
      }
    }
  ];
  const list = await _this.aggregate(aggregation);
  for (let i = 0; i < list.length; i++) {
    list[i].itemList = await Promise.all(list[i].itemList.map(async item => {
      const productIdList = await ProductSchema.find({
        deleted: false,
        status: ProductStatusEnum.published,
        versionsHidden: false,
        isPrivate: false,
        categories: item._id
      }).distinct('_id');
      return {
        _id: item._id,
        name: item.name,
        itemCount: item.itemCount,
        imagePath: await FileSchema.getRandomImage(productIdList)
      };
    }));
  }
  return list;
};

schema.statics.getHomeHoverRotateTree = async function(language: number): Promise<any[]> {
  const _this: ICategoryModel = this;
  const mainListAggregation = [
    {
      $match: {
        isHidden: false,
        subCategoryCount: { $gt: 0 },
        deleted: false,
        pid: null,
        cover: { $ne: null }
      }
    },
    {
      $lookup: {
        from: 'categorytranslations',
        localField: '_id',
        foreignField: 'category',
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
        subIdList: 1,
        name: '$translations.name',
        cover: { $concat: [ mainConfig.BASE_URL, '$cover', '/400/400' ] }
      }
    },
    {
      $lookup: {
        from: 'categories',
        localField: '_id',
        foreignField: 'pid',
        as: 'subList'
      }
    },
    {
      $unwind: '$subList'
    },
    {
      $match: {
        'subList.isHidden': false,
        $or: [
          { 'subList.itemCount': { $gt: 0 } },
          { 'subList.subCategoryCount': { $gt: 0 } }
        ],
        'subList.deleted': false
      }
    },
    {
      $lookup: {
        from: 'categorytranslations',
        localField: 'subList._id',
        foreignField: 'category',
        as: 'subList.translations'
      }
    },
    {
      $unwind: '$subList.translations'
    },
    {
      $match: {
        'subList.translations.language': language
      }
    },
    {
      $project: {
        _id: 1,
        name: 1,
        cover: 1,
        'subList._id': 1,
        'subList.name': '$subList.translations.name'
      }
    },
    {
      $group: {
        _id: '$_id',
        name: { $first: '$name' },
        cover: { $first: '$cover' },
        subList: {
          $push: {
            _id: '$subList._id',
            name: '$subList.name'
          }
        }
      }
    },
    {
      $sort: { name: 1 }
    }
  ];
  const list = await _this.aggregate(mainListAggregation);
  list.forEach(item => {
    item.subList.sort((a, b) => {
      if (a.name < b.name) {
        return -1;
      }
      if (a.name > b.name) {
        return 1;
      }
      return 0;
    });
  });
  return list;
};

schema.statics.getRandom = async function(filter: any, count: number, language: number): Promise<any[]> {
  const _this: ICategoryModel = this;
  const itemCount = await _this.countDocuments(filter);
  const aggregation = [
    {
      $match: filter
    },
    {
      $sample: { size: itemCount }
    },
    {
      $lookup: {
        from: 'categorytranslations',
        localField: '_id',
        foreignField: 'category',
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
        name: '$translations.name',
        itemCount: 1,
        subCategoryCount: 1
      }
    }
  ];
  return await _this.aggregate(aggregation);
};

export const category: ICategoryModel = mongoose.model<ICategory<any, any>, ICategoryModel>(schemaReferences.category, schema);
export default category;

async function getAllParents(idList: string[]): Promise<string[]> {
  let mainList = [];
  for (let i = 0; i < idList.length; i++) {
    const tempList = await getCategoryParentList(idList[i]);
    mainList = mainList.concat(tempList);
  }
  mainList = mainList.map(item => item.toString());
  mainList = mainList.filter(function onlyUnique(value, index, self) {
    return self.indexOf(value) == index;
  });
  return mainList;
}

export async function getCategoryParentList(id: string): Promise<string[]> {
  let idList = [];
  const categoryObj = await category.findById(id);
  if (categoryObj.pid) {
    idList.push(categoryObj.pid);
    const tempList = await getCategoryParentList(categoryObj.pid);
    idList = idList.concat(tempList);
  }
  return idList;
}

async function getSubIdList (schema: ICategoryModel, id: string): Promise<string[]> {
  let idList: any = [id];
  const subCategories = await schema.find({ pid: id, deleted: false, isHidden: false });
  if (subCategories.length) {
    await Promise.all(
      subCategories.map(async element => {
        const tempIds = await getSubIdList(schema, element._id);
        idList = idList.concat(tempIds);
      })
    );
  }
  return idList;
}

async function detachCategoryFromProducts(schema: ICategoryModel, category: ICategory ) {
  const products = await ProductSchema.find({ categories: category._id, deleted: false, status: { $ne: ProductStatusEnum.preparing } });
  await Promise.all(products.map(async product => {
    const oldMainList = product.mainCategories.map(id => id.toString());
    const categories = product.categories.map(id => id.toString());
    const index = categories.indexOf(category._id.toString());
    if (index === -1) return;
    categories.splice(index, 1);
    product.categories = categories;
    let newMainList = [];
    for (let i = 0; i < categories.length; i++) {
      const mainId = await schema.getMainCategory(categories[i]);
      if (mainId) newMainList.push(mainId);
    }
    newMainList = newMainList.map(id => id.toString());
    newMainList.filter(onlyUnique);
    newMainList.sort();
    const areSame = arraysEqual(newMainList, oldMainList);
    if (!areSame) {
      ProductVersionSchema.updateMany({ _id: product.versions }, { deleted: true }).catch(e => console.log(e));
      product.versions = [];
      product.mainCategories = newMainList;
    }
    await product.save();
    return;
  }));
  category.deleted = true;
  category.url = null;
  await Promise.all([
    await category.save(),
    await schema.updateOne({ _id: category.pid }, { $inc: { itemCountInSub: -1 * products.length } }),
  ]);
}

function onlyUnique(value, index, self) {
  return self.indexOf(value) === index;
}

function arraysEqual(arr1: any[], arr2: any[]) {
  if (arr1.length !== arr2.length) return false;
  for (let i = arr1.length; i--;) {
    if (arr1[i].toString() !== arr2[i].toString()) return false;
  }
  return true;
}