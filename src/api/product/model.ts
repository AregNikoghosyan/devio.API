import { IIdInQuery, IPaginationQuery } from '../mainModels';
import { IProduct } from '../../schemas/product/model';
import { number } from 'joi';
import { IMU } from '../../schemas/mu/model';
import { ICategory } from '../../schemas/category/model';
import { IBrand } from '../../schemas/brand/model';
import { IProposal } from '../../schemas/proposal/model';

interface ITranslation {
  language: number;
  name: string;
  description: string;
}

interface IFeaturesTranslation {
  language: number;
  title: string;
  description: string;
}

export interface ISetMainDetailsForProductBody extends IIdInQuery {
  translations: Array<ITranslation>;
  mu: string;
  brand: string;
  minCount: number;
  step: number;
  multiplier: number;
  type: number;
  preparingDayCount: number;
  isPrivate: boolean;
  partner: string;
  product: IProduct<any, any, any, any, any, any, any, any, any>;
}

export interface ISetCategoriesForProductBody extends IIdInQuery {
  categories: string[];
  product: IProduct<any, any, any, any, any, any, any, any, any>;
}


export interface ISetPricingForProductBody extends IIdInQuery {
  price: number;
  discountStartDate: Date;
  discountEndDate: Date;
  pricing: Array<{
    fromCount: number;
    bonus: number;
    discount: number;
  }>;
  product: IProduct<any, any, any, any, any, any, any, any, any>;
}


export interface IGetProductRangeOrVersionBody extends IIdInQuery {
  chosen: Array<{
    attribute: string;
    option: string;
  }>;
  language: number;
  product: IProduct<any, any, any, any, any, any, any, any, any>;
}
export interface ISetImagesForProductBody extends IIdInQuery {
  removeIdList: string[];
  product: IProduct<any, any, any, any, any, any, any, any, any>;
}

export interface ISetFeaturesForProductBody extends IIdInQuery {
  features: Array<{
    translations: Array<IFeaturesTranslation>;
  }>;
  product: IProduct<any, any, any, any, any, any, any, any, any>;
}

export interface IGenerateVersionsBody extends IIdInQuery {
  attributes: string[];
  product: IProduct<any, any, any, any, any, any, any, any, any>;
}

export interface ISetVersionsForProductBody extends IIdInQuery {
  attributes: string[];
  staticAttributes: string[];
  versions: Array<{
    _id?: string;
    product: string;
    hidden: boolean;
    photo: string;
    price: number;
    bonus: number;
    attributes: Array<{
      attribute: string;
      option: string;
    }>;
  }>;
  areSame: boolean;
  product: IProduct<any, any, any, any, any, any, any, any, any>;
}

export interface IGetProductListForDashboardBody extends IPaginationQuery {
  language: number;
  search: string;
  category: string;
  subCategory: string;
  status: number;
  priceFrom: number;
  priceTo: number;
  dateFrom: Date;
  dateTo: Date;
  partner: string;
}

export interface IGetProductDetailsBody {
  language: number;
  product: IProduct<any, any, any, any, any, any, any, any, any>;
}

export interface IHideOrUnHideProductsBody {
  action: number;
  idList: string[];
  filter: any;
}

export interface IDeleteProductsBody {
  idList: string[];
  filter: any;
}

export interface IApproveProductsBody {
  idList: string[];
  filter: any;
}

export interface IGetProductListForRequestQuery extends IPaginationQuery {
  search: string;
  productId: string;
}

export interface IGetProductListForHomeStaff extends IPaginationQuery {
  search: string;
}

export interface IGetProductMainListBody extends IPaginationQuery {
  proposalId: string;
  proposal: IProposal;
  search: string;
  mu?: IMU<string>;
  category: ICategory<string, string>;
  brandIdList: string[];
  priceFrom: number;
  priceTo: number;
  withSale: boolean;
  withBonus: boolean;
  sort: number;
  language: number;
}

export interface IGetProductListForCartBody {
  idList: Array<{
    product: string,
    productVersion?: string,
    count: number
  }>;
  language: number;
}


export interface IGetCartListModel {
  itemList: Array<{
    product: any;
    mu: string;
    productVersion: any;
    name: string;
    filePath: string;
    image: string;
    attributes: Array<{
      attributeId: string;
      attributeName: string;
      optionId: string;
      optionName: string;
    }>;
    priceList: any[];
    defaultPrice: number;
    minCount: number;
    step: number;
    stepCount: number;
    count: number;
    discountedPrice: any;
    discountAmount: any;
  }>;
  deletedList: Array<{
    product: string;
    productVersion?: string;
    count: number;
  }>;
  subTotal: number;
  discount: number;
  total: number;
  bonus: number;
}