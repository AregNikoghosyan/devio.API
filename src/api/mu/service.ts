import MuSchema from '../../schemas/mu';
import MuTranslationSchema from '../../schemas/muTranslation';
import ProductSchema from '../../schemas/product';

import { IAddMuBody, IUpdateMuBody } from './model';
import { getResponse, IResponseModel } from '../mainModels';
import { IMU } from '../../schemas/mu/model';
import { ProductStatusEnum } from '../../constants/enums';

class MuServices {

  public createMu = async(body: IAddMuBody): Promise<IResponseModel> => {
    const mu = new MuSchema({});
    mu.translations = await MuTranslationSchema.insertMany(body.translations.map((item: any) => {
      item.mu = mu._id;
      item.name = item.name.trim();
      return item;
    }));
    await mu.save();
    return getResponse(true, 'Mu added', mu);
  }

  public updateMu = async(body: IUpdateMuBody): Promise<IResponseModel> => {
    await MuTranslationSchema.deleteMany({ mu: body.mu._id });
    body.mu.translations = await MuTranslationSchema.insertMany(body.translations.map((item: any) => {
      item.mu = body.id;
      item.name = item.name.trim();
      return item;
    }));
    await body.mu.save();
    return getResponse(true, 'Mu updated', body.mu);
  }

  public deleteMu = async(idList: string[]): Promise<IResponseModel> => {
    await MuSchema.updateMany({ _id: { $in: idList } }, { deleted: true });
    return getResponse(true, 'Mu deleted');
  }

  public getMu = async(language: number): Promise<IResponseModel> => {
    const muList = await MuSchema.getShortList(language);
    return getResponse(true, 'Got mu list', muList);
  }

  public getMuList = async(): Promise<IResponseModel> => {
    const muList = await MuSchema.getListForAdmin();
    const itemList = await Promise.all(muList.map(async item => {
      const count = await ProductSchema.countDocuments({
        mu: item._id,
        status: { $ne: ProductStatusEnum.preparing },
        deleted: false
      });
      return { ...item, productCount: count };
    }));
    return getResponse(true, 'Got mu list', itemList);
  }
}

export default new MuServices();