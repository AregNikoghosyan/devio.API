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

    /** POST api/wish - Functionality for users to create wish list */
    this.router.post('/', jwtValidation.validateUser, Validations.createWishList, this.createWishList);

    /** PUT  api/wish - Functionality for users to update wish list */
    this.router.put('/', jwtValidation.validateUser, Validations.updateWishList, this.updateWishList);

    /** DELETE api/wish - Functionality for users to delete wish list */
    this.router.delete('/', jwtValidation.validateUser, Validations.deleteWishList, this.deleteWishList);

    /** GET  api/wish - Functionality for users to get wish lists */
    this.router.get('/', jwtValidation.validateUser, Validations.getWishLists, this.getWishLists);

    /** GET  api/wish - Functionality for users to get short wish lists */
    this.router.get('/short', jwtValidation.validateUser, Validations.getWishListShortList, this.getWishListShortList);

    /** GET  api/wish/shortWeb - Functionality for web user to get list names */
    this.router.get('/shortWeb', jwtValidation.validateUser, this.getWishListShortListForWeb);

    /** GET  api/wish/details - Functionality for users to get wish list details */
    this.router.get('/details', jwtValidation.validateUser, Validations.getWishListDetails, this.getWishListDetails);
    /** POST api/wish/details/products - Functionality for users to get product list in wish list */
    this.router.post('/details/product', jwtValidation.validateUser, Validations.getProductListInWishList, this.getProductListInWishList);

    /** POST api/wish/product - Functionality for users to add / remove products to / from wish lists */
    this.router.post('/product', jwtValidation.validateUser, Validations.productToUserWishListAction, this.productToUserWishListAction);

    /** PUT api/wish/product/count - Functionality for users to change product count in wish list */
    this.router.put('/product/count', jwtValidation.validateUser, Validations.changeProductCounterInWishList, this.changeProductCounterInWishList);

    /** POST api/wish/product/approve - Functionality for users to get unapproved product list */
    this.router.post('/product/approve', jwtValidation.validateUser, Validations.getUnapprovedProductList, this.getUnapprovedProductList);
    /** PUT  api/wish/product/approve - Functionality for creator user to approve unapproved product in list */
    this.router.put('/product/approve', jwtValidation.validateUser, Validations.approveProductInWishList, this.approveProductInWishList);
    /** PUT  api/wish/product/cancel  - Functionality for users to cancel product adding request */
    this.router.put('/product/cancel', jwtValidation.validateUser, Validations.cancelProductRequestInWishList, this.cancelProductRequestInWishList);


    /** DELETE api/wish/product - Functionality for creator user to remove product from wishList */ // TODO Notify
    this.router.delete('/product', jwtValidation.validateUser, Validations.deleteProductFromUserWishList, this.deleteProductFromUserWishList);

    /** GET    api/wish/member - Functionality for creator to get member list */
    this.router.get('/member', jwtValidation.validateUser, Validations.getMemberList, this.getMemberList);
    /** DELETE api/wish/member - Functionality for creator to delete member from wishList */
    this.router.delete('/member', jwtValidation.validateUser, Validations.removeMembersFromWishList, this.removeMembersFromWishList);
    /** DELETE api/wish/leave - Functionality for user to leave wishList */ // TODO Notify
    this.router.delete('/leave', jwtValidation.validateUser, Validations.leaveWishList, this.leaveWishList);

    /** POST api/wish/invite - Functionality for creator usr to generate invitation link */
    this.router.post('/invite', jwtValidation.validateUser, Validations.generateInvitationLink, this.generateInvitationLink);
    /** POST api/wish/join - Functionality for users to join wish list */
    this.router.post('/join', jwtValidation.validateUser, Validations.joinToWishList, this.joinToWishList);

    /** POST api/wish/guest- Functionality for guest to get wish list products */
    this.router.post('/guest', Validations.getGuestWishListProducts, this.getGuestWishListProducts);

    /** POST api/wish/cart - Functionality for user to go to cart from wish list */
    this.router.post('/cart', jwtValidation.validateUser, Validations.exportWishListToCart, this.exportWishListToCart);

  }

  private createWishList = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.createWishList(req.user, req.body);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'createWishList function in wishList/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private updateWishList = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.updateWishList(req.body);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'updateWishList function in wishList/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private getProductListInWishList = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.getProductListInWishList(req.body, req.user._id);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'getProductListInWishList function in wishList/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private deleteWishList = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.deleteWishList(req.body.wishList);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'deleteWishList function in wishList/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private getWishLists = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.getWishLists(req.user, req.query);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'getWishLists function in wishList/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private getWishListDetails = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.getWishListDetails(req.user, req.query);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'getWishListDetails function in wishList/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private getWishListShortList = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.getWishListShortList(req.user._id, req.query);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'getWishListShortList function in wishList/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private getWishListShortListForWeb = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.getWishListShortListForWeb(req.user._id);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'getWishListShortListForWeb function in wishList/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private productToUserWishListAction = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.productToUserWishListAction(req.user._id, req.body);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'productToUserWishListAction function in wishList/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private getUnapprovedProductList = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.getUnapprovedProductList(req.body, req.user._id);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'getUnapprovedProductList function in wishList/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private approveProductInWishList = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.approveProductInWishList(req.body.wishList, req.body.wishProductList);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'approveProductInWishList function in wishList/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private cancelProductRequestInWishList = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.cancelProductRequestInWishList(req.body.deleteIdList, req.body.userList, req.body.wishListId);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'cancelProductRequestInWishList function in wishList/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private changeProductCounterInWishList = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.changeProductCounterInWishList(req.body);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'changeProductCounterInWishList function in wishList/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private deleteProductFromUserWishList = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.deleteProductFromUserWishList(req.body.wishProduct);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'deleteProductFromUserWishList function in wishList/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private generateInvitationLink = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.generateInvitationLink(req.body.wishList);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'generateInvitationLink function in wishList/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private getMemberList = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.getMemberList(req.body.wishList);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'getMemberList function in wishList/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private joinToWishList = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.joinToWishList(req.body.wishList, req.user._id);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'joinToWishList function in wishList/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private removeMembersFromWishList = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.removeMembersFromWishList(req.body);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'removeMembersFromWishList function in wishList/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private leaveWishList = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.leaveWishList(req.body.wishList, req.user._id);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'leaveWishList function in wishList/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private getGuestWishListProducts = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.getGuestWishListProducts(req.body);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'getGuestWishListProducts function in wishList/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private exportWishListToCart = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.exportWishListToCart(req.body, req.user);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'exportWishListToCart function in wishList/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

}

export default new DeviceRoutes().router;
