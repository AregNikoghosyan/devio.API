import * as Joi from 'joi';
import { NextFunction, Response } from 'express';
import { IRequest, getErrorResponse, getResponse } from '../mainModels';
import APIError from '../../services/APIError';


export const createContact = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const result = Joi.validate(req.body, {
      address   : Joi.string().required(),
      email     : Joi.string().email().required(),
      phone     : Joi.string().allow(['', null]).optional(),
      latitude  : Joi.number().required(),
      longitude : Joi.number().required()
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
