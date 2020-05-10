import { IResponseModel, getResponse } from '../mainModels';

import PromoCodeSchema from '../../schemas/promoCode';
import { ICreatePromoCodeBody, IUpdatePromoCodeBody, IGetPromoCodeListBody } from './model';
import { IPromoCode } from '../../schemas/promoCode/model';
import { PromoCodeStatusEnum, PromoCodeTypeEnum } from '../../constants/enums';
import { regexpEscape } from '../mainValidation';

class PromoCodeServices {

  public generatePromoCode = async(): Promise<IResponseModel> => {
    const code = await PromoCodeSchema.getAvailableCode();
    return getResponse(true, 'Code generated', code);
  }
  public validatePromoCode = async(code: string): Promise<IResponseModel> => {
    const exists = await PromoCodeSchema.findOne({ code: code, deleted: false });
    if (exists) return getResponse(true, 'Promo code already exists', false);
    else return getResponse(true, 'Promo code is valid', true);
  }

  public createPromoCode = async(body: ICreatePromoCodeBody): Promise<IResponseModel> => {
    const newPromoCode = new PromoCodeSchema({
      type: body.type,
      amount: (body.type === PromoCodeTypeEnum.amount || body.type === PromoCodeTypeEnum.percent) ? body.amount : null,
      title: body.title,
      code: body.code
    });
    newPromoCode.freeShipping = body.freeShipping || false;
    newPromoCode.minPrice = body.minPrice || null;
    newPromoCode.maxPrice = body.maxPrice || null;
    newPromoCode.startDate = body.startDate || null;
    newPromoCode.endDate = body.endDate || null;
    newPromoCode.usageCount = body.usageCount || null;
    await newPromoCode.save();
    return getResponse(true, 'Promo code added');
  }

  public updatePromoCode = async(body: IUpdatePromoCodeBody): Promise<IResponseModel> => {
    const promoCode = body.promoCode;
    promoCode.title = body.title;
    promoCode.amount = body.amount;
    promoCode.freeShipping = body.freeShipping || false;
    promoCode.minPrice = body.minPrice;
    promoCode.maxPrice = body.maxPrice;
    promoCode.startDate = body.startDate || null;
    promoCode.endDate = body.endDate || null;
    if (!body.usageCount) promoCode.deprecated = false;
    else if (body.usageCount > promoCode.usageCount) promoCode.deprecated = false;
    promoCode.usageCount = body.usageCount || null;
    await promoCode.save();
    return getResponse(true, 'Promo code updated');
  }

  public deletePromoCode = async(idList: string[]): Promise<IResponseModel> => {
    await PromoCodeSchema.updateMany({ _id: { $in: idList } }, { deleted: true });
    return getResponse(true, 'PromoCode deleted');
  }

  public getPromoCodeList = async(body: IGetPromoCodeListBody): Promise<IResponseModel> => {
    const filter: any = { deleted: false };
    if (body.search) {
      const key = regexpEscape(body.search);
      filter.$or = [
        { title: new RegExp(key, 'i') },
        { code: new RegExp(key, 'i') }
      ];
    }
    if (body.type) {
      filter.type = body.type;
    }
    switch (body.status) {
      case PromoCodeStatusEnum.draft: {
        filter.startDate = { $gt: new Date() };
        filter.deprecated = false;
        break;
      }
      case PromoCodeStatusEnum.active: {
        filter.deprecated = false;
        const $or = [
          { startDate: null, endDate: null },
          { startDate: null, endDate: { $gt: new Date() } },
          { startDate: { $lt: new Date() }, endDate: null },
          { startDate: { $lt: new Date() }, endDate: { $gt: new Date() } }
        ];
        if (filter.$or) {
          const oldOr = filter.$or;
          delete filter.$or;
          filter.$and = [{ $or: oldOr }, { $or }];
        } else {
          filter.$or = $or;
        }
        break;
      }
      case PromoCodeStatusEnum.finished: {
        if (filter.$or) {
          const oldOr = filter.$or;
          delete filter.$or;
          filter.$and = [{ $or: oldOr }, { $or: [ { endDate: { $lt: new Date() } }, { deprecated: true } ] }];
        } else {
          filter.$or = [ { endDate: { $lt: new Date() } }, { deprecated: true } ];
        }
        break;
      }
      default: break;
    }
    const itemCount = await PromoCodeSchema.countDocuments(filter);
    if (itemCount === 0) return getResponse(true, 'Got list', { itemCount, pageCount: 0, itemList: [] });
    const pageCount = Math.ceil(itemCount / body.limit);
    if (body.pageNo > pageCount) return getResponse(false, 'PageNo must be less or equal than ' + pageCount);
    const skip = (body.pageNo - 1) * body.limit;
    const itemList = await PromoCodeSchema.getListByFilter(filter, skip, body.limit);
    return getResponse(true, 'Got list', { itemCount, pageCount, itemList });
  }
}

export default new PromoCodeServices;