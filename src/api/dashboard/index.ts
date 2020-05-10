import { Router, Response } from 'express';

import * as Validations from './validation';
import Services from './service';

import { IRequest, getErrorResponse } from '../mainModels';
import APIError from '../../services/APIError';
import jwtValidation from '../jwtValidation';

class DashboardRoutes {
  public router = Router();

  constructor() {
    this.routes();
  }

  private routes () {

    /** POST api/dashboard - Functionality for admin to get dashboard data */
    this.router.post('/', jwtValidation.validateAdmin, Validations.getDashboard, this.getDashboard);

  }

  private getDashboard = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.getDashboard(req.body);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'getDashboard function in mu/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

}

export default new DashboardRoutes().router;
