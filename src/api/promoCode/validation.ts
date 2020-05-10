import * as Joi from 'joi';

import { Response, NextFunction } from 'express';
import { IRequest, getErrorResponse, getResponse } from '../mainModels';
import APIError from '../../services/APIError';
import { ICreatePromoCodeBody, IUpdatePromoCodeBody, IGetPromoCodeListBody } from './model';

import PromoCodeSchema from '../../schemas/promoCode';
import { PromoCodeTypeEnum } from '../../constants/enums';
import { idValidation, pagingValidation } from '../mainValidation';

export const validatePromoCode = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const promoCode: string = req.body.code;
    if (!promoCode) return res.send(getResponse(false, 'Missing promo code'));
    const code = promoCode.replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/ ]/gi, '').trim();
    const validLength = 4;
    if (code.length < validLength) return res.send(getResponse(false, `Promo code must be equal to or greater than ${validLength}`));
    req.body.code = code;
    return next();
  } catch (e) {
    new APIError(e, 500, 'validatePromoCode function in promoCode/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const createPromoCode = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const body: ICreatePromoCodeBody = req.body;
    const bodyValidationSchema = {
      type: Joi.number().equal([1, 2, 3]).required(),
      amount: Joi.number().when('type', {
        is        : Joi.number().equal([1, 2]),
        then      : Joi.number().min(1).required()
      }),
      freeShipping: Joi.boolean().optional(),
      title: Joi.string().min(2).required(),
      code: Joi.string().required(),
      startDate: Joi.date().optional(),
      endDate: Joi.date().when('startDate', {
        is: Joi.exist(),
        then: Joi.date().min(Joi.ref('startDate')),
        otherwise: Joi.date().min(new Date())
      }),
      minPrice: Joi.number().min(1).optional(),
      maxPrice: Joi.number().when('minPrice', {
        is: Joi.exist(),
        then: Joi.number().min(Joi.ref('minPrice')).optional(),
        otherwise: Joi.number().min(1).optional()
      }),
      usageCount: Joi.number().min(1).optional(),
    };
    const result = Joi.validate(body, bodyValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const code = body.code.replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/ ]/gi, '').trim().toUpperCase();
    if (!code || code.length < 4)  {
      return res.send(getResponse(false, `Code must be equal to or greater than ${4}`));
    }
    req.body.code = code;
    if (body.type === PromoCodeTypeEnum.percent && body.amount > 100) {
      return res.send(getResponse(false, 'Wrong amount'));
    }
    const exists = await PromoCodeSchema.findOne({ code, deleted: false });
    if (exists) return res.send(getResponse(false, 'Code must be unique'));
    return next();
  } catch (e) {
    new APIError(e, 500, 'createPromoCode function in promoCode/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const updatePromoCode = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const body: IUpdatePromoCodeBody = req.body;
    const bodyValidationSchema = {
      ...idValidation,
      amount: Joi.number().min(1),
      freeShipping: Joi.boolean().optional(),
      title: Joi.string().min(2).required(),
      startDate: Joi.date().optional(),
      endDate: Joi.date().when('startDate', {
        is: Joi.exist(),
        then: Joi.date().min(Joi.ref('startDate')),
        otherwise: Joi.date().min(new Date())
      }),
      minPrice: Joi.number().min(1).optional(),
      maxPrice: Joi.number().when('minPrice', {
        is: Joi.exist(),
        then: Joi.number().min(Joi.ref('minPrice')).optional(),
        otherwise: Joi.number().min(1).optional()
      }),
      usageCount: Joi.number().min(1).optional(),
    };
    const result = Joi.validate(body, bodyValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const promoCode = await PromoCodeSchema.findOne({ _id: body.id, deleted: false });
    if (!promoCode) return res.send(getResponse(false, 'Wrong Id'));
    if (promoCode.type === PromoCodeTypeEnum.percent && body.amount > 100) {
      return res.send(getResponse(false, 'Wrong amount'));
    }
    if (body.usageCount && promoCode.usedCount > body.usageCount) {
      return res.send(getResponse(false, 'Usage count must be greater than ' + promoCode.usedCount));
    }
    req.body.promoCode = promoCode;
    return next();
  } catch (e) {
    new APIError(e, 500, 'updatePromoCode function in promoCode/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const getPromoCodeDetails = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const result = Joi.validate(req.query, idValidation);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const promoCode = await PromoCodeSchema.findOne({ _id: req.query.id, deleted: false }).select({
      _id: 1,
      type: 1,
      title: 1,
      amount: 1,
      freeShipping: 1,
      code: 1,
      startDate: 1,
      endDate: 1,
      minPrice: 1,
      maxPrice: 1,
      usageCount: 1,
      usedCount: 1
    });
    if (!promoCode) return res.send(getResponse(false, 'Wrong Id'));
    req.body.promoCode = promoCode;
    return next();
  } catch (e) {
    new APIError(e, 500, 'getPromoCodeDetails function in promoCode/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const deletePromoCode = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const result = Joi.validate(req.body, { idList: Joi.array().items(idValidation.id).min(1).required() });
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const count = await PromoCodeSchema.countDocuments({ _id: { $in: req.body.idList }, deleted: false });
    if (count !== req.body.idList.length) {
      return res.send(getResponse(false, 'Wrong id list'));
    }
    return next();
  } catch (e) {
    new APIError(e, 500, 'deletePromoCode function in promoCode/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const getPromoCodeList = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const body: IGetPromoCodeListBody = req.body;
    const bodyValidationSchema = {
      ...pagingValidation,
      search: Joi.string().min(1).optional(),
      status: Joi.number().equal([ 1, 2, 3 ]).optional(),
      type: Joi.number().equal([ 1, 2, 3 ]).optional()
    };
    const result = Joi.validate(body, bodyValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    return next();
  } catch (e) {
    new APIError(e, 500, 'getPromoCodeList function in promoCode/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};