import { Router, Response } from 'express';

import * as Validations from './validation';
import Services from './service';

import { IRequest, getErrorResponse } from '../mainModels';
import APIError from '../../services/APIError';
import jwtValidation from '../jwtValidation';

class AttributeRoutes {
  public router = Router();

  constructor() {
    this.routes();
  }

  private routes () {

    /** POST api/attribute/usual - Functionality for admin to add new usual attribute */
    this.router.post('/usual', jwtValidation.validateAdmin, Validations.createUsualAttribute, this.createUsualAttribute);

    /** POST api/attribute/color - Functionality for admin to add new color attribute */
    this.router.post('/color', jwtValidation.validateAdmin, Validations.createColorAttribute, this.createColorAttribute);

    /** GET  api/attribute - Functionality for admin to get attribute list */
    this.router.post('/', jwtValidation.validateAdmin, Validations.getAttributeListForAdmin, this.getAttributeListForAdmin);

    /** DELETE api/attribute - Functionality for admin to BULK delete attributes */
    this.router.delete('/', jwtValidation.validateAdmin, Validations.deleteAttributes, this.deleteAttributes);

    /** GET api/attribute/details - Functionality for admin to get attribute details */
    this.router.get('/details', jwtValidation.validateAdmin, Validations.getAttributeDetails, this.getAttributeDetails);

    /** PUT api/attribute - Functionality for admin to update attribute details */
    this.router.put('/', jwtValidation.validateAdmin, Validations.updateAttribute, this.updateAttribute);

    /** POST api/attribute/option/color - Functionality for admin to add color option to existing attribute */
    this.router.post('/option/color', jwtValidation.validateAdmin, Validations.addColorOption, this.addColorOption);
    /** POST api/attribute/option/usual - Functionality for admin to add color option to existing attribute */
    this.router.post('/option/usual', jwtValidation.validateAdmin, Validations.addUsualOption, this.addUsualOption);

    /** PUT api/attribute/option/color - Functionality for admin to update color option */
    this.router.put('/option/color', jwtValidation.validateAdmin, Validations.updateColorOption, this.updateColorOption);
    /** PUT api/attribute/option/usual - Functionality for admin to update usual option */
    this.router.put('/option/usual', jwtValidation.validateAdmin, Validations.updateUsualOption, this.updateUsualOption);

    /** PUT api/attribute/option/hide - Functionality for admin to hide/unHide option */
    this.router.put('/option/hide', jwtValidation.validateAdmin, Validations.hideOption, this.hideOption);

    /** DELETE api/attribute/option - Functionality for admin to delete one option from attribute */
    this.router.delete('/option', jwtValidation.validateAdmin, Validations.deleteOption, this.deleteOption);

    /** PUT api/attribute/option/position - Functionality for admin to update option positions */
    this.router.put('/option/position', jwtValidation.validateAdmin, Validations.updateOptionPositions, this.updateOptionPositions);

    /** GET  api/attribute/product - Functionality for admin to get attributes for product by autocomplete */
    this.router.get('/product', jwtValidation.validateAdmin, Validations.getAttributeAutoComplete, this.getAttributeAutoComplete);

  }

  private createUsualAttribute = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.createUsualAttribute(req.body);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'createUsualAttribute function in attribute/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private createColorAttribute = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.createColorAttribute(req.body);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'createColorAttribute function in attribute/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private getAttributeListForAdmin = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.getAttributeListForAdmin(req.body);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'getAttributeListForAdmin function in attribute/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private deleteAttributes = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.deleteAttributes(req.body.idList);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'deleteAttributes function in attribute/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private getAttributeDetails = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.getAttributeDetails(req.body.attribute);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'getAttributeDetails function in attribute/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private updateAttribute = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.updateAttribute(req.body);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'updateAttribute function in attribute/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private addColorOption = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.addColorOption(req.body);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'addColorOption function in attribute/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private addUsualOption = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.addUsualOption(req.body);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'addUsualOption function in attribute/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private updateColorOption = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.updateColorOption(req.body);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'updateColorOption function in attribute/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private updateUsualOption = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.updateUsualOption(req.body);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'updateUsualOption function in attribute/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private deleteOption = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.deleteOption(req.body.option);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'deleteOption function in attribute/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private hideOption = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.hideOption(req.body.option);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'hideOption function in attribute/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private updateOptionPositions = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.updateOptionPositions(req.body);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'updateOptionPositions function in attribute/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private getAttributeAutoComplete = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.getAttributeAutoComplete(req.query);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'getAttributeAutoComplete function in attribute/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

}

export default new AttributeRoutes().router;
