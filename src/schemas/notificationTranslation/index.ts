import * as mongoose from 'mongoose';
import { schemaReferences } from '../../constants/constants';
import { INotificationTranslationModel, INotificationTranslation } from './model';

const Schema = mongoose.Schema;

const schema = new Schema({
  notification: {
    type: Schema.Types.ObjectId,
    ref: schemaReferences.notification,
    required: true
  },
  language: {
    type: Number,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  body: {
    type: String,
    required: true
  }
});

const notificationTranslation: INotificationTranslationModel = mongoose.model<INotificationTranslation<any>, INotificationTranslationModel>(schemaReferences.notificationTranslation, schema);
export default notificationTranslation;