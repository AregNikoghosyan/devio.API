import { Document, Model } from 'mongoose';

interface ICategoryDocument<CT = string, C = string> extends Document {
  icon: string;
  cover: string;
  translations: Array<CT>;
  pid: C;
  subCategoryCount: number;
  itemCount: number;
  itemCountInSub: number;
  visibleItemCount: number;
  visibleItemCountInSub: number;
  isHidden: boolean;
  position: number;
  url: string;
  createdDt: Date;
  updatedDt: Date;
  deleted: boolean;
}

export interface ICategory<CT = string, C = string> extends ICategoryDocument<CT, C> {

}

export interface ICategoryModel extends Model<ICategory<any, any>> {
  getListByLanguage(filter: any, language: number, skip?: number, limit?: number): Array<ICategoryForUser>;
  getNameByLanguage(id: string, language: number): Promise<string>;
  bulkDelete(id: string): Promise<void>;
  getMainCategory(id: string): Promise<string>;
  incrementItemCounters(idList: string[]): Promise<void>;
  decrementItemCounters(idList: string[]): Promise<void>;
  incrementVisibleCounters(idList: string[]): Promise<void>;
  decrementVisibleCounters(idList: string[]): Promise<void>;
  incrementBothCounters(idList: string[]): Promise<void>;
  decrementBothCounters(idList: string[]): Promise<void>;
  getListForDevice(filter: any, language: number): Promise<any[]>;
  getListForAdmin(filter: any, language: number): Promise<any[]>;
  getAllParents(idList: string[]): Promise<string[]>;
  getSubIdList(id: string): Promise<string[]>;
  getHomeTree(language: number): Promise<any[]>;
  getRandom(filter: any, count: number, language: number): Promise<any[]>;
  getHomeHoverRotateTree(language: number): Promise<any[]>;
}

interface ICategoryForUser {
  _id: string;
  icon: string;
  name: string;
  itemCount: number;
  subCategoryCount: number;
}