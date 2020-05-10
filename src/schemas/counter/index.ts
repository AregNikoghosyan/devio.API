import * as mongoose from 'mongoose';
import { ICounterModel, ICounter } from './model';
import { schemaReferences } from '../../constants/constants';

const Schema = mongoose.Schema;

const schema = new Schema({
  reference: {
    type     : Number,
    required : true
  },
  count: {
    type    : Number,
    default : 0
  }
});

export const counter: ICounterModel = mongoose.model<ICounter, ICounterModel>(schemaReferences.counter, schema);
export default counter;