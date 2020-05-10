import * as Joi from 'joi';
import { Response, NextFunction } from 'express';

import APIError from '../../services/APIError';

import { IRequest, getErrorResponse, getResponse } from '../mainModels';
import {
  ICreateWishListBody,
  IGetWishListsQuery,
  IGetWishListDetailsQuery,
  IAddProductToDeviceWishListBody,
  IGetDeviceWishListQuery,
  IProductToUserWishListAction,
  IApproveProductInWishListBody,
  IRemoveProductFromDeviceWishListBody,
  IGetWishListShortListQuery,
  IChangeProductCounterInWishListBody,
  IDeleteProductFromUserWishListBody,
  IRemoveMemberFromWishListBody,
  IGetProductListInWishListBody,
  IGetGuestWishListProductsBody,
  IExportWishListToCartBody
} from './model';
import { idRegex, languageValidation, pagingValidation, idValidation, countRemainder } from '../mainValidation';

import WishListSchema           from '../../schemas/wishList';
import WishProductSchema        from '../../schemas/wishProduct';
import CompanySchema            from '../../schemas/company';
import ProductSchema            from '../../schemas/product';
import ProductVersionSchema     from '../../schemas/productVersion';
import WishInvitationSchema     from '../../schemas/wishInvitation';

import { ProductStatusEnum, WishProductStatusEnum } from '../../constants/enums';
import { IWishProduct } from '../../schemas/wishProduct/model';
import { IProduct } from '../../schemas/product/model';

export const createWishList = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const body: ICreateWishListBody = req.body;
    const bodyValidationSchema = {
      companyId: Joi.string().regex(idRegex).optional(),
      name: Joi.string().min(2).required()
    };
    const result = Joi.validate(body, bodyValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    if (body.companyId) {
      const company = await CompanySchema.findOne({ _id: body.companyId, user: req.user.id });
      if (!company) {
        return res.send(getResponse(false, 'Wrong Id'));
      }
    }
    return next();
  } catch (e) {
    new APIError(e, 500, 'createWishList function in wishList/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const updateWishList = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const body = req.body;
    const bodyValidationSchema = {
      ...idValidation,
      name: Joi.string().min(2).required()
    };
    const result = Joi.validate(body, bodyValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const wishList = await WishListSchema.findOne({ _id: body.id, creator: req.user._id });
    if (!wishList) {
      return res.send(getResponse(false, 'Wrong Id'));
    }
    req.body.wishList = wishList;
    return next();
  } catch (e) {
    new APIError(e, 500, 'updateWishList function in wishList/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const getWishLists = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    req.query.language = +req.headers['language'];
    const query: IGetWishListsQuery = req.query;
    const queryValidationSchema = {
      ...languageValidation,
      ...pagingValidation,
      type: Joi.number().min(1).max(2).optional()
    };
    const result = Joi.validate(query, queryValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    return next();
  } catch (e) {
    new APIError(e, 500, 'getWishLists function in wishList/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const getWishListShortList = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const query: IGetWishListShortListQuery = req.query;
    const queryValidationSchema = {
      productId        : idValidation.id,
      productVersionId : Joi.string().regex(idRegex).optional()
    };
    const result = Joi.validate(query, queryValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const [ product, productVersion ] = await Promise.all([
      await ProductSchema.findOne({ _id: query.productId, status: ProductStatusEnum.published, deleted: false }),
      await ProductVersionSchema.countDocuments({ product: query.productId, deleted: false })
    ]);
    if (!product) {
      return res.send(getResponse(false, 'Wrong productId'));
    }
    if (product.versions.length && !query.productVersionId) {
      return res.send(getResponse(false, 'Missing version Id'));
    }
    if (!product.versions.length && query.productVersionId) {
      return res.send(getResponse(false, 'Version Id is not allowed'));
    }
    if (query.productVersionId && !productVersion) {
      return res.send(getResponse(false, 'Wrong productVersionId'));
    }
    return next();
  } catch (e) {
    new APIError(e, 500, 'getWishListShortList function in wishList/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const getWishListDetails = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const query: IGetWishListDetailsQuery = req.query;
    const queryValidationSchema = {
      ...idValidation
    };
    const result = Joi.validate(query, queryValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const wishList = await WishListSchema.findOne({ _id: query.id, $or: [ { creator: req.user._id }, { members: req.user._id } ] });
    if (!wishList) {
      return res.send(getResponse(false, 'Wrong wish list id'));
    }
    return next();
  } catch (e) {
    new APIError(e, 500, 'getWishListDetails function in wishList/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const productToUserWishListAction = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const body: IProductToUserWishListAction = req.body ;
    const bodyValidationSchema = {
      productId        : idValidation.id,
      productVersionId : Joi.string().regex(idRegex).optional(),
      actions          : Joi.array().items(
        Joi.object().keys({
          wishListId : idValidation.id,
          action     : Joi.number().min(1).max(2).required()
        })
      ).unique('wishListId').required()
    };
    const result = Joi.validate(body , bodyValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const wishIds = body.actions.map(item => item.wishListId);
    const [ product, productVersion, wishLists ] = await Promise.all([
      await ProductSchema.findOne({ _id: body.productId, deleted: false, status: ProductStatusEnum.published }),
      await ProductVersionSchema.findOne({ _id: body.productVersionId, product: body.productId, deleted: false }),
      await WishListSchema.find({ _id: { $in: wishIds }, $or: [ { creator: req.user._id }, { members: req.user._id } ] })
    ]);
    if (!product) {
      return res.send(getResponse(false, 'Wrong product id'));
    }
    if (wishLists.length !== wishIds.length) {
      return res.send(getResponse(false, 'Wrong wish list id list'));
    }
    if (body.productVersionId && !productVersion) {
      return res.send(getResponse(false, 'Wrong product versionId'));
    }
    if (!product.versions.length && body.productVersionId) {
      return res.send(getResponse(false, 'Version ID is not allowed'));
    }
    if (!body.productVersionId && product.versions.length) {
      return res.send(getResponse(false, 'You must specify the version of product'));
    }
    req.body.wishLists = wishLists;
    return next();
  } catch (e) {
    new APIError(e, 500, 'productToUserWishListAction function in wishList/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const getUnapprovedProductList = async(req: IRequest, res: Response, next: NextFunction) => {
  try {
    req.body.language = +req.headers['language'];
    const body = req.body;
    const bodyValidationSchema = {
      ...idValidation,
      skip: Joi.number().min(0).required(),
      limit: Joi.number().min(1).required(),
      ...languageValidation
    };
    const result = Joi.validate(body, bodyValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const wishList = await WishListSchema.findOne({
      _id: body.id,
      $or: [
        { creator: req.user._id },
        { members: req.user._id }
      ]
    });
    if (!wishList) return res.send(getResponse(false, 'Wrong Id'));
    req.body.isCreator = req.user._id.toString() === wishList.creator.toString();
    return next();
  } catch (e) {
    new APIError(e, 500, 'getUnapprovedProductList function in wishList/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const approveProductInWishList = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const body: IApproveProductInWishListBody = req.body ;
    const bodyValidationSchema = {
      wishListId: idValidation.id,
      productId: Joi.number().min(1).required()
    };
    const result = Joi.validate(body, bodyValidationSchema);
    if ( result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const [ wishList, wishProductList ] = await Promise.all([
      await WishListSchema.findOne({ _id: body.wishListId, creator: req.user._id }),
      await WishProductSchema.find({ wishList: body.wishListId, uniqueIdentifier: body.productId, status: WishProductStatusEnum.unapproved })
    ]);
    if (!wishList) return res.send(getResponse(false, 'Wrong Wish list Id'));
    if (!wishProductList.length) return res.send(getResponse(false, 'Wrong wish product Id'));
    req.body.wishList = wishList;
    req.body.wishProductList = wishProductList;
    return next();
  } catch (e) {
    new APIError(e, 500, 'approveProductInWishList function in wishList/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const cancelProductRequestInWishList = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const body: IApproveProductInWishListBody = req.body ;
    const bodyValidationSchema = {
      wishListId: idValidation.id,
      productId: Joi.number().min(1).required()
    };
    const result = Joi.validate(body, bodyValidationSchema);
    if ( result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const wishList = await WishListSchema.findOne({
      _id: body.wishListId,
      $or: [
        { creator: req.user._id },
        { members: req.user._id }
      ]
    });
    if (!wishList) return res.send(getResponse(false, 'Wrong WishList ID'));
    const isCreator = wishList.creator.toString() === req.user._id.toString();
    const filter = {
      wishList: body.wishListId,
      uniqueIdentifier: body.productId,
      status: WishProductStatusEnum.unapproved
    };
    let deleteIdList = [];
    let userList = [];
    if (isCreator) {
      const requestedList = await WishProductSchema.find({
        ...filter
      });
      if (!requestedList.length) return res.send(getResponse(false, 'Wrong product Id'));
      deleteIdList = requestedList.map(item => item._id);
      userList = requestedList.map(item => item.member.toString());
    } else {
      const wishProduct = await WishProductSchema.findOne({
        ...filter,
        member: req.user._id
      });
      if (!wishProduct) return res.send(getResponse(false, 'Wrong product Id'));
      deleteIdList.push(wishProduct._id);
    }
    req.body.deleteIdList = deleteIdList;
    req.body.userList = userList.length ? userList : null;
    return next();
  } catch (e) {
    new APIError(e, 500, 'cancelProductRequestInWishList function in wishList/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const changeProductCounterInWishList = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const body: IChangeProductCounterInWishListBody = req.body;
    const bodyValidationSchema = {
      wishListId: idValidation.id,
      productId: Joi.number().min(1).required(),
      sum: Joi.number().required()
    };
    const result = Joi.validate(body , bodyValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const wishProduct: IWishProduct<string, IProduct, string, string> = await WishProductSchema.findOne({
      wishList: body.wishListId,
      uniqueIdentifier: body.productId,
      member: req.user._id,
    }).populate('product');
    if (!wishProduct) return res.send(getResponse(false, 'Wrong data set'));
    let wrongSum = false;
    if (body.sum) {
      const isDividable = countRemainder(body.sum, wishProduct.product.step);
      if (isDividable.remainder) wrongSum = true;
    }
    if (wrongSum) return res.send(getResponse(false, 'Wrong sum'));
    req.body.wishProduct = wishProduct;
    return next();
  } catch (e) {
    new APIError(e, 500, 'changeProductCounterInWishList function in wishList/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const deleteProductFromUserWishList = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const body: IDeleteProductFromUserWishListBody = req.body ;
    const bodyValidationSchema = {
      wishListId: idValidation.id,
      wishProductId: Joi.number().min(1).required()
    };
    const result = Joi.validate(body , bodyValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const [ wishList, wishProduct ] = await Promise.all([
      await WishListSchema.findOne({ _id: body.wishListId, creator: req.user._id }),
      await WishProductSchema.findOne({ uniqueIdentifier: body.wishProductId, wishList: body.wishListId })
    ]);
    if (!wishList) {
      return res.send(getResponse(false, 'Wrong wishListId'));
    }
    if (!wishProduct) {
      return res.send(getResponse(false, 'Wrong wishProductId'));
    }
    req.body.wishProduct = wishProduct;
    return next();
  } catch (e) {
    new APIError(e, 500, 'deleteProductFromUserWishList function in wishList/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const generateInvitationLink = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const result = Joi.validate(req.body, idValidation);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const wishList = await WishListSchema.findOne({
      _id: req.body.id,
      creator: req.user._id
    });
    if (!wishList) return res.send(getResponse(false, 'Wrong Id'));
    req.body.wishList = wishList;
    return next();
  } catch (e) {
    new APIError(e, 500, 'generateInvitationLink function in wishList/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const joinToWishList = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const result = Joi.validate(req.body, { code: req.body.code });
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const invitation = await WishInvitationSchema.findOne({
      code: req.body.code,
      createdDt: { $gt: new Date(Date.now() - 1000 * 60 * 60 * 60 * 72 ) }
    });
    if (!invitation) {
      return res.send(getResponse(false, 'Wrong invitation code'));
    }
    const wishList = await WishListSchema.findOne({
      _id: invitation.wishList,
      creator: { $ne: req.user._id },
      members: { $ne: req.user._id }
    });
    if (!wishList) {
      return res.send(getResponse(false, 'Wrong invitation code'));
    }
    req.body.wishList = wishList;
    return next();
  } catch (e) {
    new APIError(e, 500, 'joinToWishList function in wishList/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const getMemberList = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const result = Joi.validate(req.query, idValidation);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const wishList = await WishListSchema.findOne({
      _id: req.query.id,
      creator: req.user._id
    });
    if (!wishList) {
      return res.send(getResponse(false, 'Wrong Id'));
    }
    req.body.wishList = wishList;
    return next();
  } catch (e) {
    new APIError(e, 500, 'getMemberList function in wishList/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const removeMembersFromWishList = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const body: IRemoveMemberFromWishListBody = req.body ;
    const bodyValidationSchema = {
      wishListId   : idValidation.id,
      memberIdList : Joi.array().items(idValidation.id).required()
    };
    const result = Joi.validate(body , bodyValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    if (body.memberIdList.includes(req.user._id.toString())) {
      return res.send(getResponse(false, 'Wrong members list'));
    }
    const wishList = await WishListSchema.findOne({ _id: body.wishListId, creator: req.user._id, members: { $all: body.memberIdList } });
    if (!wishList) {
      return res.send(getResponse(false, 'Wrong Id'));
    }
    req.body.wishList = wishList;
    return next();
  } catch (e) {
    new APIError(e, 500, 'removeMemberFromWishList function in wishList/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const leaveWishList = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const result = Joi.validate(req.query, idValidation);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const wishList = await WishListSchema.findOne({ _id: req.query.id, members: req.user._id });
    if (!wishList) return res.send(getResponse(false, 'Wrong Id'));
    req.body.wishList = wishList;
    return next();
  } catch (e) {
    new APIError(e, 500, 'leaveWishList function in wishList/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const deleteWishList = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    if (req.query.id) req.body.id = req.query.id;
    const body = req.body ;
    const bodyValidationSchema = {
      ...idValidation
    };
    const result = Joi.validate(body , bodyValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const wishList = await WishListSchema.findOne({ _id: body.id, creator: req.user._id });
    if (!wishList) {
      return res.send(getResponse(false, 'Wrong Id'));
    }
    req.body.wishList = wishList;
    return next();
  } catch (e) {
    new APIError(e, 500, 'removeMemberFromWishList function in wishList/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const getProductListInWishList = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    req.body.language = +req.headers['language'];
    const body: IGetProductListInWishListBody = req.body ;
    const bodyValidationSchema = {
      ...idValidation,
      skip: Joi.number().min(0).required(),
      limit: Joi.number().min(1).required(),
      ...languageValidation,
      memberIdList: Joi.array().items(idValidation.id).min(1).optional(),
    };
    const bodyResult = Joi.validate(body , bodyValidationSchema);
    if (bodyResult.error) {
      return res.send(getResponse(false, bodyResult.error.details[0].message));
    }
    const wishList = await WishListSchema.findOne({ _id: body.id, $or: [ { creator: req.user._id }, { members: req.user._id } ] });
    if (!wishList) {
      return res.send(getResponse(false, 'Wrong Id'));
    }
    req.body.creator = wishList.creator.toString() === req.user._id.toString();
    return next();
  } catch (e) {
    new APIError(e, 500, 'getProductListInWishList function in wishList/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const getGuestWishListProducts = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    req.body.language = +req.headers['language'];
    const body: IGetGuestWishListProductsBody = req.body;
    const bodyValidationSchema = {
      ...languageValidation,
      idList: Joi.array().items(idValidation.id).unique().min(1).required()
    };
    const result = Joi.validate(body, bodyValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    return next();
  } catch (e) {
    new APIError(e, 500, 'getGuestWishListProducts function in wishList/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const exportWishListToCart = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    req.body.language = +req.headers['language'];
    const body: IExportWishListToCartBody = req.body;
    const bodyValidationSchema = {
      ...idValidation,
      ...languageValidation,
      memberIdList: Joi.array().items(idValidation.id).min(1).optional(),
    };
    const result = Joi.validate(body, bodyValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const wishList = await WishListSchema.findOne({
      _id: body.id,
      $or: [
        { creator: req.user._id },
        { members: req.user._id }
      ]
    });
    if (!wishList) return res.send(getResponse(false, 'Wrong Id'));
    req.body.creator = wishList.creator.toString() === req.user._id.toString();
    req.body.wishList = wishList;
    return next();
  } catch (e) {
    new APIError(e, 500, 'exportWishListToCart function in wishList/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};