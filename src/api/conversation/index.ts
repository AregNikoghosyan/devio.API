import { Router, Response } from 'express';
import jwtValidation from '../jwtValidation';

import * as Validations from './validation';
import Services from './service';

import { IRequest, getErrorResponse, getResponse } from '../mainModels';
import APIError from '../../services/APIError';
import { uploadForChat } from '../formData';

class ConversationRoutes {
  public router = Router();

  constructor() {
    this.routes();
  }

  private routes() {

    /** GET  api/conversation - Functionality to get conversation messages for users and admins */
    this.router.get('/', jwtValidation.validateGuestOrUser, Validations.getMessages, this.getMessages);

    /** POST api/conversation/new - Functionality for WEB guest user to create new empty conversation */
    this.router.post('/new', Validations.createEmptyConversation, this.createEmptyConversation);

    /** POST api/conversation/answer  - Functionality for admin to answer messages */
    this.router.post('/answer', jwtValidation.validateAdmin, uploadForChat, Validations.sendAnswerForAdmin, this.sendAnswerForAdmin);
    /** POST api/conversation/send    - Functionality for user/appGuest to send message */
    this.router.post('/send', jwtValidation.validateGuestOrUser, uploadForChat, Validations.sendMessageForUserOrDevice, this.sendMessageForUserOrDevice);
    /** POST api/conversation/sendWeb - Functionality for webGuest to send message */
    this.router.post('/sendWeb', uploadForChat, Validations.sendMessageForWebGuest, this.sendMessageForWebGuest);

    /** GET api/conversation/user - Functionality for logged in user to get message list */
    this.router.get('/user', jwtValidation.validateGuestOrUser, Validations.getMessageListForUserOrDevice, this.getMessageListForUserOrDevice);
    /** GET api/conversation/webGuest - Functionality for web guest to get message list */
    this.router.get('/webGuest', Validations.getMessageListForWebGuest, this.getMessageListForWebGuest);

    /** GET api/conversation/list - Functionality for admin to get conversation list */
    this.router.get('/list', jwtValidation.validateAdmin, Validations.getConversationList, this.getConversationList);
    /** GET api/conversation/messageList - Functionality for admin to get message list in conversation */
    this.router.get('/messageList', jwtValidation.validateAdmin, Validations.getMessageListForAdmin, this.getMessageListForAdmin);

    /** GET api/conversation/adminBadge - Functionality for admin to get badge */
    this.router.get('/adminBadge', jwtValidation.validateAdmin, this.getAdminBadge);
    /** GET api/conversation/userBadge - Functionality for user to get badge */
    this.router.get('/userBadge', jwtValidation.validateGuestOrUser, Validations.getUserBadge, this.getUserBadge);

  }

  private getMessages = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.getMessages(req.user, req.query);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'getMessages function in conversation/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private createEmptyConversation = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.createEmptyConversation(req.body);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'createEmptyConversation function in conversation/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private sendAnswerForAdmin = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.sendAnswerForAdmin(req.user, req.body, req.file);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'sendAnswerForAdmin function in conversation/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private sendMessageForUserOrDevice = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.sendMessageForUserOrDevice(req.user, req.body, req.file);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'sendMessageForUserOrDevice function in conversation/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private sendMessageForWebGuest = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.sendMessageForWebGuest(req.body, req.file);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'sendMessageForWebGuest function in conversation/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private getConversationList = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.getConversationList(req.query);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'getConversationList function in conversation/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private getMessageListForAdmin = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.getMessageListForAdmin(req.query);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'getMessageListForAdmin function in conversation/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private getMessageListForUserOrDevice = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.getMessageListForUserOrDevice(req.user, req.query);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'getMessageListForUserOrDevice function in conversation/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private getMessageListForWebGuest = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.getMessageListForWebGuest(req.query);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'getMessageListForWebGuest function in conversation/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private getAdminBadge = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.getAdminBadge();
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'getAdminBadge function in conversation/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private getUserBadge = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.getUserBadge(req.user, req.query.deviceId);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'getUserBadge function in conversation/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

}

export default new ConversationRoutes().router;