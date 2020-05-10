import * as mongoose from 'mongoose';
import { schemaReferences } from '../../constants/constants';
import { IVacancyTranslationModel, IVacancyTranslation } from './model';

const Schema = mongoose.Schema;

const schema = new Schema({
  vacancy: {
    type: Schema.Types.ObjectId,
    ref: schemaReferences.vacancy
  },
  language: {
    type: Number,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  body: {
    type: String,
    required: true
  }
});

const vacancyTranslation: IVacancyTranslationModel = mongoose.model<IVacancyTranslation<any>, IVacancyTranslationModel>(schemaReferences.vacancyTranslation, schema);
export default vacancyTranslation;