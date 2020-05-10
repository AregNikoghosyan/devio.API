import { Response, NextFunction } from 'express';
import * as Joi from 'joi';

import ConversationSchema from '../../schemas/conversation';
import GuestUserSchema    from '../../schemas/guestUser';

import {
  IGetMessagesQuery,
  ICreateEmptyConversationBody,
  ISendAnswerForAdminBody,
  ISendMessageForUserOrDeviceBody,
  ISendMessageForWebGuestBody,
  IGetMessageListForWebGuestQuery } from './model';

import { IRequest, getErrorResponse, getResponse } from '../mainModels';
import { pagingValidation, skipPagingValidation, languageValidation, idValidation } from '../mainValidation';

import APIError from '../../services/APIError';

import { UserTypeEnum } from '../../constants/enums';
import { deleteFiles } from '../../services/fileManager';

export const getMessages  = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    req.query.deviceId = req.headers['deviceid'];
    req.query.language = req.headers['language'] ? +req.headers['language'] : null;
    const query: IGetMessagesQuery = req.query;
    const queryValidationSchema: any = {
      ...pagingValidation
    };
    if (!req.user) {
      queryValidationSchema.deviceId = Joi.string().required();
      queryValidationSchema.language = languageValidation.language;
    } else {
      if (req.user.role === UserTypeEnum.user) {
        queryValidationSchema.language = languageValidation.language;
      } else {
        queryValidationSchema.conversationId = idValidation.id;
      }
    }
    const result = Joi.validate(query, queryValidationSchema, { allowUnknown: true });
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    if (query.conversationId) {
      const conversation = await ConversationSchema.findById(query.conversationId);
      if (!conversation) return res.send(getResponse(false, 'Wrong conversation Id'));
    }
    return next();
  } catch (e) {
    new APIError(e, 500, 'getMessages function in conversation/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const createEmptyConversation  = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const body: ICreateEmptyConversationBody = req.body;
    const bodyValidationSchema = {
      guestId: idValidation.id
    };
    const result = Joi.validate(body, bodyValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const [ conversation, guestUser ] = await Promise.all([
      await ConversationSchema.findOne({ guest: body.guestId }),
      await GuestUserSchema.findById(body.guestId)
    ]);
    if (!guestUser) {
      return res.send(getResponse(false, 'Wrong guestId'));
    }
    if (conversation) {
      return res.send(getResponse(false, 'Conversation already exists'));
    }
    return next();
  } catch (e) {
    new APIError(e, 500, 'createEmptyConversation function in conversation/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const sendAnswerForAdmin = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const body: ISendAnswerForAdminBody = req.body;
    if (body.message) body.message = body.message.trim();
    const bodyValidationSchema: any = {
      conversationId: idValidation.id
    };
    if (!req.file) {
      bodyValidationSchema.message = Joi.string().required();
    }
    const result = Joi.validate(body, bodyValidationSchema);
    if (result.error) {
      if (req.file) deleteFiles([req.file.path], false);
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const conversation = await ConversationSchema.findOne({ _id: body.conversationId, messageCount: { $gt: 0 } });
    if (!conversation) {
      if (req.file) deleteFiles([req.file.path], false);
      return res.send(getResponse(false, 'Wrong conversation Id'));
    }
    return next();
  } catch (e) {
    new APIError(e, 500, 'sendAnswerForAdmin function in conversation/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};
export const sendMessageForUserOrDevice = async(req: IRequest, res: Response, next: NextFunction) => {
  try {
    req.body.deviceId = req.headers['deviceid'];
    const body: ISendMessageForUserOrDeviceBody = req.body;
    if (body.message) body.message = body.message.trim();
    const bodyValidationSchema: any = {};
    const filter: any = {};
    if (!req.user) {
      bodyValidationSchema.deviceId = Joi.string().required();
      filter.deviceId = body.deviceId;
    } else {
      filter.user = req.user._id;
    }
    if (!req.file) {
      bodyValidationSchema.message = Joi.string().required();
    }
    const result = Joi.validate(body, bodyValidationSchema, { allowUnknown: true });
    if (result.error) {
      if (req.file) deleteFiles([req.file.path], false);
      return res.send(getResponse(false, result.error.details[0].message));
    }
    if (req.file && body.message) {
      deleteFiles([req.file.path], false);
      return res.send(getResponse(false, 'Duplicated message'));
    }
    return next();
  } catch (e) {
    new APIError(e, 500, 'sendMessageForUserOrDevice function in conversation/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const sendMessageForWebGuest = async(req: IRequest, res: Response, next: NextFunction) => {
  try {
    req.body.guestId = req.headers['guestid'];
    const body: ISendMessageForWebGuestBody = req.body;
    if (body.message) body.message = body.message.trim();
    const bodyValidationSchema: any = {
      guestId        : idValidation.id,
      // conversationId : idValidation.id
    };
    if (!req.file) {
      bodyValidationSchema.message = Joi.string().required();
    }
    const result = Joi.validate(body, bodyValidationSchema);
    if (result.error) {
      if (req.file) deleteFiles([req.file.path], false);
      return res.send(getResponse(false, result.error.details[0].message));
    }
    let conversation = await ConversationSchema.findOne({ guest: body.guestId });
    if (!conversation) {
      conversation = await ConversationSchema.create({ guest: body.guestId });
    }
    req.body.conversation = conversation;
    return next();
  } catch (e) {
    new APIError(e, 500, 'sendMessageForWebGuest function in conversation/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const getConversationList = async(req: IRequest, res: Response, next: NextFunction) => {
  try {
    req.query.language = req.headers['language'];
    const queryValidationSchema = {
      ...skipPagingValidation,
      ...languageValidation,
      search: Joi.string().optional()
    };
    const result = Joi.validate(req.query, queryValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    return next();
  } catch (e) {
    new APIError(e, 500, 'getConversationList function in conversation/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const getMessageListForAdmin = async(req: IRequest, res: Response, next: NextFunction) => {
  try {
    const queryValidationSchema = {
      ...skipPagingValidation,
      ...idValidation
    };
    const result = Joi.validate(req.query, queryValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const conversation = await ConversationSchema.findOne({ _id: req.query.id, messageCount: { $gt: 0 } });
    if (!conversation) {
      return res.send(getResponse(false, 'Wrong conversation id'));
    }
    return next();
  } catch (e) {
    new APIError(e, 500, 'getMessageListForAdmin function in conversation/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const getMessageListForUserOrDevice = async(req: IRequest, res: Response, next: NextFunction) => {
  try {
    req.query.deviceId = req.headers['deviceid'];
    req.query.language = +req.headers['language'];
    const queryValidationSchema: any = {
      ...skipPagingValidation,
      ...languageValidation
    };
    if (!req.user) {
      queryValidationSchema.deviceId = Joi.string().required();
    }
    const result = Joi.validate(req.query, queryValidationSchema, { allowUnknown: true });
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    return next();
  } catch (e) {
    new APIError(e, 500, 'getMessageListForUserOrDevice function in conversation/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const getMessageListForWebGuest = async(req: IRequest, res: Response, next: NextFunction) => {
  try {
    req.query.guestId = req.headers['guestid'];
    req.query.language = +req.headers['language'];
    const query: IGetMessageListForWebGuestQuery = req.query;
    const queryValidationSchema: any = {
      ...pagingValidation,
      ...languageValidation,
      guestId        : idValidation.id
      // conversationId : idValidation.id
    };
    const result = Joi.validate(query, queryValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    // const conversation = await ConversationSchema.findOne({ guest: query.guestId, _id: query.conversationId });
    let conversation = await ConversationSchema.findOne({ guest: query.guestId });
    if (!conversation) {
      conversation = await ConversationSchema.create({ guest: query.guestId });
    }
    req.query.conversation = conversation;
    return next();
  } catch (e) {
    new APIError(e, 500, 'getMessageListForUserOrDevice function in conversation/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const getUserBadge = async(req: IRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      const headerValidationSchema = {
        deviceId: Joi.string().required()
      };
      const result = Joi.validate(req.headers, headerValidationSchema, { allowUnknown: true });
      if (result.error) {
        return res.send(getResponse(false, result.error.details[0].message));
      }
    }
    return next();
  } catch (e) {
    new APIError(e, 500, 'getUserBadge function in conversation/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};