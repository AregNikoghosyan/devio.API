import { Router, Response } from 'express';
import { IRequest, getErrorResponse, getResponse } from '../mainModels';
import APIError from '../../services/APIError';

import * as Validations from './validation';
import Services from './service';
import jwtValidation from '../jwtValidation';

class OrderRoutes {

  public router = Router();

  constructor() {
    this.routes();
  }

  private routes = () => {

    /** GET  api/order/cart - Functionality for users to get tariff and bonus count */
    this.router.get('/cart', jwtValidation.validateUser, this.getCartDetails);
    /** POST api/order/checkout - Functionality for all to go to checkout */
    this.router.post('/checkout', jwtValidation.validateGuestOrUser, Validations.goToCheckOut, this.goToCheckOut);
    /** GET  api/order/payer - Functionality for users to get payer list */
    this.router.get('/payer', jwtValidation.validateUser, this.getPayerListForUser);
    /** POST api/oder/delivery - Functionality for all to check deliveryPrice */
    this.router.post('/delivery', Validations.checkDeliveryFee, this.checkDeliveryFee);
    /** POST api/order/deliveryDate - Functionality for all to check deliver day count */
    this.router.post('/deliveryDate', Validations.checkDeliveryDate, this.checkDeliveryDate);
    /** POST api/order/promo - Functionality for all to check if promoCode is active */
    this.router.post('/promo', jwtValidation.validateGuestOrUser, Validations.checkPromoCode, this.checkPromoCode);
    /** POST api/order/email/send - Functionality for all to send verification email */
    this.router.post('/email/send', Validations.sendVerificationEmail, this.sendVerificationEmail);
    /** POST api/order/email/verify - Functionality for all to verify email */
    this.router.post('/email/verify', Validations.verifyEmail, this.verifyEmail);


    /** POST api/order - Functionality for all to create order */
    this.router.post('/', jwtValidation.validateGuestOrUser, Validations.createOrder, this.createOrder);

    /** POST api/order/dashboard - Functionality for admin to get order list */
    this.router.post('/dashboard', jwtValidation.validatePartner, Validations.getListForAdmin, this.getListForAdmin);
    /** GET api/order/dtlsAdmin - Functionality for admin to get order details */
    this.router.get('/dtlsAdmin', jwtValidation.validateAdmin, Validations.getDetailsForAdmin, this.getDetailsForAdmin);

    /** GET  api/order/list - Functionality for users to get order list */
    this.router.get('/list', jwtValidation.validateUser, Validations.getListForUser, this.getListForUser);
    /** GET  api/order/dtlsUser - Functionality for user to get order details */
    this.router.get('/dtlsUser', jwtValidation.validateGuestOrUser, Validations.getDetailsForUser, this.getDetailsForUser);

    /** PUT api/order/cancel - Functionality for user and admins to cancel order */
    this.router.put('/cancel', jwtValidation.validateGuestOrUser, Validations.cancelOrder, this.cancelOrder);
    /** PUT api/order/review - Functionality for user to set order status to review */
    this.router.put('/review', jwtValidation.validateGuestOrUser, Validations.setReviewOrder, this.setReviewOrder);
    /** POST api/order/repeat - Functionality for user to repeat order */
    this.router.post('/repeat', jwtValidation.validateGuestOrUser, Validations.repeatOrder, this.repeatOrder);
    /** PUT api/order/finish - Functionality for user and admins to finish order */
    this.router.put('/finish', jwtValidation.validateAdmin, Validations.finishOrder, this.finishOrder);

    /** GET api/order/guest - Functionality for guests to get order id bu email and verification key */
    this.router.post('/guest', Validations.getGuestOrderId, this.getGuestOrderId);

    /** POST api/order/invoice - Functionality for all to generate invoice */
    this.router.post('/invoice', jwtValidation.validateGuestOrUser, Validations.generateInvoice, this.generateInvoice);

    this.router.get('/getPdf', jwtValidation.validateAdmin, Validations.generateInvoice, this.generateInvoiceNew);
  }

  private getCartDetails = async(req: IRequest, res: Response) => {
    try {
      res.send(getResponse(true, 'Got details', { tariffPlan: req.user.tariffPlan, bonus: req.user.points }));
    } catch (e) {
      new APIError(e, 500, 'goToCheckOut function in order/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private goToCheckOut = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.goToCheckOut(req.body, req.user);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'goToCheckOut function in order/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private getPayerListForUser = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.getPayerListForUser(req.user);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'getPayerListForUser function in order/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private checkDeliveryFee = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.checkDeliveryFee(req.body);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'checkDeliveryFee function in order/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private checkDeliveryDate = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.checkDeliveryDate(req.body.productList);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'checkDeliveryDate function in order/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private checkPromoCode = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.checkPromoCode(req.body, req.user || req.body.guestUser, req.user ? 1 : 2);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'checkPromoCode function in order/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private sendVerificationEmail = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.sendVerificationEmail(req.body.email);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'sendVerificationEmail function in order/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private verifyEmail = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.verifyEmail(req.body.guestUser, req.body.code);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'verifyEmail function in order/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private createOrder = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.createOrder(req.user, req.body);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'createOrder function in order/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private getListForAdmin = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.getListForAdmin(req.body);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'getListForAdmin function in order/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private getDetailsForAdmin = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.getDetailsForAdmin(req.body.order, req.query.language);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'getDetailsForAdmin function in order/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private getListForUser = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.getListForUser(req.user, req.query);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'getListForUser function in order/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private getDetailsForUser = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.getDetailsForUser(req.body.order, req.query.language);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'getDetailsForUser function in order/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private cancelOrder = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.cancelOrder(req.body, req.user);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'cancelOrder function in order/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private repeatOrder = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.repeatOrder(req.body.order, req.body.language, req.user);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'repeatOrder function in order/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private setReviewOrder = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.setReviewOrder(req.body.order);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'setReviewOrder function in order/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private finishOrder = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.finishOrder(req.body, req.user);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'finishOrder function in order/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private getGuestOrderId = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.getGuestOrderId(req.body);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'getGuestOrderId function in order/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private generateInvoice = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.generateInvoice(req.body, req.user);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'generateInvoice function in order/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private generateInvoiceNew = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.generateInvoiceNew(req.body, req.user);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'generateInvoice function in order/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

}

export default new OrderRoutes().router;