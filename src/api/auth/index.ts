import { Router, Response } from 'express';

import * as Validations from './validation';
import Services from './service';
import { IRequest, getErrorResponse } from '../mainModels';
import APIError from '../../services/APIError';
import jwtValidation from '../jwtValidation';


class AuthRoutes {
  public router = Router();

  constructor() {
    this.routes();
  }

  private routes() {

    /** POST api/auth/socialLogin        - Functionality for user to login with social media */
    this.router.post('/socialLogin', Validations.socialLogin, this.socialLogin);

    /** POST api/auth/sendEmail          - Functionality for sending verification email to user */
    this.router.post('/sendEmail', Validations.sendVerificationEmail, this.sendVerificationEmail);

    /** POST api/auth/verify             - Functionality for checking verification code sent to user */
    this.router.post('/verify', Validations.checkVerificationCode, this.checkVerificationCode);

    /** POST api/auth/register           - Functionality for users to register locally */
    this.router.post('/register', Validations.registerUser, this.registerUser);

    /** POST api/auth/forgot/sendEmail   - Functionality for sending forgot email to user */
    this.router.post('/forgot/sendEmail', Validations.sendForgotEmail, this.sendForgotEmail);

    /** POST api/auth/forgot/verify      - Functionality for checking verification code sent to user */
    this.router.post('/forgot/verify', Validations.checkForgotCode, this.checkForgotCode);

    /** POST api/auth/forgot/restore     - Functionality for user to restore password with restore code */
    this.router.post('/forgot/restore', Validations.restorePassword, this.restorePassword);

    /** POST api/auth/login              - Functionality for users to login with local strategy */
    this.router.post('/loginUser', Validations.loginUser, this.loginUser);

    /** POST api/auth/loginAdmin        - Functionality for admins to log in */
    this.router.post('/loginAdmin', Validations.loginAdmin, this.loginAdmin);

    /** POST api/auth/logOut            - Functionality for users to log out */
    this.router.post('/logOut', jwtValidation.validateUser, Validations.logOut, this.logOut);

    this.router.post('/changePassword', jwtValidation.validatePartner, Validations.changePassword, this.changePassword);

  }

  private socialLogin = async (req: IRequest, res: Response) => {
    try {
      const response = await Services.socialLogin(req.body);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'socialLogin function in auth/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private sendVerificationEmail = async (req: IRequest, res: Response) => {
    try {
      const response = await Services.sendVerificationEmail(req.body);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'sendVerificationEmail function in auth/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private checkVerificationCode = async (req: IRequest, res: Response) => {
    try {
      const response = await Services.checkVerificationCode(req.body);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'checkVerificationCode function in auth/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private registerUser = async (req: IRequest, res: Response) => {
    try {
      const response = await Services.registerUser(req.body);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'registerUser function in auth/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private sendForgotEmail = async (req: IRequest, res: Response) => {
    try {
      const response = await Services.sendForgotEmail(req.body);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'sendForgotEmail function in auth/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private checkForgotCode = async (req: IRequest, res: Response) => {
    try {
      const response = await Services.checkForgotCode(req.body);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'checkForgotCode function in auth/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private restorePassword = async (req: IRequest, res: Response) => {
    try {
      const response = await Services.restorePassword(req.body);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'restorePassword function in auth/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private loginUser = async (req: IRequest, res: Response) => {
    try {
      const response = await Services.loginUser(req.body);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'loginUser function in auth/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private loginAdmin = async (req: IRequest, res: Response) => {
    try {
      const response = await Services.loginAdmin(req.body);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'loginAdmin function in auth/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private logOut = async (req: IRequest, res: Response) => {
    try {
      const response = await Services.logOut(req.user._id, req.body.deviceToken);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'logOut function in auth/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private changePassword = async (req: IRequest, res: Response) => {
    try {
      const response = await Services.changePassword(req.body, req.user._id);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'changePassword function in auth/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }
}

export default new AuthRoutes().router;