import { Router, Response } from 'express';

import * as Validations from './validation';
import Services from './service';

import { IRequest, getErrorResponse } from '../mainModels';
import APIError from '../../services/APIError';
import jwtValidation from '../jwtValidation';
import { uploadLogo } from '../formData';

class BrandRoutes {
  public router = Router();

  constructor() {
    this.routes();
  }

  private routes () {

    /** POST api/brand - Functionality for admin / partner to create new brand */
    this.router.post('/', jwtValidation.validatePartner, uploadLogo, Validations.createBrand, this.createBrand);
    /** PUT  api/brand - Functionality for admin to update brand */
    this.router.put('/', jwtValidation.validateAdmin, uploadLogo, Validations.updateBrand, this.updateBrand);
    /** GET  api/brand - Functionality for admin to get brand list */
    this.router.post('/listAdmin', jwtValidation.validateAdmin, Validations.getBrandListForAdmin, this.getBrandListForAdmin);
    /** DELETE api/brand - Functionality for admin to delete chosen brands */
    this.router.delete('/', jwtValidation.validateAdmin, Validations.deleteBrands, this.deleteBrands);
    /** GET  api/brand - Functionality for all to get brand list */
    this.router.get('/list', jwtValidation.validateGuestOrUser, Validations.getBrandListForAll, this.getBrandListForAll);
    /** GET  api/brand - Functionality for all for autocomplete */
    this.router.get('/auto', jwtValidation.validateGuestOrUser, Validations.getListForAutoComplete, this.getListForAutoComplete);
    /** POST api/brand/filter - Functionality for all to get brand for filter */
    this.router.post('/filter', jwtValidation.validateGuestOrUser, Validations.getListForFilter, this.getListForFilter);

  }

  private createBrand = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.createBrand(req.body, req.file);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'createBrand function in mu/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private updateBrand = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.updateBrand(req.body, req.file);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'updateBrand function in mu/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private getBrandListForAdmin = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.getBrandListForAdmin(req.body);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'getBrandListForAdmin function in mu/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private deleteBrands = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.deleteBrands(req.body.idList);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'deleteBrands function in mu/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private getBrandListForAll = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.getBrandListForAll(req.query, req.user);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'getBrandListForAll function in mu/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private getListForAutoComplete = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.getListForAutoComplete(req.query, req.user);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'getListForAutoComplete function in mu/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private getListForFilter = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.getListForFilter(req.body, req.user);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'getListForFilter function in mu/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

}

export default new BrandRoutes().router;
