import * as Joi from 'joi';
import { Response, NextFunction } from 'express';
import { IRequest, getErrorResponse, getResponse } from '../mainModels';
import APIError from '../../services/APIError';
import { pagingValidation, idValidation, languageValidation } from '../mainValidation';

import UserNotificationSchema from '../../schemas/userNotification';
import NotificationSchema     from '../../schemas/notification';

import { UserTypeEnum, NotificationStatusEnum, UserTariffTypeEnum } from '../../constants/enums';
import { deleteFiles } from '../../services/fileManager';
import { ISendCustomNotificationBody } from './model';

export const getAdminNotificationList = async(req: IRequest, res: Response, next: NextFunction) => {
  try {
    const result = Joi.validate(req.query, pagingValidation);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    req.query.pageNo = +req.query.pageNo;
    req.query.limit = +req.query.limit;
    return next();
  } catch (e) {
    new APIError(e, 500, 'getAdminNotificationList function in notification/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const getNotificationList = async(req: IRequest, res: Response, next: NextFunction) => {
  try {
    req.query.language = +req.headers['language'];
    const result = Joi.validate(req.query, { ...languageValidation, ...pagingValidation });
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    req.query.pageNo = +req.query.pageNo;
    req.query.limit = +req.query.limit;
    if (!req.user && !req.headers['deviceId']) {
      return getResponse(false, 'Missing deviceId');
    }
    req.query.deviceId = req.headers['deviceId'];
    return next();
  } catch (e) {
    new APIError(e, 500, 'getNotificationList function in notification/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const deleteNotification = async(req: IRequest, res: Response, next: NextFunction) => {
  try {
    const result = Joi.validate(req.query, idValidation);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    if (!req.user && !req.headers['deviceId']) return getResponse(false, 'Missing deviceId');
    const filter: any = { _id: req.query.id };
    if (req.user) {
      if (req.user.role === UserTypeEnum.superAdmin || req.user.role === UserTypeEnum.admin) {
        filter.receiver = null;
        filter.deviceId = null;
      } else {
        filter.receiver = req.user._id;
      }
    } else {
      filter.deviceId = req.headers['deviceId'];
    }
    const notification = await UserNotificationSchema.findOne(filter);
    if (!notification) return res.send(getResponse(false, 'Wrong Id'));
    return next();
  } catch (e) {
    new APIError(e, 500, 'deleteNotification function in notification/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const setNotificationData = async(req: IRequest, res: Response, next: NextFunction) => {
  try {
    const result = Joi.validate(req.body, translateArrayValidation);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    return next();
  } catch (e) {
    new APIError(e, 500, 'setNotificationData function in notification/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const setNotificationImage = async(req: IRequest, res: Response, next: NextFunction) => {
  try {
    const result = Joi.validate(req.body, idValidation);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    if (!req.file) return res.send(getResponse(false, 'Missing image'));
    const notification = await NotificationSchema.findOne({ _id: req.body.id, status: NotificationStatusEnum.draft });
    if (!notification) {
      deleteFiles([req.file.path], false).catch(e => console.log(e));
    }
    req.body.notification = notification;
    return next();
  } catch (e) {
    new APIError(e, 500, 'setNotificationImage function in notification/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const sendCustomNotification = async(req: IRequest, res: Response, next: NextFunction) => {
  try {
    const body: ISendCustomNotificationBody = req.body;
    const bodyValidationSchema = {
      ...idValidation,
      filters: Joi.array().items({
        search     : Joi.string().allow(['', null]).optional(),
        orderFrom  : Joi.number().allow(['', null]).min(0).optional(),
        orderTo    : Joi.number().allow(['', null]).min(0).optional(),
        requestFrom: Joi.number().allow(['', null]).min(0).optional(),
        requestTo  : Joi.number().allow(['', null]).min(0).optional(),
        tariffPlan : Joi.number().equal([UserTariffTypeEnum.gold, UserTariffTypeEnum.silver, UserTariffTypeEnum.usual]).allow([null, '']).optional()
      }).min(0).required()
    };
    const result = Joi.validate(body, bodyValidationSchema);
    if (result.error) return res.send(getResponse(false, result.error.details[0].message));
    const notification = await NotificationSchema.findOne({
      _id: body.id,
      status: NotificationStatusEnum.draft
    });
    if (!notification) return res.send(getResponse(false, 'Wrong Id'));
    req.body.notification = notification;
    return next();
  } catch (e) {
    new APIError(e, 500, 'setNotificationImage function in notification/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const getSentNotificationList = async(req: IRequest, res: Response, next: NextFunction) => {
  try {
    req.query.language = +req.headers['language'];
    const result = Joi.validate(req.query, { ...pagingValidation, ...languageValidation });
    if (result.error) return res.send(getResponse(false, result.error.details[0].message));
    req.query.pageNo = +req.query.pageNo;
    req.query.limit = +req.query.limit;
    return next();
  } catch (e) {
    new APIError(e, 500, 'getSentNotificationList function in notification/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const getNotificationDetails  = async(req: IRequest, res: Response, next: NextFunction) => {
  try {
    req.query.language = +req.headers['language'];
    const result = Joi.validate(req.query, idValidation);
    if (result.error) return res.send(getResponse(false, result.error.details[0].message));
    const notification = await NotificationSchema.findOne(req.query._id).select({
      _id: 1,
      translations: 1,
    }).populate({
      path: 'translations',
      select: {
        _id: 0,
        language: 1,
        title: 1,
        body: 1
      }
    });
    if (!notification) return res.send(getResponse(false, 'Wrong id'));
    req.body.notification = notification;
    return next();
  } catch (e) {
    new APIError(e, 500, 'getNotificationDetails function in notification/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

const translateValidation = {
  ...languageValidation,
  title: Joi.string().min(1).required(),
  body: Joi.string().min(1).required()
};

const translateArrayValidation = {
  translations: Joi.array().items(translateValidation).length(3).unique('language').required()
};