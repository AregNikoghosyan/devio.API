import { Router, Response } from 'express';
import jwtValidation from '../jwtValidation';

import * as Validations from './validation';
import Services from './service';
import { IRequest, getErrorResponse, getResponse } from '../mainModels';
import APIError from '../../services/APIError';

class AddressRoutes {
  public router = Router();

  constructor() {
    this.routes();
  }

  private routes () {

    /** POST api/address      - Create address functionality for user */
    this.router.post('/',       jwtValidation.validateGuestOrUser,  Validations.createAddress,      this.createAddress);

    /** GET api/address/count - Functionality for user to get address count */
    this.router.get('/count',   jwtValidation.validateUser,                                  this.getAddressCount);

    /** GET  api/address/list - Functionality for user to get address list */
    this.router.get('/list',    jwtValidation.validateUser,  Validations.getAddressMainList, this.getAddressMainList);

    /** GET api/address       - Functionality for user to get single address details */
    this.router.get('/',        jwtValidation.validateUser,  Validations.getAddressDetails,  this.getAddressDetails);

    /** PUT api/address       - Functionality for user to update address */
    this.router.put('/',        jwtValidation.validateUser,  Validations.updateAddress,      this.updateAddress);

    /** DELETE api/address    - Functionality for user delete address */
    this.router.delete('/',     jwtValidation.validateUser,  Validations.deleteAddress,      this.deleteAddress);

    /** GET    api/address/all - Functionality for user to get All addresses */
    this.router.get('/all',     jwtValidation.validateUser, this.getAllAddresses);

    /** DELETE api/address/all - Functionality for user to delete all addresses */
    this.router.delete('/all', jwtValidation.validateUser, this.deleteAllAddresses);

  }

  private createAddress = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.createAddress(req.user, req.body);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'createAddress function in address/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private getAllAddresses = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.getAllAddresses(req.user._id);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'getAllAddresses function in address/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private updateAddress = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.updateAddress(req.body);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'updateAddress function in address/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private getAddressCount = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.getAddressCount(req.user._id);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'getAddressCount function in address/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private getAddressMainList = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.getAddressMainList(req.user._id, req.query);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'getAddressMainList function in address/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private getAddressDetails = async(req: IRequest, res: Response) => {
    try {
      const response = getResponse(true, 'Got address successfully', req.body.address);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'getAddressDetails function in address/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private deleteAddress = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.deleteAddress(req.body.address);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'deleteAddress function in address/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private deleteAllAddresses = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.deleteAllAddresses(req.user._id);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'deleteAllAddresses function in address/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

}

export default new AddressRoutes().router;