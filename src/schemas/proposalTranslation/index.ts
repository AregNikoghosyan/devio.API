import * as mongoose from 'mongoose';
import { schemaReferences } from '../../constants/constants';
import { IProposalTranslation, IProposalTranslationModel } from './model';

const Schema = mongoose.Schema;

const schema = new Schema({
  proposal: {
    type     : Schema.Types.ObjectId,
    ref      : schemaReferences.proposal,
    required : true
  },
  language: {
    type     : Number,
    required : true
  },
  name: {
    type     : String,
    required : true
  }
});

export const proposalTranslation: IProposalTranslationModel = mongoose.model<IProposalTranslation<any>, IProposalTranslationModel>(schemaReferences.proposalTranslation, schema);
export default proposalTranslation;