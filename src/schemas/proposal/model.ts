import { Document, Model } from 'mongoose';

interface IProposalDocument<PT = string, P = string> extends Document {
  translations: Array<PT>;
  shown: boolean;
  products: Array<P>;
  createdDt: Date;
  updatedDt: DataCue;
}

export interface IProposal<PT = string, P = string> extends IProposalDocument<PT, P> {

}

export interface IProposalModel extends Model<IProposal<any, any>> {
  getListForAdmin(skip: number, limit: number, language: number): Promise<any[]>;
  productGoneInvisible(id: string): Promise<void>;
  isValidToShow(id: string): Promise<boolean>;
}