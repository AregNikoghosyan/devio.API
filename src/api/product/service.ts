import * as fs from 'fs';

import UserSchema from '../../schemas/user';
import ProductSchema from '../../schemas/product';
import ProductTranslationSchema from '../../schemas/productTranslation';
import ProductVersionSchema from '../../schemas/productVersion';
import ProductPricingSchema from '../../schemas/productPricing';
import FeaturesSchema from '../../schemas/productFeature';
import FeaturesTranslationSchema from '../../schemas/featureTranslation';
import CategorySchema, { getCategoryParentList } from '../../schemas/category';
import FileSchema, { file } from '../../schemas/file';
import OptionSchema from '../../schemas/option';
import OptionTranslationSchema from '../../schemas/optionTranslation';
import AttributeTranslationSchema from '../../schemas/attributeTranslation';
import AttributeSchema from '../../schemas/attribute';
import BrandSchema from '../../schemas/brand';
import MuTranslationSchema from '../../schemas/muTranslation';
import ProposalSchema from '../../schemas/proposal';
import PromotionSchema from '../../schemas/promotion';
import WishListSchema from '../../schemas/wishList';
import CategoryTranslationSchema from '../../schemas/categoryTranslation';

import { IResponseModel, getResponse } from '../mainModels';
import {
  ISetMainDetailsForProductBody,
  ISetImagesForProductBody,
  ISetFeaturesForProductBody,
  IGenerateVersionsBody,
  ISetVersionsForProductBody,
  IGetProductListForDashboardBody,
  IGetProductDetailsBody,
  IHideOrUnHideProductsBody,
  IDeleteProductsBody,
  IApproveProductsBody,
  IGetProductListForRequestQuery,
  IGetProductRangeOrVersionBody,
  ISetCategoriesForProductBody,
  ISetPricingForProductBody,
  IGetProductListForHomeStaff,
  IGetProductMainListBody,
  IGetProductListForCartBody,
  IGetCartListModel
} from './model';
import { ProductStatusEnum, MediaTypeEnum, LanguageEnum, UserTypeEnum, ProductTypeEnum, ProductSortByEnum, UserTariffTypeEnum, PromoCodeStatusEnum, ColorTypeEnum } from '../../constants/enums';
import { mediaPaths } from '../../constants/constants';
import mainConfig from '../../env';
import { ObjectId, ObjectID } from 'mongodb';
import { IProduct } from '../../schemas/product/model';
import { IUser } from '../../schemas/user/model';
import { IRequestDoc } from '../../schemas/request/model';
import { IProductVersion } from '../../schemas/productVersion/model';
import { isInFavorite } from '../wishList/service';
import { IProductTranslation } from '../../schemas/productTranslation/model';
import { IFile } from '../../schemas/file/model';
import { IProductFeature } from '../../schemas/productFeature/model';
import { regexpEscape } from '../mainValidation';
import partner from '../partner';

class ProductServices {

  public prepareProduct = async (id: string): Promise<IResponseModel> => {
    const product = await ProductSchema.create({ createdBy: id });
    return getResponse(true, 'Got product', product._id);
  }

  public setMainDetailsProduct = async (body: ISetMainDetailsForProductBody): Promise<IResponseModel> => {
    const product = body.product;
    const productWasVisible = checkVisibility(body.product);
    await ProductTranslationSchema.deleteMany({ product: product._id });
    product.translations = await ProductTranslationSchema.insertMany(body.translations.map((item: any) => {
      return {
        product: product._id,
        language: item.language,
        name: item.name.trim(),
        description: item.description
      };
    }));
    const oldBrand = product.brand;
    product.brand = body.brand || null;
    product.type = body.type;
    product.preparingDayCount = body.type === ProductTypeEnum.special ? body.preparingDayCount : null;
    product.isPrivate = body.isPrivate;
    product.step = body.step;
    product.minCount = body.minCount;
    product.multiplier = body.multiplier;
    product.mu = body.mu;
    product.partner = body.partner;
    const productIsVisible = checkVisibility(product);
    if (product.status === ProductStatusEnum.published) {
      const stepIsChanged = product.step !== body.step;
      const minCountIsChanged = product.minCount !== body.minCount;
      if (minCountIsChanged) {
        await ProductPricingSchema.updateMany({ product: body.product._id, fromCount: { lt: body.minCount } }, { deleted: true });
      }
      if (stepIsChanged || minCountIsChanged) {
        // await
      }
      let brandChanged = false;
      if (!oldBrand && product.brand) brandChanged = true;
      else if (oldBrand && !product.brand) brandChanged = true;
      else if (oldBrand && product.brand && oldBrand.toString() !== product.brand.toString()) brandChanged = true;
      if (productWasVisible && !productIsVisible) {
        // Was visible, is invisible
        if (brandChanged) {
          await Promise.all([
            await BrandSchema.updateOne({ _id: oldBrand }, {
              $inc: { productCount: -1, visibleProductCount: -1 }
            }),
            await BrandSchema.updateOne({ _id: product.brand }, {
              $inc: { productCount: 1 }
            })
          ]);
        } else {
          await BrandSchema.updateOne({ _id: product.brand }, {
            $inc: { visibleProductCount: -1 }
          });
        }
        await Promise.all([
          await CategorySchema.decrementVisibleCounters(product.categories),
          await PromotionSchema.productGoneInvisible(product._id),
          await ProposalSchema.productGoneInvisible(product._id),
          await WishListSchema.productGoneInvisible(product._id)
        ]);
      } else if (!productWasVisible && productIsVisible) {
        // Was invisible, is visible
        if (brandChanged) {
          await Promise.all([
            await BrandSchema.updateOne({ _id: oldBrand }, {
              $inc: { productCount: -1, visibleProductCount: -1 }
            }),
            await BrandSchema.updateOne({ _id: product.brand }, {
              $inc: { productCount: 1, visibleProductCount: 1 }
            })
          ]);
        } else {
          await BrandSchema.updateOne({ _id: product.brand }, {
            $inc: { visibleProductCount: 1 }
          });
        }
        await CategorySchema.incrementVisibleCounters(product.categories);
      } else if (productIsVisible) {
        // Was visible, is visible
        if (brandChanged) {
          await Promise.all([
            await BrandSchema.updateOne({ _id: oldBrand }, {
              $inc: { productCount: -1, visibleProductCount: -1 }
            }),
            await BrandSchema.updateOne({ _id: product.brand }, {
              $inc: { productCount: 1, visibleProductCount: 1 }
            })
          ]);
        }
      } else {
        // Was invisible, is invisible
        if (brandChanged) {
          await Promise.all([
            await BrandSchema.updateOne({ _id: oldBrand }, {
              $inc: { productCount: -1 }
            }),
            await BrandSchema.updateOne({ _id: product.brand }, {
              $inc: { productCount: 1 }
            })
          ]);
        }
      }
    }
    await product.save();
    return getResponse(true, 'Product main details set successfully');
  }
  public getMainDetailsProduct = async (body): Promise<IResponseModel> => {
    const [muTranslation, brand] = await Promise.all([
      await MuTranslationSchema.findOne({ mu: body.product.mu, language: LanguageEnum.en }),
      await BrandSchema.findById(body.product.brand)
    ]);
    body.product.muName = muTranslation ? muTranslation.name : '';
    body.product.brandName = brand ? brand.name : '';
    return getResponse(true, 'Got product main details', body.product);
  }

  public setCategoriesForProduct = async (body: ISetCategoriesForProductBody): Promise<IResponseModel> => {
    const product = body.product;
    const oldCategoryIdList = product.categories;
    let mainCategoryIds = await Promise.all(body.categories.map(async id => {
      const mainId = await CategorySchema.getMainCategory(id);
      return mainId.toString();
    }));
    mainCategoryIds = mainCategoryIds.filter(onlyUnique);
    const areSame = arraysEqual(mainCategoryIds, product.mainCategories);
    if (!areSame) {
      ProductVersionSchema.updateMany({ _id: { $in: product.versions } }, { deleted: true }).catch(e => console.log(e));
      product.versions = [];
    }
    product.mainCategories = mainCategoryIds;
    product.categories = body.categories;
    if (product.status === ProductStatusEnum.published) {
      const isVisible = checkVisibility(product);
      if (isVisible) {
        await Promise.all([
          await CategorySchema.incrementBothCounters(product.categories),
          await CategorySchema.decrementBothCounters(oldCategoryIdList)
        ]);
      } else {
        await Promise.all([
          await CategorySchema.incrementItemCounters(product.categories),
          await CategorySchema.decrementItemCounters(oldCategoryIdList)
        ]);
      }
    }
    await product.save();
    return getResponse(true, 'Categories set');
  }

  public setPricingForProduct = async (body: ISetPricingForProductBody): Promise<IResponseModel> => {
    const product = body.product;
    await ProductPricingSchema.deleteMany({ product: body.product._id, deleted: false });
    const defaultChanged = product.defaultPrice === body.price;
    if (defaultChanged) {
      // ! TODO find versions with default value(if product has versions), notify all users who have versions(or default product) in wish list or cart
    }
    product.defaultPrice = Math.round(body.price / 10) * 10;
    product.discountStartDate = body.discountStartDate || null;
    product.discountEndDate = body.discountEndDate || null;
    if (body.pricing) {
      await ProductPricingSchema.insertMany(body.pricing.map(item => {
        return {
          product: body.id,
          fromCount: item.fromCount,
          discount: item.discount || null,
          bonus: item.bonus || null,
          deleted: false
        };
      }));
    }
    await product.save();
    return getResponse(true, 'Price set');
  }
  public getPricingForProduct = async (product: IProduct): Promise<IResponseModel> => {
    const pricing = await ProductPricingSchema.find({ product: product._id, deleted: false })
      .select({
        _id: 0,
        fromCount: 1,
        bonus: 1,
        discount: 1
      }).sort({ fromCount: 1 });
    return getResponse(true, 'Got pricing', {
      price: product.defaultPrice,
      discountStartDate: product.discountStartDate,
      discountEndDate: product.discountEndDate,
      pricing
    });
  }


  public uploadImagesForProduct = async (body: { product: IProduct }, files: Array<Express.Multer.File>): Promise<IResponseModel> => {
    const product = body.product;
    const filesToInsert = this.sortAndReNameFiles(files, product._id);
    const list = [];
    await Promise.all(filesToInsert.map(async item => {
      const newFile = new FileSchema(item);
      await newFile.save();
      list.push({ _id: newFile._id, path: mainConfig.BASE_URL + newFile.path });
    }));
    return getResponse(true, 'File images set', list);
  }

  public setImagesForProduct = async (body: ISetImagesForProductBody, files: Array<Express.Multer.File>): Promise<IResponseModel> => {
    const product = body.product;
    if (body.removeIdList && body.removeIdList.length) {
      await FileSchema.deleteFile(body.removeIdList);
      for (let i = 0; i < body.removeIdList.length; i++) {
        const index = product.images.indexOf(new ObjectId(body.removeIdList[i]));
        if (index > -1) product.images.splice(index, 1);
      }
    }
    const filesToInsert = this.sortAndReNameFiles(files, product._id);
    await Promise.all(filesToInsert.map(async item => {
      const newFile = new FileSchema(item);
      product.images.push(newFile._id);
      await newFile.save();
    }));
    await product.save();
    return getResponse(true, 'File images set');
  }

  public setImagesForProductV2 = async (body: { product: IProduct, idList: string[] }): Promise<IResponseModel> => {
    const product = body.product;
    product.images = body.idList;
    const notIncluded = await FileSchema.find({ product: product._id, _id: { $nin: body.idList } }).distinct('_id');
    await Promise.all([
      await product.save(),
      await FileSchema.updateMany({ _id: { $in: body.idList } }, { setProductImage: true }),
      await FileSchema.deleteFile(notIncluded),
      await ProductVersionSchema.updateMany({ product: product._id, photo: { $in: notIncluded } }, { photo: null })
    ]);
    return getResponse(true, 'Set');
  }

  public getImagesForProduct = async (product: IProduct): Promise<IResponseModel> => {
    const idList: any = product.images;
    const files = await FileSchema.getProductImages(idList);
    const sortedFiles = idList.map(item => {
      return files.find(fItem => fItem._id.toString() === item.toString());
    });
    return getResponse(true, 'Got images', sortedFiles);
  }

  public generateVersions = async (body: IGenerateVersionsBody): Promise<IResponseModel> => {
    const product = body.product;
    const attributes = product.attributes.map(item => item.toString());
    const areSame = arraysEqual(attributes, body.attributes);
    const defaultVersion = {
      product: body.product._id,
      attributes: [],
      photo: null,
      price: body.product.defaultPrice,
      hidden: false
    };
    if (areSame) {
      let optionsAreSame = true;
      await Promise.all(body.attributes.map(async attributeId => {
        const [allOptions, optionsByVersions] = await Promise.all([
          await OptionSchema.find({ deleted: false, attribute: attributeId }).distinct('_id'),
          await ProductVersionSchema.getOptionsByAttribute(attributeId, product._id)
        ]);
        const allOptionIds = allOptions.map(item => item.toString());
        const optionValuesAreSame = arraysEqual(allOptionIds, optionsByVersions);
        if (!optionValuesAreSame) optionsAreSame = false;
      }));
      if (optionsAreSame) {
        const versionList = await ProductVersionSchema.getListForAdmin({ _id: { $in: product.versions } });
        return getResponse(true, 'Generated successfully', versionList);
      } else {
        const [olVersionList, newVersionList] = await Promise.all([
          await ProductVersionSchema.getListForAdmin({ _id: { $in: product.versions } }),
          await this.generateVersionsForProduct(defaultVersion, body.attributes),
        ]);
        if (olVersionList.length < newVersionList.length) {
          for (let i = 0; i < newVersionList.length; i++) {
            let isNew = true;
            for (let j = 0; j < olVersionList.length; j++) {
              // if found, set true, break
              const attributeSetsAreSame = this.attributeSetsAreSame(newVersionList[i].attributes, olVersionList[j].attributes);
              if (attributeSetsAreSame) {
                isNew = false;
                break;
              }
            }
            if (isNew) olVersionList.push({ _id: '', ...newVersionList[i] });
          }
        }
        return getResponse(true, 'Generated successfully', olVersionList);
      }
    }
    const versionList = await this.generateVersionsForProduct(defaultVersion, body.attributes);
    return getResponse(true, 'Generated successfully', versionList);
  }

  public setVersionsForProduct = async (body: ISetVersionsForProductBody): Promise<IResponseModel> => {
    const product = body.product;
    const wasVisible = checkVisibility(product);
    let message;
    if (body.versions) {
      body.versions.forEach(item => {
        item.price = Math.round(item.price / 10) * 10;
      });
    }
    if (body.attributes && body.versions) {
      product.attributes = body.staticAttributes;
      if (body.areSame) {
        await Promise.all(body.versions.map(async newVersion => {
          if (newVersion._id) {
            const oldVersion = await ProductVersionSchema.findById(newVersion._id);
            if (oldVersion) {
              oldVersion.photo = newVersion.photo || null;
              let price = newVersion.price;
              const residual = price % 10;
              if (residual && residual >= 5) {
                price += (10 - residual);
              } else if (residual) {
                price -= residual;
              }
              oldVersion.price = price;
              oldVersion.hasDefaultPrice = price === product.defaultPrice;
              oldVersion.hidden = newVersion.hidden;
              await oldVersion.save();
            }
          } else {
            let price = newVersion.price;
            const residual = price % 10;
            if (residual && residual >= 5) {
              price += (10 - residual);
            } else if (residual) {
              price -= residual;
            }
            const settingVersion = await ProductVersionSchema.create({
              product: product._id,
              photo: newVersion.photo || null,
              price,
              hasDefaultPrice: newVersion.price === product.defaultPrice,
              hidden: newVersion.hidden,
              attributes: newVersion.attributes
            });
            product.versions.push(settingVersion._id);
          }
        }));
        let hiddenCount = 0;
        for (let i = 0; i < body.versions.length; i++) {
          if (body.versions[i].hidden) hiddenCount++;
        }
        product.versionsHidden = hiddenCount === body.versions.length;
        await product.save();
        message = 'Old versions updated';
      } else {
        await Promise.all([
          await ProductVersionSchema.updateMany({ _id: { $in: product.versions } }, { deleted: true }),
          await WishListSchema.productGoneInvisible(product._id)
        ]);
        product.versions = [];
        product.attributes = [];
        if (body.attributes) {
          product.attributes = body.staticAttributes;
          product.versions = await ProductVersionSchema.insertMany(body.versions.map(item => {
            const returnObj: any = {
              product: item.product,
              photo: item.photo || null,
              price: item.price,
              hasDefaultPrice: item.price === product.defaultPrice,
              hidden: item.hidden,
              attributes: item.attributes
            };
            return returnObj;
          }));
        }
        let hiddenCount = 0;
        for (let i = 0; i < body.versions.length; i++) {
          if (body.versions[i].hidden) hiddenCount++;
        }
        product.versionsHidden = hiddenCount === body.versions.length;
        await product.save();
        message = 'New versions set';
      }
    } else {
      await Promise.all([
        await ProductVersionSchema.updateMany({ _id: { $in: product.versions } }, { deleted: true }),
        await WishListSchema.productGoneInvisible(product._id)
      ]);
      product.versions = [];
      product.attributes = [];
      product.versionsHidden = false;
      await product.save();
      message = 'New versions set';
    }
    if (product.status === ProductStatusEnum.published) {
      const isVisible = checkVisibility(product);
      if (wasVisible && !isVisible) {
        // Was visible, is invisible
        await Promise.all([
          await BrandSchema.updateOne({ _id: product.brand }, { $inc: { visibleProductCount: -1 } }),
          await CategorySchema.decrementVisibleCounters(product.categories),
          await PromotionSchema.productGoneInvisible(product._id),
          await ProposalSchema.productGoneInvisible(product._id),
          await WishListSchema.productGoneInvisible(product._id)
        ]);
      } else if (!wasVisible && isVisible) {
        // Was invisible, is visible
        await Promise.all([
          await BrandSchema.updateOne({ _id: product.brand }, { $inc: { visibleProductCount: +1 } }),
          await CategorySchema.incrementVisibleCounters(product.categories)
        ]);
      }
    }
    return getResponse(true, message);
  }
  public getVersionsForProduct = async (product: IProduct): Promise<IResponseModel> => {
    const [versions, attributes] = await Promise.all([
      await ProductVersionSchema.getListForAdmin({ _id: { $in: product.versions } }),
      await AttributeSchema.getShortList({ _id: { $in: product.attributes } })
    ]);
    for (let i = 0; i < versions.length; i++) {
      for (let j = 0; j < versions[i].attributes.length; j++) {
        const translation = await OptionTranslationSchema.findOne({ option: versions[i].attributes[j].option, language: LanguageEnum.en });
        versions[i].attributes[j].optionName = translation ? translation.name : '';
      }
    }
    const staticAttributes = product.attributes.map(item => {
      return attributes.find(fItem => fItem._id.toString() === item.toString());
    });
    return getResponse(true, 'Got options', { versions, attributes: staticAttributes });
  }

  public setFeaturesForProduct = async (body: ISetFeaturesForProductBody, role: number): Promise<IResponseModel> => {
    await Promise.all([
      await FeaturesSchema.deleteMany({ product: body.product._id }),
      await FeaturesTranslationSchema.deleteMany({ feature: { $in: body.product.features } })
    ]);
    const featureIdList = [];
    if (body.features && body.features.length) {
      await Promise.all(body.features.map(async item => {
        const newFeature = new FeaturesSchema();
        const translationsToInsert = item.translations.map(translation => {
          return {
            feature: newFeature._id,
            language: translation.language,
            name: translation.title.trim(),
            value: translation.description
          };
        });
        newFeature.translations = await FeaturesTranslationSchema.insertMany(translationsToInsert);
        featureIdList.push(newFeature._id);
        await newFeature.save();
      }));
    }
    body.product.features = featureIdList;
    if (body.product.status === ProductStatusEnum.preparing) {
      const isFinished = this.productPreparingIsFinished(body.product);
      if (isFinished) {
        const adder = await UserSchema.findById(body.product.createdBy);
        if (adder) {
          if (adder.role !== UserTypeEnum.partner) {
            body.product.status = ProductStatusEnum.published;
            const isVisible = checkVisibility(body.product);
            if (isVisible) {
              await Promise.all([
                await BrandSchema.updateOne({ _id: body.product.brand }, { $inc: { productCount: 1, visibleProductCount: 1 } }),
                await CategorySchema.incrementBothCounters(body.product.categories)
              ]);
            } else {
              await Promise.all([
                await BrandSchema.updateOne({ _id: body.product.brand }, { $inc: { productCount: 1 } }),
                await CategorySchema.incrementItemCounters(body.product.categories)
              ]);
            }
          } else {
            body.product.status = ProductStatusEnum.unapproved;
          }
        }
      }
    }
    await body.product.save();
    return getResponse(true, 'Features set');
  }
  public getFeaturesForProduct = async (product: IProduct): Promise<IResponseModel> => {
    const features = await FeaturesSchema.find({ _id: { $in: product.features } }).select({
      _id: 1,
      translations: 1
    }).populate({
      path: 'translations',
      select: {
        _id: 0,
        language: 1,
        name: 1,
        value: 1
      }
    });
    return getResponse(true, 'Got features', features);
  }

  public getListForDashboard = async (user: IUser, body: IGetProductListForDashboardBody): Promise<IResponseModel> => {
    // await CategorySchema.updateMany({}, {
    //   itemCount: 0,
    //   itemCountInSub: 0,
    //   visibleItemCount: 0,
    //   visibleItemCountInSub: 0
    // });
    // const products = await ProductSchema.find({
    //   status: { $in: [ ProductStatusEnum.published, ProductStatusEnum.hidden ] },
    //   deleted: false
    // });
    // await Promise.all(products.map(async item => {
    //   const isVisible = checkVisibility(item);
    //   if (isVisible) {
    //     await CategorySchema.incrementBothCounters(item.categories);
    //   } else {
    //     await CategorySchema.incrementItemCounters(item.categories);
    //   }
    // }));
    const filter: any = { deleted: false, status: { $ne: ProductStatusEnum.preparing } };
    // if (user.role === UserTypeEnum.partner) {
    //   filter.createdBy = user._id;
    // }
    if (body.search) {
      const key = regexpEscape(body.search);
      const idList = await ProductTranslationSchema.find({ name: new RegExp(key, 'i') }).distinct('product');
      filter._id = { $in: idList };
    }
    if (body.category) filter.mainCategories = new ObjectID(body.category);
    if (body.subCategory) {
      const subIdList = await CategorySchema.getSubIdList(body.subCategory);
      filter.categories = { $in: subIdList.map(item => new ObjectID(item)) };
    }
    if (body.status) filter.status = body.status;
    if (body.priceFrom) {
      filter.defaultPrice = { $gte: +body.priceFrom };
    }
    if (body.priceTo) {
      if (body.priceFrom) filter.defaultPrice.$lte = +body.priceTo;
      else filter.defaultPrice = { $lte: +body.priceTo };
    }
    if (body.dateFrom) {
      filter.createdDt = { $gte: new Date(body.dateFrom) };
    }
    if (body.dateTo) {
      if (filter.createdDt) filter.createdDt.$lte = new Date(body.dateTo);
      else filter.createdDt = { $lte: new Date(body.dateTo) };
    }
    if (body.partner) {
      filter.partner = body.partner;
    }
    const itemCount = await ProductSchema.countDocuments(filter);
    if (itemCount === 0) return getResponse(true, 'Got product list', { itemList: [], itemCount, pageCount: 0 });
    const pageCount = Math.ceil(itemCount / body.limit);
    if (body.pageNo > pageCount) return getResponse(false, 'PageNo must be less or equal than ' + pageCount);
    const skip = (body.pageNo - 1) * body.limit;
    const itemList = await ProductSchema.getListForDashboard(filter, body.language, skip, body.limit);
    return getResponse(true, 'Got brand list', { itemList, itemCount, pageCount });
  }

  public getProductDetails = async (body: IGetProductDetailsBody, user: IUser): Promise<IResponseModel> => {
    let details;
    if (body.product.versions.length) {
      const attributeOptions = await ProductVersionSchema.getDefaultAvailableAttributes(body.product._id);
      const [detailsObj, features, attributes] = await Promise.all([
        await ProductSchema.getProductDetailsByDefault(body.product._id, body.language, true),
        await FeaturesSchema.getTranslatedList(body.product.features, body.language),
        await AttributeSchema.getMap(attributeOptions.attributes, attributeOptions.options, body.language),
      ]);
      details = { ...detailsObj, ...this.getPriceRange(detailsObj.minPrice, detailsObj.maxPrice, detailsObj.discounted, detailsObj.currentPricing) };
      details.features = features;
      details.attributes = attributes;
      details.pricing.forEach(item => {
        if (!details.discounted) item.discount = null;
      });
      details.pricing = details.pricing.filter(item => item.discount || item.bonus);
      details.priceAmounts = details.pricing.map(item => {
        return {
          fromCount: item.fromCount,
          bonus: item.bonus || null,
          maxBonusAmount: item.bonus ? Math.round((details.maxPrice * item.bonus) / 100) : null,
          minBonusAmount: item.bonus ? Math.round((details.minPrice * item.bonus) / 100) : null,
          discount: item.discount ? item.discount : null,
          minDiscountedPrice: item.discount ? getDiscountedPrice(details.minPrice, item.discount) : null,
          maxDiscountedPrice: item.discount ? getDiscountedPrice(details.maxPrice, item.discount) : null,
        };
      });
      delete details.price;
      delete details.currentPricing;
      delete details.discounted;
    } else {
      const [detailsObj, features] = await Promise.all([
        await ProductSchema.getProductDetailsByDefault(body.product._id, body.language, false),
        await FeaturesSchema.getTranslatedList(body.product.features, body.language)
      ]);
      details = detailsObj;
      details.pricing.forEach(item => {
        if (!details.discounted) item.discount = null;
      });
      details.pricing = details.pricing.filter(item => item.discount || item.bonus);
      details.priceAmounts = details.pricing.map(item => {
        return {
          fromCount: item.fromCount,
          bonus: item.bonus,
          discount: item.discount || null,
          bonusAmount: item.bonus ? Math.round((details.price * item.bonus) / 100) : null,
          discountedPrice: item.discount ? getDiscountedPrice(details.price, item.discount) : null,
        };
      });
      delete details.currentPricing;
      delete details.discounted;
      if (user) {
        details.isFavorite = await isInFavorite(user._id, body.product._id);
      }
      details.features = features;
    }
    const sortedAttributes = {};
    if (details.attributes) {
      body.product.attributes.forEach((attributeId, index) => {
        const id = attributeId.toString();
        sortedAttributes[id] = details.attributes[id];
        sortedAttributes[id].position = index;
        sortedAttributes[id].id = id;
      });
      details.attributes = sortedAttributes;
    }
    const sortedImages = body.product.images.map(item => {
      return details.images.find(fItem => fItem._id.toString() === item.toString());
    });
    details.images = sortedImages;
    ProductSchema.updateOne({ _id: body.product._id }, { $inc: { seenCount: 1 } }).catch(e => console.log(e));
    return getResponse(true, 'Got details', details);
  }

  public getProductRange = async (body: IGetProductRangeOrVersionBody): Promise<IResponseModel> => {
    if (body.chosen.length === 1) {
      const attributeId = body.chosen[0].attribute;
      const [attributeOptions, versionList] = await Promise.all([
        await ProductVersionSchema.getDefaultAvailableAttributes(body.product._id),
        await ProductVersionSchema.find({
          product: body.id,
          deleted: false,
          hidden: false,
          attributes: {
            $elemMatch: {
              attribute: body.chosen[0].attribute,
              option: body.chosen[0].option
            }
          }
        })
      ]);
      if (versionList.length === 0) return getResponse(false, 'Wong attribute and option set');
      let photo;
      for (let i = 0; i < versionList.length; i++) {
        if (versionList[i].photo) {
          photo = versionList[i].photo;
          break;
        }
      }
      const { versionIdList, attributeObj } = this.getAttributeObj(versionList);
      const [defaultAttributeMap, chosenAttributeMap, versionPriceRanges, productPricing] = await Promise.all([
        await AttributeSchema.getMap(attributeOptions.attributes, attributeOptions.options, body.language),
        await AttributeSchema.getMap(attributeObj.attributes, attributeObj.options, body.language),
        await ProductVersionSchema.getPriceRange({ _id: { $in: versionIdList } }),
        await ProductSchema.getPricing(body.product._id)
      ]);
      delete versionPriceRanges._id;
      chosenAttributeMap[attributeId] = defaultAttributeMap[attributeId];
      let details: any = { attributes: chosenAttributeMap, ...versionPriceRanges };
      productPricing.pricing.forEach(item => {
        if (!productPricing.discounted) item.discount = null;
      });
      const currentPricing = productPricing.pricing.find(item => item.fromCount === productPricing.minCount);
      details = { ...details, ...this.getPriceRange(details.minPrice, details.maxPrice, productPricing.discounted, currentPricing) };
      details.priceAmounts = productPricing.pricing.map(item => {
        return {
          fromCount: item.fromCount,
          bonus: item.bonus || null,
          maxBonusAmount: item.bonus ? Math.round((details.maxPrice * item.bonus) / 100) : null,
          minBonusAmount: item.bonus ? Math.round((details.minPrice * item.bonus) / 100) : null,
          discount: item.discount ? item.discount : null,
          minDiscountedPrice: item.discount ? getDiscountedPrice(details.minPrice, item.discount) : null,
          maxDiscountedPrice: item.discount ? getDiscountedPrice(details.maxPrice, item.discount) : null,
        };
      });
      details.photo = photo;
      delete details.discounted;
      const sortedAttributes = {};
      let replace = false;
      body.product.attributes.forEach((attributeId, index) => {
        const id = attributeId.toString();
        sortedAttributes[id] = details.attributes[id];
        sortedAttributes[id].position = index;
        sortedAttributes[id].id = id;
        replace = true;
      });
      if (replace) details.attributes = sortedAttributes;
      return getResponse(true, 'Got range', details);
    } else {
      const choseAttributeIdList = body.chosen.map(item => item.attribute);
      const versionDetails = await this.getAttributeMaps(body.chosen, body.product._id, body.language, true);
      if (!versionDetails) return getResponse(false, 'Wrong attribute / option set');
      const chosenMap = versionDetails.attributeMap;
      const versionIdList = versionDetails.versionIdList;
      choseAttributeIdList.forEach(id => {
        delete chosenMap[id];
      });
      const subChosenList = this.getAttributeSubLists(body.chosen);
      await Promise.all(subChosenList.map(async item => {
        const subChosenMap = await this.getAttributeMaps(item.chosen, body.product._id, body.language, false);
        chosenMap[item.attribute] = subChosenMap[item.attribute];
      }));
      const [versionList, versionPriceRanges, productPricing] = await Promise.all([
        await ProductVersionSchema.find({ _id: { $in: versionIdList } }),
        await ProductVersionSchema.getPriceRange({ _id: { $in: versionIdList } }),
        await ProductSchema.getPricing(body.product._id)
      ]);
      let photo;
      for (let i = 0; i < versionList.length; i++) {
        if (versionList[i].photo) {
          photo = versionList[i].photo;
          break;
        }
      }
      delete versionPriceRanges._id;
      let details: any = { attributes: chosenMap, ...versionPriceRanges };
      productPricing.pricing.forEach(item => {
        if (!productPricing.discounted) item.discount = null;
      });
      const currentPricing = productPricing.pricing.find(item => item.fromCount === productPricing.minCount);
      details = { ...details, ...this.getPriceRange(details.minPrice, details.maxPrice, productPricing.discounted, currentPricing) };
      details.priceAmounts = productPricing.pricing.map(item => {
        return {
          fromCount: item.fromCount,
          bonus: item.bonus || null,
          maxBonusAmount: item.bonus ? Math.round((details.maxPrice * item.bonus) / 100) : null,
          minBonusAmount: item.bonus ? Math.round((details.minPrice * item.bonus) / 100) : null,
          discount: item.discount ? item.discount : null,
          minDiscountedPrice: item.discount ? getDiscountedPrice(details.minPrice, item.discount) : null,
          maxDiscountedPrice: item.discount ? getDiscountedPrice(details.maxPrice, item.discount) : null,
        };
      });
      delete details.discounted;
      details.photo = photo;
      const sortedAttributes = {};
      let replace = false;
      body.product.attributes.forEach((attributeId, index) => {
        const id = attributeId.toString();
        sortedAttributes[id] = details.attributes[id];
        sortedAttributes[id].position = index;
        sortedAttributes[id].id = id;
        replace = true;
      });
      if (replace) details.attributes = sortedAttributes;
      return getResponse(true, 'Got range', details);
    }
  }

  public getProductVersion = async (body: IGetProductRangeOrVersionBody, user: IUser = null): Promise<IResponseModel> => {
    const versionDetails = await this.getAttributeMaps(body.chosen, body.product._id, body.language, true);
    if (!versionDetails) return getResponse(false, 'Wrong attribute / option set');
    const versionId = versionDetails.versionIdList[0];
    let chosenMap = {};
    const subChosenList = this.getAttributeSubLists(body.chosen);
    await Promise.all(subChosenList.map(async item => {
      const subChosenMap = await this.getAttributeMaps(item.chosen, body.product._id, body.language, false);
      chosenMap[item.attribute] = subChosenMap[item.attribute];
    }));
    const [version, pricing] = await Promise.all([
      await ProductVersionSchema.findOne({ _id: versionId }).select({ _id: 1, photo: 1, price: 1 }).lean(),
      await ProductSchema.getPricing(body.product._id)
    ]);
    version.priceAmounts = pricing.pricing.map(item => {
      return {
        fromCount: item.fromCount,
        bonus: item.bonus || null,
        bonusAmount: item.bonus ? Math.round((version.price * item.bonus) / 100) : null,
        discount: pricing.discounted && item.discount ? item.discount : null,
        discountedPrice: pricing.discounted && item.discount ? getDiscountedPrice(version.price, item.discount) : null,
      };
    });
    if (user) {
      version.isFavorite = await isInFavorite(user._id, body.product._id, version._id);
    }
    const sortedAttributes = {};
    let replace = false;
    body.product.attributes.forEach((attributeId, index) => {
      const id = attributeId.toString();
      sortedAttributes[id] = chosenMap[id];
      sortedAttributes[id].position = index;
      sortedAttributes[id].id = id;
      replace = true;
    });
    if (replace) chosenMap = sortedAttributes;
    return getResponse(true, 'ok', { version, attributes: chosenMap });
  }

  public hideOrUnHideProducts = async (body: IHideOrUnHideProductsBody): Promise<IResponseModel> => {
    if (body.action === 1) { // hiding
      const newFilter = { ...body.filter, status: ProductStatusEnum.published };
      const [products] = await Promise.all([
        await ProductSchema.find(newFilter),
        await ProductSchema.updateMany(newFilter, { status: ProductStatusEnum.hidden })
      ]);
      // Check visibility, may be with status published, but not visible
      await Promise.all(products.map(async item => {
        const wasVisible = checkVisibility(item);
        if (wasVisible) {
          await Promise.all([
            await CategorySchema.decrementVisibleCounters(item.categories),
            await BrandSchema.updateOne({ _id: item.brand }, { $inc: { visibleProductCount: -1 } }),
            await PromotionSchema.productGoneInvisible(item._id),
            await ProposalSchema.productGoneInvisible(item._id)
          ]);
        }
      }));
    } else {
      const newFilter = { ...body.filter, status: ProductStatusEnum.hidden };
      const [products] = await Promise.all([
        await ProductSchema.find(newFilter),
        await ProductSchema.updateMany(newFilter, { status: ProductStatusEnum.published })
      ]);
      await Promise.all(products.map(async item => {
        item.status = ProductStatusEnum.published;
        const isVisible = checkVisibility(item);
        if (isVisible) {
          await Promise.all([
            await CategorySchema.incrementVisibleCounters(item.categories),
            await BrandSchema.updateOne({ _id: item.brand }, { $inc: { visibleProductCount: 1 } })
          ]);
        }
      }));
      // Add here promotion change
    }
    return getResponse(true, 'ok');
  }

  public deleteProducts = async (body: IDeleteProductsBody): Promise<IResponseModel> => {
    const [products] = await Promise.all([
      await ProductSchema.find(body.filter),
      await ProductSchema.updateMany(body.filter, { deleted: true })
    ]);
    await Promise.all(products.map(async item => {
      if (item.status === ProductStatusEnum.published) {
        const wasVisible = checkVisibility(item);
        if (wasVisible) {
          await Promise.all([
            await CategorySchema.decrementBothCounters(item.categories),
            await BrandSchema.updateOne({ _id: item.brand }, { $inc: { productCount: -1, visibleProductCount: -1 } }),
            await WishListSchema.productGoneInvisible(item._id)
          ]);
        } else {
          await Promise.all([
            await CategorySchema.decrementItemCounters(item.categories),
            await BrandSchema.updateOne({ _id: item.brand }, { $inc: { productCount: -1 } })
          ]);
        }
      }
      const [proposals] = await Promise.all([
        await ProposalSchema.find({ products: item }),
        await PromotionSchema.deleteMany({ product: item })
      ]);
      await Promise.all(proposals.map(async proposal => {
        const length = proposal.products.length;
        if (length === 1) {
          proposal.products = [];
          proposal.shown = false;
        } else {
          const productIdList = proposal.products.map(item => item.toString());
          productIdList.splice(productIdList.indexOf(item.toString()), 1);
          proposal.products = productIdList;
        }
        await proposal.save();
      }));
    }));
    return getResponse(true, 'Products deleted');
  }

  public approveProducts = async (body: IApproveProductsBody): Promise<IResponseModel> => {
    const [products] = await Promise.all([
      await ProductSchema.find(body.filter),
      await ProductSchema.updateMany(body.filter, { status: ProductStatusEnum.published })
    ]);
    Promise.all(products.map(async item => {
      await Promise.all([
        await CategorySchema.incrementItemCounters(item.categories),
        await BrandSchema.updateOne({ _id: item.brand }, { $inc: { productCount: 1 } })
      ]);
    })).catch(e => console.log(e));
    return getResponse(true, 'Products approved');
  }

  public copyProduct = async (product: IProduct<string, IProductTranslation, IFile, string, IProductVersion, string, IProductFeature, string, string>, userId: string): Promise<IResponseModel> => {
    const copyProduct = new ProductSchema({ createdBy: userId, status: ProductStatusEnum.preparing });
    copyProduct.type = product.type;
    copyProduct.preparingDayCount = product.preparingDayCount;
    copyProduct.versionsHidden = product.versionsHidden;
    copyProduct.mu = product.mu;
    copyProduct.minCount = product.minCount;
    copyProduct.step = product.step;
    copyProduct.availableCount = product.availableCount;
    copyProduct.multiplier = product.multiplier;
    copyProduct.defaultPrice = product.defaultPrice;
    copyProduct.discountStartDate = product.discountStartDate;
    copyProduct.discountEndDate = product.discountEndDate;
    copyProduct.attributes = product.attributes;
    copyProduct.categories = product.categories;
    copyProduct.mainCategories = product.mainCategories;
    copyProduct.brand = product.brand;
    copyProduct.isPrivate = product.isPrivate;
    copyProduct.translations = await ProductTranslationSchema.insertMany(product.translations.map(item => {
      return {
        product: copyProduct._id,
        language: item.language,
        name: item.name,
        description: item.description
      };
    }));
    if (product.features.length) {
      await Promise.all(product.features.map(async item => {
        const newFeature = new FeaturesSchema({
          product: copyProduct._id
        });
        const oldTranslations = await FeaturesTranslationSchema.find({ feature: item._id });
        newFeature.translations = await FeaturesTranslationSchema.insertMany(oldTranslations.map(item => {
          return {
            feature: newFeature._id,
            language: item.language,
            name: item.name,
            value: item.value
          };
        }));
        await newFeature.save();
        copyProduct.features.push(newFeature._id);
      }));
    }
    const [imageList, pricingList] = await Promise.all([
      await this.copyProductImages(product.images, copyProduct._id),
      await ProductPricingSchema.find({ product: product._id, deleted: false })
    ]);
    copyProduct.images = imageList.map(item => item.newId);
    await Promise.all(product.versions.map(async item => {
      const newVersion = new ProductVersionSchema({
        product: copyProduct._id,
        attributes: item.attributes,
        price: item.price,
        hasDefaultPrice: item.hasDefaultPrice,
        boughtCount: item.boughtCount,
        hidden: item.hidden
      });
      if (item.photo) {
        const oldImage = imageList.find(fItem => fItem.oldId.toString() === item.photo.toString());
        if (oldImage) newVersion.photo = oldImage.newId;
      }
      await newVersion.save();
      copyProduct.versions.push(newVersion._id);
    }));
    await Promise.all([
      await copyProduct.save(),
      await ProductPricingSchema.insertMany(pricingList.map(item => {
        return {
          product: copyProduct._id,
          fromCount: item.fromCount,
          discount: item.discount,
          bonus: item.bonus,
        };
      }))
    ]);
    return getResponse(true, 'Got copy', copyProduct._id);
  }

  public getForRequest = async (query: IGetProductListForRequestQuery, request: IRequestDoc): Promise<IResponseModel> => {
    const existsIdList = request.products;
    const filter: any = {
      _id: { $nin: existsIdList },
      status: ProductStatusEnum.published,
      versionsHidden: false,
      deleted: false
    };
    if (query.search) {
      const key = regexpEscape(query.search);
      if (key) {
        const idList = await ProductTranslationSchema.find({ name: new RegExp(key, 'i') }).distinct('product');
        if (filter._id.$nin.length) {
          delete filter._id;
          filter.$and = [
            { _id: { $nin: existsIdList } },
            { _id: { $in: idList } },
          ];
        } else {
          filter._id = { $in: idList };
        }
      }
    }
    const itemCount = await ProductSchema.countDocuments(filter);
    if (itemCount === 0) return getResponse(true, 'Got product list', { itemList: [], pagesLeft: false });
    const pageCount = Math.ceil(itemCount / +query.limit);
    if (+query.pageNo > pageCount) return getResponse(false, 'PageNo must be less or equal than ' + pageCount);
    const skip = (+query.pageNo - 1) * +query.limit;
    const itemList = await ProductSchema.getShortList(filter, skip, +query.limit, LanguageEnum.en);
    return getResponse(true, 'Got product list', { itemList, pagesLeft: +query.pageNo !== pageCount });
  }

  public getForHomeStaff = async (query: IGetProductListForHomeStaff): Promise<IResponseModel> => {
    const filter: any = {
      status: ProductStatusEnum.published,
      versionsHidden: false,
      deleted: false
    };
    if (query.search) {
      const key = regexpEscape(query.search);
      const idList = await ProductTranslationSchema.find({ name: new RegExp(key, 'i') }).distinct('product');
      filter._id = { $in: idList };
    }
    const itemCount = await ProductSchema.countDocuments(filter);
    if (itemCount === 0) return getResponse(true, 'Got product list', { itemList: [], pagesLeft: false });
    const pageCount = Math.ceil(itemCount / +query.limit);
    if (+query.pageNo > pageCount) return getResponse(false, 'PageNo must be less or equal than ' + pageCount);
    const skip = (+query.pageNo - 1) * +query.limit;
    const itemList = await ProductSchema.getShortList(filter, skip, +query.limit, LanguageEnum.en);
    return getResponse(true, 'Got product list', { itemList, pagesLeft: +query.pageNo !== pageCount });
  }

  public getMainList = async (body: IGetProductMainListBody): Promise<IResponseModel> => {
    let categoryParentTree = [];
    if (body.category) {
      const list = await getCategoryParentList(body.category._id);
      const categoryParentList = [];
      for (let i = list.length - 1; i > -1; i--) {
        categoryParentList.push(list[i]);
      }
      categoryParentList.push(body.category._id);
      categoryParentTree = await Promise.all(categoryParentList.map(async item => {
        const categoryTranslation = await CategoryTranslationSchema.findOne({ category: item, language: body.language });
        return {
          _id: item,
          name: categoryTranslation.name
        };
      }));
    }
    const filter: any = {
      deleted: false,
      status: ProductStatusEnum.published,
      versionsHidden: false,
      isPrivate: false,
      categories: { $exists: true, $not: { $size: 0 } }
    };
    if (body.brandIdList && body.brandIdList.length) {
      filter.brand = { $in: body.brandIdList.map(item => new ObjectID(item)) };
    }
    if (body.category) {
      if (!body.category.pid) {
        filter.mainCategories = body.category._id;
      } else if (body.category.itemCount > 0) {
        filter.categories = body.category._id;
      } else {
        const idList = await CategorySchema.getSubIdList(body.category._id);
        filter.categories = { $in: idList };
      }
    }
    if (body.proposal) {
      filter._id = { $in: body.proposal.products };
    }
    if (body.search) {
      const key = regexpEscape(body.search);
      const keys = key.split(' ');
      const idList = [];
      if (filter._id) {
        idList.push([...filter._id]);
        delete filter._id;
      }
      await Promise.all(keys.map(async key => {
        const [idListFromTranslation, idListFromOptions] = await Promise.all([
          await ProductTranslationSchema.find({ name: new RegExp(key, 'i') }).distinct('product'),
          await ProductSchema.getIdListByOptionName(key)
        ]);
        idList.push([...idListFromTranslation.map(item => item.toString()), ...idListFromOptions.map(item => item.toString())]);
      }));
      const intersection = getIntersection(idList);
      if (intersection) filter._id = { $in: intersection.map(item => new ObjectID(item)) };
    }
    const sort: any = {};
    switch (body.sort) {
      case ProductSortByEnum.bestSelling: {
        sort.boughtCount = -1;
        sort.createdDt = -1;
        break;
      }
      case ProductSortByEnum.priceLowToHigh: {
        sort.minPrice = 1;
        sort.createdDt = -1;
        break;
      }
      case ProductSortByEnum.priceHighToLow: {
        sort.minPrice = -1;
        sort.createdDt = -1;
        break;
      }
      case ProductSortByEnum.discountLowToHigh: {
        sort.maxDiscount = 1;
        sort.createdDt = -1;
        break;
      }
      case ProductSortByEnum.discountHighToLow: {
        sort.maxDiscount = -1;
        sort.createdDt = -1;
        break;
      }
      default: {
        sort.minPrice = 1;
        sort.createdDt = -1;
        break;
      }
    }
    let secondFilter: any = {};
    if (body.priceFrom) {
      secondFilter.priceFrom = body.priceFrom;
    }
    if (body.priceTo) {
      secondFilter.priceTo = body.priceTo;
    }
    if (body.withSale) {
      secondFilter.maxDiscount = { $gt: 0 };
    }
    if (body.withBonus) {
      secondFilter.minBonus = { $gt: 0 };
    }
    if (!body.withSale && !body.withBonus && !body.priceFrom && !body.priceTo) {
      secondFilter = null;
    }
    const range = await ProductSchema.getMainListRange(filter, secondFilter);
    const itemCount = await ProductSchema.countMainList(filter, body.language, secondFilter);
    if (itemCount === 0) return getResponse(true, 'Got product list', { itemList: [], pagesLeft: false, itemCount: 0, range });
    const pageCount = Math.ceil(itemCount / body.limit);
    if (body.pageNo > pageCount) return getResponse(false, 'PageNo must be less or equal than ' + pageCount);
    const skip = (body.pageNo - 1) * body.limit;
    const itemList = await ProductSchema.getMainListByFilter(filter, body.language, sort, secondFilter, skip, body.limit);
    return getResponse(true, 'Got product list', { itemList, pagesLeft: body.pageNo !== pageCount, itemCount, range, categoryParentTree });
  }

  public getMainListCount = async (body: IGetProductMainListBody): Promise<IResponseModel> => {
    const filter: any = {
      deleted: false,
      status: ProductStatusEnum.published,
      versionsHidden: false,
      isPrivate: false,
      categories: { $exists: true, $not: { $size: 0 } }
    };
    if (body.brandIdList && body.brandIdList.length) {
      filter.brand = { $in: body.brandIdList.map(item => new ObjectID(item)) };
    }
    if (body.category) {
      if (body.category.itemCount > 0) {
        filter.categories = body.category._id;
      } else {
        const idList = await CategorySchema.getSubIdList(body.category._id);
        filter.categories = { $in: idList };
      }
    }
    if (body.proposal) {
      filter._id = { $in: body.proposal.products };
    }
    if (body.search) {
      const key = regexpEscape(body.search);
      const keys = key.split(' ');
      const idList = [];
      if (filter._id) {
        idList.push([...filter._id]);
        delete filter._id;
      }
      await Promise.all(keys.map(async key => {
        const [idListFromTranslation, idListFromOptions] = await Promise.all([
          await ProductTranslationSchema.find({ name: new RegExp(key, 'i') }).distinct('product'),
          await ProductSchema.getIdListByOptionName(key)
        ]);
        idList.push([...idListFromTranslation.map(item => item.toString()), ...idListFromOptions.map(item => item.toString())]);
      }));
      const intersection = getIntersection(idList);
      if (intersection) filter._id = { $in: intersection.map(item => new ObjectID(item)) };
    }
    let secondFilter: any = {};
    if (body.priceFrom) {
      secondFilter.priceFrom = body.priceFrom;
    }
    if (body.priceTo) {
      secondFilter.priceTo = body.priceTo;
    }
    if (body.withSale) {
      secondFilter.maxDiscount = { $ne: null };
    }
    if (body.withBonus) {
      secondFilter.minBonus = { $ne: null };
    }
    if (!body.withSale && !body.withBonus && !body.priceFrom && !body.priceTo) {
      secondFilter = null;
    }
    const itemCount = await ProductSchema.countMainList(filter, body.language, secondFilter);
    return getResponse(true, 'Got product list', itemCount);
  }

  public getListForCart = async (body: IGetProductListForCartBody, user: IUser): Promise<IResponseModel> => {
    // Check here
    const data = await getCartList(body.idList, body.language, user && user.tariffPlan);
    return getResponse(true, 'Got products', {
      itemList: data.itemList,
      deletedList: data.deletedList,
      tariffPlan: user ? user.tariffPlan : null,
      bonus: user ? user.points : null
    });
  }

  public getSimilarProducts = async (product: IProduct, query: { count: number, language: number }): Promise<IResponseModel> => {
    const filter: any = {
      _id: { $ne: product._id },
      deleted: false,
      status: ProductStatusEnum.published,
      versionsHidden: false,
      isPrivate: false,
      categories: { $exists: true, $not: { $size: 0 } }
    };
    filter.categories = { $in: product.categories };
    if (product.brand) {
      delete filter.categories;
      filter.$or = [
        { categories: { $in: product.categories } },
        { brand: product.brand }
      ];
    }
    const itemList = await ProductSchema.getSimilarList(filter, query.language, query.count);
    return getResponse(true, 'Got list', itemList);
  }

  public getProductSearchKeys = async (key: string): Promise<IResponseModel> => {
    const replaced = regexpEscape(key);
    if (!replaced) return getResponse(true, 'Got keys', []);
    const list = await ProductTranslationSchema.getSearchNames(replaced);
    return getResponse(true, 'Got keys', list);
  }

  // public getProductFilterRange = async(): Promise<IResponseModel> => {
  //   const filter: any = {
  //     deleted: false,
  //     status: ProductStatusEnum.published,
  //     versionsHidden: false,
  //     isPrivate: false,
  //     categories: { $exists: true, $not: { $size: 0 } }
  //   };
  //   const range = await ProductSchema.getMainListRange(filter, LanguageEnum.en, { createdDt: -1 });
  //   return getResponse(true, 'got', range);
  // }

  private generateVersionsForProduct = async (defaultVersion: { product: string, attributes: any[], photo: string, price: number }, idList: string[]) => {
    let versionList = [];
    for (let i = 0; i < idList.length; i++) {
      const tempList = await this.generateVersionsPart(defaultVersion, versionList, idList[i]);
      versionList = [...tempList];
    }
    return versionList;
  }

  private getPriceRange = (minPrice: number, maxPrice: number, discounted: boolean, currentPricing: { discount: number, bonus: number, fromCount: number }) => {
    if (currentPricing) {
      return {
        discount: discounted && currentPricing.discount ? currentPricing.discount : null,
        discountedMinPrice: discounted && currentPricing.discount ? getDiscountedPrice(minPrice, currentPricing.discount) : null,
        discountedMaxPrice: discounted && currentPricing.discount ? getDiscountedPrice(maxPrice, currentPricing.discount) : null,
        bonus: currentPricing.bonus,
        minBonusAmount: currentPricing.bonus ? Math.round((minPrice * currentPricing.bonus) / 100) : null,
        maxBonusAmount: currentPricing.bonus ? Math.round((maxPrice * currentPricing.bonus) / 100) : null
      };
    } else {
      return {
        discount: null,
        discountedMinPrice: null,
        discountedMaxPrice: null,
        bonus: null,
        minBonusAmount: null,
        maxBonusAmount: null
      };
    }
  }

  private generateVersionsPart = async (defaultVersion, versionList: any[], id: string): Promise<any[]> => {
    let list = [];
    const optionIdList = await OptionSchema.find({ attribute: id, deleted: false }).distinct('_id');
    if (!versionList.length) {
      for (let i = 0; i < optionIdList.length; i++) {
        const translation = await OptionTranslationSchema.findOne({ option: optionIdList[i], language: LanguageEnum.en });
        const returnObj = { ...defaultVersion };
        returnObj.attributes = [{
          attribute: id,
          option: optionIdList[i],
          optionName: translation ? translation.name : ''
        }];
        list.push(returnObj);
      }
    } else {
      for (let i = 0; i < optionIdList.length; i++) {
        const translation = await OptionTranslationSchema.findOne({ option: optionIdList[i], language: LanguageEnum.en });
        const tempList = versionList.map(item => {
          return {
            product: item.product,
            photo: item.photo,
            price: item.price,
            bonus: item.bonus,
            attributes: [...item.attributes, ...[{ attribute: id, option: optionIdList[i], optionName: translation ? translation.name : '' }]],
            hidden: false
          };
        });
        list = [...list, ...tempList];
      }
    }
    return list;
  }

  private productPreparingIsFinished(product: IProduct) {
    if (!product.categories.length) {
      return false;
    }
    if (!product.defaultPrice) {
      return false;
    }
    if (!product.translations.length) {
      return false;
    }
    if (!product.images.length) {
      return false;
    }
    if (!product.mu) {
      return false;
    }
    return true;
  }

  private getAttributeSubLists(list: Array<{ attribute: string, option: string }>) {
    const mainList: any = [];
    for (let i = 0; i < list.length; i++) {
      const subList = list.filter(item => item.attribute !== list[i].attribute);
      mainList.push({
        attribute: list[i].attribute,
        chosen: subList
      });
    }
    return mainList;
  }

  private async getAttributeMaps(chosen: Array<{ attribute: string, option: string }>, productId: string, language: number, returnIdList: boolean) {
    const attributeIdList = [];
    let foundIdList = [];
    for (let i = 0; i < chosen.length; i++) {
      const filter: any = {
        product: productId,
        deleted: false,
        hidden: false,
        'attributes.attribute': chosen[i].attribute,
        'attributes.option': chosen[i].option
      };
      if (foundIdList.length) filter._id = { $in: foundIdList };
      else delete filter._id;
      const idList = await ProductVersionSchema.find(filter).distinct('_id');
      if (idList.length === 0) {
        return;
      }
      foundIdList = idList;
      attributeIdList.push(chosen[i].attribute);
    }
    const mainFilter: any = {
      product: productId,
      deleted: false,
      hidden: false,
    };
    if (foundIdList.length) mainFilter._id = { $in: foundIdList };
    const list = await ProductVersionSchema.find(mainFilter).lean();
    const { attributeObj } = this.getAttributeObj(list);
    const attributeMap = await AttributeSchema.getMap(attributeObj.attributes, attributeObj.options, language);
    if (returnIdList) {
      const idList = list.map(item => item._id);
      return { attributeMap, versionIdList: idList };
    } else {
      return attributeMap;
    }
  }

  private getAttributeObj(versionList: Array<IProductVersion>): { attributeObj: { attributes: string[], options: string[] }, versionIdList: string[] } {
    const attributeObj: any = {};
    const versionIdList = versionList.map(item => {
      const attributeList = item.attributes;
      attributeList.forEach(element => {
        const attributeId = element.attribute.toString();
        const optionId = element.option.toString();
        if (attributeObj.attributes) {
          attributeObj.attributes.push(attributeId);
        } else {
          attributeObj.attributes = [attributeId];
        }
        if (attributeObj.options) {
          attributeObj.options.push(optionId);
        } else {
          attributeObj.options = [optionId];
        }
      });
      return item._id;
    });
    if (attributeObj.attributes) {
      attributeObj.attributes = [...new Set(attributeObj.attributes)];
    }
    if (attributeObj.options) {
      attributeObj.options = [...new Set(attributeObj.options)];
    }
    return { attributeObj, versionIdList };
  }

  private sortAndReNameFiles(files: any, id: string): any[] {
    const fileList = files.map((file: any, index: number) => {
      let fileName = index + id + '-' + Date.now();
      fileName = `${mediaPaths.photos}${index}${MediaTypeEnum.photo}${index}${id}-${Date.now()}`;
      fileName += this.getMimeType(file.originalname);
      fs.renameSync(file.path, mainConfig.MEDIA_PATH + fileName);
      const fileToSave = {
        type: MediaTypeEnum.photo,
        path: fileName,
        product: id,
        originalName: file.originalname,
      };
      return fileToSave;
    });
    return fileList;
  }

  private attributeSetsAreSame(att1: Array<{ attribute: string, option: string }>, att2: Array<{ attribute: string, option: string }>): boolean {
    const firstAttributesSet = att1.map(item => item.attribute);
    const secondAttributesSet = att2.map(item => item.attribute);
    const firstOptionsSet = att1.map(item => item.option);
    const secondOptionsSet = att2.map(item => item.option);
    if (!arraysEqual(firstAttributesSet, secondAttributesSet) || !arraysEqual(firstOptionsSet, secondOptionsSet)) {
      return false;
    } else {
      return true;
    }
  }

  private getMimeType(fileName: string): string {
    const split = fileName.split('.');
    return '.' + split[split.length - 1];
  }

  private async copyProductImages(imageList: IFile[], newProductId: string): Promise<Array<{ oldId: string, newId: string }>> {
    const newIdList = [];
    await Promise.all(imageList.map(async (item, index) => {
      if (fs.existsSync(mainConfig.MEDIA_PATH + item.path)) {
        let fileName = `${mediaPaths.photos}${MediaTypeEnum.photo}${index}${newProductId}-${Date.now()}`;
        fileName += this.getMimeType(item.originalName);
        fs.copyFileSync(mainConfig.MEDIA_PATH + item.path, mainConfig.MEDIA_PATH + fileName);
        const newFile = new FileSchema({
          type: MediaTypeEnum.photo,
          path: fileName,
          product: newProductId,
          originalName: item.originalName,
        });
        newIdList.push({ oldId: item._id, newId: newFile._id });
        await newFile.save();
      }
    }));
    return newIdList;
  }

}

export function checkVisibility(product: IProduct): boolean {
  return !product.isPrivate && product.categories.length > 0 && !product.versionsHidden && product.status === ProductStatusEnum.published;
}

function onlyUnique(value, index, self) {
  return self.indexOf(value) === index;
}

function arraysEqual(arr1: any[], arr2: any[]) {
  if (arr1.length !== arr2.length) return false;
  arr1.sort((a, b) => a - b);
  arr2.sort((a, b) => a - b);
  for (let i = arr1.length; i--;) {
    if (arr1[i].toString() !== arr2[i].toString()) return false;
  }
  return true;
}

function getDiscountedPrice(price: number, discount: number) {
  const discountedPrice = price - (Math.round((price * discount) / 100));
  // const pre = discountedPrice % 10;
  // if (pre >= 5) {
  //   discountedPrice += (10 - pre);
  // } else {
  //   discountedPrice -= pre;
  // }
  return discountedPrice;
}


function productHasDiscount(startDate: Date, endDate: Date) {
  let discounted = false;
  if (startDate && endDate && endDate > new Date() && startDate < new Date()) {
    discounted = true;
  } else if (startDate && !endDate && startDate < new Date()) {
    discounted = true;
  } else if (endDate && !startDate && endDate > new Date()) {
    discounted = true;
  } else if (!endDate && !startDate) {
    discounted = true;
  }
  return discounted;
}

function getPricing(count: number, pricing: any[], userTariffType: number = UserTariffTypeEnum.usual) {
  pricing.sort((a, b) => {
    if (a.fromCount >= b.fromCount) {
      return 1;
    }
    if (a.fromCount < b.fromCount) {
      return -1;
    }
  });
  switch (userTariffType) {
    case UserTariffTypeEnum.usual: {
      const filtered = pricing.filter(item => item.fromCount <= count);
      return filtered.length ? filtered[filtered.length - 1] : null;
    }
    case UserTariffTypeEnum.silver: {
      let index;
      for (let i = 0; i < pricing.length; i++) {
        if (pricing[i].fromCount <= count) index = i;
      }
      if (index === undefined) return pricing[0] || null;
      else if (index === pricing.length - 1) return pricing[pricing.length - 1];
      else return pricing[index + 1];
    }
    case UserTariffTypeEnum.gold: {
      return pricing[pricing.length - 1] || null;
    }
  }
}

function getIntersection(arr: Array<any[]>) {
  // console.log(arr)
  if (arr.length > 1) {
    let intersection;
    for (let i = 0; i < arr.length; i++) {
      if (i !== arr.length - 1) {
        if (!intersection) intersection = arr[i].filter(value => arr[i + 1].includes(value));
        else intersection = intersection.filter(value => arr[i + 1].includes(value));
      }
      // console.log(intersection);
    }
    return intersection;
  } else {
    return arr[0];
  }
}

export async function getCartList(idList: Array<{ product: string, productVersion?: string, count: number }>, language: number, userType: number): Promise<IGetCartListModel> {
  const deletedList = [...idList];
  let totalPrice = 0;
  let totalDiscountAmount = 0;
  let totalBonusAmount = 0;
  // let totalNotRoundedBonus = 0;
  const list = await Promise.all(idList.map(async item => {
    let version: IProductVersion = null;
    let product: IProduct;
    if (item.productVersion) {
      [version, product] = await Promise.all([
        await ProductVersionSchema.findOne({
          _id: item.productVersion,
          product: item.product,
          deleted: false,
          hidden: false
        }),
        await ProductSchema.findOne({
          _id: item.product,
          deleted: false,
          isPrivate: false,
          status: ProductStatusEnum.published,
          versionsHidden: false,
          'versions.0': { $exists: true },
          'categories.0': { $exists: true }
        })
      ]);
      if (!version || !product) {
        return null;
      }
    } else {
      product = await ProductSchema.findOne({
        _id: item.product,
        deleted: false,
        isPrivate: false,
        status: ProductStatusEnum.published,
        versionsHidden: false,
        'versions.0': { $exists: false },
        'categories.0': { $exists: true }
      });
      if (!product) {
        return null;
      }
    }
    const hasDiscount = productHasDiscount(product.discountStartDate, product.discountEndDate);
    let priceList = [];
    if (hasDiscount) {
      const pricing = await ProductPricingSchema.find({ product: product._id, deleted: false });
      if (pricing.length) {
        priceList = pricing.map(priceItem => {
          const price = version ? version.price : product.defaultPrice;
          const discountedPrice = priceItem.discount ? getDiscountedPrice(price, priceItem.discount) : null;
          const discountAmount = discountedPrice ? price - discountedPrice : null;
          const notRoundedBonusAmount = priceItem.bonus ? discountedPrice ? discountedPrice * priceItem.bonus / 100 : price * priceItem.bonus / 100 : null;
          let bonusAmount = null;
          if (notRoundedBonusAmount > 0 && notRoundedBonusAmount < 1) {
            bonusAmount = Math.round(notRoundedBonusAmount * 10) / 10;
          } else {
            bonusAmount = Math.round(notRoundedBonusAmount);
          }
          return {
            fromCount: priceItem.fromCount,
            discountedPrice,
            discountAmount,
            bonusAmount,
            notRoundedBonusAmount
          };
        });
      }
    }
    let attributes = [];
    const imageId = version && version.photo ? version.photo : product.images[0];
    const [file, translation] = await Promise.all([
      await FileSchema.findById(imageId).select({ path: 1 }),
      await ProductTranslationSchema.findOne({ product: product._id, language })
    ]);
    // let file = await FileSchema.findById(imageId).select({ path: 1 });
    // if (!file) {
    //   file = await FileSchema.findById(product.images[0]).select({ path: 1 });
    // }
    // const translation = await ProductTranslationSchema.findOne({ product: product._id, language });
    if (version) {
      attributes = await Promise.all(version.attributes.map(async item => {
        const [attributeTranslation, optionTranslation] = await Promise.all([
          await AttributeTranslationSchema.findOne({ attribute: item.attribute, language }),
          await OptionTranslationSchema.findOne({ option: item.option, language })
        ]);
        return {
          attributeId: item.attribute,
          attributeName: attributeTranslation ? attributeTranslation.name : null,
          optionId: item.option,
          optionName: optionTranslation ? optionTranslation.name : null
        };
      }));
    }
    let discountedPrice = null;
    let discountAmount = null;
    let bonusAmount = null;
    let notRoundedBonusAmount = null;
    if (hasDiscount && priceList.length) {
      const price = getPricing(item.count, priceList, userType);
      if (price) {
        discountedPrice = price.discountedPrice;
        discountAmount = price.discountAmount;
        bonusAmount = price.bonusAmount;
        notRoundedBonusAmount = price.notRoundedBonusAmount;
      }
    }
    const stepCount = item.count / product.step;
    totalPrice += version ? (version.price * stepCount) : (product.defaultPrice * stepCount);
    if (discountAmount) totalDiscountAmount += (discountAmount * stepCount);
    if (notRoundedBonusAmount) totalBonusAmount += Math.round(notRoundedBonusAmount * stepCount);
    const index = deletedList.findIndex(findItem => findItem.product === item.product && findItem.productVersion === item.productVersion);
    if (index > -1) deletedList.splice(index, 1);
    return {
      product: product._id,
      mu: product.mu,
      productVersion: version ? version._id : null,
      name: translation ? translation.name : null,
      filePath: file && file.path ? mainConfig.BASE_URL + file.path : null,
      image: file && file.path,
      attributes,
      priceList,
      defaultPrice: version ? version.price : product.defaultPrice,
      minCount: product.minCount,
      step: product.step,
      stepCount,
      count: item.count,
      discountedPrice,
      discountAmount,
      partner: product.partner,
    };
  }));
  const itemList = list.filter(item => !!item);
  return { itemList, deletedList, subTotal: totalPrice, discount: totalDiscountAmount, total: totalPrice - totalDiscountAmount, bonus: totalBonusAmount };
}


export const generateShareHtml = async (id: string): Promise<string> => {
  const product: IProduct<string, IProductTranslation, IFile, string, string, string, string, string, string> = await ProductSchema.findOne({
    _id: id,
    deleted: false,
    status: ProductStatusEnum.published,
    versionsHidden: false,
    isPrivate: false,
    categories: { $exists: true, $not: { $size: 0 } }
  }).populate('translations images');
  if (!product) return null;
  const translation = product.translations.find(item => item.language === LanguageEnum.en);
  // <meta name="description" content="${translation.description}">
  const html = `
    <html>
      <head>
        <title>${translation.name}</title>

        <meta name="og:image" content=${mainConfig.BASE_URL + product.images[0].path}>
      </head>
      <body></body>
      <script>
        window.location.href = '${mainConfig.WEB_CLIENT_BASE_URL}products/details/${product._id}';
      </script>
    </html>
  `;
  return html;
};

export default new ProductServices();