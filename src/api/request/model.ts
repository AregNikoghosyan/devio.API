import { IRequestDoc } from '../../schemas/request/model';
import { IFile } from '../../schemas/file/model';
import { IPaginationQuery, ILanguageInQuery, IIdInQuery } from '../mainModels';

export interface IAddRequestBody {
  type: number;
  category: string;
  iNeed: string;
  mu: string;
  count: number;
  description: string;
  deviceId: string;
}

export interface IDeleteRequestBody {
  id: string;
  deviceId: string;
  request: IRequestDoc<string, string, IFile>;
}

export interface ISendRequestBody {
  osType: number;
  type: number;
  deviceId: string;
  phoneNumber: string;
  email: string;
  firstName: string;
  lastName: string;
  idList: string[];
}

export interface IGetDraftRequestListQuery extends IPaginationQuery, ILanguageInQuery {
  deviceId: string;
}

export interface IGetDraftRequestDetailsQuery extends IIdInQuery, ILanguageInQuery {
  deviceId: string;
}

export interface IUpdateDraftRequestBody extends IAddRequestBody {
  id: string;
  removeFileList: string[];
  request: IRequestDoc;
}

export interface IGetRequestPackListQuery extends ILanguageInQuery, IPaginationQuery {
  status: number;
  deviceId: string;
}

export interface IGetRequestPackDetailsQuery extends ILanguageInQuery {
  id: string;
  deviceId: string;
  code: string;
  phoneNumber: string;
}

export interface IGetRequestPackListForAdminBody extends IPaginationQuery {
  language: number;
  search?: string;
  category?: string;
  status?: number;
  dateFrom?: Date;
  dateTo?: Date;
  countFrom?: number;
  countTo?: number;
  sortBy?: number;
  sortFrom?: number;
  userId?: string;
}

export interface ICancelRequestPackBody extends IIdInQuery {
  deviceId: string;
  code: string;
  phoneNumber: string;
}

export interface IGetRequestPackDetailsForAdminQuery extends IIdInQuery, ILanguageInQuery {

}

export interface ISetRequestFailedQuery extends IIdInQuery {}

export interface IRequestNewRequest {
  deviceId?: string;
}

export interface IAttachFileToRequestBody {
  requestId: string;
  deviceId: string;
}

export interface IDetachFileFromRequestBody {
  requestId: string;
  fileId: string;
  deviceId: string;
  request: IRequestDoc<any, any, any, any, any, any>;
}

export interface ISetRequestDraftBody {
  requestId: string;
  category: string;
  iNeed: string;
  mu: string;
  count: number;
  description: string;
  deviceId: string;
  request: IRequestDoc;
}

export interface IAttachProductToRequestBody {
  requestId: string;
  productIdList: string[];
  request: IRequestDoc;
}

export interface ISetRequestSucceedQuery extends IIdInQuery {}