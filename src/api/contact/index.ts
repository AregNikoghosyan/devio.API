import { Router, Response } from 'express';
import { IRequest, getErrorResponse, getResponse } from '../mainModels';
import APIError from '../../services/APIError';

import * as Validations from './validation';
import Services from './service';
import jwtValidation from '../jwtValidation';

class ContactRoutes {

  public router = Router();

  constructor() {
    this.routes();
  }

  private routes () {
    this.router.post('/', Validations.createContact, this.createContact);
    this.router.get('/', Validations.createContact, this.getContact);
  }

  private createContact = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.createContact(req.body);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'Something went wrong');
      res.status(500).send(getErrorResponse());
    }
  }

  private getContact = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.createContact(req.body);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'Something went wrong');
      res.status(500).send(getErrorResponse());
    }
  }
}

export default new ContactRoutes().router;