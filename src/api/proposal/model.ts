import { IProposal } from '../../schemas/proposal/model';
import { IPaginationQuery } from '../mainModels';

export interface ICreateProposalBody {
  translations: Array<{
    language: number;
    name: string;
  }>;
  productIdList: Array<string>;
}

export interface IUpdateProposalBody extends ICreateProposalBody {
  id: string;
  deleteIdList: string[];
  proposal: IProposal<any, any>;
}

export interface IGetProposalListQuery extends IPaginationQuery {
  language: number;
}