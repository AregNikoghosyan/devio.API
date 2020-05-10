import { Response, NextFunction } from 'express';
import * as Joi from 'joi';

import APIError from '../../services/APIError';
import { getErrorResponse, IRequest, getResponse } from '../mainModels';
import { ICreateAddressBody, IDeleteAddressQuery, IGetAddressMainListQuery, IGetAddressDetailsQuery, IUpdateAddressBody } from './model';
import { cityPhoneNumberRegex, idValidation, pagingValidation, idRegex } from '../mainValidation';

import AddressSchema from '../../schemas/address';

export const createAddress = async(req: IRequest, res: Response, next: NextFunction) => {
  try {
    const body: ICreateAddressBody = req.body;
    const bodyValidationSchema = {
      address            : Joi.string().required(),
      lat                : Joi.number().required(),
      lng                : Joi.number().required(),
      house              : Joi.number().min(1).optional(),
      apartment          : Joi.number().min(1).optional(),
      contactName        : Joi.string().required(),
      contactPhoneNumber : Joi.string().regex(cityPhoneNumberRegex).required(),
      isDefault          : Joi.boolean().optional()
    };
    const result = Joi.validate(body, bodyValidationSchema, { allowUnknown: true });
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    return next();
  } catch (e) {
    new APIError(e, 500, 'createAddress function in address/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const deleteAddress = async(req: IRequest, res: Response, next: NextFunction) => {
  try {
    const query: IDeleteAddressQuery = req.query;
    const queryValidationSchema = idValidation;
    const result = Joi.validate(query, queryValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const address = await AddressSchema.findOne({ _id: query.id, user: req.user._id });
    if (!address) {
      return res.send(getResponse(false, 'Wrong Id'));
    }
    req.body.address = address;
    return next();
  } catch (e) {
    new APIError(e, 500, 'deleteAddress function in address/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const getAddressMainList = async(req: IRequest, res: Response, next: NextFunction) => {
  try {
    const query: IGetAddressMainListQuery = req.query;
    const queryValidationSchema = pagingValidation;
    const result = Joi.validate(query, queryValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    return next();
  } catch (e) {
    new APIError(e, 500, 'getAddressMainList function in address/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const getAddressDetails = async(req: IRequest, res: Response, next: NextFunction) => {
  try {
    const query: IGetAddressDetailsQuery = req.query;
    const queryValidationSchema = idValidation;
    const result = Joi.validate(query, queryValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const address = await AddressSchema.findOne({ _id: query.id, user: req.user._id })
      .select({ user: 0, company: 0, createdDt: 0, updatedDt: 0, __v: 0 });
    if (!address) {
      return res.send(getResponse(false, 'Wrong Id'));
    }
    req.body.address = address;
    return next();
  } catch (e) {
    new APIError(e, 500, 'getAddressDetails function in address/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const updateAddress = async(req: IRequest, res: Response, next: NextFunction) => {
  try {
    const body: IUpdateAddressBody = req.body;
    const bodyValidationSchema = {
      ...idValidation,
      address            : Joi.string().required(),
      lat                : Joi.number().required(),
      lng                : Joi.number().required(),
      house              : Joi.number().min(1).optional(),
      apartment          : Joi.number().min(1).optional(),
      contactName        : Joi.string().required(),
      contactPhoneNumber : Joi.string().regex(cityPhoneNumberRegex).required(),
      isDefault          : Joi.boolean().optional()
    };
    const result = Joi.validate(body, bodyValidationSchema, { allowUnknown: true });
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const address = await AddressSchema.findOne({ _id: body.id, user: req.user._id });
    if (!address) {
      return getResponse(false, 'Wrong Id');
    }
    req.body.addressObj = address;
    return next();
  } catch (e) {
    new APIError(e, 500, 'updateAddress function in address/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};