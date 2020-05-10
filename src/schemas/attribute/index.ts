import * as mongoose from 'mongoose';
import { AttributeTypeEnum, LanguageEnum } from '../../constants/enums';
import { schemaReferences } from '../../constants/constants';
import { IAttribute, IAttributeModel } from './model';

import OptionSchema from '../option';
import ProductSchema from '../product';
import ProductVersionSchema from '../productVersion';

import { ObjectID } from 'bson';

const Schema = mongoose.Schema;

const schema = new Schema({
  type: {
    type: Number,
    default: AttributeTypeEnum.usual
  },
  name: {
    type: String,
    required: true
  },
  category: {
    type: Schema.Types.ObjectId,
    ref: schemaReferences.category,
    required: true
  },
  translations: [{
    type : Schema.Types.ObjectId,
    ref  : schemaReferences.attributeTranslation
  }],
  options: [{
    type : Schema.Types.ObjectId,
    ref  : schemaReferences.option
  }],
  deleted: {
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

schema.statics.getListForAdmin = async function(filter: any, skip: number = null, limit: number = null, language: number) {
  const _this: IAttributeModel = this;
  const aggregation: any[] = [
    {
      $match: filter
    },
    {
      $lookup: {
        from: 'attributetranslations',
        localField: 'translations',
        foreignField: '_id',
        as: 'translations'
      }
    },
    {
      $lookup: {
        from: 'categorytranslations',
        localField: 'category',
        foreignField: 'category',
        as: 'categoryTranslation'
      }
    },
    {
      $unwind: {
        path: '$categoryTranslation'
      }
    },
    {
      $match: {
        'categoryTranslation.language': language
      }
    },
    {
      $project: {
        _id: 1,
        name: 1,
        type: 1,
        createdDt: 1,
        'translations.language': 1,
        'translations.name': 1,
        options: { $size: '$options' },
        category: '$categoryTranslation.name'
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

schema.statics.bulkDelete = async function(idList: string[]): Promise<void> {
  const _this: IAttributeModel = this;
  const [ productIdList ] = await Promise.all([
    await ProductVersionSchema.find({
      deleted: false,
      attributes: {
        $elemMatch: {
          attribute: { $in: idList },
        }
      }
    }).distinct('product'),
    await _this.updateMany({ _id: { $in: idList } }, { deleted: true }),
    await OptionSchema.updateMany({ attribute: { $in: idList } }, { deleted: true })
  ]);
  await Promise.all([
    await ProductSchema.updateMany({ _id: { $in: productIdList } }, { versions: [], attributes: [] }),
    await ProductVersionSchema.updateMany({ product: { $in: productIdList } }, { deleted: true })
  ]);
};

schema.statics.getDetailsForAdmin = async function(id: string): Promise<any> {
  const _this: IAttributeModel = this;
  const filter = { _id: id, deleted: false };
  const aggregation: any[] = [
    {
      $match: filter
    },
    {
      $lookup: {
        from: 'categorytranslations',
        localField: 'category',
        foreignField: 'category',
        as: 'categoryTranslation'
      }
    },
    {
      $unwind: {
        path: '$categoryTranslation'
      }
    },
    {
      $match: {
        'categoryTranslation.language': LanguageEnum.en
      }
    },
    {
      $project: {
        type: 1,
        category: 1,
        categoryName: '$categoryTranslation.name',
        name: 1,
        translations: 1,
        options: 1
      }
    },
    {
      $lookup: {
        from: 'attributetranslations',
        localField: 'translations',
        foreignField: '_id',
        as: 'translations'
      }
    },
    {
      $lookup: {
        from: 'options',
        localField: 'options',
        foreignField: '_id',
        as: 'options'
      }
    },
    {
      $unwind: {
        path: '$options',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $match: {
        $or: [{
          'options.deleted': false
        }, {
          'options': null
        }]
      }
    },
    {
      $lookup: {
        from: 'optiontranslations',
        localField: 'options.translations',
        foreignField: '_id',
        as: 'options.translations'
      }
    },
    {
      $project: {
        _id: 1,
        name: 1,
        category: 1,
        categoryName: 1,
        type: 1,
        'translations.language': 1,
        'translations.name': 1,
        'options._id': 1,
        'options.colorType': 1,
        'options.position': 1,
        'options.firstColor': 1,
        'options.secondColor': 1,
        'options.hidden': 1,
        'options.translations.language': 1,
        'options.translations.name': 1
      }
    },
    {
      $group: {
        _id: '$_id',
        type: { $first: '$type' },
        translations: { $first: '$translations' },
        attributeName: { $first: '$name' },
        category: { $first: '$category' },
        categoryName: { $first: '$categoryName' },
        options: {
          $push: {
            _id: '$options._id',
            translations: '$options.translations',
            position: '$options.position',
            colorType: '$options.colorType',
            firstColor: '$options.firstColor',
            secondColor: '$options.secondColor',
            hidden: '$options.hidden'
          }
        },
        count: { '$sum': { '$size': '$options.translations' } },
      }
    },
    {
      $project: {
        _id: 1,
        type: 1,
        translations: 1,
        attributeName: 1,
        category: 1,
        categoryName: 1,
        options: { $cond: { if: { $not: '$count' }, then: [] , else: '$options' } }
      }
    },
    {
      $limit: 1
    }
  ];
  const list = await _this.aggregate(aggregation);
  return list[0];
};

schema.statics.getShortList = async function(filter): Promise<any> {
  const _this: IAttributeModel = this;
  const aggregation: any[] = [
    {
      $match: filter
    },
    {
      $sort: { position: 1 }
    },
    {
      $project: {
        _id: 1,
        name: 1
      }
    }
  ];
  const list = _this.aggregate(aggregation);
  return list;
};

schema.statics.getTranslatedMap = async function(idList: string[], language: number): Promise<any> {
  const _this: IAttributeModel = this;
  const aggregation: any[] = [
    {
      $match: {
        _id: { $in: idList }
      }
    },
    {
      $project: {
        _id: 1,
        'attribute.type': '$type',
        'attribute.options': '$options'
      }
    },
    {
      $lookup: {
        from: 'attributetranslations',
        localField: '_id',
        foreignField: 'attribute',
        as: 'attribute.translations'
      }
    },
    {
      $unwind: '$attribute.translations'
    },
    {
      $match: {
        'attribute.translations.language': language
      }
    },
    {
      $project: {
        _id: 1,
        'attribute.type': 1,
        'attribute.options': 1,
        'attribute.name': '$attribute.translations.name'
      }
    },
    {
      $lookup: {
        from: 'options',
        localField: 'attribute.options',
        foreignField: '_id',
        as: 'attribute.options'
      }
    },
    {
      $unwind: {
        path: '$attribute.options',
      }
    },
    {
      $project: {
        _id: 1,
        'attribute.type': 1,
        'attribute.name': 1,
        'attribute.options._id': 1,
        'attribute.options.option.colorType': '$attribute.options.colorType',
        'attribute.options.option.firstColor': '$attribute.options.firstColor',
        'attribute.options.option.secondColor': '$attribute.options.secondColor',
        'attribute.options.option.attributeId': '$attribute.options.attribute',
        'attribute.options.option.translations': '$attribute.options.translations',
      }
    },
    {
      $lookup: {
        from: 'optiontranslations',
        localField: 'attribute.options.option.translations',
        foreignField: '_id',
        as: 'attribute.options.translations'
      }
    },
    {
      $unwind: {
        path: '$attribute.options.translations'
      }
    },
    {
      $match: {
        'attribute.options.translations.language': language
      }
    },
    {
      $project: {
        _id: 1,
        'attribute.type': 1,
        'attribute.name': 1,
        'attribute.options._id': 1,
        'attribute.options.option._id': '$attribute.options._id',
        'attribute.options.option.colorType': 1,
        'attribute.options.option.firstColor': 1,
        'attribute.options.option.secondColor': 1,
        'attribute.options.option.attributeId': 1,
        'attribute.options.option.name': '$attribute.options.translations.name',
      }
    },
    {
      $group: {
        _id: '$_id',
        attribute: { $first: '$attribute' },
        options: {
          $push: '$attribute.options'
        }
      }
    },
    {
      $project: {
        _id: 1,
        'attribute.type': 1,
        'attribute.name': 1,
        'attribute.options': '$options',
      }
    }
  ];
  const list = await _this.aggregate(aggregation);
  const attributeMap: any = {};
  for (let i = 0; i < list.length; i++) {
    const optionObj: any = {};
    for (let j = 0; j < list[i].attribute.options.length; j++) {
      optionObj[list[i].attribute.options[j]._id.toString()] = list[i].attribute.options[j].option;
    }
    list[i].attribute.options = optionObj;
    attributeMap[list[i]._id] = list[i].attribute;
  }
  return attributeMap;
};

schema.statics.getMap = async function(attributes: string[], options: string[], language: number): Promise<any> {
  const _this: IAttributeModel = this;
  const attributeIds = attributes.map(item => new ObjectID(item));
  const optionIds = options.map(item => new ObjectID(item));
  const aggregation: any[] = [
    {
      $match: {
        _id: { $in: attributeIds }
      }
    },
    {
      $project: {
        _id: 1,
        'attribute.type': '$type',
        'attribute.options': '$options'
      }
    },
    {
      $lookup: {
        from: 'attributetranslations',
        localField: '_id',
        foreignField: 'attribute',
        as: 'attribute.translations'
      }
    },
    {
      $unwind: '$attribute.translations'
    },
    {
      $match: {
        'attribute.translations.language': language
      }
    },
    {
      $project: {
        _id: 1,
        'attribute.type': 1,
        'attribute.options': 1,
        'attribute.name': '$attribute.translations.name'
      }
    },
    {
      $lookup: {
        from: 'options',
        localField: 'attribute.options',
        foreignField: '_id',
        as: 'attribute.options'
      }
    },
    {
      $unwind: {
        path: '$attribute.options',
      }
    },
    {
      $match: {
        'attribute.options._id': { $in: optionIds }
      }
    },
    {
      $project: {
        _id: 1,
        'attribute.type': 1,
        'attribute.name': 1,
        'attribute.options._id': 1,
        'attribute.options.colorType': 1,
        'attribute.options.firstColor': 1,
        'attribute.options.position': 1,
        'attribute.options.secondColor': 1,
        'attribute.options.attributeId': '$_id',
        'attribute.options.translations': 1,
      }
    },
    {
      $lookup: {
        from: 'optiontranslations',
        localField: 'attribute.options.translations',
        foreignField: '_id',
        as: 'attribute.options.translations'
      }
    },
    {
      $unwind: {
        path: '$attribute.options.translations'
      }
    },
    {
      $match: {
        'attribute.options.translations.language': language
      }
    },
    {
      $project: {
        _id: 1,
        'attribute.type': 1,
        'attribute.name': 1,
        'attribute.options._id': 1,
        'attribute.options.colorType': 1,
        'attribute.options.position': 1,
        'attribute.options.firstColor': 1,
        'attribute.options.secondColor': 1,
        'attribute.options.attributeId': 1,
        'attribute.options.name': '$attribute.options.translations.name',
      }
    },
    {
      $group: {
        _id: '$_id',
        attribute: { $first: '$attribute' },
        options: {
          $push: '$attribute.options'
        }
      }
    },
    {
      $project: {
        _id: 1,
        'attribute.type': 1,
        'attribute.name': 1,
        'attribute.options': '$options',
      }
    }
  ];
  const list = await _this.aggregate(aggregation);
  const attributeMap: any = {};
  for (let i = 0; i < list.length; i++) {
    // const optionObj: any = {};
    // for (let j = 0; j < list[i].attribute.options.length; j++) {
    //   optionObj[list[i].attribute.options[j]._id.toString()] = list[i].attribute.options[j].option;
    // }
    list[i].attribute.options.sort(compare);
    attributeMap[list[i]._id] = list[i].attribute;
  }
  return attributeMap;
};

function compare(a, b) {
  if (a.position < b.position)
    return -1;
  if (a.position > b.position)
    return 1;
  return 0;
}

export const attribute: IAttributeModel = mongoose.model<IAttribute<any, any, any>, IAttributeModel>(schemaReferences.attribute, schema);
export default attribute;