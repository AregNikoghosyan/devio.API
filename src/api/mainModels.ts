import { Request } from 'express';
import { IUser } from '../schemas/user/model';
import { IDevice } from '../schemas/device/model';

export const getResponse = (success: boolean, message: string, data: any = null): IResponseModel => {
  const response: IResponseModel = { success, message, data };
  return response;
};

export const getErrorResponse = (): IResponseModel => {
  const response: IResponseModel = { success: false, message: 'Something went wrong', data: null };
  return response;
};

export interface IResponseModel {
  success: boolean;
  message: string;
  data: any;
}

export interface IRequest extends Request {
  user?: IUser;
  device?: IDevice;
  token?: string;
}

export interface IIdInQuery {
  id: string;
}

export interface IPaginationQuery {
  pageNo: number;
  limit: number;
}

export interface ISkipPaginationQuery {
  skip: number;
  limit: number;
}

export interface ILanguageInQuery {
  language: number;
}

export interface IRequestFilesItem {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  destination: string;
  filename: string;
  path: string;
  size: string;
}