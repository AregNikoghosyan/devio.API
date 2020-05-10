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

    /** POST api/device            - Functionality to create new device when user selects language */
    this.router.post('/',            jwtValidation.validateGuestOrUser, Validations.createDevice,   this.createDevice);

    /** PUT api/device/token       - Functionality to set device token with deviceId */
    this.router.put('/',             Validations.setDeviceToken, this.setDeviceToken);

    /** GET  api/device            - Functionality to get device settings */
    this.router.get('/',             jwtValidation.validateGuestOrUser, Validations.getDeviceSettings,  this.getDeviceSettings);

    // TODO Update users' all devices' permissions and language when update, when login
    /** PUT  api/device/permission - Functionality to change notification settings for user */
    this.router.put('/permission',   jwtValidation.validateGuestOrUser, Validations.changePermission,   this.changePermission);

    /** PUT  api/device/language   - Functionality to change language for user */
    this.router.put('/language',     jwtValidation.validateGuestOrUser, Validations.changeLanguage,     this.changeLanguage);

  }

  private createDevice = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.createDevice(req.body, req.user);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'createDevice function in device/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private setDeviceToken = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.setDeviceToken(req.body);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'setDeviceToken function in device/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private getDeviceSettings = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.getDeviceSettings(req.body.device);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'getDeviceSettings function in device/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private changePermission = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.changePermission(req.user, req.body);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'changePermission function in device/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private changeLanguage = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.changeLanguage(req.user, req.body);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'changeLanguage function in device/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

}

export default new DeviceRoutes().router;
