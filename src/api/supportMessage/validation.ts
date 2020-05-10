import * as Joi from 'joi';
import { NextFunction, Response } from 'express';
import { IRequest, getErrorResponse, getResponse } from '../mainModels';
import APIError from '../../services/APIError';
import { pagingValidation } from '../mainValidation';


export const sendSupportMessage = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const result = Joi.validate(req.body, {
      name   : Joi.string().required(),
      email  : Joi.string().email().required(),
      phone  : Joi.string().allow(['', null]).optional(),
      message: Joi.string().required()
    });
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    return next();
  } catch (e) {
    new APIError(e, 500, 'sendSupportMessage function in supportMessage/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const sendEmail = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const result = Joi.validate(req.body, {
      email  : Joi.string().email().required(),
    });
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    return next();
  } catch (e) {
    new APIError(e, 500, 'Email is not valid');
    return res.status(500).send(getErrorResponse());
  }
};

export const getSupportMessageList = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const result = Joi.validate(req.query, pagingValidation);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    req.query.pageNo = +req.query.pageNo;
    req.query.limit = +req.query.limit;
    return next();
  } catch (e) {
    new APIError(e, 500, 'getSupportMessageList function in supportMessage/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};