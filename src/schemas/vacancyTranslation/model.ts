import { Document, Model } from 'mongoose';

interface IVacancyTranslationDocument<V = string> extends Document {
  vacancy: V;
  language: number;
  title: string;
  body: string;
}

export interface IVacancyTranslation<V = string> extends IVacancyTranslationDocument<V> {

}

export interface IVacancyTranslationModel extends Model<IVacancyTranslation<any>> {

}