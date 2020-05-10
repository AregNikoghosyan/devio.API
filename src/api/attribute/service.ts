import {
  ICreateUsualAttributeBody,
  IUsualOptionBody,
  ICreateColorAttributeBody,
  IColorOptionBody,
  IGetAttributeListForAdminBody,
  IUpdateAttributeBody,
  IAddOptionBody,
  IUpdateOptionBody,
  IGetAttributeAutoCompleteQuery,
  IUpdateOptionPositionsBody
} from './model';
import { IResponseModel, getResponse } from '../mainModels';

import AttributeSchema            from '../../schemas/attribute';
import AttributeTranslationSchema from '../../schemas/attributeTranslation';
import OptionSchema               from '../../schemas/option';
import OptionTranslationSchema    from '../../schemas/optionTranslation';
import ProductVersionSchema       from '../../schemas/productVersion';
import CategoryTranslationSchema  from '../../schemas/categoryTranslation';

import { AttributeTypeEnum } from '../../constants/enums';
import { IAttribute } from '../../schemas/attribute/model';
import { IOption } from '../../schemas/option/model';
import { ObjectID } from 'bson';
import { regexpEscape } from '../mainValidation';

class AttributeServices {

  public createUsualAttribute = async (body: ICreateUsualAttributeBody): Promise<IResponseModel> => {
    const newAttribute = new AttributeSchema({
      type     : AttributeTypeEnum.usual,
      name     : body.name.trim(),
      category : body.category
    });
    body.translations.forEach((item: any) => {
      item.attribute = newAttribute._id;
    });
    newAttribute.translations = await AttributeTranslationSchema.insertMany(body.translations);
    if (body.options && body.options.length) {
      newAttribute.options = await this.createUsualOptions(body.options, newAttribute._id);
    }
    await newAttribute.save();
    return getResponse(true, 'Attribute created');
  }

  public createColorAttribute = async (body: ICreateColorAttributeBody): Promise<IResponseModel> => {
    const newAttribute = new AttributeSchema({
      type     : AttributeTypeEnum.color,
      name     : body.name.trim(),
      category : body.category
    });
    body.translations.forEach((item: any) => {
      item.attribute = newAttribute._id;
    });
    newAttribute.translations = await AttributeTranslationSchema.insertMany(body.translations);
    if (body.options && body.options.length) {
      newAttribute.options = await this.createColorOptions(body.options, newAttribute._id);
    }
    await newAttribute.save();
    return getResponse(true, 'Attribute created');
  }

  public getAttributeListForAdmin = async (body: IGetAttributeListForAdminBody): Promise<IResponseModel> => {
    const filter: any = {
      deleted: false
    };
    if (body.category) filter.category = new ObjectID(body.category);
    if (body.type) filter.type = body.type;
    if (body.search) {
      const key = regexpEscape(body.search);
      const idList = await AttributeTranslationSchema.find({ name : new RegExp(key, 'i') }).distinct('attribute');
      filter.$or = [
        { _id: { $in: idList } },
        { name: new RegExp(key, 'i') }
      ];
    }
    const itemCount = await AttributeSchema.countDocuments(filter);
    if (itemCount === 0) return getResponse(true, 'Got attribute list', { itemList: [], itemCount, pageCount: 0 });
    const pageCount = Math.ceil(itemCount / body.limit);
    if (body.pageNo > pageCount) return getResponse(false, 'PageNo must be less or equal than ' + pageCount);
    const skip = (body.pageNo - 1) * body.limit;
    const itemList = await AttributeSchema.getListForAdmin(filter, skip, body.limit, body.language);
    return getResponse(true, 'Got attribute list', { itemList, itemCount, pageCount });
  }

  public deleteAttributes = async (idList: string[]): Promise<IResponseModel> => {
    await AttributeSchema.bulkDelete(idList);
    return getResponse(true, 'Attributes deleted');
  }

  public getAttributeDetails = async (attribute: IAttribute): Promise<IResponseModel> => {
    const details = await AttributeSchema.getDetailsForAdmin(attribute._id);
    return getResponse(true, 'Got details', details);
  }

  public updateAttribute = async(body: IUpdateAttributeBody): Promise<IResponseModel> => {
    const attribute = body.attribute;
    attribute.name = body.name;
    await AttributeTranslationSchema.deleteMany({ attribute: body.id });
    body.translations.forEach((item: any) => {
      item.attribute = body.id;
    });
    attribute.translations = await AttributeTranslationSchema.insertMany(body.translations);
    await attribute.save();
    return getResponse(true, 'Attribute updated');
  }

  public addColorOption = async(body: IAddOptionBody): Promise<IResponseModel> => {
    const count = await OptionSchema.countDocuments({ attribute: body.attribute, deleted: false });
    const option: any = {
      translations: body.translations,
      position: count + 1
    };
    option.colorType = body.colorType;
    if (body.firstColor) option.firstColor = body.firstColor;
    if (body.secondColor) option.secondColor = body.secondColor;
    const idList = await this.createColorOptions([ option ], body.attribute._id);
    option._id = idList[0];
    body.attribute.options.push(idList[0]);
    await body.attribute.save();
    option.translations.forEach(element => {
      delete element.option;
    });
    return getResponse(true, 'Option added', option);
  }

  public addUsualOption = async(body: IAddOptionBody): Promise<IResponseModel> => {
    const count = await OptionSchema.countDocuments({ attribute: body.attribute, deleted: false });
    const option: any = {
      translations: body.translations,
      position: count + 1
    };
    const idList = await this.createUsualOptions([ option ], body.attribute._id);
    option._id = idList[0];
    body.attribute.options.push(idList[0]);
    await body.attribute.save();
    option.translations.forEach(element => {
      delete element.option;
    });
    return getResponse(true, 'Option added', option);
  }

  public updateColorOption = async(body: IUpdateOptionBody): Promise<IResponseModel> => {
    await OptionTranslationSchema.deleteMany({ option: body.id });
    body.option.translations = await OptionTranslationSchema.insertMany(body.translations.map(item => {
      return {
        option   : body.option._id,
        name     : item.name,
        language : item.language
      };
    }));
    body.option.colorType = body.colorType;
    if (body.firstColor) body.option.firstColor = body.firstColor;
    if (body.secondColor) body.option.secondColor = body.secondColor;
    await body.option.save();
    const option: any = {
      _id: body.id,
      translations: body.translations,
      colorType: body.colorType
    };
    if (body.firstColor) option.firstColor = body.firstColor;
    if (body.secondColor) option.secondColor = body.secondColor;
    return getResponse(true, 'Option updated', option);
  }

  public updateUsualOption = async(body: IUpdateOptionBody): Promise<IResponseModel> => {
    await OptionTranslationSchema.deleteMany({ option: body.id });
    body.option.translations = await OptionTranslationSchema.insertMany(body.translations.map(item => {
      return {
        option   : body.option._id,
        name     : item.name,
        language : item.language
      };
    }));
    await body.option.save();
    const option: any = {
      _id: body.id,
      translations: body.translations,
    };
    return getResponse(true, 'Option updated', option);
  }

  public deleteOption = async(option: IOption): Promise<IResponseModel> => {
    await Promise.all([
      await OptionSchema.updateMany({
        _id: { $ne: option._id },
        position: { $gt: option.position },
        attribute: option.attribute,
        deleted: false
      }, {
        $inc: { position: -1 }
      }),
      await OptionSchema.updateOne({ _id: option._id }, { deleted: true }),
      await AttributeSchema.updateOne({ _id: option.attribute }, { $pull: { options: option._id } }),
      await ProductVersionSchema.popOption(option._id)
    ]);
    return getResponse(true, 'Option deleted');
  }

  public hideOption = async(option: IOption): Promise<IResponseModel> => {
    option.hidden = !option.hidden;
    await option.save();
    return getResponse(true, `Option set to ${option.hidden ? '' : 'un'}hidden`);
  }

  public updateOptionPositions = async(body: IUpdateOptionPositionsBody) => {
    await Promise.all(body.options.map(async item => {
      await OptionSchema.updateOne({ _id: item.id }, { position: item.position });
    }));
    return getResponse(true, 'Positions updated');
  }

  public getAttributeAutoComplete = async(query: IGetAttributeAutoCompleteQuery): Promise<IResponseModel> => {
    const categoryList = query.categories.map(item => new ObjectID(item));
    const filter: any = {
      deleted  : false,
      category : { $in: categoryList },
    };
    const key = regexpEscape(query.search);
    const idList = await AttributeTranslationSchema.find({ name : new RegExp(key, 'i') }).distinct('attribute');
    filter.$or =  [ { _id: { $in: idList } }, { name: new RegExp(key, 'i') } ];
    const list = await AttributeSchema.getShortList(filter);
    return getResponse(true, 'Got list', list);
  }

  private createUsualOptions = async (options: Array<IUsualOptionBody>, attributeId: string): Promise<string[]> => {
    const optionIdList = [];
    await Promise.all(
      options.map(async (item) => {
        const option = new OptionSchema({
          attribute : attributeId,
          position  : item.position
        });
        item.translations.forEach((item: any) => {
          item.option = option._id;
          item.name = item.name.trim();
        });
        option.translations = await OptionTranslationSchema.insertMany(item.translations);
        await option.save();
        optionIdList.push(option._id);
      })
    );
    return optionIdList;
  }

  private createColorOptions = async (options: Array<IColorOptionBody>, attributeId: string): Promise<string[]> => {
    const optionIdList = [];
    await Promise.all(
      options.map(async (item) => {
        const option = new OptionSchema({
          attribute   : attributeId,
          colorType   : item.colorType,
          firstColor  : item.firstColor,
          secondColor : item.secondColor,
          position    : item.position
        });
        item.translations.forEach((item: any) => {
          item.option = option._id;
          item.name = item.name.trim();
        });
        option.translations = await OptionTranslationSchema.insertMany(item.translations);
        await option.save();
        optionIdList.push(option._id);
      })
    );
    return optionIdList;
  }
}

export default new AttributeServices();