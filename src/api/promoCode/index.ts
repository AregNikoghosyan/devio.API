import { Router, Response } from 'express';

import * as Validations from './validation';
import Services from './service';
import jwtValidation from '../jwtValidation';

import { IRequest, getErrorResponse } from '../mainModels';
import APIError from '../../services/APIError';

class PromoCodeRoutes {
  public router = Router();

  constructor() {
    this.routes();
  }

  private routes() {

    /** POST api/promo/generate - Functionality for admin to generate available promoCode */
    this.router.post('/generate', jwtValidation.validateAdmin, this.generatePromoCode);
    /** POST api/promo/validate - Functionality for admin to validate written promoCode */
    this.router.post('/validate', jwtValidation.validateAdmin, Validations.validatePromoCode, this.validatePromoCode);
    /** POST api/promo          - Functionality for admin to add promoCode */
    this.router.post('/', jwtValidation.validateAdmin, Validations.createPromoCode, this.createPromoCode);
    /** PUT  api/promo          - Functionality for admin to update promoCode */
    this.router.put('/', jwtValidation.validateAdmin, Validations.updatePromoCode, this.updatePromoCode);
    /** GET  api/promo          - Functionality for admin to get promoCode details */
    this.router.get('/', jwtValidation.validateAdmin, Validations.getPromoCodeDetails, this.getPromoCodeDetails);
    /** DELETE api/promo        - Functionality for admin to delete promoCode */
    this.router.delete('/', jwtValidation.validateAdmin, Validations.deletePromoCode, this.deletePromoCode);
    /** POST   api/promo/list   - Functionality for admin to get promoCode list */
    this.router.post('/list', jwtValidation.validateAdmin, Validations.getPromoCodeList, this.getPromoCodeList);
  }

  private generatePromoCode = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.generatePromoCode();
      return res.send(response);
    } catch (e) {
      new APIError(e, 500, 'generatePromoCode function in promoCode/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private validatePromoCode = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.validatePromoCode(req.body.code);
      return res.send(response);
    } catch (e) {
      new APIError(e, 500, 'validatePromoCode function in promoCode/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private createPromoCode = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.createPromoCode(req.body);
      return res.send(response);
    } catch (e) {
      new APIError(e, 500, 'createPromoCode function in promoCode/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private updatePromoCode = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.updatePromoCode(req.body);
      return res.send(response);
    } catch (e) {
      new APIError(e, 500, 'updatePromoCode function in promoCode/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private getPromoCodeDetails = async(req: IRequest, res: Response) => {
    try {
      return res.send(req.body.promoCode);
    } catch (e) {
      new APIError(e, 500, 'getPromoCodeDetails function in promoCode/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private deletePromoCode = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.deletePromoCode(req.body.idList);
      return res.send(response);
    } catch (e) {
      new APIError(e, 500, 'deletePromoCode function in promoCode/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private getPromoCodeList = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.getPromoCodeList(req.body);
      return res.send(response);
    } catch (e) {
      new APIError(e, 500, 'getPromoCodeList function in promoCode/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

}

export default new PromoCodeRoutes().router;