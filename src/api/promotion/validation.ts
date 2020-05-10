import * as Joi from 'joi';
import { Response, NextFunction } from 'express';
import { IRequest, getResponse, getErrorResponse } from '../mainModels';
import APIError from '../../services/APIError';

import { idValidation, languageValidation, idRegex, pagingValidation, countRemainder } from '../mainValidation';

import { IAddPromotionBody, IUpdatePromotionBody } from './model';
import { PromotionTypeEnum, ProductStatusEnum } from '../../constants/enums';
import { deleteFiles } from '../../services/fileManager';

import PromotionSchema from '../../schemas/promotion';
import CategorySchema from '../../schemas/category';
import ProductSchema from '../../schemas/product';


export const addPromotion = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const body: IAddPromotionBody = req.body;
    const bodyValidation = {
      ...translateArrayValidation,
      type: Joi.number().min(1).max(2).required(),
      position: Joi.number().min(1).optional(),
      category: Joi.string().regex(idRegex).when('type', {
        is: Joi.number().equal(PromotionTypeEnum.category),
        then: Joi.required()
      }),
      product: Joi.string().regex(idRegex).when('type', {
        is: Joi.number().equal(PromotionTypeEnum.product),
        then: Joi.required()
      }),
    };
    const result = Joi.validate(body, bodyValidation);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    if (body.category) {
      const category = await CategorySchema.findOne({ _id: body.category, deleted: false, isHidden: false });
      if (!category) return res.send(getResponse(false, 'Wrong or hidden category Id'));
    }
    if (body.product) {
      const product = await ProductSchema.findOne({ _id: body.product, deleted: false, status: ProductStatusEnum.published, versionsHidden: false });
      if (!product) return res.send(getResponse(false, 'Wrong or hidden product Id'));
    }
    return next();
  } catch (e) {
    new APIError(e, 500, 'addPromotion function in promotion/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const setPromotionCover = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      return res.send(getResponse(false, 'Missing image'));
    }
    const result = Joi.validate(req.body, idValidation);
    if (result.error) {
      deleteFiles([req.file.path], false).catch(e => console.log(e));
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const promotion = await PromotionSchema.findById(req.body.id);
    if (!promotion) {
      deleteFiles([req.file.path], false).catch(e => console.log(e));
      return res.send(getResponse(false, 'Wrong Id'));
    }
    req.body.promotion = promotion;
    return next();
  } catch (e) {
    new APIError(e, 500, 'setPromotionCover function in promotion/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const updatePromotion = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const body: IUpdatePromotionBody = req.body;
    const bodyValidation = {
      id: idValidation.id,
      ...translateArrayValidation,
      type: Joi.number().min(1).max(2).required(),
      position: Joi.number().min(1).required(),
      category: Joi.string().regex(idRegex).when('type', {
        is: Joi.number().equal(PromotionTypeEnum.category),
        then: Joi.required()
      }),
      product: Joi.string().regex(idRegex).when('type', {
        is: Joi.number().equal(PromotionTypeEnum.product),
        then: Joi.required()
      }),
    };
    const result = Joi.validate(body, bodyValidation);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const promotion = await PromotionSchema.findById(body.id);
    if (!promotion) {
      return res.send(getResponse(false, 'Wrong Id'));
    }
    req.body.promotion = promotion;
    if (body.category) {
      const category = await CategorySchema.findOne({ _id: body.category, deleted: false, isHidden: false });
      if (!category) return res.send(getResponse(false, 'Wrong or hidden category Id'));
    }
    if (body.product) {
      const product = await ProductSchema.findOne({ _id: body.product, deleted: false, status: ProductStatusEnum.published });
      if (!product) return res.send(getResponse(false, 'Wrong or hidden product Id'));
    }
    return next();
  } catch (e) {
    new APIError(e, 500, 'updatePromotion function in promotion/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const hideOrUnHidePromotion = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const result = Joi.validate(req.body, idValidation);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const promotion = await PromotionSchema.findById(req.body.id);
    if (!promotion) return res.send(getResponse(false, 'Wrong Id'));
    req.body.promotion = promotion;
    return next();
  } catch (e) {
    new APIError(e, 500, 'hideOrUnHidePromotion function in promotion/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const deletePromotions = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const result = Joi.validate(req.body, { idList: Joi.array().items(idValidation.id).min(1).required() });
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const promotionCount = await PromotionSchema.countDocuments({ _id: { $in: req.body.idList } });
    if (promotionCount !== req.body.idList.length) {
      return res.send(getResponse(false, 'Wrong Id List'));
    }
    return next();
  } catch (e) {
    new APIError(e, 500, 'deletePromotions function in promotion/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const getListForAdmin = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const queryValidationSchema = { 
      ...pagingValidation,
      ...languageValidation
     };
    const result = Joi.validate(req.query, queryValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    req.query.limit = +req.query.limit;
    req.query.pageNo = +req.query.pageNo;
    req.query.language = +req.query.language;
    return next();
  } catch (e) {
    new APIError(e, 500, 'getListForAdmin function in promotion/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const getDetailsForAdmin = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const queryValidationSchema = { ...idValidation };
    const result = Joi.validate(req.query, queryValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const promotion = await PromotionSchema.findById(req.query.id);
    if (!promotion) {
      return res.send(getResponse(false, 'Wrong Id'));
    }
    return next();
  } catch (e) {
    new APIError(e, 500, 'getDetailsForAdmin function in promotion/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const getListForAll = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const headerResult = Joi.validate(req.headers, languageValidation, { allowUnknown: true });
    if (headerResult.error) {
      return res.send(getResponse(false, headerResult.error.details[0].message));
    }
    const result = Joi.validate(req.query, pagingValidation);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    req.query.pageNo = +req.query.pageNo;
    req.query.limit = +req.query.limit;
    req.query.language = +req.headers['language'];
    return next();
  } catch (e) {
    new APIError(e, 500, 'getDetailsForAdmin function in promotion/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

const translateValidation = {
  ...languageValidation,
  name : Joi.string().min(1).required(),
};
const translateArrayValidation = {
  translations: Joi.array().items(translateValidation).length(3).unique('language').required()
};