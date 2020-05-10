import { Document, Model } from 'mongoose';

interface IVacancyDocument<T = string> extends Document {
  translations: Array<T>;
  image: string;
  createdDt: Date;
}

export interface IVacancy<T = string> extends IVacancyDocument<T> {

}

export interface IVacancyModel extends Model<IVacancy<any>> {

}