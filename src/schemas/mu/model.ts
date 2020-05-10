import { Document, Model } from 'mongoose';

interface IMUDocument<MT = string> extends Document {
  translations: Array<MT>;
  createdDt: Date;
  updatedDt: Date;
  deleted: boolean;
}

export interface IMU<MT = string> extends IMUDocument<MT> {

}

export interface IMUModel extends Model<IMU<any>> {
  getShortList(language: number): Promise<any[]>;
  getListForAdmin(): Promise<any[]>;
  getNameByLanguage(id: string, language: number): Promise<string>;
}