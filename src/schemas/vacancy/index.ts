import * as mongoose from 'mongoose';
import { schemaReferences } from '../../constants/constants';
import { IVacancyModel, IVacancy } from './model';

const Schema = mongoose.Schema;

const schema = new Schema({
  translations: [{
    type: Schema.Types.ObjectId,
    ref: schemaReferences.vacancyTranslation
  }],
  image: {
    type: String,
    default: null
  },
  createdDt: {
    type: Date,
    default: Date.now
  }
});

const vacancy: IVacancyModel = mongoose.model<IVacancy<any>, IVacancyModel>(schemaReferences.vacancy, schema);

export default vacancy;