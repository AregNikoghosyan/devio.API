import {
  ICreateWishListBody,
  IGetWishListsQuery,
  IGetWishListDetailsQuery,
  IProductToUserWishListAction,
  IGetWishListShortListQuery,
  IChangeProductCounterInWishListBody,
  IUpdateWishListBody,
  IRemoveMemberFromWishListBody,
  IGetProductListInWishListBody,
  IGetGuestWishListProductsBody,
  IGetUnapprovedProductListBody,
  IExportWishListToCartBody,
} from './model';
import { IResponseModel, getResponse } from '../mainModels';

import WishListSchema             from '../../schemas/wishList';
import WishProductSchema          from '../../schemas/wishProduct';
import WishInvitationSchema       from '../../schemas/wishInvitation';
import ProductSchema              from '../../schemas/product';
import ProductVersionSchema       from '../../schemas/productVersion';
import ProductPricingSchema       from '../../schemas/productPricing';
import ProductTranslationSchema   from '../../schemas/productTranslation';
import FileSchema                 from '../../schemas/file';
import AttributeTranslationSchema from '../../schemas/attributeTranslation';
import OptionTranslationSchema    from '../../schemas/optionTranslation';
import UserSchema                 from '../../schemas/user';
import UserNotificationSchema     from '../../schemas/userNotification';

import { IUser } from '../../schemas/user/model';
import { WishListParticipationTypeEnum, ProductStatusEnum, ProductToWishListActionTypeEnum, WishProductStatusEnum, NotificationTypeEnum } from '../../constants/enums';
import { IWishProduct } from '../../schemas/wishProduct/model';
import { IWishList } from '../../schemas/wishList/model';
import { IProduct } from '../../schemas/product/model';
import { IProductVersion } from '../../schemas/productVersion/model';
import mainConfig from '../../env';
import { ObjectID } from 'bson';
import { IProductPricing } from '../../schemas/productPricing/model';
import { getCartList } from '../product/service';

class WishListServices {

  public createWishList = async (user: IUser, body: ICreateWishListBody): Promise<IResponseModel> => {
    const wishList = new WishListSchema({
      creator: user._id,
      name: body.name
    });
    if (body.companyId) wishList.company = body.companyId;
    await wishList.save();
    return getResponse(true, 'Wish list created', wishList._id);
  }

  public updateWishList = async (body: IUpdateWishListBody): Promise<IResponseModel> => {
    body.wishList.name = body.name;
    await body.wishList.save();
    return getResponse(true, 'Wish list updated');
  }

  public deleteWishList = async (wishList: IWishList<string, string, string, string>): Promise<IResponseModel> => {
    await WishListSchema.bulkDeleteById(wishList._id);
    return getResponse(true, 'Wish List deleted');
  }

  public getWishLists = async (user: IUser, query: IGetWishListsQuery): Promise<IResponseModel> => {
    const filter: any = {};
    if (query.type && +query.type === WishListParticipationTypeEnum.creator) {
      filter.creator = user._id;
    } else if (query.type && +query.type === WishListParticipationTypeEnum.invited) {
      filter.members = user._id;
    } else {
      filter.$or = [{ creator: user._id }, { members: user._id }];
    }
    const itemCount = await WishListSchema.countDocuments(filter);
    if (itemCount === 0) return getResponse(true, 'Got item list', { itemList: [], pagesLeft: false });
    const pageCount = Math.ceil(itemCount / +query.limit);
    if (+query.pageNo > pageCount) return getResponse(false, 'PageNo must be less or equal than ' + pageCount);
    const skip = (+query.pageNo - 1) * +query.limit;
    const list = await WishListSchema.getListForAppUser(filter, user._id, +query.language, skip, +query.limit);
    const itemList = await Promise.all(list.map(async item => {
      const returnObj: any = {
        _id: item._id,
        name: item.name,
        owner: item.owner,
        images: []
      };
      const [productCount, images] = await Promise.all([
        await WishProductSchema.getApprovedProductCountInList(item._id),
        await WishProductSchema.getImages(item._id)
      ]);
      returnObj.images = images;
      returnObj.productCount = productCount;
      return returnObj;
    }));
    return getResponse(true, 'Got item list', { itemList, pagesLeft: +query.pageNo !== pageCount });
  }

  public getWishListDetails = async (user: IUser, query: IGetWishListDetailsQuery): Promise<IResponseModel> => {
    const details = await WishListSchema.getMainDetails(user._id, query.id);
    return getResponse(true, 'Got details successfully', details);
  }

  public getProductListInWishList = async (body: IGetProductListInWishListBody, userId: string): Promise<IResponseModel> => {
    const filter: any = {
      wishList: new ObjectID(body.id),
      status: WishProductStatusEnum.approved
    };
    let editable = true;
    if (body.creator && body.memberIdList) {
      const creatorId = userId.toString();
      if (body.memberIdList.length === 1 && body.memberIdList[0] === creatorId) {
        filter.member = new ObjectID(creatorId);
      } else {
        filter.member = { $in: body.memberIdList.map(item => new ObjectID(item)) };
        filter.count = { $gt: 0 };
        editable = false;
      }
    } else {
      filter.member = new ObjectID(userId);
    }
    let itemList = [];
    const itemCount = await WishProductSchema.countByFilter(filter);
    if (!itemCount) return getResponse(true, 'Got list', { itemList, pagesLeft: false, editable, itemCount });
    if (body.skip >= itemCount) {
      return getResponse(false, `Skip must be less than ${itemCount}`);
    }
    const list = await WishProductSchema.getList(filter, body.language, body.skip, body.limit);
    itemList = await Promise.all(list.map(async item => {
      const discounted = productHasDiscount(item.discountStartDate, item.discountEndDate);
      const pricing = discounted ? this.getPricing(item.count, item.pricing, item.minCount) : null;
      const priceList = discounted ? this.getPriceList(item.defaultPrice, item.pricing) : [];
      const returnObj = {
        ...item,
        priceList
      };
      delete returnObj.discountStartDate;
      delete returnObj.discountEndDate;
      returnObj.discountedPrice = null;
      if (discounted && pricing && pricing.discount) {
        returnObj.discountedPrice = getDiscountedPrice(returnObj.defaultPrice, pricing.discount);
      }
      delete returnObj.pricing;
      const attributes = await Promise.all(returnObj.attributes.map(async attributeObj => {
        const [attributeTranslation, optionTranslation] = await Promise.all([
          await AttributeTranslationSchema.findOne({ attribute: attributeObj.attribute, language: body.language }),
          await OptionTranslationSchema.findOne({ option: attributeObj.option, language: body.language })
        ]);
        return {
          attributeId: attributeObj.attribute,
          attributeName: attributeTranslation ? attributeTranslation.name : '',
          optionId: attributeObj.option,
          optionName: optionTranslation ? optionTranslation.name : ''
        };
      }));
      returnObj.attributes = attributes;
      return returnObj;
    }));
    return getResponse(true, 'Got list', { itemList, pagesLeft: (itemCount > body.skip + body.limit), editable, itemCount });
  }

  public getWishListShortList = async (userId: string, query: IGetWishListShortListQuery): Promise<IResponseModel> => {
    const list = await WishListSchema.getShortListWithProduct(userId);
    const wishLists = await Promise.all(list.map(async item => {
      const returnObj = { ...item };
      returnObj.added = await isInWishList(userId, item._id, query.productId, query.productVersionId);
      return returnObj;
    }));
    return getResponse(true, 'Got list', wishLists);
  }

  public getWishListShortListForWeb = async(userId: string): Promise<IResponseModel> => {
    const list = await WishListSchema.getShortListWithProduct(userId);
    return getResponse(true, 'Got list', list);
  }

  public productToUserWishListAction = async (userId: string, body: IProductToUserWishListAction): Promise<IResponseModel> => {
    await Promise.all(body.actions.map(async item => {
      const [wishProduct, wishList, product] = await Promise.all([
        await WishProductSchema.findOne({ wishList: item.wishListId, product: body.productId, productVersion: body.productVersionId, member: userId }),
        await WishListSchema.findById(item.wishListId),
        await ProductSchema.findById(body.productId).select({ minCount: 1 })
      ]);
      const isCreator = wishList.creator.toString() === userId.toString();
      if (wishProduct && item.action === ProductToWishListActionTypeEnum.add) {
        if (wishProduct.status === WishProductStatusEnum.approved) {
          wishProduct.count = product.minCount;
          await wishProduct.save();
        }
      } else if (!wishProduct && item.action === ProductToWishListActionTypeEnum.add) {
        const draftModel = {
          wishList: item.wishListId,
          product: body.productId,
          productVersion: body.productVersionId,
        };
        const [identifier, requestedList] = await Promise.all([
          await WishProductSchema.getIdentifier(item.wishListId),
          await WishProductSchema.find({
            ...draftModel,
            status: WishProductStatusEnum.unapproved
          })
        ]);
        if (isCreator) {
          const userIdList = await Promise.all(requestedList.map(async item => {
            item.status = WishProductStatusEnum.approved;
            item.count = product.minCount;
            item.uniqueIdentifier = identifier;
            await item.save();
            return item.member.toString();
          }));
          UserNotificationSchema.sendByUserIdList({
            idList: userIdList,
            type: NotificationTypeEnum.wishlistApprove,
            wishList: wishList._id
          }).catch(e => console.log(e));
          const usersToInsert = wishList.members.map(item => item.toString());
          for (let i = 0; i < userIdList.length; i++) {
            const index = usersToInsert.indexOf(userIdList[i]);
            if (index > -1) usersToInsert.splice(index, 1);
          }
          UserNotificationSchema.sendByUserIdList({
            idList: usersToInsert,
            type: NotificationTypeEnum.wishListNewProduct,
            wishList: wishList._id
          }).catch(e => console.log(e));
          await Promise.all([
            await WishProductSchema.insertMany(usersToInsert.map(memberId => {
              return {
                ...draftModel,
                member: memberId,
                status: WishProductStatusEnum.approved,
                uniqueIdentifier: identifier
              };
            })),
            await WishProductSchema.create({
              ...draftModel,
              member: userId,
              status: WishProductStatusEnum.approved,
              count: product.minCount,
              uniqueIdentifier: identifier
            })
          ]);
        } else {
          const newRequestedProduct = new WishProductSchema({
            ...draftModel,
            member: userId,
            uniqueIdentifier: requestedList[0] && requestedList[0].uniqueIdentifier ? requestedList[0].uniqueIdentifier : identifier,
            status: WishProductStatusEnum.unapproved,
          });
          await newRequestedProduct.save();
          UserNotificationSchema.sendUserNotification({
            userId: wishList.creator,
            type: NotificationTypeEnum.wishListProductRequest
          });
        }
      } else if (wishProduct && item.action === ProductToWishListActionTypeEnum.remove) {
        if (wishProduct.status === WishProductStatusEnum.unapproved) {
          await WishProductSchema.deleteOne({ _id: wishProduct._id });
        } else {
          wishProduct.count = 0;
          await wishProduct.save();
        }
      }
    }));
    return getResponse(true, 'Product actions set', true);
  }

  public getUnapprovedProductList = async (body: IGetUnapprovedProductListBody, userId: string): Promise<IResponseModel> => {
    const filter: any = {
      wishList: new ObjectID(body.id),
      status: WishProductStatusEnum.unapproved
    };
    if (!body.isCreator) {
      filter.member = new ObjectID(userId);
    }
    const itemCount = await WishProductSchema.countByFilter(filter);
    if (itemCount === 0) return getResponse(true, 'ok', { itemList: [], pagesLeft: false, isCreator: body.isCreator });
    if (body.skip >= itemCount) return getResponse(false, `Skip must be less than ${itemCount}`);
    const list = await WishProductSchema.getUnapprovedList(filter, body.language, body.skip, body.limit);
    const itemList = await Promise.all(list.map(async item => {
      const discounted = productHasDiscount(item.discountStartDate, item.discountEndDate);
      const pricing = discounted ? this.getPricing(item.count, item.pricing, item.minCount) : null;
      const priceList = discounted ? this.getPriceList(item.defaultPrice, item.pricing) : [];
      const returnObj = {
        ...item,
        priceList
      };
      delete returnObj.discountStartDate;
      delete returnObj.discountEndDate;
      returnObj.discountedPrice = null;
      if (discounted && pricing && pricing.discount) {
        returnObj.discountedPrice = getDiscountedPrice(returnObj.defaultPrice, pricing.discount);
      }
      delete returnObj.pricing;
      const attributes = await Promise.all(returnObj.attributes.map(async attributeObj => {
        const [attributeTranslation, optionTranslation] = await Promise.all([
          await AttributeTranslationSchema.findOne({ attribute: attributeObj.attribute, language: body.language }),
          await OptionTranslationSchema.findOne({ option: attributeObj.option, language: body.language })
        ]);
        return {
          attributeId: attributeObj.attribute,
          attributeName: attributeTranslation ? attributeTranslation.name : '',
          optionId: attributeObj.option,
          optionName: optionTranslation ? optionTranslation.name : ''
        };
      }));
      returnObj.attributes = attributes;
      return returnObj;
    }));
    return getResponse(true, 'Got list', { itemList, pagesLeft: itemCount > (body.skip + body.limit), isCreator: body.isCreator });
  }

  public approveProductInWishList = async (wishList: IWishList, wishProductList: IWishProduct[]): Promise<IResponseModel> => {
    const requestedUsers = wishProductList.map(item => item.member.toString());
    const newInsertingUsers = wishList.members.map(item => item.toString());
    requestedUsers.forEach(userId => {
      const index = newInsertingUsers.indexOf(userId);
      if (index > -1) newInsertingUsers.splice(index, 1);
    });
    UserNotificationSchema.sendByUserIdList({
      idList: requestedUsers,
      type: NotificationTypeEnum.wishlistApprove,
      wishList: wishList._id
    }).catch(e => console.log(e));
    UserNotificationSchema.sendByUserIdList({
      idList: newInsertingUsers,
      type: NotificationTypeEnum.wishListNewProduct,
      wishList: wishList._id
    }).catch(e => console.log(e));
    newInsertingUsers.push(wishList.creator.toString());
    const product = await ProductSchema.findById(wishProductList[0].product);
    const minCount = product.minCount;
    await Promise.all([
      wishProductList.map(async item => {
        item.status = WishProductStatusEnum.approved,
          item.count = minCount;
        await item.save();
      }),
      await WishProductSchema.insertMany(newInsertingUsers.map(userId => {
        return {
          wishList: wishList._id,
          product: wishProductList[0].product,
          productVersion: wishProductList[0].productVersion,
          uniqueIdentifier: wishProductList[0].uniqueIdentifier,
          status: WishProductStatusEnum.approved,
          member: userId,
          count: 0
        };
      }))
    ]);
    return getResponse(true, 'Product status and counters set');
  }

  public cancelProductRequestInWishList = async (idList: string[], userList: string[], wishListId: string): Promise<IResponseModel> => {
    await WishProductSchema.deleteMany({ _id: { $in: idList } });
    if (userList) {
      // This means that creator is canceling users' requested product
      UserNotificationSchema.sendByUserIdList({
        idList: userList,
        type: NotificationTypeEnum.wishListUnApprove,
        wishList: wishListId
      });
    }
    return getResponse(true, 'Canceled successfully');
  }

  public changeProductCounterInWishList = async (body: IChangeProductCounterInWishListBody): Promise<IResponseModel> => {
    const wishProduct = body.wishProduct;
    wishProduct.count = body.sum;
    await wishProduct.save();
    return getResponse(true, 'ok');
  }

  public deleteProductFromUserWishList = async (wishProduct: IWishProduct): Promise<IResponseModel> => {
    await WishProductSchema.deleteMany({
      wishList: wishProduct.wishList,
      uniqueIdentifier: wishProduct.uniqueIdentifier
    });
    const userIdList = await WishProductSchema.find({
      wishList: wishProduct.wishList,
      uniqueIdentifier: wishProduct.uniqueIdentifier,
      count: { $gt: 0 }
    }).distinct('member');
    UserNotificationSchema.sendByUserIdList({
      idList: userIdList,
      type: NotificationTypeEnum.wishListRemoveProduct,
      wishList: wishProduct.wishList
    }).catch(e => console.log(e));
    return getResponse(true, 'Product removed');
  }

  public generateInvitationLink = async (wishList: IWishList): Promise<IResponseModel> => {
    const date = new Date(Date.now() - 1000 * 60 * 60 * 5);
    const oldInvitation = await WishInvitationSchema.findOne({
      wishList: wishList._id,
      createdDt: { $gte: date }
    });
    let link = mainConfig.WEB_CLIENT_BASE_URL + 'wish-list/invitation/';
    //let link = '10.10.1.63:5000/wish-list/invitation/';
    if (oldInvitation) {
      link += oldInvitation.code;
    } else {
      const code = await WishInvitationSchema.getAvailableCode();
      await WishInvitationSchema.create({
        wishList: wishList._id,
        code
      });
      link += code;
    }
    return getResponse(true, 'Invitation generated', link);
  }

  public joinToWishList = async (wishList: IWishList, userId: string): Promise<IResponseModel> => {
    UserNotificationSchema.sendByUserIdList({
      idList: wishList.members,
      type: NotificationTypeEnum.wishListNewMember,
      wishList: wishList._id
    }).catch(e => console.log(e));
    wishList.members.push(userId);
    const wishProductList = await WishProductSchema.getApprovedListToInsert(wishList._id);
    await Promise.all(wishProductList.map(async item => {
      await WishProductSchema.create({
        wishList: wishList._id,
        product: item.product,
        productVersion: item.productVersion,
        uniqueIdentifier: item._id,
        member: userId,
        count: 0,
        status: WishProductStatusEnum.approved
      });
    }));
    await wishList.save();
    return getResponse(true, 'Successfully joined to wish list');
  }

  public getMemberList = async (wishList: IWishList): Promise<IResponseModel> => {
    const creatorId = wishList.creator.toString();
    const [creator, userList] = await Promise.all([
      await UserSchema.findOne({ _id: creatorId }).select('_id firstName lastName email'),
      await UserSchema.find({ _id: { $in: wishList.members } }).select('_id firstName lastName email')
    ]);
    const list = userList.map(item => {
      return {
        _id: item._id,
        firstName: item.firstName,
        lastName: item.lastName,
        email: item.email,
        owner: false
      };
    });
    const creatorObj = {
      _id: creator._id,
      firstName: creator.firstName,
      lastName: creator.lastName,
      email: creator.email,
      owner: true
    };
    const itemList = [ creatorObj, ...list ];
    return getResponse(true, 'Got member list', itemList);
  }

  public removeMembersFromWishList = async (body: IRemoveMemberFromWishListBody): Promise<IResponseModel> => {
    UserNotificationSchema.sendByUserIdList({
      idList: body.memberIdList,
      type: NotificationTypeEnum.wishListKick,
    }).catch(e => console.log(e));
    const wishList = body.wishList;
    const members = wishList.members.map(item => item.toString());
    body.memberIdList.forEach(memberId => {
      const index = members.indexOf(memberId);
      if (index > -1) members.splice(index, 1);
    });
    wishList.members = members;
    await Promise.all([
      await wishList.save(),
      await WishProductSchema.deleteMany({ wishList: body.wishList._id, member: { $in: body.memberIdList } })
    ]);
    return getResponse(true, 'Member and additional data removed');
  }

  public leaveWishList = async (wishList: IWishList, userId: string): Promise<IResponseModel> => {
    const memberId = userId.toString();
    const memberIdList = wishList.members.map(item => item.toString());
    const index = memberIdList.indexOf(memberId);
    if (index > -1) {
      memberIdList.splice(index, 1);
    }
    wishList.members = memberIdList;
    await Promise.all([
      await wishList.save(),
      await WishProductSchema.deleteMany({ wishList: wishList._id, member: memberId })
    ]);
    UserNotificationSchema.sendUserNotification({
      type: NotificationTypeEnum.wishListLeave,
      userId: wishList.creator,
      wishList: wishList._id
    });
    return getResponse(true, 'Wish list left');
  }

  public getGuestWishListProducts = async (body: IGetGuestWishListProductsBody): Promise<IResponseModel> => {
    const [versions, products] = await Promise.all([
      await ProductVersionSchema.find({ _id: { $in: body.idList }, deleted: false, hidden: false }),
      await ProductSchema.find({ _id: { $in: body.idList }, versions: { $size: 0 }, deleted: false, status: ProductStatusEnum.published })
    ]);
    const { versionList, productList } = await this.getProductLists(versions, products, body.language);
    const filteredVersionList = [];
    versionList.forEach(item => {
      if (item) filteredVersionList.push(item);
    });
    const list = [...filteredVersionList, ...productList];
    const deletedList = [];
    for (let i = 0; i < body.idList.length; i++) {
      let includes = false;
      const id = body.idList[i];
      for (let j = 0; j < list.length; j++) {
        if ((list[j].versionId && id === list[j].versionId.toString()) || (list[j].productId && id === list[j].productId.toString())) {
          includes = true;
          break;
        }
      }
      if (!includes) deletedList.push(id);
    }
    return getResponse(true, 'Got list', { itemList: list, deletedIdList: deletedList });
  }

  public exportWishListToCart = async (body: IExportWishListToCartBody, user: IUser): Promise<IResponseModel> => {
    const filter: any = {
      wishList : new ObjectID(body.id),
      status   : WishProductStatusEnum.approved,
      count    : { $gt: 0 },
      member   : new ObjectID(user._id)
    };
    if (body.creator && body.memberIdList) {
      filter.member = { $in: body.memberIdList.map(item => new ObjectID(item)) };
    }
    const itemCount = await WishProductSchema.countByFilter(filter);
    if (!itemCount) return getResponse(false, 'This is empty');
    const list = await WishProductSchema.getListToExport(filter);
    const data = await getCartList(list, body.language, user.tariffPlan);
    return getResponse(true, 'Exported successfully', {
      wishListId: body.id,
      wishListName: body.wishList.name,
      itemCount,
      itemList: data.itemList,
      deletedList: data.deletedList,
      subTotal: data.subTotal,
      discount: data.discount,
      total: data.total,
      tariffPlan: user.tariffPlan,
      bonus: user.points
    });
  }

  private getProductLists = async (versions: IProductVersion<any, any, any, any>[], products: IProduct<any, any, any, any, any, any, any, any, any>[], language: number) => {
    const [versionList, productList] = await Promise.all([
      await Promise.all(versions.map(async item => {
        const product = await ProductSchema.findOne({ _id: item.product, deleted: false, status: ProductStatusEnum.published, versionsHidden: false });
        if (!product) return;
        const discounted = productHasDiscount(product.discountStartDate, product.discountEndDate);
        let discountedPrice = null;
        if (discounted) {
          const pricing = await ProductPricingSchema.findOne({ product: product._id, fromCount: product.minCount, deleted: false });
          if (pricing && pricing.discount) {
            discountedPrice = getDiscountedPrice(item.price, pricing.discount);
          }
        }
        const imageId = item.photo ? item.photo : product.images[0];
        const [file, translation, attributes] = await Promise.all([
          await FileSchema.findById(imageId).select({ path: 1 }),
          await ProductTranslationSchema.findOne({ product: product._id, language: language }),
          await Promise.all(item.attributes.map(async item => {
            const [attributeTranslation, optionTranslation] = await Promise.all([
              await AttributeTranslationSchema.findOne({ attribute: item.attribute, language: language }),
              await OptionTranslationSchema.findOne({ option: item.option, language: language })
            ]);
            return {
              attributeId: item.attribute,
              attributeName: attributeTranslation ? attributeTranslation.name : null,
              optionId: item.option,
              optionName: optionTranslation ? optionTranslation.name : null
            };
          }))
        ]);
        const filePath = file && file.path ? mainConfig.BASE_URL + file.path : null;
        const name = translation ? translation.name : null;
        return {
          productId: product._id,
          versionId: item._id,
          name,
          filePath,
          attributes,
          discountedPrice,
          defaultPrice: item.price,
          minCount: product.minCount
        };
      })),
      await Promise.all(products.map(async item => {
        const discounted = productHasDiscount(item.discountStartDate, item.discountEndDate);
        let discountedPrice = null;
        if (discounted) {
          const pricing = await ProductPricingSchema.findOne({ product: item._id, fromCount: item.minCount });
          if (pricing && pricing.discount) {
            discountedPrice = getDiscountedPrice(item.defaultPrice, pricing.discount);
          }
        }
        const [image, translation] = await Promise.all([
          await FileSchema.findById(item.images[0]),
          await ProductTranslationSchema.findOne({ product: item._id, language: language }),
        ]);
        return {
          productId: item._id,
          versionId: null,
          name: translation ? translation.name : null,
          filePath: image ? mainConfig.BASE_URL + image.path : null,
          attributes: [],
          discountedPrice,
          minCount: item.minCount,
          defaultPrice: item.defaultPrice
        };
      }))
    ]);
    return { versionList, productList };
  }

  private getPricing = (count: number, pricing: IProductPricing[], minCount: number): IProductPricing => {
    if (count === 0) {
      const price = pricing.find(item => item.fromCount === minCount);
      return price || null;
    } else {
      const filtered = pricing.filter(item => item.fromCount <= count);
      filtered.sort((a, b) => {
        if (a.fromCount >= b.fromCount) {
          return 1;
        }
        if (a.fromCount < b.fromCount) {
          return -1;
        }
      });
      return filtered.length ? filtered[filtered.length - 1] : null;
    }
  }

  private getPriceList = (defaultPrice: number, pricing: IProductPricing[]): Array<{ fromCount: number, price: number }> => {
    const list = pricing.map(item => {
      return {
        fromCount: item.fromCount,
        price: item.discount ? getDiscountedPrice(defaultPrice, item.discount) : null
      };
    });
    return list.filter(item => !!item.price);
  }

}

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

function productHasDiscount(startDate: Date, endDate: Date) {
  let discounted = false;
  if (startDate && endDate && endDate > new Date() && startDate < new Date()) {
    discounted = true;
  } else if (startDate && !endDate && startDate < new Date()) {
    discounted = true;
  } else if (endDate && !startDate && endDate > new Date()) {
    discounted = true;
  } else if (!endDate && !startDate) {
    discounted = true;
  }
  return discounted;
}

export async function isInFavorite(userId: string, productId: string, versionId: string = null) {
  const wishListIdList = await WishListSchema.find({ $or: [{ creator: userId }, { members: userId }] }).distinct('_id');
  const includeArray = await Promise.all(wishListIdList.map(async item => {
    return await isInWishList(userId, item, productId, versionId);
  }));
  let isFavorite = false;
  for (let i = 0; i < includeArray.length; i++) {
    if (includeArray[i]) {
      isFavorite = true;
      break;
    }
  }
  return isFavorite;
}

async function isInWishList(userId: string, wishListId: string, productId: string, versionId: string = null): Promise<boolean> {
  const filter = {
    wishList: wishListId,
    product: productId,
    productVersion: versionId,
    member: userId
  };
  const wishProduct = await WishProductSchema.findOne(filter);
  if (!wishProduct) {
    return false;
  }
  if (wishProduct.status === WishProductStatusEnum.unapproved) return true;
  if (wishProduct.status === WishProductStatusEnum.approved) return !!wishProduct.count;
}

export default new WishListServices();