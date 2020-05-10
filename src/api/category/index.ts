import { Router, Response } from 'express';
import APIError from '../../services/APIError';
import jwtValidation from '../jwtValidation';
import { uploadIcon, uploadCover } from '../formData';
import { IRequest, getErrorResponse } from '../mainModels';

import Services from './service';
import * as Validations from './validation';

class CategoryRoutes {
  public router = Router();

  constructor() {
    this.routes();
  }

  private routes () {

    this.router.route('/')
      /** POST   api/category       - Functionality for admin to create new category */
      .post(  jwtValidation.validateAdmin,  Validations.createCategory,   this.createCategory)
      /** PUT    api/category       - Functionality for admin to update category */
      .put(   jwtValidation.validateAdmin,  Validations.updateCategory,   this.updateCategory)
      /** GET    api/category       - Functionality for admin to get category list */
      .get(   jwtValidation.validateAdmin,  Validations.getCategoryListForAdmin,  this.getCategoryListForAdmin)
      /** DELETE api/category       - Functionality for admin to delete category */
      .delete(jwtValidation.validateAdmin,  Validations.deleteCategory,   this.deleteCategory);

    /** POST api/category/icon - Functionality for admin to add icon to category */
    this.router.post('/icon', jwtValidation.validateAdmin, uploadIcon, Validations.uploadCategoryIcon, this.uploadCategoryIcon);

    /** POST api/category/cover - Functionality for admin to add cover to category */
    this.router.post('/cover', jwtValidation.validateAdmin, uploadCover, Validations.uploadCategoryCover, this.uploadCategoryCover);

    /** GET  api/category/detailsAdmin - Functionality for admin to get category details  */
    this.router.get('/detailsAdmin', jwtValidation.validateAdmin, Validations.getCategoryDetailsForAdmin, this.getCategoryDetailsForAdmin);

    /** PUT  api/category/position - Functionality for admin to update categories position */
    this.router.put('/position', jwtValidation.validateAdmin, Validations.changePosition, this.changePosition);

    /** PUT api/category/hide - Functionality for admin to set category hidden on unHidden */
    this.router.put('/hide', jwtValidation.validateAdmin, Validations.hideCategory, this.hideCategory);

    /** GET api/category/all - Functionality for user to get all categories without pagination */
    this.router.get('/all', Validations.getAllCategories, this.getAllCategories);

    /** GET api/category/short - Functionality for all to get short list (for dropDown) */
    this.router.get('/short', Validations.getCategoriesShort, this.getCategoriesShort);

    /** GET api/category/device - Functionality for all to get category list with items or sub categories in them */
    this.router.get('/device', Validations.getCategoriesForDevice, this.getCategoriesForDevice);
    /** GET api/category/hover - Functionality for web to get category list for hover */
    this.router.get('/hover', Validations.getCategoriesForHover, this.getCategoriesForHover);

    /** GET  api/category/promotion - Functionality for admin to get category autocomplete for adding promotion */
    this.router.get('/promotion', jwtValidation.validateAdmin, Validations.getCategoriesForPromotion, this.getCategoriesForPromotion);

    /** GET  api/category/home - Functionality for all to get app home tree */
    this.router.get('/home', Validations.getHomeTree, this.getHomeTree);

    /** GET  api/category/subTree - Functionality for all to get subcategory tree in web */
    this.router.get('/subTree', Validations.getSubTree, this.getSubTree);

    /** GET  api/category/details - Functionality for all to get one category data */
    this.router.get('/details', Validations.getCategoryDetails, this.getCategoryDetails);

    /** GET  api/category/webHoverTree - Functionality for all to get web home hover tree(rotating ones) */
    this.router.get('/webHoverTree', Validations.getCategoriesForWebHoverTree, this.getCategoriesForWebHoverTree);

  }

  private createCategory = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.createCategory(req.body);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'createCategory function in category/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private uploadCategoryIcon = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.uploadCategoryIcon(req.file, req.body);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'uploadCategoryIcon function in category/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private uploadCategoryCover = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.uploadCategoryCover(req.file, req.body);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'uploadCategoryCover function in category/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private updateCategory = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.updateCategory(req.body);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'updateCategory function in category/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private getCategoryDetailsForAdmin = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.getCategoryDetailsForAdmin(req.body.category);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'getCategoryDetailsForAdmin function in category/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private getAllCategories = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.getAllCategories(req.query);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'getAllCategories function in category/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private getCategoryListForAdmin = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.getCategoryListForAdmin(req.query);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'getCategoryListForAdmin function in category/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private hideCategory = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.hideCategory(req.body.category);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'hideCategory function in category/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private deleteCategory = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.deleteCategory(req.body.category);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'deleteCategory function in category/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private changePosition = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.changePosition(req.body);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'changePosition function in category/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private getCategoriesShort = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.getCategoriesShort(+req.query.language, req.query.search, req.query.pid);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'getCategoriesShort function in category/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private getCategoriesForDevice = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.getCategoriesForDevice(req.query);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'getCategoriesForDevice function in category/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private getCategoriesForHover = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.getCategoriesForHover(req.query.language);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'getCategoriesForHover function in category/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private getCategoriesForWebHoverTree = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.getCategoriesForWebHoverTree(req.query.language);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'getCategoriesForWebHoverTree function in category/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private getCategoriesForPromotion = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.getCategoriesForPromotion(req.query.search);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'getCategoriesForPromotion function in category/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private getHomeTree = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.getHomeTree(+req.headers['language']);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'getHomeTree function in category/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private getSubTree = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.getSubTree(req.body);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'getSubTree function in category/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private getCategoryDetails = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.getCategoryDetails(req.body);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'getCategoryDetails function in category/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

}

export default new CategoryRoutes().router;