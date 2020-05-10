import { Model, Document } from 'mongoose';

interface IOptionDocument<OT = string, A = string> extends Document {
  attribute: A;
  translations: OT;
  colorType: number;
  position: number;
  firstColor: string;
  secondColor: string;
  hidden: boolean;
  deleted: boolean;
}

export interface IOption<OT = string, A = string> extends IOptionDocument<OT, A> {

}

export interface IOptionModel extends Model<IOption<any, any>> {

}