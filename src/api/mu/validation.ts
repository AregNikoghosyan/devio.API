import * as Joi from 'joi';
import APIError from '../../services/APIError';

import { Response, NextFunction } from 'express';
import { IRequest, getResponse, getErrorResponse } from '../mainModels';
import { languageValidation, idValidation } from '../mainValidation';

import MuSchema from '../../schemas/mu';
import ProductSchema from '../../schemas/product';

import { IAddMuBody, IUpdateMuBody } from './model';
import { ProductStatusEnum } from '../../constants/enums';

export const createMu = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const body: IAddMuBody = req.body;
    const bodyValidationSchema = translateArrayValidation;
    const result = Joi.validate(body, bodyValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    return next();
  } catch (e) {
    new APIError(e, 500, 'createMu function in mu/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const updateMu = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const body: IUpdateMuBody = req.body;
    const bodyValidationSchema = {
      ...idValidation,
      ...translateArrayValidation
    };
    const result = Joi.validate(body, bodyValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const mu = await MuSchema.findOne({ _id: body.id, deleted: false });
    if (!mu) {
      return res.send(getResponse(false, 'Wrong Id'));
    }
    req.body.mu = mu;
    return next();
  } catch (e) {
    new APIError(e, 500, 'updateMu function in mu/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const deleteMu = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const bodyValidationSchema = {
      idList: Joi.array().items(idValidation.id).min(1).required()
     };
    const result = Joi.validate(req.body, bodyValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const [ muCount, product ] = await Promise.all([
      await MuSchema.countDocuments({ _id: { $in: req.body.idList }, deleted: false }),
      await ProductSchema.findOne({ mu: { $in: req.body.idList }, deleted: false, status: { $ne: ProductStatusEnum.preparing } })
    ]);
    if (muCount !== req.body.idList.length) {
      return res.send(getResponse(false, 'Wrong Id list'));
    }
    if (product) {
      return res.send(getResponse(false, 'You can\'t delete mu which is connected to product'));
    }
    return next();
  } catch (e) {
    new APIError(e, 500, 'deleteMu function in mu/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const getMu = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const queryValidationSchema = { ...languageValidation };
    const result = Joi.validate(req.query, queryValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    return next();
  } catch (e) {
    new APIError(e, 500, 'getMu function in mu/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

const translateValidation = {
  ...languageValidation,
  name: Joi.string().min(1).required()
};

const translateArrayValidation = {
  translations: Joi.array().items(translateValidation).length(3).unique('language').required()
};