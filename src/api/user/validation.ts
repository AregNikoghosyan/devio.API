import * as Joi from 'joi';
import { Response, NextFunction } from 'express';

import APIError from '../../services/APIError';

import { IRequest, getErrorResponse, getResponse } from '../mainModels';
import { IUpdateUserProfileBody, IUpdateUserPhoneBody, IVerifyPhoneBody, IGetUserListBody, ISetUserTariffBody } from './model';
import { phoneNumberRegex, pagingValidation, idValidation, languageValidation } from '../mainValidation';

import UserSchema from '../../schemas/user';
import { verificationCodeLength } from '../../constants/constants';
import { UserTariffTypeEnum, UserTypeEnum } from '../../constants/enums';

export const updateUserProfile = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const body: IUpdateUserProfileBody = req.body;
    const bodyValidationSchema = {
      firstName   : Joi.string().allow('').min(2).required(),
      lastName    : Joi.string().allow('').min(2).required(),
      email       : Joi.string().email().allow('').min(2).required()
    };
    const result = Joi.validate(body, bodyValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    return next();
  } catch (e) {
    new APIError(e, 500, 'updateUserProfile function in user/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const updateUserPhone = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const body: IUpdateUserPhoneBody = req.body;
    const bodyValidationSchema = {
      phoneNumber: Joi.string().regex(phoneNumberRegex).allow('').required()
    };
    const result = Joi.validate(body, bodyValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    if (req.user.phoneNumber === body.phoneNumber && req.user.phoneVerified) {
      return res.send(getResponse(false, 'New phoneNumber must be different than old one'));
    }
    const isNotUnique = await UserSchema.findOne({ _id: { $ne: req.user._id }, phoneNumber: body.phoneNumber, phoneVerified: true });
    if (isNotUnique) return res.send(getResponse(false, 'Phone number is already being used'));
    return next();
  } catch (e) {
    new APIError(e, 500, 'updateUserPhone function in user/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const verifyPhone = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    if (!user.phoneNumber || !user.phoneVerificationCode || user.phoneVerified) {
      return res.send(getResponse(false, 'Wrong user'));
    }
    const body: IVerifyPhoneBody = req.body;
    const bodyValidationSchema = {
      phoneNumber : Joi.string().regex(phoneNumberRegex).required(),
      code        : Joi.string().length(verificationCodeLength).required()
    };
    const result = Joi.validate(body, bodyValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    return next();
  } catch (e) {
    new APIError(e, 500, 'verifyPhone function in user/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const getUserList = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const body: IGetUserListBody = req.body;
    const bodyValidationSchema = {
      ...pagingValidation,
      search      : Joi.string().allow(['', null]).optional(),
      tariffPlan  : Joi.number().equal([UserTariffTypeEnum.usual, UserTariffTypeEnum.gold, UserTariffTypeEnum.silver]).allow(['', null]).optional(),
      requestFrom : Joi.number().min(0).allow(['', null]).optional(),
      requestTo   : Joi.number().min(0).allow(['', null]).optional(),
      orderFrom   : Joi.number().allow(['', null]).min(0).optional(),
      orderTo     : Joi.number().min(0).allow(['', null]).optional(),
    };
    const result = Joi.validate(body, bodyValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    if (body.orderFrom && body.orderTo && body.orderFrom > body.orderTo) {
      return getResponse(false, 'Order to must be larger than order from');
    }
    if (body.requestFrom && body.requestTo && body.requestFrom > body.requestTo) {
      return getResponse(false, 'request to must be larger than request from');
    }
    return next();
  } catch (e) {
    new APIError(e, 500, 'getUserList function in user/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const setUserTariff = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const body: ISetUserTariffBody = req.body;
    const bodyValidationSchema = {
      userId: idValidation.id,
      tariffPlan: Joi.number().equal([UserTariffTypeEnum.usual, UserTariffTypeEnum.silver, UserTariffTypeEnum.gold]).required()
    };
    const result = Joi.validate(body, bodyValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const user = await UserSchema.findOne({
      _id: body.userId,
      role: UserTypeEnum.user,
      passwords: { $exists: true, $not: { $size: 0 } }
    });
    if (!user) return res.send(getResponse(false, 'Wrong user Id'));
    req.body.user = user;
    return next();
  } catch (e) {
    new APIError(e, 500, 'setUserTariff function in user/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const getUserDetails = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const result = Joi.validate(req.query, idValidation);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const user = await UserSchema.findOne({
      _id: req.query.id,
      role: UserTypeEnum.user,
      passwords: { $exists: true, $not: { $size: 0 } }
    });
    if (!user) return res.send(getResponse(false, 'Wrong user Id'));
    req.body.user = user;
    return next();
  } catch (e) {
    new APIError(e, 500, 'getUserDetails function in user/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const getUserOrders = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const query = req.query;
    const queryValidationSchema = {
      ...idValidation,
      ...pagingValidation
    };
    const result = Joi.validate(query, queryValidationSchema);
    if (result.error) return res.send(getResponse(false, result.error.details[0].message));
    req.query.pageNo = +req.query.pageNo;
    req.query.limit = +req.query.limit;
    return next();
  } catch (e) {
    new APIError(e, 500, 'getUserOrders function in user/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const getUserRequests = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const query = req.query;
    req.query.language = +req.headers['language'];
    const queryValidationSchema = {
      ...idValidation,
      ...languageValidation,
      ...pagingValidation
    };
    const result = Joi.validate(query, queryValidationSchema);
    if (result.error) return res.send(getResponse(false, result.error.details[0].message));
    req.query.pageNo = +req.query.pageNo;
    req.query.limit = +req.query.limit;
    return next();
  } catch (e) {
    new APIError(e, 500, 'getUserRequests function in user/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const getUserCountByFilter = async(req: IRequest, res: Response, next: NextFunction) => {
  try {
    const body = req.body;
    const bodyValidationSchema = {
      filters: Joi.array().items({
        search     : Joi.string().allow(['', null]).optional(),
        orderFrom  : Joi.number().allow(['', null]).min(0).optional(),
        orderTo    : Joi.number().allow(['', null]).min(0).optional(),
        requestFrom: Joi.number().allow(['', null]).min(0).optional(),
        requestTo  : Joi.number().allow(['', null]).min(0).optional(),
        tariffPlan : Joi.number().equal([UserTariffTypeEnum.gold, UserTariffTypeEnum.silver, UserTariffTypeEnum.usual]).allow([null, '']).optional()
      }).min(0).required()
    };
    const result = Joi.validate(body, bodyValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    return next();
  } catch (e) {
    new APIError(e, 500, 'getUserCountByFilter function in user/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const blockOrUnBlockUser = async(req: IRequest, res: Response, next: NextFunction) => {
  try {
    const result = Joi.validate(req.body, idValidation);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const user = await UserSchema.findOne({ _id: req.body.id });
    if (!user) return res.send(getResponse(false, 'Wrong Id'));
    req.body.user = user;
    return next();
  } catch (e) {
    new APIError(e, 500, 'getUserCountByFilter function in user/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};