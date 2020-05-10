import { IVacancy } from '../../schemas/vacancy/model';

export interface IAddVacancyBody {
  translations: [{
    language: number,
    title: string,
    body: string
  }];
}

export interface IUpdateVacancyBody {
  id: string;
  translations: [{
    language: number,
    title: string,
    body: string
  }];
  vacancy: IVacancy<any>;
}

export interface ISetVacancyImageBody {
  vacancy: IVacancy;
  file: Express.Multer.File;
  deleteImage: boolean;
}