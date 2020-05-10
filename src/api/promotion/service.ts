import * as fs from 'fs';

import PromotionSchema from '../../schemas/promotion';
import PromotionTranslationSchema from '../../schemas/promotionTranslation';
import ProductSchema from '../../schemas/product';
import CategorySchema from '../../schemas/category';

import { IAddPromotionBody, IUpdatePromotionBody, IGetPromotionListForAdmin } from './model';
import { IResponseModel, getResponse } from '../mainModels';
import { IPromotion } from '../../schemas/promotion/model';
import { mediaPaths } from '../../constants/constants';
import { MediaTypeEnum, ProductStatusEnum } from '../../constants/enums';
import mainConfig from '../../env';
import { deleteFiles } from '../../services/fileManager';

class PromotionServices {

  public addPromotion = async(body: IAddPromotionBody): Promise<IResponseModel> => {
    const promotion = new PromotionSchema({
      type: body.type,
      product: body.product || null,
      category: body.category || null
    });
    promotion.translations = await PromotionTranslationSchema.insertMany(body.translations.map(item => {
      return {
        promotion : promotion._id,
        language  : item.language,
        name      : item.name.trim()
      };
    }));
    const count = await PromotionSchema.countDocuments();
    const position = body.position;
    if (!position || position > count) {
      promotion.position = count + 1;
    } else {
      await PromotionSchema.updateMany({ position: { $gte: position } }, { $inc: { position: 1 } });
      promotion.position = position;
    }
    await promotion.save();
    return getResponse(true, 'Promotion added', promotion._id);
  }

  public setPromotionCover = async(promotion: IPromotion, file: Express.Multer.File): Promise<IResponseModel> => {
    let fileName = promotion._id + '-' + Date.now();
    fileName = `${mediaPaths.photos}${MediaTypeEnum.photo}${promotion._id}-${Date.now()}`;
    fileName += this.getMimeType(file.originalname);
    fs.renameSync(file.path, mainConfig.MEDIA_PATH + fileName);
    if (promotion.cover) {
      deleteFiles([promotion.cover], true).catch(e => console.log(e));
    }
    promotion.cover = fileName;
    await promotion.save();
    return getResponse(true, 'Cover set');
  }

  public updatePromotion = async(body: IUpdatePromotionBody): Promise<IResponseModel> => {
    const promotion = body.promotion;
    await PromotionTranslationSchema.deleteMany({ promotion: promotion._id });
    promotion.type = body.type;
    promotion.product = body.product || null;
    promotion.category = body.category || null;
    const translations: any[] = await PromotionTranslationSchema.insertMany(body.translations.map(item => {
      return {
        promotion: promotion._id,
        language: item.language,
        name: item.name.trim()
      };
    }));
    promotion.translations = translations;
    const oldPosition = promotion.position;
    const count = await PromotionSchema.countDocuments();
    const newPosition = body.position > count ? count : body.position;
    if (newPosition !== oldPosition) {
      if (newPosition > oldPosition) {
        await PromotionSchema.updateMany({ position: { $gt: oldPosition, $lte: newPosition } }, { $inc: { position: -1 } });
      } else {
        await PromotionSchema.updateMany({ position: { $lt: oldPosition, $gte: newPosition } }, { $inc: { position: +1 } });
      }
      promotion.position = newPosition;
    }
    await promotion.save();
    return getResponse(true, 'Promotion updated');
  }

  public hideOrUnHidePromotion = async(promotion: IPromotion): Promise<IResponseModel> => {
    if (promotion.hidden) {
      const isValidToShow = await PromotionSchema.isValidToShow(promotion._id);
      if (!isValidToShow) return getResponse(false, 'Invalid to show');
    }
    promotion.hidden = !promotion.hidden;
    await promotion.save();
    return getResponse(true, `Promotion set to ${promotion.hidden ? 'hidden' : 'unHidden'}`);
  }

  public deletePromotions = async(idList: string[]): Promise<IResponseModel> => {
    await PromotionSchema.bulkDelete(idList);
    return getResponse(true, 'Promotion deleted');
  }

  public getListForAdmin = async(query: IGetPromotionListForAdmin): Promise<IResponseModel> => {
    const itemCount = await PromotionSchema.countDocuments();
    if (itemCount === 0) return getResponse(true, 'Got request list', { itemList: [], pageCount: 0, itemCount });
    const pageCount = Math.ceil(itemCount / +query.limit);
    if (+query.pageNo > pageCount) return getResponse(false, 'PageNo must be less or equal than ' + pageCount);
    const skip = (+query.pageNo - 1) * +query.limit;
    const itemList = await PromotionSchema.getListForAdmin(skip, query.limit, query.language);
    return getResponse(true, 'Got request list', { itemList, pageCount, itemCount });
  }

  public getDetailsForAdmin = async(id: string): Promise<IResponseModel> => {
    const details = await PromotionSchema.getDetailsForAdmin(id);
    return getResponse(true, 'Got details', details);
  }

  public getListForAll = async(query: { language: number, pageNo: number, limit: number }): Promise<IResponseModel> => {
    const filter = {
      hidden: false,
      cover: { $ne: null }
    };
    const itemCount = await PromotionSchema.countDocuments(filter);
    if (itemCount === 0) return getResponse(true, 'Got request list', { itemList: [], pagesLeft: false });
    const pageCount = Math.ceil(itemCount / +query.limit);
    if (+query.pageNo > pageCount) return getResponse(false, 'PageNo must be less or equal than ' + pageCount);
    const skip = (+query.pageNo - 1) * +query.limit;
    const itemList = await PromotionSchema.getListForAll(filter, query.language, skip, query.limit);
    return getResponse(true, 'Got request list', { itemList, pagesLeft: query.pageNo !== pageCount });
  }

  private getMimeType(fileName: string): string {
    const split = fileName.split('.');
    return '.' + split[split.length - 1];
  }
}

export default new PromotionServices();