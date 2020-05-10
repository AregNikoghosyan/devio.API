import * as fs from 'fs';

import { getResponse, IResponseModel } from '../mainModels';
import { ICreateBrandBody, IUpdateBrandBody, IGetBrandListBody, IGetBrandListForAutoCompleteQuery, IGetBrandListForFilterBody } from './model';

import BrandSchema              from '../../schemas/brand';
import FileSchema               from '../../schemas/file';
import ProductSchema            from '../../schemas/product';
import ProductTranslationSchema from '../../schemas/productTranslation';
import CategorySchema           from '../../schemas/category';

import { mediaPaths } from '../../constants/constants';
import mainConfig from '../../env';
import { MediaTypeEnum, ProductStatusEnum, UserTypeEnum } from '../../constants/enums';
import { IUser } from '../../schemas/user/model';
import { regexpEscape } from '../mainValidation';

class BrandServices {

  public createBrand = async(body: ICreateBrandBody, file: Express.Multer.File): Promise<IResponseModel> => {
    const brand = new BrandSchema({
      name: body.name.trim(),
      upperCaseName: body.name.trim().toUpperCase()
    });
    const logoName = mediaPaths.icons + brand._id + '-' + Date.now() + this.getMimeType(file.filename);
    const newFile = new FileSchema({
      type: MediaTypeEnum.photo,
      path: logoName,
      originalName: file.originalname,
      brand: brand._id
    });
    fs.rename(file.path, mainConfig.MEDIA_PATH + logoName, () => {});
    brand.logo = newFile._id;
    await Promise.all([
      await brand.save(),
      await newFile.save()
    ]);
    return getResponse(true, 'Brand added');
  }

  public updateBrand = async(body: IUpdateBrandBody, file: Express.Multer.File): Promise<IResponseModel> => {
    const brand = body.brand;
    if (body.name) {
      brand.name = body.name.trim();
      brand.upperCaseName = body.name.trim().toUpperCase();
    }
    if (file) {
      const logoName = mediaPaths.icons + brand._id + '-' + Date.now() + this.getMimeType(file.filename);
      const newFile = new FileSchema({
        type: MediaTypeEnum.photo,
        path: logoName,
        originalName: file.originalname,
        brand
      });
      fs.rename(file.path, mainConfig.MEDIA_PATH + logoName, () => {});
      FileSchema.deleteFile([brand.logo]).catch(e => console.log(e));
      brand.logo = newFile._id;
      await Promise.all([
        await brand.save(),
        await newFile.save()
      ]);
    } else {
      await brand.save();
    }
    return getResponse(true, 'Brand updated');
  }

  public getBrandListForAdmin = async(body: IGetBrandListBody): Promise<IResponseModel> => {
    const filter: any = {};
    if (body.search) {
      const key = regexpEscape(body.search);
      filter.name = new RegExp(key, 'i');
    }
    if (body.countFrom) {
      filter.productCount = { $gte: body.countFrom };
    }
    if (body.countTo) {
      if (filter.productCount) {
        filter.productCount.$lte = body.countTo;
      } else {
        filter.productCount = { $lte: body.countTo };
      }
    }
    const itemCount = await BrandSchema.countDocuments(filter);
    if (itemCount === 0) return getResponse(true, 'Got brand list', { itemList: [], itemCount, pageCount: 0 });
    const pageCount = Math.ceil(itemCount / body.limit);
    if (body.pageNo > pageCount) return getResponse(false, 'PageNo must be less or equal than ' + pageCount);
    const skip = (body.pageNo - 1) * body.limit;
    const list = await BrandSchema.find(filter).select({ _id: 1, logo: 1, name: 1, productCount: 1, createdDt: 1 }).sort({ createdDt: -1 }).skip(skip).limit(body.limit);
    const itemList = await Promise.all(list.map(async item => {
      const file = await FileSchema.findById(item.logo);
      const returnObj = {
        _id: item._id,
        logo : file ? mainConfig.BASE_URL + file.path : null,
        name: item.name,
        productCount: item.productCount,
        createdDt: item.createdDt
      };
      return returnObj;
    }));
    return getResponse(true, 'Got brand list', { itemList, itemCount, pageCount });
  }

  public deleteBrands = async(idList: string[]): Promise<IResponseModel> => {
    await Promise.all([
      await BrandSchema.deleteMany({ _id: { $in: idList } }),
      await ProductSchema.updateMany({ brand: { $in: idList } }, { brand: null })
    ]);
    return getResponse(true, 'Brand deleted');
  }

  public getBrandListForAll = async(query: IGetBrandListBody, user: IUser): Promise<IResponseModel> => {
    const filter: any = {};
    if (!user || user.role === UserTypeEnum.user) filter.visibleProductCount = { $gt: 0 };
    if (query.search) {
      const key = regexpEscape(query.search);
      filter.name = new RegExp(key, 'i');
    }
    const itemCount = await BrandSchema.countDocuments(filter);
    if (itemCount === 0) return getResponse(true, 'Got brand list', { itemList: [], itemCount, pageCount: 0 });
    const pageCount = Math.ceil(itemCount / +query.limit);
    if (+query.pageNo > pageCount) return getResponse(false, 'PageNo must be less or equal than ' + pageCount);
    const skip = (+query.pageNo - 1) * +query.limit;
    const itemList = await BrandSchema.getListForAll(filter, skip, +query.limit, user ? user.role : null);
    return getResponse(true, 'Got brand list', { itemList, itemCount, pageCount, pagesLeft: +query.pageNo !== pageCount  });
  }

  public getListForAutoComplete = async(query: IGetBrandListForAutoCompleteQuery, user: IUser): Promise<IResponseModel> => {
    const filter: any = {};
    if (!user || user.role === UserTypeEnum.user) filter.visibleProductCount = { $gt: 0 };
    if (query.search) {
      const key = regexpEscape(query.search);
      filter.name = new RegExp(key, 'i');
    }
    const all = (query.all === 'true');
    if (!all) {
      filter.productCount = { $gt: 0 };
    }
    const list = await BrandSchema.find(filter).select({ _id: 1, name: 1 });
    return getResponse(true, 'Got list', list);
  }

  public getListForFilter = async(body: IGetBrandListForFilterBody, user: IUser): Promise<IResponseModel> => {
    let categoryIdList = [];
    if (body.category) {
      if (body.category.subCategoryCount) {
        categoryIdList = await CategorySchema.getSubIdList(body.category._id);
      } else {
        categoryIdList.push(body.category._id);
      }
    }
    const productFilter: any = {
      deleted: false,
      status: ProductStatusEnum.published,
      versionsHidden: false,
      isPrivate: false,
      categories: { $exists: true, $not: { $size: 0 } }
    };
    if (categoryIdList.length) {
      productFilter.categories = { $in: categoryIdList };
    } else if (body.search) {
      const searchIdList = await ProductTranslationSchema.find({ name : new RegExp(body.search, 'i') }).distinct('product');
      productFilter._id = { $in: searchIdList };
    }
    const brandIdList = await ProductSchema.find(productFilter).distinct('brand');
    const brandFilter: any = {
      _id: { $in: brandIdList },
      productCount: { $gt: 0 },
      visibleProductCount: { $gt: 0 },
      logo: { $ne: null }
    };
    const itemCount = await BrandSchema.countDocuments(brandFilter);
    if (itemCount === 0) return getResponse(true, 'Got item list', { itemList: [], pagesLeft: false });
    const pageCount = Math.ceil(itemCount / body.limit);
    if (body.pageNo >  pageCount) return getResponse(false, 'Page no must be less than or equal to ' + pageCount);
    const skip = (body.pageNo - 1) * body.limit;
    const itemList = await BrandSchema.find(brandFilter).sort({ name: 1 }).skip(skip).limit(body.limit).select({ _id: 1, name: 1 });
    return getResponse(true, 'Got item list', { itemList, pagesLeft: body.pageNo !== pageCount });
  }

  private getMimeType(fileName: string) {
    const split = fileName.split('.');
    return '.' + split[split.length - 1];
  }

}

export default new BrandServices();