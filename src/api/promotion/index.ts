import { Router, Response } from 'express';

import * as Validations from './validation';
import Services from './service';
import jwtValidation from '../jwtValidation';

import { IRequest, getErrorResponse } from '../mainModels';
import APIError from '../../services/APIError';
import { uploadCover } from '../formData';

class PromotionRoutes {
  public router = Router();

  constructor() {
    this.routes();
  }

  private routes() {

    /** POST api/promotion - Functionality for admin to add promotion */
    this.router.post('/', jwtValidation.validateAdmin, Validations.addPromotion, this.addPromotion);
    /** POST api/promotion/cover - Functionality for admin to set promotion cover */
    this.router.put('/cover', jwtValidation.validateAdmin, uploadCover, Validations.setPromotionCover, this.setPromotionCover);
    /** PUT  api/promotion - Functionality for admin to update promotion */
    this.router.put('/', jwtValidation.validateAdmin, Validations.updatePromotion, this.updatePromotion);
    /** PUT  api/promotion/hidden - Functionality for admin to hide / unHide promotion */
    this.router.put('/hidden', jwtValidation.validateAdmin, Validations.hideOrUnHidePromotion, this.hideOrUnHidePromotion);
    /** DELETE api/promotion - Functionality for admin to delete promotions */
    this.router.delete('/', jwtValidation.validateAdmin, Validations.deletePromotions, this.deletePromotions);
    /** GET  api/promotion - Functionality for admin to get promotion list */
    this.router.get('/', jwtValidation.validateAdmin, Validations.getListForAdmin, this.getListForAdmin);
    /** GET  api/promotion/details - Functionality for admin to get promotion details */
    this.router.get('/details', jwtValidation.validateAdmin, Validations.getDetailsForAdmin, this.getDetailsForAdmin);
    /** GET  api/promotion/list - Functionality for all to get promotions */
    this.router.get('/list', Validations.getListForAll, this.getListForAll);

  }

  private addPromotion = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.addPromotion(req.body);
      return res.send(response);
    } catch (e) {
      new APIError(e, 500, 'addPromotion function in promotion/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private setPromotionCover = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.setPromotionCover(req.body.promotion, req.file);
      return res.send(response);
    } catch (e) {
      new APIError(e, 500, 'setPromotionCover function in promotion/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private updatePromotion = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.updatePromotion(req.body);
      return res.send(response);
    } catch (e) {
      new APIError(e, 500, 'updatePromotion function in promotion/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private hideOrUnHidePromotion = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.hideOrUnHidePromotion(req.body.promotion);
      return res.send(response);
    } catch (e) {
      new APIError(e, 500, 'hideOrUnHidePromotion function in promotion/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private deletePromotions = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.deletePromotions(req.body.idList);
      return res.send(response);
    } catch (e) {
      new APIError(e, 500, 'deletePromotions function in promotion/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private getListForAdmin = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.getListForAdmin(req.query);
      return res.send(response);
    } catch (e) {
      new APIError(e, 500, 'getListForAdmin function in promotion/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private getDetailsForAdmin = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.getDetailsForAdmin(req.query.id);
      return res.send(response);
    } catch (e) {
      new APIError(e, 500, 'getDetailsForAdmin function in promotion/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private getListForAll = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.getListForAll(req.query);
      return res.send(response);
    } catch (e) {
      new APIError(e, 500, 'getListForAll function in promotion/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

}

export default new PromotionRoutes().router;