import * as Joi from 'joi';

import { Router, Request, Response } from 'express';
import APIError from '../../services/APIError';
import { getErrorResponse, getResponse } from '../mainModels';

import * as Validation from './validation';
import Service from './service';

class ImageRoutes {

  router = Router();

  constructor() {

    this.router.get('/:path/:width/:height', Validation.getImageBySize, this.getImageBySize);

    // this.router.get('/:path', Validation.getImageByDefault, this.getImageByDefault);
  }

  private getImageBySize = async(req: Request, res: Response) => {
    try {
      const { buffer, contentType } = await Service.getImageBySize(req.body);
      res.contentType(contentType);
      res.end(buffer, 'binary');
    } catch (e) {
      new APIError(e, 500, 'getImageBySize function in image/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private getImageByDefault = async(req: Request, res: Response) => {
    try {
      const { buffer, contentType } = await Service.getImageByDefault(req.body);
      res.contentType(contentType);
      res.end(buffer, 'binary');
    } catch (e) {
      new APIError(e, 500, 'getImageByDefault function in image/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

}

export default new ImageRoutes().router;