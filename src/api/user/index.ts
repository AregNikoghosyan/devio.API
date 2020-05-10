import { Router, Response } from 'express';

import * as Validations from './validation';
import Services from './service';

import { IRequest, getErrorResponse } from '../mainModels';
import APIError from '../../services/APIError';
import jwtValidation from '../jwtValidation';

class DeviceRoutes {
  public router = Router();

  constructor() {
    this.routes();
  }

  private routes () {

    /** GET  api/user              - Functionality for users to get profile data */
    this.router.get('/',             jwtValidation.validateUser,                                this.getUserProfile);

    /** PUT  api/user              - Functionality for users to updated profile data */
    this.router.put('/',             jwtValidation.validateUser, Validations.updateUserProfile, this.updateUserProfile);

    /** PUT  api/user/phone        - Functionality for user to update phone number */
    this.router.put('/phone',        jwtValidation.validateUser, Validations.updateUserPhone,   this.updateUserPhone);

    /** POST api/user/verifyPhone  - Functionality for user to verify phone number */
    this.router.post('/verifyPhone', jwtValidation.validateUser, Validations.verifyPhone,       this.verifyPhone);

    /** POST api/user/list         - Functionality for admin to get user list */
    this.router.post('/list',        jwtValidation.validateAdmin, Validations.getUserList,     this.getUserList);

    /** PUT  api/user/tariff       - Functionality for admin to set user tariff plan */
    this.router.put('/tariff',       jwtValidation.validateAdmin, Validations.setUserTariff,   this.setUserTariff);

    /** GET  api/user/details       - Functionality for admin to get user details */
    this.router.get('/details',      jwtValidation.validateAdmin, Validations.getUserDetails,  this.getUserDetails);

    /** GET  api/user/order         - Functionality for admin to get order list in user details */
    this.router.get('/order',        jwtValidation.validateAdmin, Validations.getUserOrders, this.getUserOrders);
    /** GET  api/user/request       - Functionality for admin to get request list in user details */
    this.router.get('/request',      jwtValidation.validateAdmin, Validations.getUserRequests, this.getUserRequests);

    /** POST api/user/count         - Functionality for admin to get count of the users by filter */
    this.router.post('/count', jwtValidation.validateAdmin, Validations.getUserCountByFilter, this.getUserCountByFilter);

    /** PUT  api/user/block         - Functionality for admin to block or unblock user */
    this.router.put('/block',  jwtValidation.validateAdmin, Validations.blockOrUnBlockUser, this.blockOrUnBlockUser);

    /** GET  api/user/badge         - Functionality for user to get user badges */
    this.router.get('/badge', jwtValidation.validateUser, this.getUserBadges);

  }

  private getUserProfile = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.getUserProfile(req.user, req.query.short);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'getUserProfile function in user/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private updateUserProfile = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.updateUserProfile(req.user, req.body);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'updateUserProfile function in user/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private updateUserPhone = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.updateUserPhone(req.user, req.body.phoneNumber);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'updateUserPhone function in user/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private verifyPhone = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.verifyPhone(req.user, req.body);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'verifyPhone function in user/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private getUserList = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.getUserList(req.body);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'getUserList function in user/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private setUserTariff = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.setUserTariff(req.body);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'setUserTariff function in user/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private getUserDetails = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.getUserDetails(req.body.user);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'getUserDetails function in user/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private getUserOrders = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.getUserOrders(req.query);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'getUserOrders function in user/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private getUserRequests = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.getUserRequests(req.query);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'getUserRequests function in user/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private getUserCountByFilter = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.getUserCountByFilter(req.body.filters);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'getUserCountByFilter function in user/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private blockOrUnBlockUser = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.blockOrUnBlockUser(req.body.user);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'blockOrUnBlockUser function in user/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private getUserBadges = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.getUserBadges(req.user._id);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'getUserBadges function in user/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

}

export default new DeviceRoutes().router;
