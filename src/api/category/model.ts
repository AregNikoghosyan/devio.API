import { IIdInQuery, ILanguageInQuery, IPaginationQuery } from '../mainModels';
import { ICategory } from '../../schemas/category/model';
import { IProduct } from '../../schemas/product/model';

interface ITranslation {
  language: number;
  name: string;
}

export interface ICreateCategoryBody {
  id?: string;
  translations: Array<ITranslation>;
  url?: string;
  parentCategory?: ICategory;
}

export interface IUploadCategoryIconBody extends IIdInQuery {
  category: ICategory;
}

export interface IUpdateCategoryBody extends ICreateCategoryBody {
  id: string;
  category: ICategory<any, any>;
}

export interface IGetAllCategoriesQuery extends IIdInQuery, ILanguageInQuery {
  search?: string;
}

export interface IGetCategoryListForAdminQuery extends IIdInQuery, ILanguageInQuery {
  productId: string;
  product: IProduct;
}

export interface IHideCategoryQuery extends IIdInQuery {}

export interface IDeleteCategoryQuery extends IIdInQuery {}

export interface IChangePositionBody extends IIdInQuery {
  position: number;
  category: ICategory;
}

export interface IGetShortCategoriesQuery extends ILanguageInQuery {
  search: string;
  pid?: string;
}

export interface IGetCategoryListForDeviceQuery extends ILanguageInQuery, IIdInQuery {}