import { IPaginationQuery } from '../mainModels';
import { IAttribute } from '../../schemas/attribute/model';
import { IOption } from '../../schemas/option/model';

export interface ICreateUsualAttributeBody {
  name: string;
  category: string;
  translations: Array<INameTranslation>;
  options: Array<IUsualOptionBody>;
}

export interface ICreateColorAttributeBody {
  name: string;
  category: string;
  translations: Array<INameTranslation>;
  options: Array<IColorOptionBody>;
}

export interface IUsualOptionBody {
  _id?: string;
  translations: Array<INameTranslation>;
  position: number;
}

export interface IColorOptionBody {
  _id?: string;
  translations: Array<INameTranslation>;
  colorType: number;
  firstColor: string;
  secondColor: string;
  position: number;
}

interface INameTranslation {
  language: number;
  name: string;
}

export interface IGetAttributeListForAdminBody extends IPaginationQuery {
  category: string;
  search: string;
  type: number;
  language: number;
}

export interface IUpdateAttributeBody {
  id: string;
  name: string;
  translations: Array<INameTranslation>;
  attribute: IAttribute<any, any, any>;
}

export interface IAddOptionBody {
  id: string;
  translations: Array<INameTranslation>;
  colorType?: number;
  firstColor: string;
  secondColor: string;
  attribute: IAttribute<any, any, any>;
}

export interface IUpdateOptionBody {
  id: string;
  translations: Array<INameTranslation>;
  colorType?: number;
  firstColor?: string;
  secondColor?: string;
  option: IOption<any, any>;
}

export interface IGetAttributeAutoCompleteQuery {
  id: string;
  search: string;
  categories: string[];
}

export interface IUpdateOptionPositionsBody {
  attributeId: string;
  options: Array<{
    id: string;
    position: number;
  }>;
}