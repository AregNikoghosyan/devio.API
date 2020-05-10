import { Router, Response } from 'express';

import * as Validations from './validation';
import Services from './service';

import { IRequest, getErrorResponse, getResponse } from '../mainModels';
import APIError from '../../services/APIError';
import jwtValidation from '../jwtValidation';
import { uploadForProduct } from '../formData';

class ProductRoutes {
  public router = Router();

  constructor() {
    this.routes();
  }

  private routes () {

    // TODO Schedule job for deleting all staff about products with preparing status old than one day
    /** POST api/product/prepare - Functionality to get Id for starting create product */
    this.router.post('/prepare', jwtValidation.validatePartner, this.prepareProduct);

    /** POST api/product/main - Functionality for admin / partner to set first details - name, etc. */
    this.router.post('/main', jwtValidation.validatePartner, Validations.setMainDetailsForProduct, this.setMainDetailsProduct);
    /** GET  api/product/main - Functionality for admin / partner to get first details - name, etc. */
    this.router.get('/main', jwtValidation.validatePartner, Validations.getMainDetailsForProduct, this.getMainDetailsProduct);

    /** POST api/product/category - Functionality for admin / partner to set categories for product */
    this.router.post('/category', jwtValidation.validatePartner, Validations.setCategoriesForProduct, this.setCategoriesForProduct);
    /** GET  api/product/category - Functionality for admin / partner to get categories of product */
    this.router.get('/category', jwtValidation.validatePartner, Validations.getCategoriesForProduct, this.getCategoriesForProduct);

    /** POST api/product/pricing - Functionality for admin / partner to set pricing for product */
    this.router.post('/pricing', jwtValidation.validatePartner, Validations.setPricingForProduct, this.setPricingForProduct);
    /** GET  api/product/pricing - Functionality for admin / partner to get pricing of product */
    this.router.get('/pricing', jwtValidation.validatePartner, Validations.getPricingForProduct, this.getPricingForProduct);

    /** POST api/product/images/upload - Functionality for admin to upload product images */
    this.router.post('/images/upload', jwtValidation.validatePartner, uploadForProduct, Validations.uploadImagesForProduct, this.uploadImagesForProduct);
    /** POST api/product/images/set - Functionality for admin to set product images */
    this.router.post('/images/set', jwtValidation.validatePartner, Validations.setImagesForProductV2, this.setImagesForProductV2);
    /** POST api/product/images - Functionality for admin / partner to set and unset images of product */
    // this.router.post('/images', jwtValidation.validatePartner, uploadForProduct, Validations.setImagesForProduct, this.setImagesForProduct);
    /** POST api/product/images - Functionality for admin / partner to get images of product */
    this.router.get('/images', jwtValidation.validatePartner, Validations.getImagesForProduct, this.getImagesForProduct);

    /** POST api/product/generate - Functionality for admin / partner to generate product versions */
    this.router.post('/generate', jwtValidation.validatePartner, Validations.generateVersions, this.generateVersions);
    /** POST api/product/versions - Functionality for admin / partner to set versions for product */
    this.router.post('/versions', jwtValidation.validatePartner, Validations.setVersionsForProduct, this.setVersionsForProduct);
    /** POST api/product/generate - Functionality for admin / partner to get versions for product */
    this.router.get('/versions', jwtValidation.validatePartner, Validations.getVersionsForProduct, this.getVersionsForProduct);

    /** POST api/product/features - Functionality for admin / partner to set features for product */
    this.router.post('/features', jwtValidation.validatePartner, Validations.setFeaturesForProduct, this.setFeaturesForProduct);
    /** GET  api/product/features - Functionality for admin / partner to get features for product */
    this.router.get('/features', jwtValidation.validatePartner, Validations.getFeaturesForProduct, this.getFeaturesForProduct);

    /** POST api/product/dashboardList - Functionality for admin to get product list */
    this.router.post('/dashboardList', jwtValidation.validatePartner, Validations.getListForDashboard, this.getListForDashboard);

    /** PUT  api/product/hide - Functionality for admin / partner to hide / unHide products */
    this.router.put('/hide', jwtValidation.validatePartner, Validations.hideOrUnHideProducts, this.hideOrUnHideProducts);
    /** DELETE api/product - Functionality for admin / partner to delete products */
    this.router.delete('/', jwtValidation.validatePartner, Validations.deleteProducts, this.deleteProducts);
    /** PUT api/product/approve - Functionality for admin to approve unapproved products */
    this.router.put('/approve', jwtValidation.validateAdmin, Validations.approveProducts, this.approveProducts);
    /** POST api/product/copy - Functionality for admin to copy product */
    this.router.post('/copy', jwtValidation.validateAdmin, Validations.copyProduct, this.copyProduct);

    /** GET  api/product/details - Functionality for all to get product details */
    this.router.get('/details', jwtValidation.validateGuestOrUser, Validations.getProductDetails, this.getProductDetails);
    /** POST api/product/range - Functionality for all to get product range by attribute */
    this.router.post('/range', Validations.getProductRange, this.getProductRange);
    /** POST api/product/version - Functionality for all to get product version */
    this.router.post('/version', jwtValidation.validateGuestOrUser, Validations.getProductVersion, this.getProductVersion);

    /** GET  api/product/request - Functionality for admin to get products with search for attaching to request */
    this.router.get('/request', jwtValidation.validateAdmin, Validations.getForRequest, this.getForRequest);
    /** GET  api/product/home - Functionality for admin to get products with search for attaching to promotion / homeCategory */
    this.router.get('/home', jwtValidation.validateAdmin, Validations.getForHomeStaff, this.getForHomeStaff);

    /** POST  api/product/mainList - Functionality for all to get product list */
    this.router.post('/mainList', Validations.getMainList, this.getMainList);
    /** POST  api/product/mainListCount - Functionality for all to get product count by filter */
    this.router.post('/mainListCount', Validations.getMainList, this.getMainListCount);

    /** GET   api/product/similar - Functionality for all to get similar product list */
    this.router.get('/similar', Validations.getSimilarProducts, this.getSimilarProducts);

    /** POST  api/product/cart - Functionality for users to get cart product list */
    this.router.post('/cart', jwtValidation.validateGuestOrUser, Validations.getListForCart, this.getListForCart);

    /** GET  api/product/search - Functionality for all to get search keys */
    this.router.get('/search', this.getProductSearchKeys);

    // TODO Remove
    /** GET  api/product/filterRange - Functionality for all to get product range */
    this.router.get('/filterRange', ((req, res) => {
      res.send(getResponse(true, 'Got', { minPrice: 10, maxPrice: 120000 }));
    }));


  }

  private prepareProduct = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.prepareProduct(req.user._id);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'prepareProduct function in product/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private setMainDetailsProduct = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.setMainDetailsProduct(req.body);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'setMainDetailsProduct function in product/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private getMainDetailsProduct = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.getMainDetailsProduct(req.body);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'getMainDetailsProduct function in product/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private setCategoriesForProduct = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.setCategoriesForProduct(req.body);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'setCategoriesForProduct function in product/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private getCategoriesForProduct = async(req: IRequest, res: Response) => {
    try {
      res.send(getResponse(true, 'Got categories', req.body.categories));
    } catch (e) {
      new APIError(e, 500, 'getCategoriesForProduct function in product/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private setPricingForProduct = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.setPricingForProduct(req.body);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'setPricingForProduct2 function in product/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }
  private getPricingForProduct = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.getPricingForProduct(req.body.product);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'getPricingForProduct function in product/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private uploadImagesForProduct = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.uploadImagesForProduct(req.body, <any>req.files);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'uploadImagesForProduct function in product/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private setImagesForProductV2 = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.setImagesForProductV2(req.body);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'setImagesForProductV2 function in product/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private setImagesForProduct = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.setImagesForProduct(req.body, <any>req.files);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'setImagesForProduct function in product/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private getImagesForProduct = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.getImagesForProduct(req.body.product);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'getImagesForProduct function in product/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private generateVersions = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.generateVersions(req.body);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'generateVersions function in product/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private setVersionsForProduct = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.setVersionsForProduct(req.body);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'setVersionsForProduct function in product/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private getVersionsForProduct = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.getVersionsForProduct(req.body.product);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'getVersionsForProduct function in product/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private setFeaturesForProduct = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.setFeaturesForProduct(req.body, req.user.role);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'setFeaturesForProduct function in product/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private getFeaturesForProduct = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.getFeaturesForProduct(req.body.product);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'getFeaturesForProduct function in product/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private getListForDashboard = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.getListForDashboard(req.user, req.body);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'getListForDashboard function in product/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private getProductDetails = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.getProductDetails(req.body, req.user);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'getProductDetails function in product/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private getProductRange = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.getProductRange(req.body);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'getProductRange function in product/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private getProductVersion = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.getProductVersion(req.body, req.user);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'getProductVersion function in product/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private hideOrUnHideProducts = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.hideOrUnHideProducts(req.body);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'hideOrUnHideProducts function in product/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private deleteProducts = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.deleteProducts(req.body);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'deleteProducts function in product/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private approveProducts = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.approveProducts(req.body);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'approveProducts function in product/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private copyProduct = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.copyProduct(req.body.product, req.user._id);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'copyProduct function in product/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private getForRequest = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.getForRequest(req.query, req.body.request);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'getForRequest function in product/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private getForHomeStaff = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.getForHomeStaff(req.query);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'getForHomeStaff function in product/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private getMainList = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.getMainList(req.body);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'getMainList function in product/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private getMainListCount = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.getMainListCount(req.body);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'getMainListCount function in product/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private getListForCart = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.getListForCart(req.body, req.user);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'getListForCart function in product/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private getSimilarProducts = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.getSimilarProducts(req.body.product, req.query);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'getSimilarProducts function in product/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private getProductSearchKeys = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.getProductSearchKeys(req.query.key);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'getProductSearchKeys function in product/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  // private getProductFilterRange = async(req: IRequest, res: Response) => {
  //   try {
  //     const response = await Services.getProductFilterRange();
  //     res.send(response);
  //   } catch (e) {
  //     new APIError(e, 500, 'getProductFilterRange function in product/service.ts');
  //     res.status(500).send(getErrorResponse());
  //   }
  // }

}

export default new ProductRoutes().router;
