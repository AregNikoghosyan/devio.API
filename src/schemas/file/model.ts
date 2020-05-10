import { Document, Model } from 'mongoose';

interface IFileDocument<R = string, C = string, M = string, P = string, B = string> extends Document {
  type: number;
  path: string;
  originalName: string;
  isMain: boolean;
  shortKeys: string[];
  request: R;
  category: C;
  message: M;
  product: P;
  brand: B;
  setProductImage: boolean;
}

export interface IFile<R = string, C = string, M = string, P = string, B = string> extends IFileDocument<R, C, M, P, B> {

}

export interface IFileModel extends Model<IFile<any, any, any, any, any>> {
  deleteFile(idList: string[]): Promise<void>;
  getProductImages(idList: string[]): Promise<any[]>;
  getRandomImage(productIdList: string[]): Promise<string>;
}
