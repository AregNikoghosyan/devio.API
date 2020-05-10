
import OrderSchema from '../../schemas/order';

import { ICheckReqModel, ISuccessTransactionModel } from './model';
import { OrderStatusEnum } from '../../constants/enums';

class IdramServices {
  public checkOrder = async (body: ICheckReqModel): Promise<boolean> => {
    try {
      if (body.EDP_PRECHECK === 'YES') {
        const order = await OrderSchema
          .findOne()
          .where({ nid: body.EDP_BILL_NO })
          .where({ total: body.EDP_AMOUNT })
          .where({ status: OrderStatusEnum.draft });

        return !!order;
      } else {
        await this.successTransaction(<any>body);
        return true;
      }
    } catch (error) {
      throw error;
    }
  }

  public successTransaction = async (query: ISuccessTransactionModel) => {
    try {
      const order = await OrderSchema
        .findOne()
        .where({ nid: +query.EDP_BILL_NO })
        .where({ total: +query.EDP_AMOUNT })
        .where({ status: OrderStatusEnum.draft });

      order.status = OrderStatusEnum.pending;

      await order.save();
    } catch (error) {
      throw error;
    }
  }

  public fail = async (body: ISuccessTransactionModel) => {
    console.log('fail IDRAM', body);
  }
}

export default new IdramServices();
