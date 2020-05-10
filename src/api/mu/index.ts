import { Router, Response } from 'express';

import * as Validations from './validation';
import Services from './service';

import { IRequest, getErrorResponse } from '../mainModels';
import APIError from '../../services/APIError';
import jwtValidation from '../jwtValidation';

class MuRoutes {
  public router = Router();

  constructor() {
    this.routes();
  }

  private routes () {

    /** POST api/mu - Functionality for admin to create new mu */
    this.router.post('/', jwtValidation.validateAdmin, Validations.createMu, this.createMu);
    /** PUT api/mu - Functionality for admin to update mu */
    this.router.put('/', jwtValidation.validateAdmin, Validations.updateMu, this.updateMu);
    /** DELETE api/mu - Functionality for admin to delete mu */
    this.router.delete('/', jwtValidation.validateAdmin, Validations.deleteMu, this.deleteMu);

    /** GET api/mu - Functionality for all to get mu */
    this.router.get('/', Validations.getMu, this.getMu);
    /** GET api/mu/list -Functionality for admin to get mu list */
    this.router.get('/list', jwtValidation.validateAdmin, this.getMuList);

  }

  private createMu = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.createMu(req.body);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'createMu function in mu/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private updateMu = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.updateMu(req.body);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'updateMu function in mu/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private deleteMu = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.deleteMu(req.body.idList);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'deleteMu function in mu/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private getMu = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.getMu(+req.query.language);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'getMu function in mu/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private getMuList = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.getMuList();
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'getMuList function in mu/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

}

export default new MuRoutes().router;
