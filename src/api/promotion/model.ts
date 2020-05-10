import { IPromotion } from '../../schemas/promotion/model';
import { IPaginationQuery } from '../mainModels';

export interface IAddPromotionBody {
  translations: Array<{
    language: number;
    name: string;
  }>;
  type: number;
  product: string;
  category: string;
  position: number;
}

export interface IUpdatePromotionBody extends IAddPromotionBody {
  id: string;
  promotion: IPromotion;
}

export interface IGetPromotionListForAdmin extends IPaginationQuery {
  language: number;
}