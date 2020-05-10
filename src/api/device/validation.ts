import * as Joi from 'joi';

import APIError from '../../services/APIError';

import DeviceSchema from '../../schemas/device';

import { Response, NextFunction } from 'express';
import { IRequest, getErrorResponse, getResponse } from '../mainModels';
import { IChangePermissionBody, ICreateDeviceBody, IChangeLanguageBody, ISetDeviceTokenBody } from './model';

export const createDevice = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const body: ICreateDeviceBody = req.body;
    const bodyValidationSchema = {
      osType      : Joi.number().min(1).max(2).required(),
      language    : Joi.number().min(1).max(3).required(),
      deviceId    : Joi.string().required(),
      deviceToken : Joi.string().optional()
    };
    const result = Joi.validate(body, bodyValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    return next();
  } catch (e) {
    new APIError(e, 500, 'createDevice function in device/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const setDeviceToken = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const body: ISetDeviceTokenBody = req.body;
    const bodyValidationSchema = {
      deviceId    : Joi.string().required(),
      deviceToken : Joi.string().required()
    };
    const result = Joi.validate(body, bodyValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const device = await DeviceSchema.findOne({ deviceId: body.deviceId });
    if (!device) return res.send(getResponse(false, 'Wrong deviceId'));
    req.body.device = device;
    return next();
  } catch (e) {
    new APIError(e, 500, 'setDeviceToken function in device/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const getDeviceSettings = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const query = req.query;
    const queryValidationSchema = {
      deviceId: Joi.string().required()
    };
    const result = Joi.validate(query, queryValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const device = await DeviceSchema.findOne({ deviceId: query.deviceId });
    if (!device) {
      return res.send(getResponse(false, 'Wrong device Id'));
    }
    req.body.device = device;
    return next();
  } catch (e) {
    new APIError(e, 500, 'getDeviceSettings function in device/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const changePermission = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const body: IChangePermissionBody = req.body;
    const bodyValidationSchema: any = {
      type: Joi.number().min(1).max(3).required()
    };
    if (!req.user) {
      bodyValidationSchema.deviceId = Joi.string().required();
    }
    const result = Joi.validate(body, bodyValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    if (!req.user) {
      const device = await DeviceSchema.findOne({ deviceId: body.deviceId });
      if (!device) return res.send(getResponse(false, 'Wrong Id'));
      else req.body.device = device;
    }
    return next();
  } catch (e) {
    new APIError(e, 500, 'changePermission function in device/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const changeLanguage = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const body: IChangeLanguageBody = req.body;
    const bodyValidationSchema: any = {
      language: Joi.number().min(1).max(3).required()
    };
    if (!req.user) {
      bodyValidationSchema.deviceId = Joi.string().required();
    }
    const result = Joi.validate(body, bodyValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    if (!req.user) {
      const device = await DeviceSchema.findOne({ deviceId: body.deviceId });
      if (!device) return res.send(getResponse(false, 'Wrong Id'));
      else req.body.device = device;
    }
    return next();
  } catch (e) {
    new APIError(e, 500, 'changeLanguage function in device/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};