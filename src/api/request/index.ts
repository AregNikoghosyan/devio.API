import { Router, Response } from 'express';
import jwtValidation from '../jwtValidation';
import { IRequest, getErrorResponse, IResponseModel } from '../mainModels';
import APIError from '../../services/APIError';

import * as Validations from './validation';
import Services from './service';
import { uploadIcon, uploadDifferent, uploadRequestFile } from '../formData';

class RequestRoutes {
  public router = Router();

  constructor() {
    this.routes();
  }

  private routes() {

    /** POST api/request/new              - Functionality for app user / app guest to request new request */
    this.router.post('/new',                jwtValidation.validateGuestOrUser, Validations.requestNewRequest, this.requestNewRequest);

    /** PUT  api/request/setDraft         - Functionality for user to create draft request from preparing one */
    this.router.put('/setDraft',            jwtValidation.validateGuestOrUser, Validations.setRequestDraft, this.setRequestDraft);

    /** POST api/request/add              - Functionality for user to add request */
    this.router.post('/add',                jwtValidation.validateGuestOrUser, uploadDifferent, Validations.addRequest, this.addRequest);

    /** DELETE api/request                - Functionality for user to remove request */
    this.router.delete('/draft',            jwtValidation.validateGuestOrUser, Validations.deleteRequest, this.deleteRequest);

    /** POST api/request/send             - Functionality for user to request pack of requests */
    this.router.post('/send',               jwtValidation.validateGuestOrUser, Validations.sendRequestPack, this.sendRequestPack);

    /** GET  api/request/draft            - Functionality for user to get draft request list */
    this.router.get('/draft',               jwtValidation.validateGuestOrUser, Validations.getDraftRequestList, this.getDraftRequestList);

    /** GET  api/request/draftDetails     - Functionality for user to get draft request details */
    this.router.get('/draftDetails',        jwtValidation.validateGuestOrUser, Validations.getDraftRequestDetails, this.getDraftRequestDetails);

    /** PUT  api/request/draft            - Functionality for user to update draft request */
    this.router.put('/draft',               jwtValidation.validateGuestOrUser, uploadDifferent, Validations.updateDraftRequest, this.updateDraftRequest);

    /** GET  api/request/pack             - Functionality for user to get active / history request pack list */
    this.router.get('/pack',                jwtValidation.validateGuestOrUser, Validations.getRequestPackList, this.getRequestPackList);

    /** GET  api/request/packDetails      - Functionality for getting request pack details */
    this.router.get('/packDetails',         jwtValidation.validateGuestOrUser, Validations.getRequestPackDetails, this.getRequestPackDetails);

    /** GET  api/request/packList         - Functionality for admin to get request list */
    this.router.post('/packList',           jwtValidation.validateAdmin, Validations.getRequestPackListForAdmin, this.getRequestPackListForAdmin);

    /** GET  api/request/packDetailsAdmin - Functionality for admin to get request pack details */
    this.router.get('/packDetailsAdmin',    jwtValidation.validateAdmin, Validations.getRequestPackDetailsForAdmin, this.getRequestPackDetailsForAdmin);

    /** PUT  api/request/pack/cancel      - Functionality for user to cancel request pack */
    this.router.put('/pack/cancel',         jwtValidation.validateGuestOrUser, Validations.cancelRequestPack, this.cancelRequestPack);

    /** PUT  api/request/failed           - Functionality for admin to set request failed from pack list */
    this.router.put('/failed',              jwtValidation.validateAdmin, Validations.setRequestFailed, this.setRequestFailed);

    /** PUT  api/request/product          - Functionality for admin to attach product to request */
    this.router.put('/product',             jwtValidation.validateAdmin, Validations.attachProductToRequest, this.attachProductToRequest);

    /** DELETE api/request/product        - Functionality for admin to detach product from request */
    this.router.delete('/product',          jwtValidation.validateAdmin, Validations.detachProductFormRequest, this.detachProductFormRequest);

    /** PUT  api/request/succeed          - Functionality for admin to set request succeed from pack list */
    this.router.put('/succeed',             jwtValidation.validateAdmin, Validations.setRequestSucceed, this.setRequestSucceed);

    /** GET  api/request/check            - Functionality for app user / guest to get request with fileList type */
    this.router.get('/check',               jwtValidation.validateGuestOrUser, Validations.getFileListRequest, this.getFileListRequest);

    /** POST api/request/attach           - Functionality for app user / app guest to attach file to request */
    this.router.post('/attach',             jwtValidation.validateGuestOrUser, uploadDifferent, Validations.attachFilesToRequest, this.attachFilesToRequest);

    /** PUT  api/request/detach           - Functionality for app user / app guest to detach file from request */
    this.router.put('/detach',              jwtValidation.validateGuestOrUser, Validations.detachFileFromRequest, this.detachFileFromRequest);

  }

  private requestNewRequest = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.requestNewRequest(req.user, req.body);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'requestNewRequest function in request/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private attachFilesToRequest = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.attachFilesToRequest(req.body.request, <any>req.files);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'attachFileToRequest function in request/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private detachFileFromRequest = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.detachFileFromRequest(req.body);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'detachFileFromRequest function in request/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private setRequestDraft = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.setRequestDraft(req.body);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'setRequestDraft function in request/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private addRequest = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.addRequest(<any>req.files, req.body, req.user);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'addRequest function in request/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private deleteRequest = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.deleteRequest(req.body);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'deleteRequest function in request/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private sendRequestPack = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.sendRequestPack(req.user, req.body);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'sendRequestPack function in request/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private getDraftRequestList = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.getDraftRequestList(req.user, req.query);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'getDraftRequestList function in request/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private getDraftRequestDetails = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.getDraftRequestDetails(req.body.request, +req.query.language);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'getDraftRequestDetails function in request/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private updateDraftRequest = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.updateDraftRequest(req.body, <any>req.files);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'updateDraftRequest function in request/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private getRequestPackList = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.getRequestPackList(req.user, req.query);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'getRequestPackList function in request/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private getRequestPackDetails = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.getRequestPackDetails(+req.query.language, req.body.filter);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'getRequestPackDetails function in request/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private getRequestPackListForAdmin = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.getRequestPackListForAdmin(req.body);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'getRequestPackListForAdmin function in request/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private cancelRequestPack = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.cancelRequestPack(req.body.requestPack);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'cancelRequestPack function in request/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private getRequestPackDetailsForAdmin = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.getRequestPackDetailsForAdmin(req.body.pack, req.query);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'getRequestPackDetailsForAdmin function in request/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private setRequestFailed = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.setRequestFailed(req.body.request);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'setRequestFailed function in request/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private attachProductToRequest = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.attachProductToRequest(req.body);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'attachProductToRequest function in request/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private detachProductFormRequest = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.detachProductFormRequest(req.body);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'detachProductFormRequest function in request/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private setRequestSucceed = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.setRequestSucceed(req.body.request);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'setRequestSucceed function in request/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private getFileListRequest = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.getFileListRequest(req.body);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'getFileListRequest function in request/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

}

export default new RequestRoutes().router;