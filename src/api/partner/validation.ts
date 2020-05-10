import * as Joi from 'joi';
import APIError from '../../services/APIError';
import { Response, NextFunction } from 'express';
import { IRequest, getResponse, getErrorResponse } from '../mainModels';
import { ICreatePartnerBody } from './model';
import { idValidation, idRegex } from '../mainValidation';
import PartnerSchema from '../../schemas/partner';

export const createPartner = async (req: IRequest, res: Response, next: NextFunction) => {
    try {
        const body: ICreatePartnerBody = req.body;
        const bodyValidationSchema = {
            name: Joi.string().required(),
            email: Joi.string().required(),
            message: Joi.string().optional(),
            vatid: Joi.string().required(),
            phoneNumber: Joi.string().required(),
            contactperson: Joi.string().required(),
        };
        const result = Joi.validate(body, bodyValidationSchema);
        if (result.error) {
            return res.send(getResponse(false, result.error.details[0].message));
        }
        return next();
    } catch (e) {
        new APIError(e, 500, 'createPartner function in partner/validation.ts');
        return res.status(500).send(getErrorResponse());
    }
};

export const activatePartner = async (req: IRequest, res: Response, next: NextFunction) => {
    try {
        const body: ICreatePartnerBody = req.body;
        const bodyValidationSchema = {
            partnerId: Joi.string().allow('').regex(idRegex).required()
        };
        const result = Joi.validate(body, bodyValidationSchema);
        if (result.error) {
            return res.send(getResponse(false, result.error.details[0].message));
        }
        const partner = await PartnerSchema.findById(req.body.partnerId);
        if (!partner) return res.send(getResponse(false, 'Wrong Id'));
        req.body.partner = partner;
        return next();
    } catch (e) {
        new APIError(e, 500, 'activatePartner function in partner/validation.ts');
        return res.status(500).send(getErrorResponse());
    }
};

export const getPartnerDetails = async (req: IRequest, res: Response, next: NextFunction) => {
    try {
        const query: any = req.query;
        const queryValidationSchema = {
            partnerId: Joi.string().allow('').regex(idRegex).required()
        };
        const result = Joi.validate(query, queryValidationSchema);
        if (result.error) {
            return res.send(getResponse(false, result.error.details[0].message));
        }
        return next();
    } catch (e) {
        new APIError(e, 500, 'getPartnerDetails function in partner/validation.ts');
        return res.status(500).send(getErrorResponse());
    }
};
