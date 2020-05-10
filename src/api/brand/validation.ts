import * as Joi from 'joi';
import APIError from '../../services/APIError';

import { Response, NextFunction } from 'express';
import { IRequest, getResponse, getErrorResponse } from '../mainModels';
import { idValidation, pagingValidation, idRegex, regexpEscape } from '../mainValidation';

import BrandSchema from '../../schemas/brand';
import CategorySchema from '../../schemas/category';

import { ICreateBrandBody, IUpdateBrandBody, IGetBrandListBody, IGetBrandListForAutoCompleteQuery, IGetBrandListForFilterBody } from './model';
import { deleteFiles } from '../../services/fileManager';

export const createBrand = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const body: ICreateBrandBody = req.body;
    const bodyValidationSchema = {
      name: Joi.string().min(1).required()
    };
    const result = Joi.validate(body, bodyValidationSchema);
    if (result.error) {
      if (req.file) deleteFiles([req.file.path], false);
      return res.send(getResponse(false, result.error.details[0].message));
    }
    if (!req.file) {
      return res.send(getResponse(false, 'Missing logo'));
    }
    const check = await BrandSchema.findOne({ upperCaseName: body.name.toUpperCase() });
    if (check) {
      if (req.file) deleteFiles([req.file.path], false);
      return res.send(getResponse(false, 'Name must be unique'));
    }
    return next();
  } catch (e) {
    new APIError(e, 500, 'createBrand function in brand/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const updateBrand = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const body: IUpdateBrandBody = req.body;
    const bodyValidationSchema = {
      ...idValidation,
      name: Joi.string().min(1).optional()
    };
    const result = Joi.validate(body, bodyValidationSchema);
    if (result.error) {
      if (req.file) deleteFiles([req.file.path], false);
      return res.send(getResponse(false, result.error.details[0].message));
    }
    if (!req.file && !body.name) {
      return res.send(getResponse(false, 'Missing data'));
    }
    const brand = await BrandSchema.findById(body.id);
    if (!brand) {
      if (req.file) deleteFiles([req.file.path], false);
      return res.send(getResponse(false, 'Wrong Id'));
    }
    if (body.name) {
      const check = await BrandSchema.findOne({ _id: { $ne: body.id }, upperCaseName: body.name.toUpperCase() });
      if (check) {
        if (req.file) deleteFiles([req.file.path], false);
        return res.send(getResponse(false, 'Name must be unique'));
      }
    }
    req.body.brand = brand;
    return next();
  } catch (e) {
    new APIError(e, 500, 'updateBrand function in brand/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const getBrandListForAdmin = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const body: IGetBrandListBody = req.body;
    const bodyValidationSchema = {
      ...pagingValidation,
      search : Joi.string().min(1).optional(),
      countFrom: Joi.number().min(0).optional(),
      countTo: Joi.number().min(0).optional()
    };
    const result = Joi.validate(body, bodyValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    if (body.countFrom && body.countTo && body.countFrom > body.countTo) {
      return res.send(getResponse(false, 'Count from must be less than or equal to count to'));
    }
    return next();
  } catch (e) {
    new APIError(e, 500, 'getBrandListForAdmin function in brand/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const getBrandListForAll = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const query: IGetBrandListBody = req.query;
    const queryValidationSchema = {
      ...pagingValidation,
      search : Joi.string().min(1).optional()
    };
    const result = Joi.validate(query, queryValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    return next();
  } catch (e) {
    new APIError(e, 500, 'getBrandListForAll function in brand/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const getListForAutoComplete = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const query: IGetBrandListForAutoCompleteQuery = req.query;
    const queryValidationSchema = {
      all    : Joi.boolean().required(),
      search : Joi.string().min(1).optional()
    };
    const result = Joi.validate(query, queryValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    return next();
  } catch (e) {
    new APIError(e, 500, 'getListForAutoComplete function in brand/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const getListForFilter = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const body: IGetBrandListForFilterBody = req.body;
    const bodyValidationSchema = {
      ...pagingValidation,
      categoryId: Joi.string().regex(idRegex).allow('').optional(),
      search: Joi.string().allow('').optional()
    };
    const result = Joi.validate(body, bodyValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    if (body.categoryId) {
      const category = await CategorySchema.findOne({
        _id: body.categoryId,
        $or: [
          { itemCountInSub: { $gt: 0 } },
          { itemCount: { $gt: 0 } },
        ],
        deleted: false,
        isHidden: false
      });
      if (!category) return res.send(getResponse(false, 'Wrong category Id'));
      req.body.category = category;
    }
    if (body.search) {
      req.body.search = regexpEscape(body.search);
    }
    return next();
  } catch (e) {
    new APIError(e, 500, 'getListForFilter function in brand/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const deleteBrands =  async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const body = req.body;
    const bodyValidationSchema = {
      idList: Joi.array().items(idValidation.id).min(1).required()
    };
    const result = Joi.validate(body, bodyValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const count = await BrandSchema.countDocuments({ _id: { $in: body.idList } });
    if (count !== body.idList.length) {
      return res.send(getResponse(false, 'Wrong Id list'));
    }
    return next();
  } catch (e) {
    new APIError(e, 500, 'getListForAutoComplete function in brand/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};