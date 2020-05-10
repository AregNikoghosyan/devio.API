import * as Joi from 'joi';
import { NextFunction, Response } from 'express';
import { IRequest, getErrorResponse, getResponse } from '../mainModels';
import APIError from '../../services/APIError';
import { IAddVacancyBody, IUpdateVacancyBody } from './model';
import { languageValidation, idValidation, pagingValidation } from '../mainValidation';
import { LanguageEnum } from '../../constants/enums';

import VacancySchema from '../../schemas/vacancy';

export const addVacancy = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const body: IAddVacancyBody = req.body;
    const result = Joi.validate(body, {
      translations: Joi.array().items({
        ...languageValidation,
        title : Joi.string().min(1).required(),
        body  : Joi.string().min(1).required()
      }).min(1).unique('language').required()
    });
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const armenian = body.translations.map(item => item.language === LanguageEnum.hy);
    if (!armenian) return res.send(getResponse(false, 'Armenian is required'));
    return next();
  } catch (e) {
    new APIError(e, 500, 'addVacancy function in wishList/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const updateVacancy = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const body: IUpdateVacancyBody = req.body;
    const result = Joi.validate(body, {
      ...idValidation,
      translations: Joi.array().items({
        ...languageValidation,
        title : Joi.string().min(1).required(),
        body  : Joi.string().min(1).required()
      }).min(1).unique('language').required()
    });
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const armenian = body.translations.map(item => item.language === LanguageEnum.hy);
    if (!armenian) return res.send(getResponse(false, 'Armenian is required'));
    const vacancy = await VacancySchema.findById(body.id);
    if (!vacancy) return res.send(getResponse(false, 'Wrong Id'));
    req.body.vacancy = vacancy;
    return next();
  } catch (e) {
    new APIError(e, 500, 'updateVacancy function in wishList/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const setVacancyImage = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const result = Joi.validate(req.body, {
      ...idValidation,
      deleteImage: Joi.boolean().optional()
    });
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    if (!req.body.deleteImage && !req.file) return res.send(getResponse(false, 'Missing data'));
    const vacancy = await VacancySchema.findById(req.body.id);
    if (!vacancy) return res.send(getResponse(false, 'Wrong Id'));
    req.body.vacancy = vacancy;
    req.body.file = req.file;
    return next();
  } catch (e) {
    new APIError(e, 500, 'setVacancyImage function in wishList/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const getVacancyAdminList = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const result = Joi.validate(req.query, {
      ...pagingValidation
    });
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    req.query.pageNo = +req.query.pageNo;
    req.query.limit = +req.query.limit;
    return next();
  } catch (e) {
    new APIError(e, 500, 'setVacancyImage function in wishList/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const getVacancyDetailsForAdmin = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const result = Joi.validate(req.query, {
      ...idValidation
    });
    if (result.error) return res.send(getResponse(false, result.error.details[0].message));
    const vacancy = await VacancySchema.findById(req.query.id).select('_id image translations').populate({
      path: 'translations',
      select: { _id: 0, language: 1, title: 1, body: 1 }
    });
    if (!vacancy) return res.send(getResponse(false, 'Wrong Id'));
    req.body.vacancy = vacancy;
    return next();
  } catch (e) {
    new APIError(e, 500, 'getVacancyDetailsForAdmin function in wishList/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const deleteVacancies = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const result = Joi.validate(req.body, {
      idList: Joi.array().items(idValidation.id).min(1).required()
    });
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const vacancyList = await VacancySchema.find({ _id: { $in: req.body.idList } });
    if (vacancyList.length !== req.body.idList.length) {
      return res.send(getResponse(false, 'Wrong Id list'));
    }
    req.body.vacancyList = vacancyList;
    return next();
  } catch (e) {
    new APIError(e, 500, 'deleteVacancies function in wishList/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};