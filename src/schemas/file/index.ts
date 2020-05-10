import * as mongoose from 'mongoose';
import * as fs from 'fs';

import { schemaReferences } from '../../constants/constants';
import { IFileModel, IFile } from './model';
import mainConfig from '../../env';
import { deleteFiles } from '../../services/fileManager';
import { ObjectID } from 'bson';

const Schema = mongoose.Schema;

const schema = new Schema({
  type: {
    type: Number,
    required: true
  },
  path: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    default: null
  },
  isMain: {
    type: Boolean,
    default: false
  },
  shortKeys: [{
    type: String
  }],
  request: {
    type: Schema.Types.ObjectId,
    ref: schemaReferences.request,
    default: null
  },
  category: {
    type: Schema.Types.ObjectId,
    ref: schemaReferences.category,
    default: null
  },
  message: {
    type: Schema.Types.ObjectId,
    ref: schemaReferences.message,
    default: null
  },
  product: {
    type: Schema.Types.ObjectId,
    ref: schemaReferences.product,
    default: null
  },
  brand: {
    type: Schema.Types.ObjectId,
    ref: schemaReferences.brand,
    default: null
  },
  setProductImage: {
    type: Boolean,
    default: false
  }
});

schema.statics.deleteFile = async function(idList: string[]) {
  const _this: IFileModel = this;
  const files = await _this.find({ _id: { $in: idList } });
  const length = files.length;
  const pathList = [];
  for (let i = 0; i < length; i++) {
    pathList.push(mainConfig.MEDIA_PATH + files[i].path);
  }
  deleteFiles(pathList, false);
  await _this.deleteMany({ _id: { $in: idList } });
};

schema.statics.getProductImages = async function(idList: string[]) {
  const _this: IFileModel = this;
  const aggregation: any[] = [
    {
      $match: {
        _id: { $in: idList }
      }
    },
    {
      $project: {
        _id: 1,
        path: { $concat: [ mainConfig.BASE_URL, '$path' ] }
      }
    }
  ];
  const list = _this.aggregate(aggregation);
  return list;
};

schema.statics.getRandomImage = async function(productIdList: string[]): Promise<string> {
  const _this: IFileModel = this;
  const aggregation = [
    {
      $match: {
        product: { $in: productIdList.map(item => new ObjectID(item)) }
      }
    },
    {
      $sample: { size: 1 }
    },
  ];
  const list = await _this.aggregate(aggregation);
  const item = list[0];
  if (item) return mainConfig.BASE_URL + item.path + '/400/400';
};

export const file: IFileModel = mongoose.model<IFile<any, any, any, any, any>, IFileModel>( schemaReferences.file, schema);
export default file;