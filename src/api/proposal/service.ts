import { ICreateProposalBody, IUpdateProposalBody, IGetProposalListQuery } from './model';

import ProposalSchema            from '../../schemas/proposal';
import ProposalTranslationSchema from '../../schemas/proposalTranslation';
import ProductSchema             from '../../schemas/product';
import ProductTranslationSchema  from '../../schemas/productTranslation';
import FileSchema                from '../../schemas/file';

import { IResponseModel, getResponse } from '../mainModels';
import { IProposal } from '../../schemas/proposal/model';
import { LanguageEnum } from '../../constants/enums';
import mainConfig from '../../env';
import { ObjectID } from 'bson';

class ProposalServices {

  public createProposal = async(body: ICreateProposalBody): Promise<IResponseModel> => {
    const count = await ProposalSchema.countDocuments();
    const newProposal = new ProposalSchema({
      products: <any>body.productIdList,
      shown: count === 0
    });
    newProposal.translations = await ProposalTranslationSchema.insertMany(body.translations.map(item => {
      return {
        proposal : newProposal._id,
        language : item.language,
        name     : item.name.trim()
      };
    }));
    await newProposal.save();
    return getResponse(true, 'Proposal created');
  }

  public updateProposal = async(body: IUpdateProposalBody): Promise<IResponseModel> => {
    await ProposalTranslationSchema.deleteMany({ proposal: body.id });
    const proposal = body.proposal;
    proposal.products = body.productIdList;
    proposal.translations = await ProposalTranslationSchema.insertMany(body.translations.map(item => {
      return {
        proposal : proposal._id,
        language : item.language,
        name     : item.name.trim()
      };
    }));
    if (body.deleteIdList) {
      const productIdList = proposal.products.map(item => item.toString());
      body.deleteIdList.forEach(delId => {
        const index = productIdList.indexOf(delId);
        if (index > -1) {
          productIdList.splice(index, 1);
        }
      });
      proposal.products = productIdList;
    }
    await proposal.save();
    return getResponse(true, 'Proposal updated');
  }

  public setProposalShown = async(proposal: IProposal): Promise<IResponseModel> => {
    // proposal.shown = true;
    await Promise.all([
      // await proposal.save(),
      await ProposalSchema.updateOne({ _id: proposal._id }, { shown: true }),
      await ProposalSchema.updateMany({ _id: { $ne: proposal._id } }, { shown: false })
    ]);
    return getResponse(true, 'Proposal set to shown');
  }

  public getProposalList = async(query: IGetProposalListQuery): Promise<IResponseModel> => {
    const itemCount = await ProposalSchema.countDocuments();
    if (itemCount === 0) return getResponse(true, 'Got request list', { itemList: [], pageCount: 0, itemCount });
    const pageCount = Math.ceil(itemCount / +query.limit);
    if (+query.pageNo > pageCount) return getResponse(false, 'PageNo must be less or equal than ' + pageCount);
    const skip = (+query.pageNo - 1) * +query.limit;
    console.log(query.language);
    const itemList = await ProposalSchema.getListForAdmin(skip, query.limit, +query.language);
    return getResponse(true, 'Got request list', { itemList, pageCount, itemCount });
  }

  public deleteProposals = async(idList: string[]): Promise<IResponseModel> => {
    await ProposalSchema.deleteMany({ _id: { $in: idList } });
    const shown = await ProposalSchema.findOne({ shown: true });
    if (!shown) {
      await ProposalSchema.updateOne({}, { shown: true });
    }
    return getResponse(true, 'Proposals deleted');
  }

  public getProposalDetails = async(proposal: IProposal): Promise<IResponseModel> => {
    const [ translations, products ] = await Promise.all([
      await ProposalTranslationSchema.find({ _id: { $in: proposal.translations } }).select({ _id: 0, language: 1, name: 1 }),
      await Promise.all(proposal.products.map(async productId => {
        const [ translation, file ] = await Promise.all([
          await ProductTranslationSchema.findOne({ product: productId, language: LanguageEnum.en }),
          await FileSchema.findOne({ product: productId })
        ]);
        return {
          _id: productId,
          name: translation ? translation.name : '',
          filePath: file && file.path ? mainConfig.BASE_URL + file.path : null
        };
      }))
    ]);
    const returnObj = {
      _id: proposal._id,
      translations,
      products
    };
    return getResponse(true, 'Got details', returnObj);
  }

  public getProposalForAll = async(query: { language: number, limit: number, pageNo: number }): Promise<IResponseModel> => {
    const proposal = await ProposalSchema.findOne({ shown: true }).populate('translations');
    if (!proposal) {
      return getResponse(true, 'Proposal is missing', null);
    }
    const translation = proposal.translations.find(item => item.language === query.language);
    let proposalName = '';
    if (translation) proposalName = translation.name;
    const filter = {
      _id       : { $in: proposal.products.map(item => new ObjectID(item)) },
      deleted   : false,
      versionsHidden: false,
      isPrivate : false
    };
    const itemCount = await ProductSchema.countMainList(filter, query.language);
    if (itemCount === 0) return getResponse(true, 'Got product list', { name: proposalName, itemList: [], pagesLeft: false });
    const pageCount = Math.ceil(itemCount / +query.limit);
    if (+query.pageNo > pageCount) return getResponse(false, 'PageNo must be less or equal than ' + pageCount);
    const skip = (+query.pageNo - 1) * +query.limit;
    const itemList = await ProductSchema.getMainListByFilter(filter, query.language, null, null, skip, query.limit);
    return getResponse(true, 'Got product list', { name: proposalName, _id: proposal._id, itemList, pagesLeft: +query.pageNo !== pageCount });
  }

}

export default new ProposalServices();