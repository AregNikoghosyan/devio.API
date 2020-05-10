
import { Request, Response, Router } from 'express';

import Service from './service';
import APIError from '../../services/APIError';
import { getErrorResponse } from '../mainModels';

class Idram {
  public router: Router;

  constructor() {
    this.router = Router();
    this.routes();
  }

  private checkOrder = async(req: Request, res: Response) => {
    try {
      const data: boolean = await Service.checkOrder(req.body);
      if (data) return res.sendStatus(200);
      return res.sendStatus(400);
    } catch (e) {
      new APIError(e, 500, 'checkOrder function in idram/service.ts');
      res.status(500).send(getErrorResponse());
    }
  };

  private successTransaction = async(req: Request, res: Response) => {
    try {
      await Service.successTransaction(req.query);
      return res.sendStatus(200);
    } catch (e) {
      new APIError(e, 500, 'successTransaction function in idram/service.ts');
      res.status(500).send(getErrorResponse());
    }
  };

  private fail = async(req: Request, res: Response) => {
    try {
      await Service.fail(req.query);
      return res.sendStatus(200);
    } catch (e) {
      new APIError(e, 500, 'fail function in idram/service.ts');
      res.status(500).send(getErrorResponse());
    }
  };

  private routes = () => {
    this.router.post('/checkOrder', this.checkOrder);
    this.router.get('/success', this.successTransaction);
    this.router.get('/fail', this.fail);
  }
}

export default new Idram().router;
