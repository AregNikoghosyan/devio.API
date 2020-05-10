import { Router, Response } from 'express';
import jwtValidation from '../jwtValidation';

import * as Validations from './validation';
import Services from './service';

import { IRequest, getErrorResponse, getResponse } from '../mainModels';
import APIError from '../../services/APIError';

class CompanyRoutes {
  public router = Router();

  constructor() {
    this.routes();
  }

  private routes() {

    /** POST   api/company      - Create company functionality for user */
    this.router.post('/', jwtValidation.validateUser, Validations.createCompany, this.createCompany);

    /** PUT    api/company      - Update company functionality for user */
    this.router.put('/', jwtValidation.validateUser, Validations.updateCompany, this.updateCompany);

    /** GET    api/company      - Get single company details for user */
    this.router.get('/', jwtValidation.validateUser, Validations.getCompanyDetails, this.getCompanyDetails);

    /** GET    api/company/list - Get company list functionality for user */
    this.router.get('/list', jwtValidation.validateUser, Validations.getCompanyList, this.getCompanyList);

    /** GET    api/company/short - Get company short list for user */
    this.router.get('/short', jwtValidation.validateUser, this.getCompanyShortList);

    /** DELETE api/company      - Functionality for user to delete company */
    this.router.delete('/', jwtValidation.validateUser, Validations.deleteCompany, this.deleteCompany);

    /** DELETE api/company/all  - Functionality for user to delete all companies */
    this.router.delete('/all', jwtValidation.validateUser, this.deleteUsersAllCompanies);

    /** GET api/company/delivery - Functionality for user to get company delivery addresses */
    this.router.get('/delivery', jwtValidation.validateUser, Validations.getCompanyAddresses, this.getCompanyAddresses);

    /** POST api/company/delivery - Functionality for user to add company delivery address */
    this.router.post('/delivery', jwtValidation.validateUser, Validations.addCompanyAddress, this.addCompanyAddress);

  }

  private createCompany = async (req: IRequest, res: Response) => {
    try {
      const response = await Services.createCompany(req.user, req.body);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'createCompany function in company/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private updateCompany = async (req: IRequest, res: Response) => {
    try {
      const response = await Services.updateCompany(req.body);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'updateCompany function in company/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private getCompanyDetails = async (req: IRequest, res: Response) => {
    try {
      const response = getResponse(true, 'Got company details', req.body.company);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'getCompanyDetails function in company/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private deleteCompany = async (req: IRequest, res: Response) => {
    try {
      const response = await Services.deleteCompany(req.query.id);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'deleteCompany function in company/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private deleteUsersAllCompanies = async (req: IRequest, res: Response) => {
    try {
      const response = await Services.deleteUsersAllCompanies(req.user.id);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'deleteUsersAllCompanies function in company/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private getCompanyList = async (req: IRequest, res: Response) => {
    try {
      const response = await Services.getCompanyList(req.user._id, req.query);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'getCompanyList function in company/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private getCompanyShortList = async (req: IRequest, res: Response) => {
    try {
      const response = await Services.getCompanyShortList(req.user._id);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'getCompanyShortList function in company/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private getCompanyAddresses = async (req: IRequest, res: Response) => {
    try {
      res.send(getResponse(true, 'Got list', req.body.company.deliveryAddresses));
    } catch (e) {
      new APIError(e, 500, 'getCompanyAddresses function in company/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private addCompanyAddress = async (req: IRequest, res: Response) => {
    try {
      const response = await Services.addCompanyAddress(req.body);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'addCompanyAddress function in company/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

}

export default new CompanyRoutes().router;