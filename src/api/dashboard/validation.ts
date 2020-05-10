import * as Joi from 'joi';
import APIError from '../../services/APIError';

import { Response, NextFunction } from 'express';
import { IRequest, getResponse, getErrorResponse } from '../mainModels';
import { languageValidation, idValidation } from '../mainValidation';
import { IGetDashboardBody } from './model';

export const getDashboard = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const body: IGetDashboardBody = req.body;
    const bodyValidationSchema = {
      dateFrom: Joi.date().required(),
      dateTo: Joi.date().allow(['', null]).optional(),
    };
    const result = Joi.validate(body, bodyValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    if (body.dateFrom && body.dateFrom && body.dateFrom > body.dateTo) {
      return res.send(getResponse(false, 'Date from must be less than date to'));
    }
    return next();
  } catch (e) {
    new APIError(e, 500, 'createMu function in dashboard/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};