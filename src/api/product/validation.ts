import * as Joi from 'joi';
import { Response, NextFunction } from 'express';
import { IRequest, getResponse, getErrorResponse } from '../mainModels';
import APIError from '../../services/APIError';
import { idValidation, languageValidation, idRegex, pagingValidation, countRemainder, regexpEscape } from '../mainValidation';

import ProductSchema        from '../../schemas/product';
import ProductVersionSchema, { productVersion } from '../../schemas/productVersion';
import MUSchema             from '../../schemas/mu';
import CategorySchema       from '../../schemas/category';
import FileSchema           from '../../schemas/file';
import AttributeSchema      from '../../schemas/attribute';
import OptionSchema         from '../../schemas/option';
import BrandSchema          from '../../schemas/brand';
import RequestSchema        from '../../schemas/request';
import ProposalSchema       from '../../schemas/proposal';

import {
  ISetImagesForProductBody,
  ISetFeaturesForProductBody,
  IGenerateVersionsBody,
  ISetVersionsForProductBody,
  ISetMainDetailsForProductBody,
  IGetProductListForDashboardBody,
  IHideOrUnHideProductsBody,
  IDeleteProductsBody,
  IApproveProductsBody,
  IGetProductRangeOrVersionBody,
  ISetCategoriesForProductBody,
  ISetPricingForProductBody,
  IGetProductMainListBody
} from './model';
import { deleteFiles } from '../../services/fileManager';
import { ProductStatusEnum, UserTypeEnum, ProductTypeEnum } from '../../constants/enums';
import { ObjectID } from 'bson';
import { IProduct } from '../../schemas/product/model';
import { IProductTranslation } from '../../schemas/productTranslation/model';
import { IFile } from '../../schemas/file/model';
import { IProductVersion } from '../../schemas/productVersion/model';
import { IProductFeature } from '../../schemas/productFeature/model';

export const setMainDetailsForProduct = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const body: ISetMainDetailsForProductBody = req.body;
    const bodyValidationSchema = {
      ...idValidation,
      ...translateArrayValidation,
      mu                : idValidation.id,
      minCount          : Joi.number().greater(0.001).required(),
      step              : Joi.number().greater(0.001).required(),
      brand             : Joi.string().regex(idRegex).optional(),
      type              : Joi.number().min(1).max(2).required(),
      isPrivate         : Joi.boolean().required(),
      partner           : idValidation.id.optional(),
      preparingDayCount : Joi.number().min(1).when('type', {
        is   : Joi.number().equal(ProductTypeEnum.special),
        then : Joi.required()
      })
    };
    const result = Joi.validate(body, bodyValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    if (body.step > body.minCount) {
      return res.send(getResponse(false, 'Step must be less than or equal to minCount'));
    }
    const { remainder, multiplier } = countRemainder(body.minCount, body.step);
    if (remainder) {
      return res.send(getResponse(false, 'Min discount must be divisible to minCount'));
    }
    req.body.multiplier = multiplier;
    const [ product, mu ] = await Promise.all([
      await ProductSchema.findOne({ _id: body.id, deleted: false }),
      await MUSchema.findOne({ _id: body.mu, deleted: false })
    ]);
    if (!product) {
      return res.send(getResponse(false, 'Wrong product Id'));
    }
    if (!mu) {
      return res.send(getResponse(false, 'Wrong MU ID'));
    }
    if (body.brand) {
      const brand = await BrandSchema.findById(body.brand);
      if (!brand) {
        return res.send(getResponse(false, 'Wrong Brand Id'));
      }
    }
    req.body.product = product;
    return next();
  } catch (e) {
    new APIError(e, 500, 'setMainDetailsForProduct function in product/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};
export const getMainDetailsForProduct = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const query = req.query;
    const queryValidationSchema = idValidation;
    const result = Joi.validate(query, queryValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const product = await ProductSchema.findOne({ _id: query.id, deleted: false }).select({
      _id               : 1,
      mu                : 1,
      step              : 1,
      minCount          : 1,
      brand             : 1,
      availableCount    : 1,
      translations      : 1,
      type              : 1,
      partner           : 1,
      preparingDayCount : 1,
      isPrivate         : 1,
    }).populate({
      path   : 'translations',
      select : {
        _id         : 0,
        language    : 1,
        name        : 1,
        description : 1
      }
    });
    if (!product) {
      return res.send(getResponse(false, 'Wrong product Id'));
    }
    req.body.product = product.toJSON();
    return next();
  } catch (e) {
    new APIError(e, 500, 'getMainDetailsForProduct function in product/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const setCategoriesForProduct = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const body: ISetCategoriesForProductBody = req.body;
    const bodyValidationSchema = {
      ...idValidation,
      categories : Joi.array().items(Joi.string().regex(idRegex)).unique().required(),
    };
    const result = Joi.validate(body, bodyValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const filter: any = {
      _id: body.id,
      deleted: false
    };
    if (req.user.role === UserTypeEnum.partner) {
      filter.partner = new ObjectID(req.user._id);
    }
    const [ product, categoryCount ] = await Promise.all([
      await ProductSchema.findOne(filter),
      await CategorySchema.countDocuments({ _id: { $in: body.categories }, subCategoryCount: 0 })
    ]);
    if (!product) {
      return res.send(getResponse(false, 'Wrong Id'));
    }
    if (categoryCount !== body.categories.length) {
      return res.send(getResponse(false, 'Wrong category Id list'));
    }
    req.body.product = product;
    return next();
  } catch (e) {
    new APIError(e, 500, 'setPricingForProduct function in product/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};
export const getCategoriesForProduct = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const result = Joi.validate(req.query, idValidation);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const filter: any = {
      _id: req.query.id,
      deleted: false
    };
    if (req.user.role === UserTypeEnum.partner) {
      filter.partner = new ObjectID(req.user._id);
    }
    const product = await ProductSchema.findOne(filter);
    if (!product) {
      return res.send(getResponse(false, 'Wrong Id'));
    }
    req.body.categories = product.categories;
    return next();
  } catch (e) {
    new APIError(e, 500, 'getCategoriesForProduct function in product/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};


export const setPricingForProduct = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const body: ISetPricingForProductBody = req.body;
    const bodyValidationSchema = {
      ...idValidation,
      price             : Joi.number().min(10).required(),
      discountStartDate : Joi.date().optional(),
      discountEndDate   : Joi.date().optional(),
      pricing           : Joi.array().items(Joi.object().keys({
        fromCount : Joi.number().required(),
        bonus     : Joi.number().max(99).optional(),
        discount  : Joi.number().max(99).optional(),
      })).unique('fromCount').min(1).optional()
    };
    const result = Joi.validate(body, bodyValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const filter: any = {
      _id: body.id,
      deleted: false
    };
    if (req.user.role === UserTypeEnum.partner) {
      filter.createdBy = req.user._id;
    }
    const product = await ProductSchema.findOne(filter);
    if (!product) {
      return res.send(getResponse(false, 'Wrong Id'));
    }
    if (body.pricing) {
      for (let i = 0; i < body.pricing.length; i++) {
        if (!body.pricing[i].bonus && !body.pricing[i].discount) {
          return res.send(getResponse(false, 'Pricing item must contain bonus or discount'));
        }
        if (body.pricing[i].fromCount < product.minCount) {
          return res.send(getResponse(false, 'Count must be greater than or equal to min count of product'));
        }
      }
    }
    if (body.discountStartDate && body.discountEndDate && body.discountEndDate <= body.discountStartDate) {
      return res.send(getResponse(false, 'Start Date must be less than End Date'));
    }
    req.body.product = product;
    return next();
  } catch (e) {
    new APIError(e, 500, 'setPricingForProduct function in product/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};
export const getPricingForProduct = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const query = req.query;
    const queryValidationSchema = {
      ...idValidation
    };
    const result = Joi.validate(query, queryValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const filter: any = {
      _id: query.id,
      deleted: false
    };
    if (req.user.role === UserTypeEnum.partner) {
      filter.createdBy = req.user._id;
    }
    const product = await ProductSchema.findOne(filter);
    if (!product) {
      return res.send(getResponse(false, 'Wrong Id'));
    }
    req.body.product = product;
    return next();
  } catch (e) {
    new APIError(e, 500, 'getPricingForProduct function in product/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};


export const uploadImagesForProduct = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const body: { id: string } = req.body;
    const bodyValidationSchema = {
      ...idValidation,
    };
    const result = Joi.validate(body, bodyValidationSchema);
    if (result.error) {
      if (req.files && req.files.length) {
        const files: any = req.files;
        const pathList = files.map(file => file.path);
        deleteFiles(pathList, false);
      }
      return res.send(getResponse(false, result.error.details[0].message));
    }
    if (!req.files || !req.files.length) {
      return res.send(getResponse(false, 'Missing data'));
    }
    const product = await ProductSchema.findOne({ _id: body.id, deleted: false });
    if (!product) {
      if (req.files && req.files.length) {
        const files: any = req.files;
        const pathList = files.map(file => file.path);
        deleteFiles(pathList, false);
      }
      return res.send(getResponse(false, 'Wrong Id'));
    }
    req.body.product = product;
    return next();
  } catch (e) {
    new APIError(e, 500, 'uploadImagesForProduct function in product/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};
export const setImagesForProductV2 = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const body: { id: string, idList: string[] } = req.body;
    const bodyValidationSchema = {
      ...idValidation,
      idList : Joi.array().items(Joi.string().regex(idRegex)).unique().min(1).required()
    };
    const result = Joi.validate(body, bodyValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const [ fileCount, product ] = await Promise.all([
      await FileSchema.countDocuments({ _id: { $in: body.idList }, product: body.id }),
      await ProductSchema.findOne({ _id: body.id, deleted: false })
    ]);
    if (!product) {
      return res.send(getResponse(false, 'Wrong Id'));
    }
    if (fileCount !== body.idList.length) {
      return res.send(getResponse(false, 'Wrong idList'));
    }
    req.body.product = product;
    return next();
  } catch (e) {
    new APIError(e, 500, 'setImagesForProductV2 function in product/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};
export const setImagesForProduct = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const body: ISetImagesForProductBody = req.body;
    const bodyValidationSchema = {
      ...idValidation,
      removeIdList : Joi.array().items(Joi.string().regex(idRegex)).unique().optional()
    };
    const result = Joi.validate(body, bodyValidationSchema);
    if (result.error) {
      if (req.files && req.files.length) {
        const files: any = req.files;
        const pathList = files.map(file => file.path);
        deleteFiles(pathList, false);
      }
      return res.send(getResponse(false, result.error.details[0].message));
    }
    if ((!req.files || !req.files.length) && (!body.removeIdList || !body.removeIdList.length)) {
      return res.send(getResponse(false, 'Missing data'));
    }
    const [ product, fileCount ] = await Promise.all([
      await ProductSchema.findOne({ _id: body.id, deleted: false }),
      await FileSchema.countDocuments({ _id: { $in: body.removeIdList }, product: body.id })
    ]);
    if (!product) {
      if (req.files && req.files.length) {
        const files: any = req.files;
        const pathList = files.map(file => file.path);
        deleteFiles(pathList, false);
      }
      return res.send(getResponse(false, 'Wrong Id'));
    }
    if (body.removeIdList && body.removeIdList.length !== fileCount) {
      if (req.files && req.files.length) {
        const files: any = req.files;
        const pathList = files.map(file => file.path);
        deleteFiles(pathList, false);
      }
      return res.send(getResponse(false, 'Wrong Remove ID list'));
    }
    req.body.product = product;
    return next();
  } catch (e) {
    new APIError(e, 500, 'setImagesForProduct function in product/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};
export const getImagesForProduct = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const query = req.query;
    const queryValidationSchema = {
      ...idValidation
    };
    const result = Joi.validate(query, queryValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const product = await ProductSchema.findOne({ _id: query.id, deleted: false });
    if (!product) {
      return res.send(getResponse(false, 'Wrong Id'));
    }
    req.body.product = product;
    return next();
  } catch (e) {
    new APIError(e, 500, 'getImagesForProduct function in product/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const generateVersions = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const body: IGenerateVersionsBody = req.body;
    const bodyValidationSchema = {
      ...idValidation,
      attributes: Joi.array().items(Joi.string().regex(idRegex).required()).min(1).unique().required()
    };
    const result = Joi.validate(body, bodyValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const [ product, attributeCount ] = await Promise.all([
      await ProductSchema.findOne({ _id: body.id, deleted: false }),
      await AttributeSchema.countDocuments({ _id: { $in: body.attributes }, deleted: false })
    ]);
    if (!product) {
      return res.send(getResponse(false, 'Wrong Id'));
    }
    if (body.attributes.length !== attributeCount) {
      return res.send(getResponse(false, 'Wrong attribute Id list'));
    }
    req.body.product = product;
    return next();
  } catch (e) {
    new APIError(e, 500, 'generateVersions function in product/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const setVersionsForProduct = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const body: ISetVersionsForProductBody = req.body;
    const bodyValidationSchema: any = {
      ...idValidation,
      attributes : Joi.array().items(Joi.string().regex(idRegex).required()).unique().optional()
    };
    const staticAttributes = body.attributes ? body.attributes.map(item => item) : [];
    const firstResult = Joi.validate(body, bodyValidationSchema, { allowUnknown: true });
    if (firstResult.error) {
      return res.send(getResponse(false, firstResult.error.details[0].message));
    }
    const [ product, attributes ] = await Promise.all([
      await ProductSchema.findOne({ _id: body.id, deleted: false }),
      await AttributeSchema.find({ _id: { $in: body.attributes }, deleted: false })
    ]);
    let areSame = false;
    if (body.attributes) {
      const oldAttributes = product.attributes.map(item => item.toString());
      areSame = arraysEqual(oldAttributes, body.attributes);
    }
    if (!areSame) {
      bodyValidationSchema.versions = Joi.array().items({
        product    : Joi.string().regex(idRegex).required(),
        hidden     : Joi.boolean().required(),
        price      : Joi.number().min(1).required(),
        photo      : Joi.string().allow(null).regex(idRegex).optional(),
        attributes : Joi.array().items({
          attribute : idValidation.id,
          option    : idValidation.id
        }).required()
      }).optional();
    } else {
      bodyValidationSchema.versions = Joi.array().items({
        _id        : Joi.string().allow('').regex(idRegex).required(),
        product    : Joi.string().regex(idRegex).required(),
        hidden     : Joi.boolean().required(),
        price      : Joi.number().min(1).required(),
        photo      : Joi.string().allow(null).regex(idRegex).optional(),
        attributes : Joi.array().items({
          attribute : idValidation.id,
          option    : idValidation.id
        }).required()
      }).optional();
    }
    const result = Joi.validate(body, bodyValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    req.body.areSame = areSame;
    if (!product) {
      return res.send(getResponse(false, 'Wrong Id'));
    }
    if (body.versions && (!body.attributes || !body.attributes.length)) {
      return res.send(getResponse(false, 'Missing attributes'));
    }
    if (body.attributes && (!body.versions || !body.versions.length)) {
      return res.send(getResponse(false, 'Missing versions'));
    }
    if (!body.attributes && (!body.versions || !body.versions.length)) {
      req.body.product = product;
      return next();
    }
    if (body.attributes && body.attributes.length !== attributes.length) {
      return res.send(getResponse(false, 'Wrong attribute Id list'));
    }
    if (areSame) {
      const idList = body.versions.map(item => item._id).filter(item => !!item);
      const optionCount = await ProductVersionSchema.countDocuments({ _id: { $in: idList }, product: body.id, deleted: false });
      if (optionCount !== idList.length) {
        return res.send(getResponse(false, 'Wrong versionList'));
      }
    }
    let expectedLength = 0;
    for (let i = 0; i < attributes.length; i++) {
      const optionsLength = attributes[i].options.length;
      if (!expectedLength) expectedLength = (expectedLength + 1) * optionsLength;
      else expectedLength *= optionsLength;
    }
    if (expectedLength !== body.versions.length) {
      return res.send(getResponse(false, 'Wrong versions length'));
    }
    if (body.versions && body.attributes) {
      for (let i = 0; i < body.versions.length; i++) {
        if (body.versions[i].product !== body.id) {
          return res.send(getResponse(false, 'Wrong version list(product Id)'));
        }
        if (body.versions[i].attributes.length !== body.attributes.length) {
          return res.send(getResponse(false, 'Wrong version list(attributes length)'));
        }
        if (body.versions[i].photo) {
          const file = await FileSchema.findOne({ _id: body.versions[i].photo, product: body.id });
          if (!file) {
            return res.send(getResponse(false, 'Wrong version list(photo Id)'));
          }
        }
        for (let j = 0; j < body.versions[i].attributes.length; j++) {
          if (body.attributes.indexOf(body.versions[i].attributes[j].attribute) === -1) {
            return res.send(getResponse(false, 'Wrong version list(attribute Id in attributes)'));
          }
          const option = await OptionSchema.findOne({ _id: body.versions[i].attributes[j].option, attribute: body.versions[i].attributes[j].attribute, deleted: false });
          if (!option) {
            return res.send(getResponse(false, 'Wrong version list(option Id in attributes)'));
          }
        }
      }
    }
    req.body.product = product;
    req.body.staticAttributes = staticAttributes;
    return next();
  } catch (e) {
    new APIError(e, 500, 'setVersionsForProduct function in product/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};
export const getVersionsForProduct = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const query = req.query;
    const queryValidationSchema = {
      ...idValidation
    };
    const result = Joi.validate(query, queryValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const product = await ProductSchema.findOne({ _id: query.id, deleted: false });
    if (!product) {
      return res.send(getResponse(false, 'Wrong Id'));
    }
    req.body.product = product;
    return next();
  } catch (e) {
    new APIError(e, 500, 'getVersionsForProduct function in product/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const setFeaturesForProduct = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const body: ISetFeaturesForProductBody = req.body;
    const bodyValidationSchema = {
      ...idValidation,
      features: Joi.array().items(featureTranslateArrayValidation).optional()
    };
    const result = Joi.validate(body, bodyValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const product = await ProductSchema.findOne({ _id: body.id, deleted: false });
    if (!product) {
      return res.send(getResponse(false, 'Wrong Id'));
    }
    req.body.product = product;
    return next();
  } catch (e) {
    new APIError(e, 500, 'setFeaturesForProduct function in product/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};
export const getFeaturesForProduct = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const query = req.query;
    const queryValidationSchema = {
      ...idValidation
    };
    const result = Joi.validate(query, queryValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const product = await ProductSchema.findOne({ _id: query.id, deleted: false });
    if (!product) {
      return res.send(getResponse(false, 'Wrong Id'));
    }
    req.body.product = product;
    return next();
  } catch (e) {
    new APIError(e, 500, 'getFeaturesForProduct function in product/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};


export const getListForDashboard = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    req.body.language = +req.headers['language'];
    const body: IGetProductListForDashboardBody = req.body;
    const bodyValidationSchema = {
      ...pagingValidation,
      ...languageValidation,
      search    : Joi.string().allow(['', null]).min(1).optional(),
      category  : Joi.string().regex(idRegex).allow('').optional(),
      subCategory: Joi.string().regex(idRegex).allow('').optional(),
      status    : Joi.number().min(1).max(4).allow('').optional(),
      priceFrom : Joi.number().allow('').min(1).optional(),
      priceTo   : Joi.number().allow('').min(1).optional(),
      dateFrom  : Joi.date().allow(['', null]).optional(),
      dateTo    : Joi.date().allow(['', null]).optional(),
      partner   : Joi.string().regex(idRegex).allow('').optional(),
    };
    const result = Joi.validate(body, bodyValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    if (body.category) {
      const category = await CategorySchema.findOne({ _id: body.category, pid: null, deleted: false });
      if (!category) return res.send(getResponse(false, 'Wrong category Id'));
    }
    if (body.subCategory && !body.category) return res.send(getResponse(false, 'Category is required'));
    if (body.subCategory) {
      const category = await CategorySchema.findOne({ _id: body.category, deleted: false });
      if (!category) return res.send(getResponse(false, 'Wrong category Id'));
    }
    if (body.priceFrom && body.priceTo && body.priceFrom > body.priceTo) {
      return res.send(getResponse(false, 'Price from must be less than price to'));
    }
    if (body.dateFrom && body.dateTo && body.dateFrom > body.dateTo) {
      return res.send(getResponse(false, 'DateFrom must be less than DateTo'));
    }
    return next();
  } catch (e) {
    new APIError(e, 500, 'getListForDashboard function in product/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const getProductDetails = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const query = req.query;
    const queryValidationSchema = {
      ...idValidation
    };
    const queryResult = Joi.validate(query, queryValidationSchema);
    if (queryResult.error) {
      return res.send(getResponse(false, queryResult.error.details[0].message));
    }
    const headerResult = Joi.validate(req.headers, languageValidation, { allowUnknown: true });
    if (headerResult.error) {
      return res.send(getResponse(false, headerResult.error.details[0].message));
    }
    const product = await ProductSchema.findOne({ _id: query.id, deleted: false, status: ProductStatusEnum.published, versionsHidden: false });
    if (!product) {
      return res.send(getResponse(false, 'Wrong Id'));
    }
    req.body.language = +req.headers['language'];
    req.body.product = product;
    return next();
  } catch (e) {
    new APIError(e, 500, 'getProductDetails function in product/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const getProductRange = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const body: IGetProductRangeOrVersionBody = req.body;
    const bodyValidationSchema = {
      ...idValidation,
      chosen: Joi.array().items(Joi.object().keys({
        attribute: idValidation.id,
        option: idValidation.id
      })).min(1).unique('attribute').unique('option').required(),
    };
    const bodyResult = Joi.validate(body, bodyValidationSchema);
    if (bodyResult.error) {
      return res.send(getResponse(false, bodyResult.error.details[0].message));
    }
    const headerResult = Joi.validate(req.headers, languageValidation, { allowUnknown: true });
    if (headerResult.error) {
      return res.send(getResponse(false, headerResult.error.details[0].message));
    }
    const product = await ProductSchema.findOne({ _id: body.id, deleted: false, status: ProductStatusEnum.published }); // versionsHidden: false
    if (!product) {
      return res.send(getResponse(false, 'Wrong Id'));
    }
    if (product.attributes.length && product.attributes.length === body.chosen.length) {
      return res.send(getResponse(false, 'Wrong chosen list length'));
    }
    req.body.language = +req.headers['language'];
    req.body.product = product;
    return next();
  } catch (e) {
    new APIError(e, 500, 'getProductRange function in product/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const getProductVersion = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const body: IGetProductRangeOrVersionBody = req.body;
    const bodyValidationSchema = {
      ...idValidation,
      chosen: Joi.array().items(Joi.object().keys({
        attribute: idValidation.id,
        option: idValidation.id
      })).min(1).unique('attribute').unique('option').required(),
    };
    const bodyResult = Joi.validate(body, bodyValidationSchema);
    if (bodyResult.error) {
      return res.send(getResponse(false, bodyResult.error.details[0].message));
    }
    const headerResult = Joi.validate(req.headers, languageValidation, { allowUnknown: true });
    if (headerResult.error) {
      return res.send(getResponse(false, headerResult.error.details[0].message));
    }
    const product = await ProductSchema.findOne({ _id: body.id, deleted: false, status: ProductStatusEnum.published }); // versionsHidden: false
    if (!product) {
      return res.send(getResponse(false, 'Wrong Id'));
    }
    if (product.attributes.length && product.attributes.length !== body.chosen.length) {
      return res.send(getResponse(false, 'Wrong chosen list length'));
    }
    req.body.language = +req.headers['language'];
    req.body.product = product;
    return next();
  } catch (e) {
    new APIError(e, 500, 'getProductVersion function in product/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const hideOrUnHideProducts = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const body: IHideOrUnHideProductsBody = req.body;
    const bodyValidationSchema = {
      action: Joi.number().equal([1, 2]).required(),  // 1 is Hide, 2 is unHide
      idList: Joi.array().items(idValidation.id).required()
    };
    const result = Joi.validate(body, bodyValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const filter: any = { _id: { $in: body.idList }, deleted: false };
    if (req.user.role === UserTypeEnum.partner) {
      filter.createdBy = req.user._id;
    }
    const count = await ProductSchema.countDocuments(filter);
    if (count !== body.idList.length) {
      return res.send(getResponse(false, 'Wrong Id List'));
    }
    req.body.filter = filter;
    return next();
  } catch (e) {
    new APIError(e, 500, 'hideOrUnHideProducts function in product/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const deleteProducts = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const body: IDeleteProductsBody = req.body;
    const bodyValidationSchema = {
      idList: Joi.array().items(idValidation.id).required()
    };
    const result = Joi.validate(body, bodyValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const filter: any = { _id: { $in: body.idList }, deleted: false };
    if (req.user.role === UserTypeEnum.partner) {
      filter.createdBy = req.user._id;
    }
    const count = await ProductSchema.countDocuments(filter);
    if (count !== body.idList.length) {
      return res.send(getResponse(false, 'Wrong Id List'));
    }
    req.body.filter = filter;
    return next();
  } catch (e) {
    new APIError(e, 500, 'deleteProducts function in product/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const approveProducts = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const body: IApproveProductsBody = req.body;
    const bodyValidationSchema = {
      idList: Joi.array().items(idValidation.id).required()
    };
    const result = Joi.validate(body, bodyValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const filter: any = { _id: { $in: body.idList }, deleted: false, status: ProductStatusEnum.unapproved };
    const count = await ProductSchema.countDocuments(filter);
    if (count !== body.idList.length) {
      return res.send(getResponse(false, 'Wrong Id List'));
    }
    req.body.filter = filter;
    return next();
  } catch (e) {
    new APIError(e, 500, 'approveProducts function in product/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const getForRequest = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const query = req.query;
    const queryValidationSchema = {
      ...pagingValidation,
      requestId : idValidation.id,
      search    : Joi.string().min(1).optional()
    };
    const result = Joi.validate(query, queryValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const request = await RequestSchema.findOne({ _id: query.requestId });
    if (!request) return res.send(getResponse(false, 'Wrong product Id'));
    req.body.request = request;
    return next();
  } catch (e) {
    new APIError(e, 500, 'getForRequest function in product/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const getForHomeStaff = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const query = req.query;
    const queryValidationSchema = {
      ...pagingValidation,
      search    : Joi.string().allow('').optional()
    };
    const result = Joi.validate(query, queryValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    return next();
  } catch (e) {
    new APIError(e, 500, 'getForRequest function in product/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const getMainList = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const body: IGetProductMainListBody = req.body;
    body.language = +req.headers['language'];
    const bodyValidationSchema = {
      ...pagingValidation,
      ...languageValidation,
      proposalId: Joi.string().regex(idRegex).allow('').allow(null).optional(),
      search    : Joi.string().allow('').optional(),
      category  : Joi.string().regex(idRegex).optional(),
      brandIdList : Joi.array().items(Joi.string().regex(idRegex)).min(1).optional(),
      priceFrom : Joi.number().min(1).optional(),
      priceTo   : Joi.when('priceFrom', {
        is        : Joi.exist(),
        then      : Joi.number().min(Joi.ref('priceFrom')),
        otherwise : Joi.number().min(1)
      }).optional(),
      sort : Joi.number().equal([1, 2, 3, 4, 5]).optional(),
      withSale: Joi.boolean().optional(),
      withBonus: Joi.boolean().optional()
    };
    const result = Joi.validate(body, bodyValidationSchema, { allowUnknown: true });
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    if (body.search) body.search = regexpEscape(body.search);
    const [ category, proposal ] = await Promise.all([
      await CategorySchema.findOne({ _id: body.category, deleted: false, isHidden: false }),
      await ProposalSchema.findOne({ _id: body.proposalId })
    ]);
    // const [ mu, category, brandList, proposal ] = await Promise.all([
    //   await MUSchema.findOne({ _id: body.mu, deleted: false }),
    //   await CategorySchema.findOne({ _id: body.category, deleted: false, isHidden: false }),
    //   await BrandSchema.find({ _id: { $in: body.brandIdList } }),
    //   await ProposalSchema.findOne({ _id: body.proposalId })
    // ]);
    if (body.proposalId && !proposal) {
      return res.send(getResponse(false, 'Wrong Proposal Id'));
    } else if (proposal) {
      req.body.proposal = proposal;
    }
    // if (body.mu && !mu) {
    //   return res.send(getResponse(false, 'Wrong MU Id'));
    // }
    if (body.category && !category) {
      return res.send(getResponse(false, 'Wrong category Id'));
    } else {
      req.body.category = category;
    }
    // if (body.brandIdList && body.brandIdList.length !== brandList.length) {
    //   return res.send(getResponse(false, 'Wrong brand IdList'));
    // }
    return next();
  } catch (e) {
    new APIError(e, 500, 'getForRequest function in product/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const getListForCart = async(req: IRequest, res: Response, next: NextFunction) => {
  try {
    req.body.language = +req.headers['language'];
    const body = req.body;
    const bodyValidationSchema = {
      ...languageValidation,
      idList: Joi.array().items({
        product: idValidation.id,
        productVersion: Joi.string().regex(idRegex).allow(null).optional(),
        count: Joi.number().required()
      }).min(1).required()
    };
    const result = Joi.validate(body, bodyValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    if (!isUniqueProductList(body.idList)) return res.send(getResponse(false, 'Wrong id list'));
    return next();
  } catch (e) {
    new APIError(e, 500, 'getForRequest function in product/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const copyProduct = async(req: IRequest, res: Response, next: NextFunction) => {
  try {
    const body = req.body;
    const bodyValidationSchema = {
      ...idValidation
    };
    const result = Joi.validate(body, bodyValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const product: IProduct<string, IProductTranslation, IFile, string, IProductVersion, string, IProductFeature, string, string> = await ProductSchema.findOne({
      _id: body.id
    }).populate('translations images versions features');
    if (!product) {
      return res.send(getResponse(false, 'Wrong Id'));
    }
    req.body.product = product;
    return next();
  } catch (e) {
    new APIError(e, 500, 'getForRequest function in product/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const getSimilarProducts = async(req: IRequest, res: Response, next: NextFunction) => {
  try {
    req.query.language = +req.headers['language'];
    const result = Joi.validate(req.query, {
      ...idValidation,
      ...languageValidation,
      count: Joi.number().min(1).max(15).integer().required()
    });
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    req.query.count = +req.query.count;
    const product = await ProductSchema.findOne({ _id: req.query.id, deleted: false, status: ProductStatusEnum.published });
    if (!product) {
      return res.send(getResponse(false, 'Wrong Id'));
    }
    req.body.product = product;
    return next();
  } catch (e) {
    new APIError(e, 500, 'getSimilarProducts function in product/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

const translateValidation = {
  ...languageValidation,
  name        : Joi.string().min(1).required(),
  description : Joi.string().min(1).required()
};

const featureTranslateValidation = {
  ...languageValidation,
  title       : Joi.string().min(1).required(),
  description : Joi.string().min(1).required()
};

const translateArrayValidation = {
  translations: Joi.array().items(translateValidation).length(3).unique('language').required()
};

const featureTranslateArrayValidation = {
  translations: Joi.array().items(featureTranslateValidation).length(3).unique('language').required()
};

function arraysEqual(arr1: any[], arr2: any[]) {
  arr1.sort();
  arr2.sort();
  if (arr1.length !== arr2.length) return false;
  for (let i = arr1.length; i--;) {
    if (arr1[i].toString() !== arr2[i].toString()) return false;
  }
  return true;
}

function isUniqueProductList(list: Array<{ count: number, product: string, productVersion: string }>): boolean {
  for (let i = 0; i < list.length; i++) {
    for (let j = 0; j < list.length; j++) {
      if (j !== i && list[j].product === list[i].product && ((!list[j].productVersion && !list[i].productVersion) || (list[j].productVersion === list[i].productVersion))) {
        return false;
      }
    }
  }
  return true;
}