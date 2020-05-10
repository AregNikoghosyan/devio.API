import { Response, NextFunction } from 'express';
import * as Joi from 'joi';

import { IRequest, getResponse, getErrorResponse, IIdInQuery } from '../mainModels';
import APIError from '../../services/APIError';
import { ICreateCompanyBody, IUpdateCompanyBody, IGetCompanyDetailsQuery, IDeleteCompanyQuery, IGetCompanyListQuery, IAddCompanyAddressBody } from './model';
import { cityPhoneNumberRegex, tinRegex, idRegex, idValidation, pagingValidation } from '../mainValidation';

import CompanySchema from '../../schemas/company';

export const createCompany  = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const body: ICreateCompanyBody = req.body;
    const bodyValidationSchema = {
      name : Joi.string().min(2).required(),
      tin  : Joi.string().regex(tinRegex).required(),

      bilAddress   : Joi.string().required(),
      bilLat       : Joi.number().required(),
      bilLng       : Joi.number().required(),
      bilHouse     : Joi.number().optional(),
      bilApartment : Joi.number().optional(),

      delAddresses: Joi.array().items({
        address            : Joi.string().required(),
        lat                : Joi.number().required(),
        lng                : Joi.number().required(),
        house              : Joi.number().optional(),
        apartment          : Joi.number().optional(),
        contactName        : Joi.string().required(),
        contactPhoneNumber : Joi.string().regex(cityPhoneNumberRegex).required()
      }).min(1).required()
    };
    const result = Joi.validate(body, bodyValidationSchema, { allowUnknown: true });
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const company = await CompanySchema.findOne({ user: req.user._id, tin: body.tin, deleted: false });
    if (company) {
      return res.send(getResponse(false, 'Company with given tin already exists'));
    }
    return next();
  } catch (e) {
    new APIError(e, 500, 'createCompany function in company/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const updateCompany  = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const body: IUpdateCompanyBody = req.body;
    const bodyValidationSchema = {
      id                 : Joi.string().regex(idRegex).required(),

      name               : Joi.string().min(2).required(),
      tin                : Joi.string().regex(tinRegex).required(),

      bilAddress         : Joi.string().required(),
      bilLat             : Joi.number().required(),
      bilLng             : Joi.number().required(),
      bilHouse           : Joi.number().optional(),
      bilApartment       : Joi.number().optional(),

      delAddresses: Joi.array().items({
        address            : Joi.string().required(),
        lat                : Joi.number().required(),
        lng                : Joi.number().required(),
        house              : Joi.number().optional(),
        apartment          : Joi.number().optional(),
        contactName        : Joi.string().required(),
        contactPhoneNumber : Joi.string().regex(cityPhoneNumberRegex).required(),
      }).min(1).required()
    };
    const result = Joi.validate(body, bodyValidationSchema, { allowUnknown: true });
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const [ company, companyCheck ] = await Promise.all([
      await CompanySchema.findOne({ _id: body.id, user: req.user._id })
      .populate({ path: 'billingAddress' }),
      await CompanySchema.findOne({ _id: { $ne: body.id }, user: req.user._id, tin: body.tin, deleted: false })
    ]);
    if (companyCheck) {
      return res.send(getResponse(false, 'Tin is already registered'));
    }
    if (!company) {
      return res.send(getResponse(false, 'Wrong Id'));
    }
    req.body.company = company;
    return next();
  } catch (e) {
    new APIError(e, 500, 'createCompany function in company/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const getCompanyDetails  = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const query: IGetCompanyDetailsQuery = req.query;
    const queryValidationSchema = idValidation;
    const result = Joi.validate(query, queryValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const company = await CompanySchema.findOne({ _id: query.id, user: req.user._id, deleted: false })
    .select({
      user: 0,
      updatedDt: 0,
      __v: 0
    }).populate({
        path: 'billingAddress',
        select: {
          _id: 0,
          user: 0,
          company: 0,
          contactName: 0,
          contactPhoneNumber: 0,
          isUserDefaultAddress: 0,
          __v: 0,
          createdDt: 0,
          updatedDt: 0
        }
      })
      .populate({
        path: 'deliveryAddresses',
        select: {
          _id: 0,
          user: 0,
          company: 0,
          isUserDefaultAddress: 0,
          __v: 0,
          createdDt: 0,
          updatedDt: 0
        }
      }).lean();
    if (!company) {
      return res.send(getResponse(false, 'Wrong Id'));
    }
    req.body.company = company;
    return next();
  } catch (e) {
    new APIError(e, 500, 'getCompanyDetails function in company/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const deleteCompany  = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const query: IDeleteCompanyQuery = req.query;
    const queryValidationSchema = idValidation;
    const result = Joi.validate(query, queryValidationSchema);
    if (result.error) {
      return getResponse(false, result.error.details[0].message);
    }
    const company = await CompanySchema.findOne({ _id: query.id, user: req.user._id, deleted: false });
    if (!company) {
      return res.send(getResponse(false, 'Wrong Id'));
    }
    return next();
  } catch (e) {
    new APIError(e, 500, 'deleteCompany function in company/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const getCompanyList = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const query: IGetCompanyListQuery = req.query;
    const queryValidationSchema = pagingValidation;
    const result = Joi.validate(query, queryValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    return next();
  } catch (e) {
    new APIError(e, 500, 'getCompanyList function in company/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const getCompanyAddresses = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const query: IIdInQuery = req.query;
    const queryValidationSchema = idValidation;
    const result = Joi.validate(query, queryValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const company = await CompanySchema.findOne({
      user: req.user._id,
      _id: query.id,
      deleted: false
    }).populate({
      path: 'deliveryAddresses',
      select: {
        _id: 1,
        contactName: 1,
        contactPhoneNumber: 1,
        address: 1,
        lat: 1,
        lng: 1
      }
    });
    if (!company) return res.send(getResponse(false, 'Wrong Id'));
    req.body.company = company;
    return next();
  } catch (e) {
    new APIError(e, 500, 'getCompanyAddresses function in company/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const addCompanyAddress = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const body: IAddCompanyAddressBody = req.body;
    const bodyValidationSchema = {
      ...idValidation,
      address            : Joi.string().required(),
      lat                : Joi.number().required(),
      lng                : Joi.number().required(),
      house              : Joi.number().optional(),
      apartment          : Joi.number().optional(),
      contactName        : Joi.string().required(),
      contactPhoneNumber : Joi.string().regex(cityPhoneNumberRegex).required(),
      isDefault          : Joi.boolean().optional()
    };
    const result = Joi.validate(body, bodyValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const company = await CompanySchema.findOne({
      deleted: false,
      user: req.user._id,
      _id: body.id
    });
    if (!company) return res.send(getResponse(false, 'Wrong Id'));
    req.body.company = company;
    return next();
  } catch (e) {
    new APIError(e, 500, 'addCompanyAddress function in company/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};