import * as mongoose from 'mongoose';
import { schemaReferences } from '../../constants/constants';
import { IProposalModel, IProposal } from './model';
import { LanguageEnum } from '../../constants/enums';
import { IProduct } from '../product/model';
import { checkVisibility } from '../../api/product/service';

const Schema = mongoose.Schema;

const schema = new Schema({
  translations: [{
    type: Schema.Types.ObjectId,
    ref: schemaReferences.proposalTranslation
  }],
  shown: {
    type: Boolean,
    default: false
  },
  products: [{
    type: Schema.Types.ObjectId,
    ref: schemaReferences.product
  }],
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

schema.statics.getListForAdmin = async function(skip: number, limit: number, language: number) {
  const _this: IProposalModel = this;
  const aggregation: any[] = [
    {
      $project: {
        _id          : 1,
        translations : 1,
        updatedDt    : 1,
        shown        : 1,
        count: { $size: '$products' }
      }
    },
    {
      $lookup: {
        from: 'proposaltranslations',
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
        _id       : 1,
        updatedDt : 1,
        shown     : 1,
        count     : 1,
        name      : '$translations.name'
      }
    },
    {
      $sort: {
        updatedDt: -1
      }
    }
  ];
  if (skip) aggregation.push({ $skip: skip });
  if (limit) aggregation.push({ $limit: limit });
  const list = await _this.aggregate(aggregation);
  return await Promise.all(list.map(async item => {
    return {
      _id       : item._id,
      name      : item.name,
      shown     : item.shown,
      updatedDt : item.updatedDt,
      count     : item.count,
      changeable: await _this.isValidToShow(item._id)
    };
  }));
};

schema.statics.productGoneInvisible = async function(productId: string): Promise<void> {
  const _this: IProposalModel = this;
  const list: Array<IProposal<string, IProduct>> = await _this.find({ products: productId }).populate('products');
  await Promise.all(list.map(async item => {
    let invisibleCount = 0;
    for (let i = 0; i < item.products.length; i++) {
      if (!checkVisibility(item.products[0])) invisibleCount++;
    }
    if (item.products.length === invisibleCount) {
      item.shown = false;
      await item.save();
    }
  }));
};

schema.statics.isValidToShow = async function(id: string): Promise<boolean> {
  const _this: IProposalModel = this;
  const proposal: IProposal<string, IProduct> = await _this.findOne({ _id: id }).populate('products');
  if (!proposal) return false;
  if (!proposal.products.length) return false;
  let invisibleCount = 0;
  proposal.products.forEach(item => {
    if (!checkVisibility(item)) invisibleCount++;
  });
  if (invisibleCount === proposal.products.length) return false;
  return true;
};

const proposal: IProposalModel = mongoose.model<IProposal<any, any>, IProposalModel>(schemaReferences.proposal, schema);
export default proposal;