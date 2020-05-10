import { ISendSupportMessageBody, ISendEmail } from './model';
import { IResponseModel, getResponse, IPaginationQuery } from '../mainModels';

import SupportMessageSchema from '../../schemas/supportMessage';
import EmailMessageSchema from '../../schemas/subscribe';

class SupportServices {
  public sendSupportMessage = async(body: ISendSupportMessageBody): Promise<IResponseModel> => {
    await SupportMessageSchema.create({
      name: body.name,
      email: body.email,
      phone: body.phone || null,
      message: body.message
    });
    return getResponse(true, 'ok');
  };

  public sendEmail = async(body: ISendEmail): Promise<IResponseModel> => {
    await EmailMessageSchema.create({
      email: body.email,
    });
    return getResponse(true, 'ok');
  };

  public getSupportMessageList = async(query: IPaginationQuery): Promise<IResponseModel> => {
    const itemCount = await SupportMessageSchema.countDocuments({});
    if (!itemCount) return getResponse(true, 'Got', { itemList: [], itemCount, pageCount: 0 });
    const pageCount = Math.ceil(itemCount / query.limit);
    if (query.pageNo > pageCount) return getResponse(false, 'Too high pageNo');
    const skip = (query.pageNo - 1) * query.limit;
    const itemList = await SupportMessageSchema.find({}).sort({ createdDt: -1 }).skip(skip).limit(query.limit).select({
      _id: 1,
      name: 1,
      email: 1,
      phone: 1,
      message: 1,
      createdDt: 1
    });
    return getResponse(true, 'Got', { itemCount, itemList, pageCount });
  };

  public getEmailMessageList = async(query: IPaginationQuery): Promise<IResponseModel> => {
    const itemCount = await EmailMessageSchema.countDocuments({});
    if (!itemCount) return getResponse(true, 'Got', { itemList: [], itemCount, pageCount: 0 });
    const pageCount = Math.ceil(itemCount / query.limit);
    if (query.pageNo > pageCount) return getResponse(false, 'Too high pageNo');
    const skip = (query.pageNo - 1) * query.limit;
    const itemList = await EmailMessageSchema.find({}).sort({ createdDt: -1 }).skip(skip).limit(query.limit).select({
      email: 1,
      createdDt: 1
    });
    return getResponse(true, 'Got',  { itemCount, itemList, pageCount });
  };
  
}




export default new SupportServices();