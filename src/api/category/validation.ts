import { Response, NextFunction } from 'express';
import * as Joi from 'joi';
import APIError from '../../services/APIError';

import CategorySchema from '../../schemas/category';
import ProductSchema  from '../../schemas/product';

import { IRequest, getResponse, getErrorResponse } from '../mainModels';
import {
  ICreateCategoryBody,
  IUploadCategoryIconBody,
  IUpdateCategoryBody,
  IGetAllCategoriesQuery,
  IGetCategoryListForAdminQuery,
  IHideCategoryQuery,
  IGetShortCategoriesQuery,
  IDeleteCategoryQuery,
  IChangePositionBody,
  IGetCategoryListForDeviceQuery
} from './model';
import { idRegex, languageValidation, idValidation } from '../mainValidation';
import { LanguageEnum } from '../../constants/enums';


export const createCategory = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const body: ICreateCategoryBody = req.body;
    const bodyValidationSchema = {
      ...translateValidationSchema,
      id: Joi.string().regex(idRegex).optional(),
      url: Joi.string().min(3).max(30).allow([null, '']).optional()
    };
    const result = Joi.validate(body, bodyValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    if (body.url) {
      body.url = body.url.replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi, '').split(' ').filter(item => !!item).join('_').toLowerCase();
      const checkUrl = await CategorySchema.findOne({ url: body.url, deleted: false });
      if (checkUrl) return res.send(getResponse(false, 'Category with given url already exists'));
    }
    if (body.id) {
      const parentCategory = await CategorySchema.findOne({ _id: body.id, deleted: false });
      if (!parentCategory) {
        return res.send(getResponse(false, 'Wrong Id'));
      } else {
        req.body.parentCategory = parentCategory;
      }
    }
    return next();
  } catch (e) {
    new APIError(e, 500, 'createCategory function in category/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const uploadCategoryIcon = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      return res.send(getResponse(false, 'Missing icon'));
    }
    const body: IUploadCategoryIconBody = req.body;
    const bodyValidationSchema = {
      id: Joi.string().regex(idRegex).required()
    };
    const result = Joi.validate(body, bodyValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const category = await CategorySchema.findOne({ _id: body.id, pid: null, deleted: false });
    if (!category) {
      return res.send(getResponse(false, 'Wrong Id'));
    }
    req.body.category = category;
    return next();
  } catch (e) {
    new APIError(e, 500, 'uploadCategoryIcon function in category/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const uploadCategoryCover = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      return res.send(getResponse(false, 'Missing cover'));
    }
    const body: IUploadCategoryIconBody = req.body;
    const bodyValidationSchema = {
      id: Joi.string().regex(idRegex).required()
    };
    const result = Joi.validate(body, bodyValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const category = await CategorySchema.findOne({ _id: body.id, pid: null, deleted: false });
    if (!category) {
      return res.send(getResponse(false, 'Wrong Id'));
    }
    req.body.category = category;
    return next();
  } catch (e) {
    new APIError(e, 500, 'uploadCategoryCover function in category/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const updateCategory = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const body: IUpdateCategoryBody = req.body;
    const bodyValidationSchema = {
      ...translateValidationSchema,
      id  : Joi.string().regex(idRegex).required(),
      url : Joi.string().min(3).max(30).allow([ null, '' ]).required()
    };
    const result = Joi.validate(body, bodyValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const category = await CategorySchema.findOne({ _id: body.id, deleted: false });
    if (!category) {
      return res.send(getResponse(false, 'Wrong Id'));
    }
    if (body.url && body.url !== category.url) {
      body.url = body.url.replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi, '').split(' ').filter(item => !!item).join('_').toLowerCase();
      const checkUniqueUrl = await CategorySchema.findOne({ _id: { $ne: body.id }, url: body.url, deleted: false });
      if (checkUniqueUrl) return res.send(getResponse(false, 'Category with this url already exists'));
    }
    req.body.category = category;
    return next();
  } catch (e) {
    new APIError(e, 500, 'updateCategory function in category/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const getAllCategories = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const query: IGetAllCategoriesQuery = req.query;
    const queryValidation = {
      id: Joi.string().regex(idRegex).optional(),
      ...languageValidation,
      search: Joi.string().min(1).optional()
    };
    const result = Joi.validate(query, queryValidation);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    if (query.id) {
      const category = await CategorySchema.findOne({ _id: query.id, isHidden: false, subCategoryCount: { $gt: 0 }, deleted: false });
      if (!category) return res.send(getResponse(false, 'Wrong Id'));
    }
    return next();
  } catch (e) {
    new APIError(e, 500, 'getAllCategories function in category/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const getCategoriesShort = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const query: IGetShortCategoriesQuery = req.query;
    const queryValidation = {
      ...languageValidation,
      search: Joi.string().min(1).optional(),
      pid: Joi.string().regex(idRegex).allow('').optional()
    };
    const result = Joi.validate(query, queryValidation);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    return next();
  } catch (e) {
    new APIError(e, 500, 'getCategoriesShort function in category/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const getCategoryListForAdmin = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const query: IGetCategoryListForAdminQuery = req.query;
    const queryValidation = {
      id: Joi.string().regex(idRegex).optional(),
      productId: Joi.string().regex(idRegex).optional(),
      ...languageValidation
    };
    const result = Joi.validate(query, queryValidation);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    if (query.id) {
      const category = await CategorySchema.findOne({ _id: query.id, subCategoryCount: { $gt: 0 }, deleted: false });
      if (!category) return res.send(getResponse(false, 'Wrong Id'));
    }
    if (query.productId) {
      const product = await ProductSchema.findOne({ _id: query.productId, deleted: false });
      if (!product) return res.send(getResponse(false, 'Wrong product id'));
      req.query.product = product;
    }
    return next();
  } catch (e) {
    new APIError(e, 500, 'getCategoryList function in category/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const getCategoryDetailsForAdmin = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const query = req.query;
    const queryValidation = {
      ...idValidation
    };
    const result = Joi.validate(query, queryValidation);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const category = await CategorySchema.findOne({ _id: query.id, deleted: false }).select({
      _id: 1,
      icon: 1,
      translations: 1,
      pid: 1,
      cover: 1,
      url: 1
    }).lean();
    if (!category) return res.send(getResponse(false, 'Wrong Id'));
    req.body.category = category;
    return next();
  } catch (e) {
    new APIError(e, 500, 'getCategoryDetailsForAdmin function in category/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const hideCategory = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const query: IHideCategoryQuery = req.query;
    const queryValidation = {
      id: Joi.string().regex(idRegex).required(),
    };
    const result = Joi.validate(query, queryValidation);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const category = await CategorySchema.findOne({ _id: query.id, deleted: false });
    if (!category) return res.send(getResponse(false, 'Wrong Id'));
    req.body.category = category;
    return next();
  } catch (e) {
    new APIError(e, 500, 'hideCategory function in category/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const deleteCategory = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const query: IDeleteCategoryQuery = req.query;
    const queryValidation = {
      id: Joi.string().regex(idRegex).required(),
    };
    const result = Joi.validate(query, queryValidation);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const category = await CategorySchema.findOne({ _id: query.id, deleted: false });
    if (!category) {
      return res.send(getResponse(false, 'Wrong Id'));
    }
    req.body.category = category;
    return next();
  } catch (e) {
    new APIError(e, 500, 'deleteCategory function in category/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const changePosition = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const body: IChangePositionBody = req.body;
    const bodyValidation = {
      id       : Joi.string().regex(idRegex).required(),
      position : Joi.number().min(0).required()
    };
    const result = Joi.validate(body, bodyValidation);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const category = await CategorySchema.findOne({ _id: body.id, deleted: false });
    if (!category) return res.send(getResponse(false, 'Wrong Id'));
    req.body.category = category;
    return next();
  } catch (e) {
    new APIError(e, 500, 'changePosition function in category/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const getCategoriesForDevice = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const query: IGetCategoryListForDeviceQuery = req.query;
    if (!req.query.language) req.query.language = +req.headers['language'];
    const queryValidation = {
      id : Joi.string().regex(idRegex).optional(),
      ...languageValidation
    };
    const result = Joi.validate(query, queryValidation);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    if (query.id) {
      const category = await CategorySchema.findOne({ _id: query.id, isHidden: false, subCategoryCount: { $gt: 0 }, deleted: false });
      if (!category) {
        return res.send(getResponse(false, 'Wrong Id'));
      }
    }
    return next();
  } catch (e) {
    new APIError(e, 500, 'getCategoriesForDevice function in category/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const getCategoriesForHover = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    req.query.language = +req.headers['language'];
    const query: IGetCategoryListForDeviceQuery = req.query;
    const queryValidation = {
      ...languageValidation
    };
    const result = Joi.validate(query, queryValidation);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    return next();
  } catch (e) {
    new APIError(e, 500, 'getCategoriesForHover function in category/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const getCategoriesForWebHoverTree = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    req.query.language = +req.headers['language'];
    const query = req.query;
    const queryValidation = {
      ...languageValidation
    };
    const result = Joi.validate(query, queryValidation);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    return next();
  } catch (e) {
    new APIError(e, 500, 'getCategoriesForWebHoverTree function in category/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const getCategoriesForPromotion = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const query: IGetCategoryListForDeviceQuery = req.query;
    const queryValidation = {
      search: Joi.string().allow('').optional()
    };
    const result = Joi.validate(query, queryValidation);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    return next();
  } catch (e) {
    new APIError(e, 500, 'getCategoriesForPromotion function in category/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const getHomeTree = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const result = Joi.validate(+req.headers['language'], Joi.number().equal([LanguageEnum.hy, LanguageEnum.ru, LanguageEnum.en]).required());
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    return next();
  } catch (e) {
    new APIError(e, 500, 'getHomeTree function in category/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const getSubTree = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    req.query.language = +req.headers['language'];
    const result = Joi.validate(req.query, {
      ...languageValidation,
      ...idValidation
    });
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const category = await CategorySchema.findOne({
      _id: req.query.id,
      deleted: false
    });
    if (!category) return res.send(getResponse(false, 'Wrong Id'));
    req.body.category = category;
    req.body.language = req.query.language;
    return next();
  } catch (e) {
    new APIError(e, 500, 'getSubTree function in category/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const getCategoryDetails = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    req.query.language = +req.headers['language'];
    const result = Joi.validate(req.query, {
      ...languageValidation,
      ...idValidation
    });
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const category = await CategorySchema.findOne({
      _id: req.query.id,
      deleted: false
    });
    if (!category) return res.send(getResponse(false, 'Wrong Id'));
    req.body.category = category;
    req.body.language = req.query.language;
    return next();
  } catch (e) {
    new APIError(e, 500, 'getCategoryDetails function in category/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

const translateValidation = {
  ...languageValidation,
  name: Joi.string().min(2).required()
};

const translateValidationSchema = {
  translations: Joi.array().items(translateValidation).length(3).unique('language').required()
};
