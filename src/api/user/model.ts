import { IPaginationQuery } from '../mainModels';
import { IUser } from '../../schemas/user/model';

export interface IUpdateUserProfileBody {
  firstName: string;
  lastName: string;
  email: string;
}

export interface IUpdateUserPhoneBody {
  phoneNumber: string;
}

export interface IVerifyPhoneBody extends IUpdateUserPhoneBody {
  code: string;
}

export interface IGetUserListFilter {
  search?: string;
  tariffPlan?: number;
  requestFrom?: number;
  requestTo?: number;
  orderFrom?: number;
  orderTo?: number;
}

export interface IGetUserListBody extends IPaginationQuery, IGetUserListFilter {

}

export interface ISetUserTariffBody {
  userId: string;
  tariffPlan: number;
  user: IUser;
}

