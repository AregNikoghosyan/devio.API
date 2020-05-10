import * as fs from 'fs';

import {
  ICreateCategoryBody,
  IUploadCategoryIconBody,
  IUpdateCategoryBody,
  IGetAllCategoriesQuery,
  IGetCategoryListForAdminQuery,
  IChangePositionBody,
  IGetCategoryListForDeviceQuery
} from './model';
import { IResponseModel, getResponse } from '../mainModels';

import CategorySchema from '../../schemas/category';
import ProductSchema  from '../../schemas/product';
import CategoryTranslationSchema from '../../schemas/categoryTranslation';
import PromotionSchema from '../../schemas/promotion';
import mainConfig from '../../env';
import { ObjectID, ObjectId } from 'bson';
import { ICategory } from '../../schemas/category/model';
import { mediaPaths } from '../../constants/constants';
import { LanguageEnum, ProductStatusEnum } from '../../constants/enums';
import { regexpEscape } from '../mainValidation';

class CategoryServices {

  public createCategory = async(body: ICreateCategoryBody): Promise<IResponseModel> => {
    const category = new CategorySchema({});
    let enName = '';
    const translationList = body.translations.map(item => {
      const translation = {
        category : category._id,
        language : item.language,
        name     : item.name.trim()
      };
      if (item.language === LanguageEnum.en) enName = item.name;
      return translation;
    });
    if (body.url) {
      category.url = body.url;
    } else {
      category.url = await this.generateUniqueUrl(enName, category._id);
    }
    category.translations = await CategoryTranslationSchema.insertMany(translationList);
    const filter = {
      pid: body.parentCategory ? body.parentCategory._id : null,
      deleted: false
    };
    let count = await CategorySchema.countDocuments(filter);
    category.position = ++count;
    if (body.parentCategory) {
      category.pid = body.parentCategory._id;
      body.parentCategory.subCategoryCount = ++body.parentCategory.subCategoryCount;
      await Promise.all([
        await body.parentCategory.save(),
        await category.save()
      ]);
    } else {
      await category.save();
    }
    return getResponse(true, 'Category created', category._id);
  }

  public uploadCategoryIcon = async(file: Express.Multer.File, body: IUploadCategoryIconBody): Promise<IResponseModel> => {
    if (body.category.icon && fs.existsSync(mainConfig.MEDIA_PATH + body.category.icon)) {
      fs.unlink(mainConfig.MEDIA_PATH + body.category.icon, () => {});
    }
    const iconName = mediaPaths.icons + body.category._id + '-' + Date.now() + this.getMimeType(file.filename);
    body.category.icon = iconName;
    await body.category.save();
    fs.rename(file.path, mainConfig.MEDIA_PATH + iconName, () => {});
    return getResponse(true, 'ok');
  }

  public uploadCategoryCover = async(file: Express.Multer.File, body: IUploadCategoryIconBody): Promise<IResponseModel> => {
    if (body.category.cover && fs.existsSync(mainConfig.MEDIA_PATH + body.category.cover)) {
      fs.unlink(mainConfig.MEDIA_PATH + body.category.cover, () => {});
    }
    const coverName = mediaPaths.photos + body.category._id + '-' + Date.now() + this.getMimeType(file.filename);
    body.category.cover = coverName;
    await body.category.save();
    fs.rename(file.path, mainConfig.MEDIA_PATH + coverName, () => {});
    return getResponse(true, 'ok');
  }

  public updateCategory = async(body: IUpdateCategoryBody): Promise<IResponseModel> => {
    await CategoryTranslationSchema.deleteMany({ category: body.id });
    let enName = '';
    const translations = body.translations.map(item => {
      const translation = {
        category: body.id,
        language: item.language,
        name: item.name.trim()
      };
      if (item.language === LanguageEnum.en) enName = item.name;
      return translation;
    });
    body.category.translations = await CategoryTranslationSchema.insertMany(translations);
    if (body.url) body.category.url = body.url;
    else body.category.url = await this.generateUniqueUrl(enName, body.category._id);
    await body.category.save();
    return getResponse(true, 'Category updated');
  }

  public getAllCategories = async(query: IGetAllCategoriesQuery): Promise<IResponseModel> => {
    const filter: any = {
      $or: [
        { itemCount        : { $gt: 0 } },
        { itemCountInSub   : { $gt: 0 } }
      ],
      isHidden: false,
      pid: query.id ? new ObjectID(query.id) : null,
      deleted: false
    };
    if (query.search) {
      const key = regexpEscape(query.search);
      const idList = await CategoryTranslationSchema.find({ name: new RegExp(key, 'i') }).distinct('category');
      if (!idList.length) return getResponse(true, 'Got category list', []);
      filter._id = { $in: idList };
    }
    const itemList = await CategorySchema.getListByLanguage(filter, +query.language);
    return getResponse(true, 'Got category list', itemList);
  }

  public getCategoryListForAdmin = async(query: IGetCategoryListForAdminQuery): Promise<IResponseModel> => {
    const filter: any = { deleted: false };
    if (query.id) filter.pid = new ObjectID(query.id);
    else filter.pid = null;
    const itemCount = await CategorySchema.countDocuments(filter);
    if (itemCount === 0) return getResponse(true, 'Got categories list', []);
    const itemList = await CategorySchema.getListForAdmin(filter, +query.language);
    if (query.productId) {
      const product = query.product;
      const categoryList = await CategorySchema.getAllParents(product.categories);
      itemList.forEach(item => {
        item.includes = categoryList.includes(item._id.toString());
      });
    }
    return getResponse(true, 'Got categories list', itemList);
  }

  public hideCategory = async(category: ICategory): Promise<IResponseModel> => {
    category.isHidden = !category.isHidden;
    await category.save();
    return getResponse(true, 'Category updated');
  }

  public deleteCategory = async(category: ICategory): Promise<IResponseModel> => {
    const pid = await CategorySchema.getMainCategory(category._id);
    await CategorySchema.bulkDelete(category._id);
    const idList = await CategorySchema.getSubIdList(pid);
    await PromotionSchema.updateVisibility([pid, ...idList]);
    return getResponse(true, 'Category deleted');
  }

  public getCategoryDetailsForAdmin = async(category: any): Promise<IResponseModel> => {
    if (category.icon) category.icon = mainConfig.BASE_URL + category.icon;
    if (category.cover) category.cover = mainConfig.BASE_URL + category.cover;
    const [ translations, parentCategoryName ] = await Promise.all([
      await CategoryTranslationSchema.find({ _id: { $in: category.translations } }).select({ language: 1, name: 1, _id: 0 }),
      await CategoryTranslationSchema.findOne({ category: category.pid, language: LanguageEnum.en })
    ]);
    category.translations = translations;
    category.parentName = parentCategoryName ? parentCategoryName.name : '';
    return getResponse(true, 'Got category details', category);
  }

  public changePosition = async(body: IChangePositionBody): Promise<IResponseModel> => {
    const filter: any = { deleted: false };
    let length = 0;
    if (body.category.pid) {
      filter.pid = body.category.pid;
    } else {
      filter.pid = null;
    }
    length = await CategorySchema.countDocuments(filter);
    if (body.position > length) {
      return getResponse(false, 'Position must be less than ' + (length + 1));
    }
    if (body.position === body.category.position) {
      return getResponse(true, 'Position updated');
    } else if (body.position > body.category.position) {
      const oldPosition = body.category.position;
      body.category.position = body.position;
      await Promise.all([
        await body.category.save(),
        await CategorySchema.updateMany({
          ...filter,
          position: { $lte: body.position, $gt: oldPosition },
          _id: { $ne: body.id }
        }, {
          $inc: { position: -1 }
        })
      ]);
    } else {
      const oldPosition = body.category.position;
      body.category.position = body.position;
      await Promise.all([
        await body.category.save(),
        await CategorySchema.updateMany({
          ...filter,
          position: { $lt: oldPosition, $gte: body.position },
          _id: { $ne: body.id }
        }, {
          $inc: { position: 1 }
        })
      ]);
    }
    return getResponse(true, 'Position updated');
  }

  public getCategoriesShort = async(language: number, search: string, pid: string): Promise<IResponseModel> => {
    const filter: any = { deleted: false, pid: null };
    if (pid) {
      filter.pid = new ObjectID(pid);
    }
    if (search) {
      const key = regexpEscape(search);
      const idList = await CategoryTranslationSchema.find({ name: new RegExp(key, 'i') }).distinct('category');
      if (!idList.length) return getResponse(true, 'Got category list', []);
      filter._id = { $in: idList };
    }
    const itemList = await CategorySchema.getListByLanguage(filter, language);
    return getResponse(true, 'Got list', itemList);
  }

  public getCategoriesForDevice = async(query: IGetCategoryListForDeviceQuery): Promise<IResponseModel> =>  {
    const filter = {
      isHidden: false,
      $or: [
        { visibleItemCount: { $gt: 0 } },
        { visibleItemCountInSub: { $gt: 0 } }
      ],
      deleted: false,
      pid: null
    };
    if (query.id) filter.pid = new ObjectID(query.id);
    const list = await CategorySchema.getListForDevice(filter, +query.language);
    return getResponse(true, 'Got list successfully', list);
  }

  public getCategoriesForHover = async(language: number): Promise<IResponseModel> => {
    const filter: any = {
      isHidden: false,
      $or: [
        { itemCount: { $gt: 0 } },
        { subCategoryCount: { $gt: 0 } }
      ],
      deleted: false,
      pid: null
    };
    let mainList = await CategorySchema.getListForDevice(filter, language);
    mainList = await Promise.all(mainList.map(async item => {
      if (item.subCategoryCount > 0) {
        const tempFilter = { ...filter };
        tempFilter.pid = item._id;
        item.categories = await CategorySchema.getListForDevice(tempFilter, language);
      } else {
        item.categories = [];
      }
      return item;
    }));
    for (let i = 0; i < mainList.length; i++) {
      mainList[i].categories = await Promise.all(mainList[i].categories.map(async item => {
        if (item.subCategoryCount > 0) {
          const tempFilter = { ...filter };
          tempFilter.pid = item._id;
          item.categories = await CategorySchema.getListForDevice(tempFilter, language);
        } else {
          item.categories = [];
        }
        return item;
      }));
    }
    return getResponse(true, 'Got list', mainList);
  }

  public getCategoriesForWebHoverTree = async(language: number): Promise<IResponseModel> => {
    // const mainList = await CategorySchema.getHomeHoverRotateTree(language);
    const filter: any = {
      isHidden: false,
      $or: [
        { itemCount: { $gt: 0 } },
        { subCategoryCount: { $gt: 0 } }
      ],
      deleted: false,
      pid: null
    };
    const list = await CategorySchema.getListForDevice(filter, language);
    const mainList = [];
    await Promise.all(list.map(async item => {
      item.cover = mainConfig.BASE_URL + item.cover;
      if (item.subCategoryCount > 0) {
        const result = await this.getCategoriesForDevice({ language: language, id: item._id });
        const subList = result.data;
        item.subList = subList.map(item => {
          return {
            _id: item._id,
            name: item.name,
            position: item.position
          };
        });
        item.subList.sort((a, b) => {
          if (a.position < b.position) {
            return -1;
          }
          if (a.position > b.position) {
            return 1;
          }
          return 0;
        });
        delete item.subCategoryCount;
        delete item.itemCount;
        delete item.icon;
        if (item.subList.length) mainList.push(item);
      }
    }));
    mainList.sort((a, b) => {
      if (a.position < b.position) {
        return -1;
      }
      if (a.position > b.position) {
        return 1;
      }
      return 0;
    });
    return getResponse(true, 'Got list', mainList);
  }

  public getCategoriesForPromotion = async(searchKey: string): Promise<IResponseModel> => {
    const filter: any = {
      isHidden: false,
      deleted: false,
      $or: [
        { visibleItemCountInSub: { $gt: 0 } },
        { visibleItemCount: { $gt: 0 } },
      ]
    };
    if (searchKey) {
      const key = regexpEscape(searchKey);
      const idList = await CategoryTranslationSchema.find({ name : new RegExp(key, 'i') }).distinct('category');
      filter._id = { $in: idList };
    }
    const list = await CategorySchema.getListByLanguage(filter, LanguageEnum.en);
    return getResponse(true, 'Got list', list);
  }

  public getHomeTree = async(language: number): Promise<IResponseModel> => {
    const tree = await CategorySchema.getHomeTree(language);
    return getResponse(true, 'Got categories', tree);
  }

  public getSubTree = async(body: { category: ICategory, language: number }) => {
    if (body.category.subCategoryCount <= 0) {
      return getResponse(true, 'Got data', []);
    }
    // Get 4 random subcategories
    const filter = {
      pid: new ObjectID(body.category._id),
      deleted: false,
      $or: [
        { itemCount: { $gt: 0 } },
        { subCategoryCount: { $gt: 0 } }
      ]
    };
    const categoryCount = 4;
    const categoryList = await CategorySchema.getRandom(filter, categoryCount, body.language);
    const itemList = await Promise.all(categoryList.map(async item => {
      const filter: any = {
        status: ProductStatusEnum.published,
        isPrivate: false,
        deleted: false,
        versionsHidden: false
      };
      if (item.itemCount > 0) {
        filter.categories = item._id;
      } else {
        const subCategories = await CategorySchema.getSubIdList(item._id);
        filter.categories = { $in: subCategories.map(item => new ObjectID(item)) };
      }
      const imageList = await ProductSchema.getRandomImages(filter);
      return {
        _id: item._id,
        name: item.name,
        imageList
      };
    }));
    return getResponse(true, 'Got item list', itemList);
  }

  public getCategoryDetails = async(body: { category: ICategory, language: number }) => {
    const translation = await CategoryTranslationSchema.findOne({ category: body.category._id, language: body.language });
    return getResponse(true, 'Got', { name: translation.name, id: translation.category });
  }

  private getMimeType(fileName: string) {
    const split = fileName.split('.');
    return '.' + split[split.length - 1];
  }

  private generateUniqueUrl = async (name: string, id: string) => {
    let replacedName = name.replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi, '').split(' ').filter(item => !!item).join('_').toLowerCase();
    let checkUnique = await CategorySchema.findOne({ url: replacedName, deleted: false, _id: { $ne: id } });
    let i = 1;
    while (checkUnique) {
      const newName = replacedName + '_' + i;
      checkUnique = await CategorySchema.findOne({ url: newName, deleted: false, _id: { $ne: id } });
      if (!checkUnique) {
        replacedName = newName;
      }
      i++;
    }
    return replacedName;
  }

}

export default new CategoryServices();