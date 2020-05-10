import { IBrand } from '../../schemas/brand/model';
import { IPaginationQuery } from '../mainModels';
import { ICategory } from '../../schemas/category/model';

export interface ICreateBrandBody {
  name: string;
}

export interface IUpdateBrandBody extends ICreateBrandBody {
  id: string;
  brand: IBrand<any, any>;
}

export interface IGetBrandListBody extends IPaginationQuery {
  search: string;
  countFrom: number;
  countTo: number;
}

export interface IGetBrandListForAutoCompleteQuery {
  search: string;
  all: string;
}

export interface IGetBrandListForFilterBody extends IPaginationQuery {
  categoryId?: string;
  search?: string;
  category?: ICategory;
}