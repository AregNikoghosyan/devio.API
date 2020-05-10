import { Router, Response } from 'express';
import jwtValidation from '../jwtValidation';

import * as Validations from './validation';
import Services from './service';

import { IRequest, getErrorResponse } from '../mainModels';
import APIError from '../../services/APIError';


class ProposalRoutes {
  public router = Router();

  constructor () {
    this.routes();
  }

  private routes () {

    /** POST api/proposal - Functionality for admin to create new proposal */
    this.router.post('/', jwtValidation.validateAdmin, Validations.createProposal, this.createProposal);
    /** PUT api/proposal - Functionality for admin to update proposal */
    this.router.put('/', jwtValidation.validateAdmin, Validations.updateProposal, this.updateProposal);
    /** PUT api/proposal/shown - Functionality for admin to set proposal shown */
    this.router.put('/shown', jwtValidation.validateAdmin, Validations.setProposalShown, this.setProposalShown);

    /** DELETE api/proposal - Functionality for admin to delete proposals */
    this.router.delete('/', jwtValidation.validateAdmin, Validations.deleteProposals, this.deleteProposals);
    /** GET api/proposal/list - Functionality for admin to get proposal list */
    this.router.get('/list', jwtValidation.validateAdmin, Validations.getProposalList, this.getProposalList);
    /** GET api/proposal/details - Functionality for admin to get proposal details */
    this.router.get('/details', jwtValidation.validateAdmin, Validations.getProposalDetails, this.getProposalDetails);

    /** GET api/proposal - Functionality for all to get shown proposal */
    this.router.get('/', Validations.getProposalForAll, this.getProposalForAll);

  }

  private createProposal = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.createProposal(req.body);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'createProposal function in proposal/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private updateProposal = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.updateProposal(req.body);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'updateProposal function in proposal/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private setProposalShown = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.setProposalShown(req.body.proposal);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'setProposalShown function in proposal/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private getProposalList = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.getProposalList(req.query);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'getProposalList function in proposal/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private deleteProposals = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.deleteProposals(req.body.idList);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'deleteProposals function in proposal/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private getProposalDetails = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.getProposalDetails(req.body.proposal);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'getProposalDetails function in proposal/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

  private getProposalForAll = async(req: IRequest, res: Response) => {
    try {
      const response = await Services.getProposalForAll(req.query);
      res.send(response);
    } catch (e) {
      new APIError(e, 500, 'getProposalForAll function in proposal/service.ts');
      res.status(500).send(getErrorResponse());
    }
  }

}

export default new ProposalRoutes().router;