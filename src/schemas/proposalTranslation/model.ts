import { Document, Model } from 'mongoose';

interface IProposalTranslationDocument<P = string> extends Document {
  promotion: P;
  language: number;
  name: string;
}

export interface IProposalTranslation<P = string> extends IProposalTranslationDocument<P> {

}

export interface IProposalTranslationModel extends Model<IProposalTranslation<any>> {

}