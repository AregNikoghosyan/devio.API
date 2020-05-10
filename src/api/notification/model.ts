import { INotification } from '../../schemas/notification/model';

export interface ISendCustomNotificationBody {
  id: string;
  filters: Array<{
    search: string;
    orderFrom: number;
    orderTo: number;
    requestFrom: number;
    requestTo: number;
    tariffPlan: number;
  }>;
  notification: INotification;
}