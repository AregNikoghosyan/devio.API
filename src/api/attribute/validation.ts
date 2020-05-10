import { Response, NextFunction } from 'express';
import * as Joi from 'joi';

import APIError from '../../services/APIError';

import { IRequest, getResponse, getErrorResponse } from '../mainModels';
import { idRegex, languageValidation, pagingValidation, idValidation } from '../mainValidation';
import { ICreateUsualAttributeBody, IUpdateAttributeBody, IAddOptionBody, IUpdateOptionBody, IGetAttributeAutoCompleteQuery, IUpdateOptionPositionsBody, IGetAttributeListForAdminBody } from './model';

import AttributeSchema from '../../schemas/attribute';
import OptionSchema    from '../../schemas/option';
import CategorySchema  from '../../schemas/category';
import ProductSchema   from '../../schemas/product';

import { AttributeTypeEnum } from '../../constants/enums';

export const createUsualAttribute = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const body: ICreateUsualAttributeBody = req.body;
    const bodyValidationSchema = {
      name     : Joi.string().min(1).required(),
      category : idValidation.id,
      ...translateArrayValidation,
      ...usualOptionArrayValidation
    };
    const result = Joi.validate(body, bodyValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    if (body.options) {
      body.options.forEach(item => {
        if (item.position > body.options.length) {
          return res.send(getResponse(false, 'Position must not be greater than length'));
        }
      });
    }
    const [ checkUnique, category ] = await Promise.all([
      await AttributeSchema.findOne({ name: body.name, deleted: false }),
      await CategorySchema.findOne({ _id: body.category, pid: null, deleted: false })
    ]);
    if (checkUnique) {
      return res.send(getResponse(false, 'Name must be unique'));
    }
    if (!category) {
      return res.send(getResponse(false, 'Wrong categoryId'));
    }
    return next();
  } catch (e) {
    new APIError(e, 500, 'createUsualAttribute function in category/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const createColorAttribute = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const body: ICreateUsualAttributeBody = req.body;
    const bodyValidationSchema = {
      name: Joi.string().min(1).required(),
      ...translateArrayValidation,
      ...colorOptionArrayValidation,
      category: idValidation.id
    };
    const result = Joi.validate(body, bodyValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    if (body.options) {
      body.options.forEach(item => {
        if (item.position > body.options.length) {
          return res.send(getResponse(false, 'Position must not be greater than length'));
        }
      });
    }
    const [ checkUnique, category ] = await Promise.all([
      await AttributeSchema.findOne({ name: body.name, deleted: false }),
      await CategorySchema.findOne({ _id: body.category, pid: null, deleted: false })
    ]);
    if (checkUnique) {
      return res.send(getResponse(false, 'Name must be unique'));
    }
    if (!category) {
      return res.send(getResponse(false, 'Wrong categoryId'));
    }
    return next();
  } catch (e) {
    new APIError(e, 500, 'createColorAttribute function in category/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const getAttributeListForAdmin = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const body: IGetAttributeListForAdminBody = req.body;
    const bodyValidationSchema = {
      ...pagingValidation,
      ...languageValidation,
      category : Joi.string().regex(idRegex).optional(),
      search   : Joi.string().optional(),
      type     : Joi.number().equal([AttributeTypeEnum.color, AttributeTypeEnum.usual]).optional()
    };
    const result = Joi.validate(body, bodyValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    if (body.category) {
      const category = await CategorySchema.findOne({ _id: body.category, pid: null, deleted: false });
      if (!category) return res.send(getResponse(false, 'Wrong category Id'));
    }
    return next();
  } catch (e) {
    new APIError(e, 500, 'getAttributeListForAdmin function in category/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const deleteAttributes = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const bodyValidationSchema = {
      idList: Joi.array().items(Joi.string().regex(idRegex)).required()
    };
    const result = Joi.validate(req.body, bodyValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const count = await AttributeSchema.countDocuments({ _id: { $in: req.body.idList } });
    if (count !== req.body.idList.length) {
      return res.send(getResponse(true, 'Wrong Id list'));
    }
    return next();
  } catch (e) {
    new APIError(e, 500, 'deleteAttributes function in category/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const getAttributeDetails = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const queryValidationSchema = { ...idValidation };
    const result = Joi.validate(req.query, queryValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const attribute = await AttributeSchema.findOne({ _id: req.query.id, deleted: false });
    if (!attribute) {
      return res.send(getResponse(false, 'Wrong Id'));
    }
    req.body.attribute = attribute;
    return next();
  } catch (e) {
    new APIError(e, 500, 'getAttributeDetails function in category/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const updateAttribute = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const body: IUpdateAttributeBody = req.body;
    const bodyValidationSchema = {
      ...idValidation,
      ...translateArrayValidation,
      name: Joi.string().min(2).required()
    };
    const result = Joi.validate(body, bodyValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const [ attribute, checkName ] = await Promise.all([
      await AttributeSchema.findOne({ _id: body.id, deleted: false }),
      await AttributeSchema.findOne({ name: body.name, _id: { $ne: body.id }, deleted: false })
    ]);
    if (!attribute) {
      return res.send(getResponse(false, 'Wrong Id'));
    }
    if (checkName) {
      return res.send(getResponse(false, 'Name must be unique'));
    }
    req.body.attribute = attribute;
    return next();
  } catch (e) {
    new APIError(e, 500, 'getAttributeDetails function in category/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const addColorOption = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const body: IAddOptionBody = req.body;
    const bodyValidationSchema = {
      ...idValidation,
      ...translateArrayValidation,
      colorType  : Joi.number().min(1).max(3).required(),
      firstColor : Joi.string().when('colorType', {
        is        : Joi.number().min(2).max(3),
        then      : Joi.required()
      }),
      secondColor: Joi.string().when('colorType', {
        is        : Joi.number().equal(3),
        then      : Joi.required()
      })
    };
    const result = Joi.validate(body, bodyValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const attribute = await AttributeSchema.findOne({ _id: body.id, type: AttributeTypeEnum.color, deleted: false });
    if (!attribute) return res.send(getResponse(false, 'Wrong id'));
    req.body.attribute = attribute;
    return next();
  } catch (e) {
    new APIError(e, 500, 'addOption function in category/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const addUsualOption = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const body: IAddOptionBody = req.body;
    const bodyValidationSchema = {
      ...idValidation,
      ...translateArrayValidation,
    };
    const result = Joi.validate(body, bodyValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const attribute = await AttributeSchema.findOne({ _id: body.id, type: AttributeTypeEnum.usual, deleted: false });
    if (!attribute) return res.send(getResponse(false, 'Wrong id'));
    req.body.attribute = attribute;
    return next();
  } catch (e) {
    new APIError(e, 500, 'addOption function in category/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const updateColorOption = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const body: IUpdateOptionBody = req.body;
    const bodyValidationSchema = {
      ...idValidation,
      ...translateArrayValidation,
      colorType  : Joi.number().min(1).max(3).required(),
      firstColor : Joi.string().when('colorType', {
        is        : Joi.number().min(2).max(3),
        then      : Joi.required()
      }),
      secondColor: Joi.string().when('colorType', {
        is        : Joi.number().equal(3),
        then      : Joi.required()
      })
    };
    const result = Joi.validate(body, bodyValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const option = await OptionSchema.findOne({ _id: body.id, deleted: false });
    if (!option) return res.send(getResponse(false, 'Wrong id'));
    req.body.option = option;
    return next();
  } catch (e) {
    new APIError(e, 500, 'updateColorOption function in category/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const updateUsualOption = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const body: IUpdateOptionBody = req.body;
    const bodyValidationSchema = {
      ...idValidation,
      ...translateArrayValidation,
    };
    const result = Joi.validate(body, bodyValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const option = await OptionSchema.findOne({ _id: body.id, deleted: false });
    if (!option) return res.send(getResponse(false, 'Wrong id'));
    req.body.option = option;
    return next();
  } catch (e) {
    new APIError(e, 500, 'updateUsualOption function in category/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const deleteOption = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const bodyValidationSchema = idValidation;
    const result = Joi.validate(req.body, bodyValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const option = await OptionSchema.findOne({ _id: req.body.id, deleted: false });
    if (!option) {
      return res.send(getResponse(false, 'Wrong ID'));
    }
    req.body.option = option;
    return next();
  } catch (e) {
    new APIError(e, 500, 'addOption function in category/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const hideOption = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const bodyValidationSchema = idValidation;
    const result = Joi.validate(req.body, bodyValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const option = await OptionSchema.findOne({ _id: req.body.id, deleted: false });
    if (!option) {
      return res.send(getResponse(false, 'Wrong ID'));
    }
    req.body.option = option;
    return next();
  } catch (e) {
    new APIError(e, 500, 'addOption function in category/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const updateOptionPositions = async(req: IRequest, res: Response, next: NextFunction) => {
  try {
    const body: IUpdateOptionPositionsBody = req.body;
    const firstResult = Joi.validate(body, { attributeId: idValidation.id }, { allowUnknown: true });
    if (firstResult.error) {
      return res.send(getResponse(false, firstResult.error.details[0].message));
    }
    const [ attribute, optionLength ] = await Promise.all([
      await AttributeSchema.findOne({ _id: body.attributeId, deleted: false }),
      await OptionSchema.countDocuments({ attribute: body.attributeId, deleted: false })
    ]);
    if (!attribute) {
      return res.send(getResponse(false, 'Wrong attributeId'));
    }
    if (!optionLength) {
      return res.send(getResponse(false, 'Nothing to set position'));
    }
    const bodyValidationSchema = {
      attributeId: idValidation.id,
      options: Joi.array().items(Joi.object().keys({
        ...idValidation,
        position: Joi.number().min(1).max(optionLength)
      })).length(optionLength).unique('position').required()
    };
    const result = Joi.validate(body, bodyValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const optionsCountById = await OptionSchema.countDocuments({ attribute: body.attributeId, _id: { $in: body.options.map(item => item.id) }, deleted: false });
    if (optionsCountById !== optionLength) {
      return res.send(getResponse(false, 'Wrong Id list'));
    }
    return next();
  } catch (e) {
    new APIError(e, 500, 'updateOptionPositions function in category/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const getAttributeAutoComplete = async(req: IRequest, res: Response, next: NextFunction) => {
  try {
    const query: IGetAttributeAutoCompleteQuery = req.query;
    const queryValidationSchema = {
      ...idValidation,
      search: Joi.string().min(1).required()
    };
    const result = Joi.validate(query, queryValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const product = await ProductSchema.findOne({ _id: query.id, deleted: false });
    if (!product) return res.send(getResponse(false, 'Wrong Id'));
    req.query.categories = product.mainCategories;
    return next();
  } catch (e) {
    new APIError(e, 500, 'getAttributeAutoComplete function in category/validation.ts');
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

const usualOptionValidation = {
  _id: Joi.string().regex(idRegex).optional(),
  ...translateArrayValidation,
  position: Joi.number().min(1).required()
};

const colorOptionValidation = {
  _id: Joi.string().regex(idRegex).optional(),
  ...translateArrayValidation,
  colorType: Joi.number().min(1).max(3).required(),
  firstColor: Joi.string().when('colorType', {
    is: Joi.number().min(2).max(3),
    then: Joi.required()
  }),
  secondColor: Joi.string().when('colorType', {
    is: Joi.number().equal(3),
    then: Joi.required()
  }),
  position: Joi.number().min(1).required()
};

const usualOptionArrayValidation = {
  options: Joi.array().items(usualOptionValidation).unique('position').optional()
};

const colorOptionArrayValidation = {
  options: Joi.array().items(colorOptionValidation).unique('position').optional()
};