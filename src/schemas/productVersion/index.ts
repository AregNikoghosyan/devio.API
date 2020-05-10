import * as mongoose from 'mongoose';
import { schemaReferences } from '../../constants/constants';
import { IProductVersionModel, IProductVersion } from './model';
import mainConfig from '../../env';
import { ObjectID } from 'bson';
import { LanguageEnum } from '../../constants/enums';

import ProductSchema from '../product';

const Schema = mongoose.Schema;

const schema = new Schema({
  product: {
    type : Schema.Types.ObjectId,
    ref  : schemaReferences.product
  },
  attributes: [
    {
      attribute: {
        type     : Schema.Types.ObjectId,
        ref      : schemaReferences.attribute,
        required : true
      },
      option: {
        type     : Schema.Types.ObjectId,
        ref      : schemaReferences.option,
        required : true
      }
    }
  ],
  photo: {
    type : Schema.Types.ObjectId,
    ref  : schemaReferences.file
  },
  price: {
    type     : Number,
    required : true
  },
  hasDefaultPrice: {
    type    : Boolean,
    default : true
  },
  availableCount: {
    type    : Number,
    default : 0
  },
  boughtCount: {
    type    : Number,
    default : 0
  },
  hidden: {
    type    : Boolean,
    default : false
  },
  deleted: {
    type    : Boolean,
    default : false
  }
});

schema.index({ 'product': -1 });

schema.statics.getListForAdmin = async function(filter: any) {
  const _this: IProductVersionModel = this;
  const aggregation: any[] = [
    {
      $match: { ...filter, deleted: false }
    },
    {
      $project: {
        _id: 1,
        photo: 1,
        price: 1,
        bonus: 1,
        hidden: 1,
        attributes: 1,
        product: 1
      }
    },
    {
      $lookup: {
        from: 'files',
        localField: 'photo',
        foreignField: '_id',
        as: 'photo'
      }
    },
    {
      $unwind: {
        path: '$photo',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $project: {
        _id: 1,
        photo: { $cond: { if: '$photo', then: '$photo._id', else: null } },
        photoSrc: { $cond: { if: '$photo', then: { $concat: [mainConfig.BASE_URL, '$photo.path'] }, else: null } },
        price: 1,
        bonus: 1,
        hidden: 1,
        product: 1,
        'attributes.attribute': 1,
        'attributes.option': 1,
      }
    },
    {
      $unwind: {
        path: '$attributes',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $lookup: {
        from: 'optiontranslations',
        localField: 'attributes.option',
        foreignField: 'option',
        as: 'attributes.optionTranslation'
      }
    },
    {
      $unwind: {
        path: '$attributes.optionTranslation',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $match: {
        'attributes.optionTranslation.language': LanguageEnum.en
      }
    },
    {
      $project: {
        _id: 1,
        photo: 1,
        photoSrc: 1,
        price: 1,
        bonus: 1,
        hidden: 1,
        product: 1,
        'attributes.attribute': 1,
        'attributes.option': 1,
        'attributes.optionName': '$attributes.optionTranslation.name'
      }
    },
    {
      $group: {
        _id: '$_id',
        hidden: { $first: '$hidden' },
        product: { $first: '$product' },
        price: { $first: '$price' },
        photo: { $first: '$photo' },
        photoSrc: { $first: '$photoSrc' },
        attributes: {
          $push: '$attributes'
        }
      }
    }
  ];
  const list = _this.aggregate(aggregation);
  return list;
};

schema.statics.getPriceRange = async function(filter: any): Promise<{ minPrice: number, maxPrice: number }> {
  const _this: IProductVersionModel = this;
  const aggregation = [
    {
      $match: filter
    },
    {
      $group: {
        _id: '$product',
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
      }
    },
    {
      $project: {
        minPrice: 1,
        maxPrice: 1,
      }
    }
  ];
  const list = await _this.aggregate(aggregation);
  return list[0];
};

schema.statics.getDefaultAvailableAttributes = async function(productId: string): Promise<any> {
  const _this: IProductVersionModel = this;
  const versions = await _this.find({ product: productId, deleted: false, hidden: false }).select('attributes.attribute attributes.option').lean();
  const returnObj: any = {};
  versions.map(item => {
    const attributeLits = item.attributes;
    attributeLits.forEach(element => {
      if (returnObj.attributes) {
        returnObj.attributes.push(element.attribute.toString());
      } else {
        returnObj.attributes = [element.attribute.toString()];
      }
      if (returnObj.options) {
        returnObj.options.push(element.option.toString());
      } else {
        returnObj.options = [element.option.toString()];
      }
    });
  });
  if (returnObj.attributes) {
    returnObj.attributes = [ ...new Set(returnObj.attributes) ];
  }
  if (returnObj.options) {
    returnObj.options = [ ...new Set(returnObj.options) ];
  }
  return returnObj;
};

schema.statics.getOptionsByAttribute = async function(attributeId: string, productId: string): Promise<string[]> {
  const _this: IProductVersionModel = this;
  const aggregation: any = [
    {
      $match: {
        product: new ObjectID(productId),
        deleted: false,
        attributes: {
          $elemMatch: {
            attribute: new ObjectID(attributeId)
          }
        }
      }
    },
    {
      $unwind: {
        path: '$attributes'
      }
    },
    {
      $match: {
        'attributes.attribute': new ObjectID(attributeId)
      }
    },
    {
      $project: {
        attributes: 1
      }
    }
  ];
  const list = await _this.aggregate(aggregation);
  const optionList: string[] = [];
  for (let i = 0; i < list.length; i++) {
    const optionId = list[i].attributes.option.toString();
    if (!(optionList.includes(optionId))) optionList.push(optionId);
  }
  return optionList;
};

schema.statics.popOption = async function(optionId: string): Promise<void> {
  const _this: IProductVersionModel = this;
  const list = await _this.find({
    deleted: false,
    attributes: {
      $elemMatch: {
        option: new ObjectID(optionId)
      }
    }
  });
  await Promise.all(list.map(async item => {
    item.deleted = true;
    const product = await ProductSchema.findById(item.product);
    if (product) {
      const oldVersions = product.versions.map(item => item.toString());
      const delId = item._id.toString();
      const index = oldVersions.indexOf(delId);
      if (index > -1) oldVersions.splice(index, 1);
      if (!oldVersions.length) {
        product.attributes = [];
        product.versions = [];
      }
      product.versions = oldVersions;
      await Promise.all([
        item.save(),
        product.save()
      ]);
    } else {
      await item.save();
    }
  }));
};

export const productVersion: IProductVersionModel = mongoose.model<IProductVersion<any, any, any, any>, IProductVersionModel>(schemaReferences.productVersion, schema);
export default productVersion;
