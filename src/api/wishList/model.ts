import { ILanguageInQuery, IPaginationQuery, IIdInQuery } from '../mainModels';
import { IWishList } from '../../schemas/wishList/model';
import { IWishProduct } from '../../schemas/wishProduct/model';
import { IProduct } from '../../schemas/product/model';

export interface ICreateWishListBody {
  companyId?: string;
  name: string;
  type: number;
}

export interface IUpdateWishListBody {
  id: string;
  name: string;
  wishList: IWishList<any, any, any, any>;
}

export interface IGetWishListsQuery extends ILanguageInQuery, IPaginationQuery  {
  type: number;
}

export interface IGetWishListDetailsQuery extends IIdInQuery  {}

export interface IAddProductToDeviceWishListBody {
  productId: string;
  deviceId: string;
  productVersionId: string;
}

export interface IRemoveProductFromDeviceWishListBody {
  id: string;
  deviceId: string;
}

export interface IGetDeviceWishListQuery extends ILanguageInQuery, IPaginationQuery {
  deviceId: string;
}

export interface IProductToUserWishListAction {
  productId: string;
  productVersionId: string;
  actions: Array<{
    wishListId: string;
    action: number;
  }>;
  wishLists: IWishList<any, any, any, any>[];
}

export interface IGetUnapprovedProductListBody extends IIdInQuery, ILanguageInQuery {
  skip: number;
  limit: number;
  isCreator: boolean;
}

export interface IApproveProductInWishListBody {
  wishListId: string;
  productId: number;
}

export interface IGetWishListShortListQuery {
  productId: string;
  productVersionId: string;
}

export interface IChangeProductCounterInWishListBody {
  wishListId: string;
  productId: number;
  sum: number;
  wishProduct: IWishProduct<string, IProduct, string, string>;
}

export interface IDeleteProductFromUserWishListBody {
  wishListId: string;
  wishProductId: string;
}

export interface IRemoveMemberFromWishListBody {
  wishListId: string;
  memberIdList: string[];
  wishList: IWishList<any, any, any, any>;
}

export interface IGetProductListInWishListBody extends IIdInQuery, ILanguageInQuery {
  skip: number;
  limit: number;
  memberIdList?: string[];
  creator: boolean;
}

export interface IGetGuestWishListProductsBody {
  idList: string;
  language: number;
}

export interface IExportWishListToCartBody {
  id: string;
  language: number;
  memberIdList: string[];
  creator: boolean;
  wishList: IWishList;
}