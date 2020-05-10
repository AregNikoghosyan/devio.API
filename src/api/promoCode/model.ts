import { IPromoCode } from '../../schemas/promoCode/model';
import { IPaginationQuery } from '../mainModels';

interface IPromoCodeBody {
  amount: number;
  freeShipping: boolean;
  title: string;
  startDate?: Date;
  endDate?: Date;
  minPrice?: number;
  maxPrice?: number;
  usageCount?: number;
}

export interface ICreatePromoCodeBody extends IPromoCodeBody {
  type: number;
  code: string;
}

export interface IUpdatePromoCodeBody extends IPromoCodeBody {
  id: string;
  promoCode: IPromoCode;
}

export interface IGetPromoCodeListBody extends IPaginationQuery {
  search?: string;
  type?: number;
  status?: number;
}