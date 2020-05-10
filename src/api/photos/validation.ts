import * as Joi from 'joi';
import * as fs from 'fs';

import { Response, NextFunction, Request } from 'express';
import APIError from '../../services/APIError';
import { getErrorResponse, getResponse } from '../mainModels';
import mainConfig from '../../env';
import { mediaPaths } from '../../constants/constants';

export const getImageBySize = async(req: Request, res: Response, next: NextFunction) => {
  try {
    
    const details = {
      path: req.params['path'],
      width: parseInt(req.params['width']),
      height: parseInt(req.params['height']),
    };
    const result = Joi.validate(details, {
      path: Joi.string().regex(/[^\\]*\.(\w+)$/).required(),
      width: Joi.number().integer().min(10),
      height: Joi.number().integer().min(10)
    });
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const exists = fs.existsSync(mainConfig.MEDIA_PATH + mediaPaths.photos + details.path);
    if (!exists) {
      return res.status(404).send('File not found');
    }
    details.width = +details.width;
    details.height = +details.height;
    req.body = {...details};
    return next();
  } catch (e) {
    new APIError(e, 500, 'getImageBySize function in image/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const getImageByDefault = async(req: Request, res: Response, next: NextFunction) => {
  try {
    const result = Joi.validate(req.params['path'], Joi.string().regex(/[^\\]*\.(\w+)$/).required());
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const details = { path: req.params['path'] };
    const exists = fs.existsSync(mainConfig.MEDIA_PATH + details.path);
    if (!exists) {
      return res.status(404).send('File not found');
    }
    req.body = details;
    return next();
  } catch (e) {
    new APIError(e, 500, 'getImageByDefault function in image/validation.ts');
    res.status(500).send(getErrorResponse());
  }
};