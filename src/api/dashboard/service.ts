import { IGetDashboardBody } from './model';
import { IResponseModel, getResponse } from '../mainModels';

import UserSchema        from '../../schemas/user';
import GuestUserSchema   from '../../schemas/guestUser';
import OrderSchema       from '../../schemas/order';
import RequestPackSchema from '../../schemas/requestPack';
import ProductSchema     from '../../schemas/product';
import BrandSchema       from '../../schemas/brand';
import { OrderStatusEnum, OsTypeEnum, RequestPackStatusEnum } from '../../constants/enums';

class DashboardServices {
  public getDashboard = async(body: IGetDashboardBody): Promise<IResponseModel> => {
    const [ userCount, guestCount, orderCount, requestCount, productCount, brandCount] = await Promise.all([
      UserSchema.newCountByDateRange(body),
      GuestUserSchema.newCountByDateRange(body),
      OrderSchema.newCountByDateRange(body),
      RequestPackSchema.newCountByDateRange(body),
      ProductSchema.newCountByDateRange(body),
      BrandSchema.newCountByDateRange(body)
    ]);
    const requestFilter: any = {
      createdDt: {
        $gt: new Date(body.dateFrom)
      }
    };
    if (body.dateTo) {
      requestFilter.createdDt.$lt = new Date(body.dateTo);
    }
    const orderFilter: any = {
      status: { $nin: [ OrderStatusEnum.draft ] },
      createdDt: {
        $gt: new Date(body.dateFrom)
      }
    };
    if (body.dateTo) {
      orderFilter.createdDt.$lt = new Date(body.dateTo);
    }
    const [ ordersAndroid, ordersIOS, ordersWeb, requestsAndroid, requestsIOS, requestsWeb ] = await Promise.all([
      OrderSchema.countDocuments({ ...orderFilter, osType: OsTypeEnum.android }),
      OrderSchema.countDocuments({ ...orderFilter, osType: OsTypeEnum.ios }),
      OrderSchema.countDocuments({ ...orderFilter, osType: OsTypeEnum.web }),
      RequestPackSchema.countDocuments({ ...requestFilter, osType: OsTypeEnum.android }),
      RequestPackSchema.countDocuments({ ...requestFilter, osType: OsTypeEnum.ios }),
      RequestPackSchema.countDocuments({ ...requestFilter, osType: OsTypeEnum.web })
    ]);
    const [ ordersFinished, ordersPending, ordersCanceled, requestsFinished, requestsPending, requestsCanceled ] = await Promise.all([
      OrderSchema.countDocuments({ ...orderFilter, status: OrderStatusEnum.finished }),
      OrderSchema.countDocuments({ ...orderFilter, status: { $in: [ OrderStatusEnum.pending, OrderStatusEnum.review ] } }),
      OrderSchema.countDocuments({ ...orderFilter, status: OrderStatusEnum.canceled }),
      RequestPackSchema.countDocuments({ ...requestFilter, status: RequestPackStatusEnum.finished }),
      RequestPackSchema.countDocuments({ ...requestFilter, status: RequestPackStatusEnum.active }),
      RequestPackSchema.countDocuments({ ...requestFilter, status: RequestPackStatusEnum.canceled })
    ]);
    // Orders by status, requests by statuses,
    return getResponse(true, 'ok', {
      userCount,
      guestCount,
      orderCount,
      requestCount,
      productCount,
      brandCount,
      ordersAndroid,
      ordersIOS,
      ordersWeb,
      requestsAndroid,
      requestsIOS,
      requestsWeb,
      ordersFinished,
      ordersPending,
      ordersCanceled,
      requestsFinished,
      requestsPending,
      requestsCanceled
    });
  };
}

export default new DashboardServices();