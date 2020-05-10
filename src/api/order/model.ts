import { IWishList } from '../../schemas/wishList/model';
import { IAddress } from '../../schemas/address/model';
import { IPromoCode } from '../../schemas/promoCode/model';
import { ICompany } from '../../schemas/company/model';
import { IGuestUser } from '../../schemas/guestUser/model';
import { IPaginationQuery } from '../mainModels';
import { IOrder } from '../../schemas/order/model';
import { IUser } from '../../schemas/user/model';

export interface IGoToCheckOutBody {
  language: number;
  bonus: number;
  wishList?: IWishList;
  idList: Array<{
    count: number;
    product: string;
    productVersion?: string;
  }>;
}

export interface ICheckDeliveryFeeBody {
  id: string;
  price: number;
  address: IAddress;
}

export interface ICheckPromoCodeBody {
  language: number;
  email?: string;
  deliveryType: number;
  addressId: string;
  code: string;
  price: number;
  address: IAddress;
  promoCode: IPromoCode;
}

export interface ICreateOrderBody {
  language: number;
  osType: number;
  companyId: string;
  email: string;
  code: string;
  guestName: string;
  guestPhoneNumber: string;
  deliveryDate: Date;
  deliveryMethod: number;
  deliveryAddressId: string;
  paymentMethod: number;
  promoCode: string;
  bonus: number;
  idList: Array<{
    count: number;
    product: string;
    productVersion?: string;
  }>;
  deliveryAddress: IAddress;
  promo?: IPromoCode;
  company?: ICompany;
  guestUser?: IGuestUser;
  additional: string;
}

export interface IGetOrderListForAdminBody extends IPaginationQuery {
  search?: string;
  status?: number;
  paymentType?: number;
  minPrice?: number;
  maxPrice?: number;
  dateFrom?: Date;
  dateTo?: Date;
  userId?: string; // For getting for admin list
  partner?: string;
}

export interface IGetOrderListForUserQuery extends IPaginationQuery {
  active: boolean;
  language: number;
}

export interface ICancelOrderBody {
  id: string;
  reason: string;
  email: string;
  code: string;
  order: IOrder<IUser, IGuestUser, string, string, string, string, string, string, string>;
}

export interface IGenerateInvoiceBody {
  idList: Array<{
    count: number;
    product: string;
    productVersion: string;
  }>;
  companyId: string;
  company: ICompany<string, IAddress, string>;
  addressId: string;
}