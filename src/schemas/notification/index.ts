import * as mongoose from 'mongoose';
import { schemaReferences } from '../../constants/constants';
import { INotificationModel, INotification } from './model';
import { NotificationStatusEnum } from '../../constants/enums';

const Schema = mongoose.Schema;

const schema = new Schema({
  image: {
    type: String,
    default: null
  },
  translations: [{
    type: Schema.Types.ObjectId,
    ref: schemaReferences.notificationTranslation
  }],
  userCount: {
    type: Number,
    default: null
  },
  status: {
    type: Number,
    default: NotificationStatusEnum.draft
  },
  createdDt: {
    type: Date,
    default: Date.now
  }
});

const notification: INotificationModel = mongoose.model<INotification<any>, INotificationModel>(schemaReferences.notification, schema);
export default notification;