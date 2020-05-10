import { Document, Model } from 'mongoose';

interface IAttributeDocument<AT = string, O = string, C = string> extends Document {
  type: number;
  name: string;
  category: C;
  translations: AT[];
  options: O[];
  deleted: boolean;
  createdDt: Date;
  updatedDt: Date;
}

export interface IAttribute<AT = string, O = string, C = string> extends IAttributeDocument<AT, O, C> {

}

export interface IAttributeModel extends Model<IAttribute<any, any, any>> {
  getListForAdmin(filter: any, skip: number, limit: number, language: number): Promise<any[]>;
  bulkDelete(idList: string[]): Promise<void>;
  getDetailsForAdmin(id: string): Promise<any>;
  getShortList(filter: any): Promise<any>;
  getTranslatedMap(idList: string[], language: number): Promise<any>;
  getMap(attributes: string[], options: string[], language: number): Promise<any>;
}