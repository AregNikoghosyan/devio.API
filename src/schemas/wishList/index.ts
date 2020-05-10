import * as mongoose from 'mongoose';
import { schemaReferences } from '../../constants/constants';
import { IWishListModel, IWishList } from './model';
import { IResponseModel } from '../../api/mainModels';
import { ObjectID } from 'bson';

import WishInvitationSchema   from '../wishInvitation';
import WishProductSchema      from '../wishProduct';
import UserNotificationSchema from '../userNotification';
import DeviceSchema          from '../device';
import { NotificationTypeEnum } from '../../constants/enums';

const Schema = mongoose.Schema;

const schema = new Schema({
  creator: {
    type    : Schema.Types.ObjectId,
    ref     : schemaReferences.user,
    default : null
  },
  company: {
    type    : Schema.Types.ObjectId,
    ref     : schemaReferences.company,
    default : null
  },
  members: [{
    type : Schema.Types.ObjectId,
    ref  : schemaReferences.user
  }],
  name: {
    type     : String,
    required : true
  },
  products: [{
    type : Schema.Types.ObjectId,
    ref  : schemaReferences.wishProduct,
  }],
  createdDt: {
    type    : Date,
    default : Date.now
  },
  updatedDt: {
    type    : Date,
    default : Date.now
  }
});

schema.pre('save', async function(next) {
  const _this: any = this;
  if (!_this.isNew) {
    _this.updatedDt = Date.now();
    next();
  }
});

schema.statics.getListForAppUser = async function (filter: any, id: string, language: number, skip: number, limit: number): Promise<any[]> {
  const _this: IWishListModel = this;
  const aggregation: any[] = [
    {
      $match: filter
    },
    {
      $sort: { createdDt: -1 }
    },
    {
      $project: {
        _id: 1,
        name: 1,
        owner: { $cond: { if: { $eq: [ '$creator', id ] }, then: true, else: false } }
      }
    },
    {
      $lookup: {
        from: 'wishproducts',
        localField: '_id',
        foreignField: 'wishList',
        as: 'products'
      }
    },
    {
      $project: {
        _id: 1,
        name: 1,
        owner: 1
      }
    }
  ];
  if (skip) aggregation.push({ $skip: skip });
  if (limit) aggregation.push({ $limit: limit });
  const list = await _this.aggregate(aggregation);
  return list;
};

schema.statics.getMainDetails = async function (userId: string, id: string): Promise<IResponseModel> {
  const _this: IWishListModel = this;
  const aggregation: any[] = [
    {
      $match: { _id: new ObjectID(id) }
    },
    {
      $project: {
        _id: 1,
        name: 1,
        creator: 1,
        members: 1,
        company: 1,
        owner: { $cond: { if: { $eq: [ '$creator', userId ] }, then: true, else: false } }
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'creator',
        foreignField: '_id',
        as: 'creator'
      }
    },
    {
      $unwind: {
        path: '$creator',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $lookup: {
        from: 'companies',
        localField: 'company',
        foreignField: '_id',
        as: 'company'
      }
    },
    {
      $unwind: {
        path: '$company',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'members',
        foreignField: '_id',
        as: 'members'
      }
    },
    {
      $unwind: {
        path: '$members',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $project: {
        _id: 1,
        name: 1,
        'creator._id': 1,
        'creator.firstName': 1,
        'creator.lastName': 1,
        'creator.email': 1,
        members: 1,
        company: '$company.name',
        companyId: '$company._id',
        owner: 1
      }
    },
    {
      $group: {
        _id: '$_id',
        name: { $first: '$name' },
        creator: { $first: '$creator' },
        company: { $first: '$company' },
        companyId: { $first: '$companyId' },
        owner: { $first: '$owner' },
        members: {
          $push: {
            _id: '$members._id',
            firstName: '$members.firstName',
            lastName: '$members.lastName',
            email: '$members.email'
          }
        }
      }
    },
    {
      $project: {
        _id: 1,
        name: 1,
        creator: 1,
        company: 1,
        owner: 1,
        companyId: 1,
        members: 1,
        firstMember: { $arrayElemAt: [ '$members', 0 ] }
      }
    },
    {
      $project: {
        _id: 1,
        name: 1,
        creator: 1,
        company: 1,
        owner: 1,
        companyId: 1,
        members: {
          $cond: {
            if: '$firstMember._id',
            then: '$members',
            else: []
          }
        }
      }
    }
  ];
  const list = await _this.aggregate(aggregation);
  return list[0];
};

schema.statics.getShortListWithProduct = async function(userId: string): Promise<any> {
  const _this: IWishListModel = this;
  const userObjectId = new ObjectID(userId);
  const aggregation: any[] = [
    {
      $match: {
        $or: [{ creator: userObjectId }, { members: userObjectId }]
      }
    },
    {
      $sort: { createdDt: -1 }
    },
    {
      $project: {
        _id: 1,
        name: 1,
      }
    }
  ];
  const list = await _this.aggregate(aggregation);
  return list;
};

schema.statics.bulkDeleteById = async function(id: string): Promise<void> {
  const _this: IWishListModel = this;
  const wishList = await _this.findById(id);
  if (wishList) {
    await Promise.all([
      await _this.deleteOne({ _id: id }),
      await WishInvitationSchema.deleteMany({ wishList: id }),
      await WishProductSchema.deleteMany({ wishList: id })
    ]);
    UserNotificationSchema.sendByUserIdList({
      idList: wishList.members,
      type: NotificationTypeEnum.wishListDelete,
      // wishList: wishList._id
    }).catch(e => console.log(e));
  }
};

schema.statics.bulkDeleteByCompanyId = async function(companyId): Promise<void> {
  const _this: IWishListModel = this;
  const idList = await _this.find({ company: companyId }).distinct('_id');
  await Promise.all(idList.map(async item => {
    await _this.bulkDeleteById(item);
  }));
};

schema.statics.productGoneInvisible = async function(productId: string): Promise<void> {
  const _this: IWishListModel = this;
  const wishProductList = await WishProductSchema.find({ product: productId });
  const wishProductIdList = wishProductList.map(item => item._id);
  const wishListIdList = wishProductList.map(item => item.wishList);
  const wishListList = await _this.find({ _id: { $in: wishListIdList } });
  await Promise.all(wishListList.map(async item => {
    const members = await WishProductSchema.find({ product: productId, wishList: item._id }).distinct('member');
    await UserNotificationSchema.sendByUserIdList({
      idList: members,
      type: NotificationTypeEnum.wishListRemoveProduct,
      wishList: item._id
    });
  }));
  await WishProductSchema.deleteMany({ _id: { $in: wishProductIdList } });
};

export const wishList: IWishListModel = mongoose.model<IWishList<any, any, any, any>, IWishListModel>(schemaReferences.wishList, schema);
export default wishList;