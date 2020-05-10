import { Router, Response } from 'express';
import jwtValidation from '../jwtValidation';
import { IRequest, getErrorResponse, getResponse } from '../mainModels';
import APIError from '../../services/APIError';

import * as Validations from './validation';
import Services from './service';
import { uploadImage } from '../formData';
import mainConfig from '../../env';

class NotificationRoutes {

  public router = Router();

  constructor() {
    this.routes();
  }

  private routes () {

    /** GET api/notification/badge - Functionality for registered users to get unseen notification count */
    this.router.get('/badge', jwtValidation.validateGuestOrUser, this.getNotificationBadge);
    /** PUT api/notification/seen - Functionality for registered users to set all notifications to seen */
    this.router.put('/seen', jwtValidation.validateGuestOrUser, this.setNotificationsSeen);
    /** GET api/notification/list - Functionality for users to get notification list */
    this.router.get('/list', jwtValidation.validateGuestOrUser, Validations.getNotificationList, this.getNotificationList);
    /** DELETE api/notification - Functionality for all to delete notifications */
    this.router.delete('/', jwtValidation.validateGuestOrUser, Validations.deleteNotification, this.deleteNotification);
    /** DELETE api/notification/all - Functionality for users or guests to delete all notifications */
    this.router.delete('/all', jwtValidation.validateGuestOrUser, this.deleteAllNotifications);

    /** POST api/notification - Functionality for admin to set notification main data and get Id */
    this.router.post('/', jwtValidation.validateAdmin, Validations.setNotificationData, this.setNotificationData);
    /** POST api/notification/file - Functionality for admin to set notification photo */
    this.router.post('/file', jwtValidation.validateAdmin, uploadImage, Validations.setNotificationImage, this.setNotificationImage);
    /** POST api/notification/send - Functionality for admin to send notification */
    this.router.post('/send', jwtValidation.validateAdmin, Validations.sendCustomNotification, this.sendCustomNotification);

    /** GET api/notification/adminList - Functionality for admin to get sent notification list */
    this.router.get('/adminList', jwtValidation.validateAdmin, Validations.getSentNotificationList, this.getSentNotificationList);
    /** GET  api/notification/details - Functionality for all to get details of the notification */
    this.router.get('/adminDetails', jwtValidation.validateAdmin, Validations.getNotificationDetails, this.getNotificationDetails);

  }

  private getNotificationBadge = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.getNotificationBadge(req.user, <string>req.headers['deviceId']);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'getNotificationBadge function in notification/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private setNotificationsSeen = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.setNotificationsSeen(req.user, <string>req.headers['deviceId']);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'setNotificationsSeen function in notification/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private getNotificationList = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.getNotificationList(req.query, req.user);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'getNotificationList function in notification/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private deleteNotification = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.deleteNotification(req.query.id);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'deleteNotification function in notification/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private deleteAllNotifications = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.deleteAllNotifications(req.user, <string>req.headers['language']);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'deleteAllNotifications function in notification/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private setNotificationData = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.setNotificationData(req.body);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'setNotificationData function in notification/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private setNotificationImage = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.setNotificationImage(req.body.notification, req.file);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'setNotificationImage function in notification/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private sendCustomNotification = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.sendCustomNotification(req.body);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'sendCustomNotification function in notification/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private getSentNotificationList = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.getSentNotificationList(req.query);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'getSentNotificationList function in notification/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private getNotificationDetails = async(req: IRequest, res: Response) => {
    try {
      if (req.body.notification.image) req.body.notification.image = mainConfig.BASE_URL + req.body.notification.image;
      res.send(getResponse(true, 'Got details', req.body.notification));
    } catch (e) {
      new APIError(e, 500, 'getSentNotificationList function in notification/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

}

export default new NotificationRoutes().router;