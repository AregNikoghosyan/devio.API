import * as Joi from 'joi';
import { Response, NextFunction } from 'express';

import { IRequest, getErrorResponse, getResponse } from '../mainModels';
import APIError from '../../services/APIError';
import { languageValidation, idValidation, pagingValidation } from '../mainValidation';
import { ICreateProposalBody, IUpdateProposalBody, IGetProposalListQuery } from './model';

import ProposalSchema from '../../schemas/proposal';
import ProductSchema  from '../../schemas/product';

export const createProposal = async(req: IRequest, res: Response, next: NextFunction) => {
  try {
    const body: ICreateProposalBody = req.body;
    const bodyValidationSchema = {
      ...translateArrayValidation,
      productIdList: Joi.array().items(idValidation.id).min(1).unique().required()
    };
    const result = Joi.validate(body, bodyValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const productCount = await ProductSchema.countDocuments({
      _id: { $in: body.productIdList },
      deleted: false
    });
    if (productCount !== body.productIdList.length) {
      return res.send(getResponse(false, 'Wrong id list'));
    }
    return next();
  } catch (e) {
    new APIError(e, 500, 'createProposal function in proposal/validations.ts');
    res.status(500).send(getErrorResponse());
  }
};

export const updateProposal = async(req: IRequest, res: Response, next: NextFunction) => {
  try {
    const body: IUpdateProposalBody = req.body;
    const bodyValidationSchema = {
      ...idValidation,
      ...translateArrayValidation,
      productIdList: Joi.array().items(idValidation.id).min(1).unique().required(),
      deleteIdList: Joi.array().items(idValidation.id).min(1).optional()
    };
    const result = Joi.validate(body, bodyValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const [ proposal, productCount ] = await Promise.all([
      await ProposalSchema.findById(body.id),
      await ProductSchema.countDocuments({
        _id: { $in: body.productIdList },
        deleted: false
      })
    ]);
    if (!proposal) {
      return res.send(getResponse(false, 'Wrong Id'));
    }
    if (productCount !== body.productIdList.length) {
      return res.send(getResponse(false, 'Wrong id list'));
    }
    req.body.proposal = proposal;
    return next();
  } catch (e) {
    new APIError(e, 500, 'updateProposal function in proposal/validations.ts');
    res.status(500).send(getErrorResponse());
  }
};

export const setProposalShown = async(req: IRequest, res: Response, next: NextFunction) => {
  try {
    const result = Joi.validate(req.body, idValidation);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const proposal = await ProposalSchema.findOne({
      _id: req.body.id,
      shown: false
    });
    if (!proposal) {
      return res.send(getResponse(false, 'Wrong Id or proposal is already shown'));
    }
    if (!(await ProposalSchema.isValidToShow(proposal._id))) {
      return res.send(getResponse(false, 'Invalid to show'));
    }
    req.body.proposal = proposal;
    return next();
  } catch (e) {
    new APIError(e, 500, 'setProposalShown function in proposal/validations.ts');
    res.status(500).send(getErrorResponse());
  }
};

export const getProposalList = async(req: IRequest, res: Response, next: NextFunction) => {
  try {
    const query: IGetProposalListQuery = req.query;
    req.query.language = +req.headers['language'];
    const result = Joi.validate(req.query, {
      ...languageValidation,
      ...pagingValidation
    });
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    query.limit = +query.limit;
    query.pageNo = +query.pageNo;
    return next();
  } catch (e) {
    new APIError(e, 500, 'getProposalList function in proposal/validations.ts');
    res.status(500).send(getErrorResponse());
  }
};

export const getProposalDetails = async(req: IRequest, res: Response, next: NextFunction) => {
  try {
    const result = Joi.validate(req.query, idValidation);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const proposal = await ProposalSchema.findById(req.query.id);
    if (!proposal) {
      return res.send(getResponse(false, 'Wrong Id'));
    }
    req.body.proposal = proposal;
    return next();
  } catch (e) {
    new APIError(e, 500, 'getProposalDetails function in proposal/validations.ts');
    res.status(500).send(getErrorResponse());
  }
};

export const getProposalForAll = async(req: IRequest, res: Response, next: NextFunction) => {
  try {
    req.query.language = +req.headers['language'];
    const queryValidationSchema = {
      ...languageValidation,
      ...pagingValidation
    };
    req.query.limit = +req.query.limit;
    req.query.pageNo = +req.query.pageNo;
    const result = Joi.validate(req.query, queryValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    return next();
  } catch (e) {
    new APIError(e, 500, 'getPromotionForAll function in proposal/validations.ts');
    res.status(500).send(getErrorResponse());
  }
};

export const deleteProposals = async(req: IRequest, res: Response, next: NextFunction) => {
  try {
    const result = Joi.validate(req.body, { idList: Joi.array().items(idValidation.id).unique().min(1).required()});
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const count = await ProposalSchema.countDocuments({ _id: { $in: req.body.idList } });
    if (count !== req.body.idList.length) {
      return res.send(getResponse(false, 'Wrong Id list'));
    }
    return next();
  } catch (e) {
    new APIError(e, 500, 'getPromotionForAll function in proposal/validations.ts');
    res.status(500).send(getErrorResponse());
  }
};

const translateValidation = {
  ...languageValidation,
  name : Joi.string().min(1).required(),
};
const translateArrayValidation = {
  translations: Joi.array().items(translateValidation).length(3).unique('language').required()
};