import * as Joi from 'joi';
import { Response, NextFunction } from 'express';

import APIError from '../../services/APIError';

import { IRequest, getErrorResponse, getResponse } from '../mainModels';

import {
  IAddRequestBody,
  IDeleteRequestBody,
  IGetDraftRequestDetailsQuery,
  IUpdateDraftRequestBody,
  IGetRequestPackDetailsQuery,
  IGetRequestPackListForAdminBody,
  ICancelRequestPackBody,
  ISetRequestFailedQuery,
  IRequestNewRequest,
  IAttachFileToRequestBody,
  IDetachFileFromRequestBody,
  ISetRequestDraftBody,
  IAttachProductToRequestBody,
  ISetRequestSucceedQuery } from './model';

import { idRegex,
         idValidation,
         phoneNumberRegex,
         languageValidation,
         pagingValidation } from '../mainValidation';

import CategorySchema    from '../../schemas/category';
import RequestSchema     from '../../schemas/request';
import FileSchema        from '../../schemas/file';
import RequestPackSchema from '../../schemas/requestPack';
import MUSchema          from '../../schemas/mu';
import ProductSchema     from '../../schemas/product';

import { RequestStatusEnum, RequestPackStatusEnum, ProductStatusEnum, RequestTypeEnum, OsTypeEnum } from '../../constants/enums';
import { deleteFiles } from '../../services/fileManager';
import { ObjectId } from 'mongodb';

export const requestNewRequest = async(req: IRequest, res: Response, next: NextFunction) => {
  try {
    const body: IRequestNewRequest = req.body;
    if (!req.user) {
      const bodyValidationSchema = {
        deviceId    : Joi.string().required()
      };
      const result = Joi.validate(body, bodyValidationSchema);
      if (result.error) {
        return res.send(getResponse(false, result.error.details[0].message));
      }
    }
    return next();
  } catch (e) {
    new APIError(e, 500, 'requestNewRequest function in request/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const attachFilesToRequest = async(req: IRequest, res: Response, next: NextFunction) => {
  try {
    if (req.files && !req.files.length) {
      return res.send(getResponse(false, 'Missing file'));
    }
    const body: IAttachFileToRequestBody = req.body;
    const bodyValidationSchema: any = {
      requestId: idValidation.id
    };
    if (!req.user) {
      bodyValidationSchema.deviceId = Joi.string().required();
    }
    const result = Joi.validate(body, bodyValidationSchema);
    if (result.error) {
      if (req.files && req.files.length) {
        const files: any = req.files;
        const pathList = files.map(file => file.path);
        deleteFiles(pathList, false).catch(e => console.log(e));
      }
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const filter: any = {
      _id: body.requestId,
      status: RequestStatusEnum.draft,
      type: RequestTypeEnum.fileList
    };
    if (req.user) {
      filter.user = req.user._id;
    } else {
      filter.deviceId = body.deviceId;
    }
    const request = await RequestSchema.findOne(filter);
    if (!request) {
      if (req.files && req.files.length) {
        const files: any = req.files;
        const pathList = files.map(file => file.path);
        deleteFiles(pathList, false).catch(e => console.log(e));
      }
      return res.send(getResponse(false, 'Wrong request Id'));
    }
    req.body.request = request;
    return next();
  } catch (e) {
    new APIError(e, 500, 'attachFileToRequest function in request/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const detachFileFromRequest = async(req: IRequest, res: Response, next: NextFunction) => {
  try {
    const body: IDetachFileFromRequestBody = req.body;
    const bodyValidationSchema: any = {
      requestId: idValidation.id,
      fileId: idValidation.id
    };
    if (!req.user) {
      bodyValidationSchema.deviceId = Joi.string().required();
    }
    const result = Joi.validate(body, bodyValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const filter: any = {
      _id: body.requestId,
      type: RequestTypeEnum.fileList,
      status: RequestStatusEnum.draft,
      files: { $in: [ body.fileId ] }
    };
    if (req.user) {
      filter.user = req.user._id;
    } else {
      filter.deviceId = body.deviceId;
    }
    const request = await RequestSchema.findOne(filter);
    if (!request) {
      return res.send(getResponse(false, 'Wrong request Id'));
    }
    req.body.request = request;
    return next();
  } catch (e) {
    new APIError(e, 500, 'requestNewRequest function in request/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const setRequestDraft = async(req: IRequest, res: Response, next: NextFunction) => {
  try {
    const body: ISetRequestDraftBody = req.body;
    const bodyValidationSchema: any = {
      requestId   : idValidation.id,
      category    : Joi.string().regex(idRegex).optional(),
      iNeed       : Joi.string().min(2).required(),
      mu          : Joi.string().regex(idRegex).required(),
      count       : Joi.number().min(1).required(),
      description : Joi.string().min(2).optional(),
    };
    if (!req.user) {
      bodyValidationSchema.deviceId = Joi.string().required();
    }
    const result = Joi.validate(body, bodyValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const filter: any = {
      _id: body.requestId,
      status: RequestStatusEnum.preparing,
    };
    if (req.user) {
      filter.user = req.user._id;
    } else {
      filter.deviceId = body.deviceId;
    }
    const [ request, mu ] = await Promise.all([
      await RequestSchema.findOne(filter),
      await MUSchema.findOne({ _id: body.mu, deleted: false })
    ]);
    if (!request) {
      return getResponse(false, 'Wrong request Id');
    }
    if (!mu) {
      return getResponse(false, 'Wrong mu Id');
    }
    if (body.category) {
      const category = await CategorySchema.findOne({ _id: body.category, pid: null, isHidden: false });
      if (!category) {
        return res.send(getResponse(false, 'Wrong category Id'));
      }
    }
    req.body.request = request;
    return next();
  } catch (e) {
    new APIError(e, 500, 'requestNewRequest function in request/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const addRequest = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const body: IAddRequestBody = req.body;
    const bodyValidationSchema: any = {
      type        : Joi.number().min(1).max(2).required(),
      category    : Joi.string().regex(idRegex).optional(),
      iNeed       : Joi.string().min(2).when('type', {
        is: Joi.number().equal(RequestTypeEnum.usual),
        then: Joi.required()
      }),
      mu          : Joi.string().regex(idRegex).when('type', {
        is: Joi.number().equal(RequestTypeEnum.usual),
        then: Joi.required()
      }),
      count       : Joi.number().min(1).when('type', {
        is: Joi.number().equal(RequestTypeEnum.usual),
        then: Joi.required()
      }),
      description : Joi.string().min(2).optional(),
      deviceId    : Joi.string().optional()
    };
    const result = Joi.validate(body, bodyValidationSchema);
    if (result.error) {
      if (req.files && req.files.length) {
        const files: any = req.files;
        const pathList = files.map(file => file.path);
        deleteFiles(pathList, false).catch(e => console.log(e));
      }
      return res.send(getResponse(false, result.error.details[0].message));
    }
    if (body.mu) {
      const mu = MUSchema.findOne({ _id: body.mu, deleted: false });
      if (!mu) {
        if (req.files && req.files.length) {
          const files: any = req.files;
          const pathList = files.map(file => file.path);
          deleteFiles(pathList, false).catch(e => console.log(e));
        }
        return res.send(getResponse(false, 'Wrong MU Id'));
      }
    }
    if (body.category) {
      const category = await CategorySchema.findOne({ _id: body.category, pid: null, isHidden: false });
      if (!category) {
        if (req.files && req.files.length) {
          const files: any = req.files;
          const pathList = files.map(file => file.path);
          deleteFiles(pathList, false).catch(e => console.log(e));
        }
        return res.send(getResponse(false, 'Wrong category Id'));
      }
    }
    body.type = +body.type;
    if (body.type === RequestTypeEnum.fileList) {
      if (!req.files.length) {
        return res.send(getResponse(false, 'Missing file'));
      }
      if (req.user || req.body.deviceId) {
        const filter: any = {
          status: RequestStatusEnum.draft,
          type: RequestTypeEnum.fileList,
        };
        if (req.user) filter.user = req.user._id;
        else filter.deviceId = req.body.deviceId;
        const checkRequest = await RequestSchema.findOne(filter);
        if (checkRequest && +req.headers['ostype'] !== OsTypeEnum.web) {
          return res.send(getResponse(false, 'Request already exists'));
        } else if (checkRequest && +req.headers['ostype'] === OsTypeEnum.web) {
          await checkRequest.remove();
        }
      }
    }
    return next();
  } catch (e) {
    new APIError(e, 500, 'addRequest function in request/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const deleteRequest = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const body: IDeleteRequestBody = req.body;
    const bodyValidationSchema: any = {
      ...idValidation
    };
    if (!req.user) {
      bodyValidationSchema.deviceId = Joi.string().required();
    }
    const result = Joi.validate(body, bodyValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    if (req.user) {
      const request = await RequestSchema.findOne({ _id: body.id, user: req.user._id, status: RequestStatusEnum.draft }).populate('files');
      if (!request) return res.send(getResponse(false, 'Wrong Id'));
      req.body.request = request;
    } else {
      const request = await RequestSchema.findOne({ _id: body.id, deviceId: body.deviceId, status: RequestStatusEnum.draft }).populate('files');
      if (!request) return res.send(getResponse(false, 'Wrong Id'));
      req.body.request = request;
    }
    return next();
  } catch (e) {
    new APIError(e, 500, 'deleteRequest function in request/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const sendRequestPack = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    if (req.headers['ostype']) req.body.osType = +req.headers['ostype'];
    const bodyValidationSchema: any = {
      email       : Joi.string().email().required(),
      phoneNumber : Joi.string().regex(phoneNumberRegex).required(),
      osType      : Joi.number().equal([OsTypeEnum.android, OsTypeEnum.ios, OsTypeEnum.web]).required(),
      firstName   : Joi.string().min(2).required(),
      lastName    : Joi.string().allow(['', null]).min(2).optional()
    };
    if (req.user) {
      bodyValidationSchema.type = Joi.number().min(1).max(2).required();
      const result = Joi.validate(req.body, bodyValidationSchema);
      if (result.error) {
        return res.send(getResponse(false, result.error.details[0].message));
      }
      req.body.email = req.body.email.toLowerCase();
      const requestCount = await RequestSchema.countDocuments({ user: req.user._id, status: RequestStatusEnum.draft, type: req.body.type, requestPack: null });
      if (!requestCount) return res.send(getResponse(false, 'Request list is empty'));
    } else if (req.body.deviceId) {
      bodyValidationSchema.type = Joi.number().min(1).max(2).required();
      bodyValidationSchema.deviceId = Joi.string().required();
      const result = Joi.validate(req.body, bodyValidationSchema);
      if (result.error) {
        return res.send(getResponse(false, result.error.details[0].message));
      }
      req.body.email = req.body.email.toLowerCase();
      const requestCount = await RequestSchema.countDocuments({ deviceId: req.body.deviceId, type: req.body.type, status: RequestStatusEnum.draft, requestPack: null });
      if (!requestCount) return res.send(getResponse(false, 'Request list is empty'));
    } else {
      bodyValidationSchema.idList = Joi.array().items(Joi.string().regex(idRegex)).min(1).unique().required();
      const result = Joi.validate(req.body, bodyValidationSchema);
      if (result.error) {
        return res.send(getResponse(false, result.error.details[0].message));
      }
      req.body.email = req.body.email.toLowerCase();
      const count = await RequestSchema.countDocuments({ _id: { $in: req.body.idList} , status: RequestStatusEnum.draft, user: null, deviceId: null, requestPack: null });
      if (count !== req.body.idList.length) return res.send(getResponse(false, 'Wrong Id list'));
    }
    return next();
  } catch (e) {
    new APIError(e, 500, 'sendRequestPack function in request/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const getDraftRequestList = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const queryValidationSchema: any = {
      ...languageValidation,
      ...pagingValidation
    };
    if (!req.user) {
      queryValidationSchema.deviceId = Joi.string().required();
    }
    const result = Joi.validate(req.query, queryValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    return next();
  } catch (e) {
    new APIError(e, 500, 'getDraftRequestList function in request/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const getDraftRequestDetails = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const queryValidationSchema: any = {
      ...languageValidation,
      ...idValidation
    };
    if (!req.user) {
      queryValidationSchema.deviceId = Joi.string().required();
    }
    const result = Joi.validate(req.query, queryValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const query: IGetDraftRequestDetailsQuery = req.query;
    const filter: any = {
      _id    : query.id,
      status : RequestStatusEnum.draft
    };
    if (req.user) {
      filter.user = req.user._id;
    } else {
      filter.deviceId = query.deviceId;
    }
    const request = await RequestSchema.findOne(filter)
    .select({
      category        : 1,
      iNeed           : 1,
      measurementUnit : 1,
      count           : 1,
      description     : 1,
      type            : 1
    })
    .populate({
      path   : 'files',
      select : {
        originalName : 1,
        type         : 1,
        path         : 1
      }
    }).lean();
    if (!request) return res.send(getResponse(false, 'Wrong Id'));
    req.body.request = request;
    return next();
  } catch (e) {
    new APIError(e, 500, 'getDraftRequestDetails function in request/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const updateDraftRequest = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const body: IUpdateDraftRequestBody = req.body;
    const bodyValidationSchema: any = {
      ...idValidation,
      category       : Joi.string().regex(idRegex).optional(),
      iNeed          : Joi.string().min(2).optional(),
      mu             : Joi.string().regex(idRegex).optional(),
      count          : Joi.number().min(1).optional(),
      description    : Joi.string().min(2).optional(),
      removeFileList : Joi.array().items(Joi.string().regex(idRegex)).unique().min(1).optional()
    };
    if (!req.user) {
      bodyValidationSchema.deviceId = Joi.string().required();
    }
    const result = Joi.validate(body, bodyValidationSchema);
    if (result.error) {
      if (req.files && req.files.length) {
        const files: any = req.files;
        const pathList = files.map(file => file.path);
        deleteFiles(pathList, false).catch(e => console.log(e));
      }
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const filter: any = { _id: body.id, status: RequestStatusEnum.draft };
    if (req.user) {
      filter.user = req.user._id;
    } else {
      filter.deviceId = body.deviceId;
    }
    const [request, mu] = await Promise.all([
      await RequestSchema.findOne(filter),
      await MUSchema.findOne({ _id: body.mu, deleted: false })
    ]);
    if (!mu) return res.send(getResponse(false, 'Wrong MU Id'));
    if (!request) {
      if (req.files && req.files.length) {
        const files: any = req.files;
        const pathList = files.map(file => file.path);
        deleteFiles(pathList, false).catch(e => console.log(e));
      }
      return res.send(getResponse(false, 'Wrong Id'));
    }
    if (request.type === RequestTypeEnum.usual && (!body.count || !body.mu || !body.iNeed)) {
      if (req.files && req.files.length) {
        const files: any = req.files;
        const pathList = files.map(file => file.path);
        deleteFiles(pathList, false).catch(e => console.log(e));
      }
      return res.send(getResponse(false, 'Missing data'));
    }
    if (body.removeFileList && body.removeFileList.length) {
      const fileCount = await FileSchema.countDocuments({ _id: { $in: body.removeFileList }, request: body.id });
      if (body.removeFileList.length !== fileCount) {
        if (req.files && req.files.length) {
          const files: any = req.files;
          const pathList = files.map(file => file.path);
          deleteFiles(pathList, false).catch(e => console.log(e));
        }
        return res.send(getResponse(false, 'Wrong Id list'));
      }
    }
    if (body.category) {
      const category = await CategorySchema.findOne({ _id: body.category, pid: null, isHidden: false });
      if (!category) {
        if (req.files && req.files.length) {
          const files: any = req.files;
          const pathList = files.map(file => file.path);
          deleteFiles(pathList, false).catch(e => console.log(e));
        }
        return res.send(getResponse(false, 'Wrong category Id'));
      }
    }
    req.body.request = request;
    return next();
  } catch (e) {
    new APIError(e, 500, 'updateDraftRequest function in request/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const getRequestPackList = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const queryValidationSchema: any = {
      ...languageValidation,
      ...pagingValidation,
      status: Joi.number().min(1).max(2).required()
    };
    if (!req.user) {
      queryValidationSchema.deviceId = Joi.string().required();
    }
    const result = Joi.validate(req.query, queryValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    return next();
  } catch (e) {
    new APIError(e, 500, 'getRequestPackList function in request/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const getRequestPackDetails = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.query.language) req.query.language = +req.headers['language'];
    const queryValidationSchema: any = {
      ...languageValidation,
    };
    if (req.user) {
      queryValidationSchema.id = Joi.string().regex(idRegex).required();
    } else if (req.query.deviceId) {
      queryValidationSchema.deviceId = Joi.string().required();
      queryValidationSchema.id       = Joi.string().regex(idRegex).required();
    } else {
      queryValidationSchema.code        = Joi.string().min(4).required();
      queryValidationSchema.phoneNumber = Joi.string().regex(phoneNumberRegex).required();
    }
    const result = Joi.validate(req.query, queryValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const query: IGetRequestPackDetailsQuery = req.query;
    const filter: any = {};
    if (req.user || query.deviceId) {
      filter._id = new ObjectId(query.id);
      if (req.user) filter.user = req.user._id;
      else filter.deviceId = query.deviceId;
    } else {
      filter.shortCode = query.code;
      filter.userPhoneNumber = query.phoneNumber;
    }
    const count = await RequestPackSchema.countDocuments(filter);
    if (!count) {
      return res.send(getResponse(false, 'Wrong id or code'));
    } else {
      req.body.filter = filter;
    }
    return next();
  } catch (e) {
    new APIError(e, 500, 'getRequestPackDetails function in request/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const getRequestPackListForAdmin = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const body: IGetRequestPackListForAdminBody = req.body;
    const bodyValidationSchema = {
      ...pagingValidation,
      language  : languageValidation.language,
      category  : Joi.string().allow([null, '']).regex(idRegex).optional(),
      status    : Joi.number().allow([null, '']).min(1).max(3).optional(),
      search    : Joi.string().allow([null, '']).min(1).optional(),
      dateFrom  : Joi.date().allow([null, '']).optional(),
      dateTo    : Joi.date().allow([null, '']).optional(),
      countFrom : Joi.number().allow([null, '']).min(1).optional(),
      countTo   : Joi.number().allow([null, '']).min(1).optional(),
      sortBy    : Joi.number().allow([null, '']).equal([1, 2, 3]).optional(),
      sortFrom  : Joi.number().allow([null, '']).equal([1, -1]).optional()
    };
    const result = Joi.validate(req.body, bodyValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    if (body.dateFrom && body.dateTo && body.dateFrom > body.dateTo) {
      return res.send(getResponse(false, 'dateFrom must be less than dateTo'));
    }
    if (body.countFrom && body.countTo && body.countFrom > body.countTo) {
      return res.send(getResponse(false, 'countFrom must be less or equal than countTo'));
    }
    if (body.countFrom) req.body.countFrom = +req.body.countFrom;
    if (body.countFrom) req.body.countTo = +req.body.countTo;
    if (body.countFrom) req.body.countFrom = +req.body.countFrom;
    if (body.countFrom) req.body.countTo = +req.body.countTo;
    if (body.sortBy && !body.sortFrom) {
      body.sortFrom = -1;
    }
    return next();
  } catch (e) {
    new APIError(e, 500, 'getRequestPackListForAdmin function in request/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const getRequestPackDetailsForAdmin = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const queryValidationSchema = {
      ...idValidation,
      language: Joi.number().min(1).max(3).required()
    };
    const result = Joi.validate(req.query, queryValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const pack = await RequestPackSchema.findById(req.query.id).populate('user');
    if (!pack) return res.send(getResponse(false, 'Wrong Id'));
    req.body.pack = pack;
    return next();
  } catch (e) {
    new APIError(e, 500, 'getRequestPackListForAdmin function in request/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const cancelRequestPack = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const body: ICancelRequestPackBody = req.body;
    const bodyValidationSchema: any = {
      ...idValidation,
    };
    const filter: any = { _id: body.id, status: RequestPackStatusEnum.active };
    if (req.user) {
      filter.user = req.user._id;
    } else if (req.body.deviceId) {
      bodyValidationSchema.deviceId = Joi.string().required();
      filter.deviceId = body.deviceId;
    } else {
      bodyValidationSchema.code        = Joi.string().min(4).required();
      bodyValidationSchema.phoneNumber = Joi.string().regex(phoneNumberRegex).required();
      filter.shortCode       = body.code;
      filter.userPhoneNumber = body.phoneNumber;
    }
    const result = Joi.validate(body, bodyValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const requestPack = await RequestPackSchema.findOne(filter);
    if (!requestPack) {
      return res.send(getResponse(false, 'Wrong id or code'));
    } else {
      req.body.requestPack = requestPack;
    }
    return next();
  } catch (e) {
    new APIError(e, 500, 'cancelRequestPack function in request/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const setRequestFailed = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const query: ISetRequestFailedQuery = req.query;
    const queryValidationSchema: any = {
      ...idValidation,
    };
    const result = Joi.validate(query, queryValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const request = await RequestSchema.findOne({
      _id: req.query.id,
      status: RequestStatusEnum.pending,
      requestPack: { $ne: null }
    });
    if (!request) {
      return res.send(getResponse(false, 'Wrong Id'));
    }
    req.body.request = request;
    return next();
  } catch (e) {
    new APIError(e, 500, 'setRequestFailed function in request/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const attachProductToRequest = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const body: IAttachProductToRequestBody = req.body;
    const bodyValidationSchema: any = {
      requestId     : idValidation.id,
      productIdList : Joi.array().items(idValidation.id).required(),
    };
    const result = Joi.validate(body, bodyValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const [ productCount, request ] = await Promise.all([
      await ProductSchema.countDocuments({ _id: { $in: body.productIdList}, deleted: false, status: ProductStatusEnum.published }),
      await RequestSchema.findOne({ _id: body.requestId, status: RequestStatusEnum.pending, requestPack: { $ne: null }, products: { $nin: body.productIdList } })
    ]);
    if (productCount !== body.productIdList.length) {
      return res.send(getResponse(false, 'Wrong Product Id list'));
    }
    if (!request) {
      return res.send(getResponse(false, 'Wrong request Id or product Id list'));
    } else {
      const requestPack = await RequestPackSchema.findOne({ _id: request.requestPack, status: RequestPackStatusEnum.active });
      if (!requestPack) return res.send(getResponse(false, 'Wrong request Id'));
    }
    req.body.request = request;
    return next();
  } catch (e) {
    new APIError(e, 500, 'attachProductToRequest function in request/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const detachProductFormRequest = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const body = req.body;
    const bodyValidationSchema: any = {
      requestId : idValidation.id,
      productId : Joi.array().items(idValidation.id).required(),
    };
    const result = Joi.validate(body, bodyValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const [ product, request ] = await Promise.all([
      await ProductSchema.findOne({ _id: body.productId, deleted: false, status: ProductStatusEnum.published }),
      await RequestSchema.findOne({ _id: body.requestId, status: RequestStatusEnum.pending, requestPack: { $ne: null }, products: { $nin: [body.productId] } })
    ]);
    if (!product) {
      return res.send(getResponse(false, 'Wrong request Id or product Id list'));
    }
    if (!request) {
      return res.send(getResponse(false, 'Wrong request Id or product Id list'));
    } else {
      const requestPack = await RequestPackSchema.findOne({ _id: request.requestPack, status: RequestPackStatusEnum.active });
      if (!requestPack) return res.send(getResponse(false, 'Wrong request Id'));
    }
    req.body.request = request;
    return next();
  } catch (e) {
    new APIError(e, 500, 'detachProductFormRequest function in request/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const setRequestSucceed = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const query: ISetRequestSucceedQuery = req.query;
    const queryValidationSchema: any = {
      ...idValidation,
    };
    const result = Joi.validate(query, queryValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const request = await RequestSchema.findOne({
      _id          : req.query.id,
      status       : RequestStatusEnum.pending,
      requestPack  : { $ne: null },
      'products.0' : { $exists: true }
    });
    if (!request) {
      return res.send(getResponse(false, 'Wrong Id'));
    }
    req.body.request = request;
    return next();
  } catch (e) {
    new APIError(e, 500, 'setRequestSucceed function in request/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const getFileListRequest = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      const result = Joi.validate(req.query.deviceId, Joi.string().required());
      if (result.error) {
        return res.send(getResponse(false, result.error.details[0].message));
      }
      req.body.deviceId = req.query.deviceId;
    } else {
      req.body.userId = req.user._id;
    }
    return next();
  } catch (e) {
    new APIError(e, 500, 'setRequestSucceed function in request/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};