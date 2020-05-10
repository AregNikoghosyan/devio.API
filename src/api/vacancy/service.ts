import * as fs from 'fs';

import { IAddVacancyBody, IUpdateVacancyBody, ISetVacancyImageBody } from './model';
import { IResponseModel, getResponse, IPaginationQuery } from '../mainModels';

import VacancySchema            from '../../schemas/vacancy';
import VacancyTranslationSchema from '../../schemas/vacancyTranslation';
import mainConfig from '../../env';
import { LanguageEnum } from '../../constants/enums';
import { IVacancy } from '../../schemas/vacancy/model';
import { IVacancyTranslation } from '../../schemas/vacancyTranslation/model';

class VacancyServices {

  public addVacancy = async(body: IAddVacancyBody): Promise<IResponseModel> => {
    const newVacancy = new VacancySchema();
    newVacancy.translations = await VacancyTranslationSchema.insertMany(body.translations.map(item => {
      return {
        vacancy: newVacancy._id,
        language: item.language,
        title: item.title,
        body: item.body
      };
    }));
    await newVacancy.save();
    return getResponse(true, 'Vacancy added', newVacancy._id);
  }

  public updateVacancy = async(body: IUpdateVacancyBody): Promise<IResponseModel> => {
    const vacancy = body.vacancy;
    await VacancyTranslationSchema.deleteMany({ _id: { $in: vacancy.translations } });
    vacancy.translations = await VacancyTranslationSchema.insertMany(body.translations.map(item => {
      return {
        vacancy: vacancy._id,
        language: item.language,
        title: item.title,
        body: item.body
      };
    }));
    await vacancy.save();
    return getResponse(true, 'Vacancy updated', vacancy._id);
  }

  public setVacancyImage = async(body: ISetVacancyImageBody): Promise<IResponseModel> => {
    const vacancy = body.vacancy;
    if (body.deleteImage && vacancy.image) {
      const path = mainConfig.MEDIA_PATH + vacancy.image;
      if (fs.existsSync(path)) fs.unlinkSync(path);
    } else if (body.file) {
      const newPath = `${Date.now()}-${vacancy._id}${this.getMimeType(body.file.originalname)}`;
      fs.renameSync(body.file.path, mainConfig.MEDIA_PATH + newPath);
      const oldPath = vacancy.image;
      vacancy.image = newPath;
      if (oldPath && fs.existsSync(mainConfig.MEDIA_PATH + oldPath)) fs.unlinkSync(mainConfig.MEDIA_PATH + oldPath);
    }
    await vacancy.save();
    return getResponse(true, 'Image set');
  }

  public getVacancyAdminList = async(query: IPaginationQuery): Promise<IResponseModel> => {
    const itemCount = await VacancySchema.countDocuments();
    if (!itemCount) return getResponse(true, 'Got item list', { itemList: [], itemCount: 0, pageCount: 0 });
    const pageCount = Math.ceil(itemCount / query.limit);
    if (query.pageNo > pageCount) return getResponse(true, 'Too high pageNo');
    const skip = (query.pageNo - 1) * query.limit;
    const list = await VacancySchema.find().sort({ createdDt: -1 }).skip(skip).limit(query.limit);
    const itemList = await Promise.all(list.map(async item => {
      const translation = await VacancyTranslationSchema.findOne({ vacancy: item._id, language: LanguageEnum.hy });
      return {
        _id: item._id,
        image: item.image ? mainConfig.BASE_URL + item.image : null,
        title: translation ? translation.title : null,
        createdDt: item.createdDt
      };
    }));
    return getResponse(true, 'Got item list', { itemList, itemCount, pageCount });
  }

  public getVacancyDetailsForAdmin = async(vacancy: IVacancy<IVacancyTranslation>): Promise<IResponseModel> => {
    if (vacancy.image) vacancy.image = mainConfig.BASE_URL + vacancy.image;
    return getResponse(true, 'Got details', vacancy);
  }

  public deleteVacancies = async(vacancyList: IVacancy[]): Promise<IResponseModel> => {
    await Promise.all(vacancyList.map(async item => {
      if (item.image && fs.existsSync(mainConfig.MEDIA_PATH + item.image)) {
        fs.unlinkSync(mainConfig.MEDIA_PATH + item.image);
      }
      await Promise.all([
        await VacancyTranslationSchema.deleteMany({ _id: { $in: item.translations } }),
        await VacancySchema.deleteOne({ _id: item._id })
      ]);
    }));
    return getResponse(true, 'Vacancies deleted');
  }

  private getMimeType(fileName: string) {
    const split = fileName.split('.');
    return '.' + split[split.length - 1];
  }

}

export default new VacancyServices();