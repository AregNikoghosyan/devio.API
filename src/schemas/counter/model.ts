import { Document, Model } from 'mongoose';

interface ICounterDocument extends Document {
  reference: number;
  count: number;
}

export interface ICounter extends ICounterDocument {

}

export interface ICounterModel extends Model<ICounter> {

}
