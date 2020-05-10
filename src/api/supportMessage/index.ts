import { Router, Response } from 'express';
import { IRequest, getErrorResponse, getResponse } from '../mainModels';
import APIError from '../../services/APIError';

import * as Validations from './validation';
import Services from './service';
import jwtValidation from '../jwtValidation';

class SupportRoutes {

  public router = Router();

  constructor() {
    this.routes();
  }

  private routes () {
    this.router.post('/', Validations.sendSupportMessage, this.sendSupportMessage);
    this.router.get('/', jwtValidation.validateAdmin, Validations.getSupportMessageList, this.getSupportMessageList);
    this.router.post('/sendEmail', Validations.sendEmail, this.sendEmail);
    this.router.get('/emailList', jwtValidation.validateAdmin, Validations.getSupportMessageList, this.getEmailMessageList);
  }

  private sendSupportMessage = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.sendSupportMessage(req.body);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'sendSupportMessage function in supportMessage/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private sendEmail = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.sendEmail(req.body);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'sendSupportMessage function in supportMessage/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private getSupportMessageList = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.getSupportMessageList(req.query);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'getSupportMessageList function in supportMessage/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private getEmailMessageList = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.getEmailMessageList(req.query);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'getSupportMessageList function in supportMessage/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

}

export default new SupportRoutes().router;