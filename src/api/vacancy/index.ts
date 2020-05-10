import { Router, Response } from 'express';
import { IRequest, getErrorResponse, getResponse } from '../mainModels';
import APIError from '../../services/APIError';

import * as Validations from './validation';
import Services from './service';
import jwtValidation from '../jwtValidation';
import { uploadImage } from '../formData';

class VacancyRoutes {

  public router = Router();

  constructor() {
    this.routes();
  }

  private routes () {

    /** POST   api/vacancy - Functionality for admin to add vacancy */
    this.router.post('/', jwtValidation.validateAdmin, Validations.addVacancy, this.addVacancy);
    /** PUT    api/vacancy - Functionality for admin to update vacancy */
    this.router.put('/', jwtValidation.validateAdmin, Validations.updateVacancy, this.updateVacancy);
    /** PUT    api/vacancy/image - Functionality for admin to add / update photo of the vacancy */
    this.router.put('/image', jwtValidation.validateAdmin, uploadImage, Validations.setVacancyImage, this.setVacancyImage);
    /** GET    api/vacancy/adminList - Functionality for admin to get vacancy list */
    this.router.get('/adminList', jwtValidation.validateAdmin, Validations.getVacancyAdminList, this.getVacancyAdminList);
    /** GET    api/vacancy - Functionality for admin to get vacancy details */
    this.router.get('/', jwtValidation.validateAdmin, Validations.getVacancyDetailsForAdmin, this.getVacancyDetailsForAdmin);
    /** DELETE api/vacancy - Functionality for admin to delete vacancies */
    this.router.delete('/', jwtValidation.validateAdmin, Validations.deleteVacancies, this.deleteVacancies);

  }

  private addVacancy = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.addVacancy(req.body);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'addVacancy function in wishList/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private updateVacancy = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.updateVacancy(req.body);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'updateVacancy function in wishList/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private setVacancyImage = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.setVacancyImage(req.body);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'setVacancyImage function in wishList/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private getVacancyAdminList = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.getVacancyAdminList(req.query);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'getVacancyAdminList function in wishList/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private getVacancyDetailsForAdmin = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.getVacancyDetailsForAdmin(req.body.vacancy);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'getVacancyDetailsForAdmin function in wishList/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private deleteVacancies = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.deleteVacancies(req.body.vacancyList);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'deleteVacancies function in wishList/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

}

export default new VacancyRoutes().router;