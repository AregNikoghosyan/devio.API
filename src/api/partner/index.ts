import { Router, Response } from 'express';

import * as Validations from './validation';
import Services from './service';
import { IRequest, getErrorResponse } from '../mainModels';
import APIError from '../../services/APIError';
import jwtValidation from '../jwtValidation';

class PartnerRoutes {
    public router = Router();

    constructor() {
        this.routes();
    }

    private routes() {
        /** POST api/partner - Functionality to create new partner */
        this.router.post('/', jwtValidation.validateAdmin, Validations.createPartner, this.createPartner);

        /** POST api/partner - Functionality to create new partner */
        this.router.post('/request', jwtValidation.validateGuestOrUser, Validations.createPartner, this.requestPartner);

        /** GET  api/partner/selectList - Functionality for partners to get partner list */
        this.router.get('/selectList', jwtValidation.validateAdmin, this.getListForSelect);

        /** PUT  api/partner/activatePartner - Functionality for admins to activate or deactivate partner */
        this.router.put('/activatePartner', jwtValidation.validateAdmin, Validations.activatePartner, this.activatePartner);

        /** GET  api/partner/list - Functionality for users to get partners list for admin */
        this.router.get('/list', jwtValidation.validateAdmin, this.getListForAdmin);

        /** GET  api/partner/details - Functionality for admin to get partner details */
        this.router.get('/details', jwtValidation.validateAdmin, Validations.getPartnerDetails, this.getPartnerDetails);
    }

    private createPartner = async (req: IRequest, res: Response) => {
        try {
            const response = await Services.createPartner(req.body, req.user);
            res.send(response);
        } catch (e) {
            new APIError(e, 500, 'createPartner function in partner/service.ts');
            res.status(500).send(getErrorResponse());
        }
    }

    private requestPartner = async (req: IRequest, res: Response) => {
        try {
            const response = await Services.requestPartner(req.body, req.user);
            res.send(response);
        } catch (e) {
            new APIError(e, 500, 'createPartner function in partner/service.ts');
            res.status(500).send(getErrorResponse());
        }
    }

    private getListForSelect = async (req: IRequest, res: Response) => {
        try {
            const response = await Services.getListForSelect();
            res.send(response);
        } catch (e) {
            new APIError(e, 500, 'getListForSelect function in partner/service.ts');
            res.status(500).send(getErrorResponse());
        }
    }

    private activatePartner = async (req: IRequest, res: Response) => {
        try {
            const response = await Services.activatePartner(req.body.partner);
            res.send(response);
        } catch (e) {
            new APIError(e, 500, 'activatePartner function in partner/service.ts');
            res.status(500).send(getErrorResponse());
        }
    }

    private getListForAdmin = async (req: IRequest, res: Response) => {
        try {
            const response = await Services.getListForAdmin(req.body);
            res.send(response);
        } catch (e) {
            new APIError(e, 500, 'getListForSelect function in partner/service.ts');
            res.status(500).send(getErrorResponse());
        }
    }

    private getPartnerDetails = async (req: IRequest, res: Response) => {
        try {
            const response = await Services.getPartnerDetails(req.query.partnerId);
            res.send(response);
        } catch (e) {
            new APIError(e, 500, 'getListForSelect function in partner/service.ts');
            res.status(500).send(getErrorResponse());
        }
    }
  
}

export default new PartnerRoutes().router;