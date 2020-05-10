import * as fs from 'fs';

import {
  IAddRequestBody,
  IDeleteRequestBody,
  ISendRequestBody,
  IGetDraftRequestListQuery,
  IUpdateDraftRequestBody,
  IGetRequestPackListQuery,
  IGetRequestPackListForAdminBody,
  IGetRequestPackDetailsForAdminQuery,
  IRequestNewRequest,
  IDetachFileFromRequestBody,
  ISetRequestDraftBody,
  IAttachProductToRequestBody
} from './model';

import { IUser } from '../../schemas/user/model';
import { IResponseModel, getResponse, IRequestFilesItem } from '../mainModels';

import { IRequestDoc }  from '../../schemas/request/model';
import { IRequestPack } from '../../schemas/requestPack/model';

import RequestSchema      from '../../schemas/request';
import RequestPackSchema  from '../../schemas/requestPack';
import FileSchema         from '../../schemas/file';
import CategorySchema     from '../../schemas/category';
import UserSchema         from '../../schemas/user';
import MUSchema           from '../../schemas/mu';
import ProductSchema      from '../../schemas/product';
import UserNotificationSchema from '../../schemas/userNotification';

import mainConfig from '../../env';

import { deleteFiles, autorotate, convert } from '../../services/fileManager';
import {
  MediaTypeEnum,
  RequestStatusEnum,
  RequestPackStatusEnum,
  RequestPackSortEnum,
  ProductStatusEnum,
  RequestTypeEnum,
  NotificationTypeEnum
} from '../../constants/enums';
import { mediaPaths } from '../../constants/constants';
import { ObjectID } from 'bson';
import { regexpEscape } from '../mainValidation';

class RequestServices {

  public requestNewRequest = async(user: IUser, body: IRequestNewRequest): Promise<IResponseModel> => {
    const newRequest = new RequestSchema();
    if (user) {
      newRequest.user = user._id;
    } else {
      newRequest.deviceId = body.deviceId;
    }
    await newRequest.save();
    return getResponse(true, 'Request created', newRequest._id);
  }

  public attachFilesToRequest = async(request: IRequestDoc, files: IRequestFilesItem[]): Promise<IResponseModel> => {
    const fileList = await this.sortAndReNameFiles(files, request._id);
    const pathList = [];
    fileList.forEach(item => {
      if (item.type === MediaTypeEnum.photo) {
        pathList.push(mainConfig.MEDIA_PATH + item.path);
      }
    });
    autorotate(pathList).catch(e => console.log(e));
    const newFiles: any[] = await FileSchema.insertMany(fileList);
    const fileListToReturn = newFiles.map(item => {
      request.files.push(item._id);
      return {
        _id: item._id,
        originalName: item.originalName,
        path: item.path ? mainConfig.BASE_URL + item.path : null,
        type: item.type
      };
    });
    await request.save();
    return getResponse(true, 'File attached', fileListToReturn);
  }

  public detachFileFromRequest = async(body: IDetachFileFromRequestBody): Promise<IResponseModel> => {
    if (body.request.files.length > 1) {
      await RequestSchema.updateOne({ _id: body.requestId }, { $pull: { files: body.fileId } });
      this.deleteFile(body.fileId).catch(e => console.log(e));
      return getResponse(true, 'File detached', false);
    } else {
      await RequestSchema.deleteOne({ _id: body.requestId });
      this.deleteFile(body.fileId).catch(e => console.log(e));
      return getResponse(true, 'File detached', true);
    }
  }

  public setRequestDraft = async(body: ISetRequestDraftBody): Promise<IResponseModel> => {
    body.request.iNeed = body.iNeed;
    body.request.measurementUnit = body.mu;
    body.count = body.count;
    if (body.category) body.request.category = body.category;
    if (body.description) body.request.description = body.description;
    body.request.status = RequestStatusEnum.draft;
    await body.request.save();
    return getResponse(true, 'Request set to draft');
  }

  public addRequest = async(files: IRequestFilesItem[], body: IAddRequestBody, user: IUser): Promise<IResponseModel> => {
    const newRequest = new RequestSchema({
      status : RequestStatusEnum.draft,
      type   : body.type
    });
    if (body.type === RequestTypeEnum.usual) {
      newRequest.iNeed = body.iNeed,
      newRequest.measurementUnit = body.mu;
      newRequest.count = body.count;
    }
    if (body.category) newRequest.category       = body.category;
    if (body.description) newRequest.description = body.description;
    if (user) {
      newRequest.user = user._id;
    } else if (body.deviceId) {
      newRequest.deviceId = body.deviceId;
    }
    if (files && files.length) {
      const fileList = await this.sortAndReNameFiles(files, newRequest._id);
      const pathList = [];
      fileList.forEach(item => {
        if (item.type === MediaTypeEnum.photo) {
          pathList.push(mainConfig.MEDIA_PATH + item.path);
        }
      });
      autorotate(pathList).catch(e => console.log(e));
      newRequest.files = await FileSchema.insertMany(fileList);
    }
    await newRequest.save();
    if (body.type === RequestTypeEnum.fileList) {
      const files = await FileSchema.find({ _id: { $in: newRequest.files } }).select({ _id: 1, path: 1, originalName: 1, type: 1 });
      files.forEach(item => {
        item.path = item.path ? mainConfig.BASE_URL + item.path : null;
      });
      return getResponse(true, 'Request added', { _id: newRequest._id, files });
    } else {
      return getResponse(true, 'Request added', newRequest._id);
    }
  }

  public deleteRequest = async(body: IDeleteRequestBody): Promise<IResponseModel> => {
    const idList = [];
    const pathList = [];
    const length = body.request.files.length;
    for (let i = 0; i < length; i++) {
      idList.push(body.request.files[i]._id);
      if (body.request.files[i].path) pathList.push(mainConfig.MEDIA_PATH + body.request.files[i].path);
    }
    if (pathList.length) {
      deleteFiles(pathList, false);
    }
    await Promise.all([
      await RequestSchema.deleteOne({ _id: body.request._id }),
      await FileSchema.deleteMany({ _id: { $in: idList } })
    ]);
    return getResponse(true, 'Request deleted');
  }

  public sendRequestPack = async(user: IUser, body: ISendRequestBody): Promise<IResponseModel> => {
    let requestPackId;
    if (user) {
      const idList = await RequestSchema.find({ user: user._id, type: body.type, status: RequestStatusEnum.draft }).distinct('_id');
      const requestPack = new RequestPackSchema({
        user: user._id,
        requestList: idList,
        requestCount: idList.length,
        userPhoneNumber: body.phoneNumber,
        userEmail: body.email,
        userFirstName: body.firstName,
        userLastName: body.lastName || null,
        osType: body.osType || null
      });
      user.requestCount++;
      requestPackId = requestPack._id;
      await Promise.all([
        await requestPack.save(),
        await user.save(),
        await RequestSchema.updateMany({ _id: { $in: idList } }, { status: RequestStatusEnum.pending, requestPack: requestPack._id  })
      ]);
    } else if (body.deviceId) {
      const idList = await RequestSchema.find({ deviceId: body.deviceId, type: body.type, status: RequestStatusEnum.draft }).distinct('_id');
      const requestPack = new RequestPackSchema({
        deviceId: body.deviceId,
        requestList: idList,
        requestCount: idList.length,
        userPhoneNumber: body.phoneNumber,
        userEmail: body.email,
        userFirstName: body.firstName,
        userLastName: body.lastName || null,
        osType: body.osType || null
      });
      requestPackId = requestPack._id;
      await Promise.all([
        await requestPack.save(),
        await RequestSchema.updateMany({ _id: { $in: idList } }, { status: RequestStatusEnum.pending, requestPack: requestPack._id  })
      ]);
    } else {
      const requestPack = new RequestPackSchema({
        requestList: <any>body.idList,
        requestCount: body.idList.length,
        userPhoneNumber: body.phoneNumber,
        userEmail: body.email,
        userFirstName: body.firstName,
        userLastName: body.lastName || null,
        osType: body.osType || null
      });
      requestPackId = requestPack._id;
      await Promise.all([
        await requestPack.save(),
        await RequestSchema.updateMany({ _id: { $in: body.idList } }, { status: RequestStatusEnum.pending, requestPack: requestPack._id  })
      ]);
      // TODO send here code to phone number to check requests status later
    }
    await UserNotificationSchema.sendAdminNotification({ type: NotificationTypeEnum.newRequest, sender: user ? user._id : null, request: requestPackId });
    return getResponse(true, 'Request pack sent');
  }

  public getDraftRequestList = async(user: IUser, query: IGetDraftRequestListQuery): Promise<IResponseModel> => {
    const filter: any = { status: RequestStatusEnum.draft, requestPack: null, type: RequestTypeEnum.usual };
    if (user) {
      filter.user = new ObjectID(user._id);
    } else {
      filter.deviceId = query.deviceId;
    }
    const itemCount = await RequestSchema.countDocuments(filter);
    if (itemCount === 0) return getResponse(true, 'Got request list', { itemList: [], pagesLeft: false, itemCount });
    const pageCount = Math.ceil(itemCount / +query.limit);
    if (+query.pageNo > pageCount) return getResponse(false, 'PageNo must be less or equal than ' + pageCount);
    const skip = (+query.pageNo - 1) * +query.limit;
    const itemList = await RequestSchema.getDraftList(filter, +query.language, skip, +query.limit);
    return getResponse(true, 'Got request list', { itemList, pagesLeft: +query.pageNo !== pageCount, itemCount });
  }

  public getDraftRequestDetails = async(request: IRequestDoc, language: number): Promise<IResponseModel> => {
    const requestObj: any = request;
    requestObj.files.forEach(item => {
      if (item.path) item.path = mainConfig.BASE_URL + item.path;
    });
    const [ muName, categoryName ] = await Promise.all([
      await MUSchema.getNameByLanguage(request.measurementUnit, language),
      await CategorySchema.getNameByLanguage(request.category, language)
    ]);
    requestObj.categoryName = categoryName;
    requestObj.muName = muName;
    return getResponse(true, 'Got details', requestObj);
  }

  public updateDraftRequest = async(body: IUpdateDraftRequestBody, files: IRequestFilesItem[]): Promise<IResponseModel> => {
    const request = body.request;
    if (request.type === RequestTypeEnum.usual) {
      request.iNeed           = body.iNeed;
      request.measurementUnit = body.mu;
      request.count           = body.count;
      request.category        = body.category ? body.category : null;
      request.description     = body.description ? body.description : null;
    }
    if (body.removeFileList) {
      FileSchema.deleteFile(body.removeFileList).catch(e => console.log(e));
      const idList = request.files.filter((value, index, array) => {
        const remove = body.removeFileList.indexOf(value.toString());
        return remove === -1;
      });
      request.files = idList;
    }
    if (files && files.length) {
      const fileList = await this.sortAndReNameFiles(files, body.id);
      const setList = await FileSchema.insertMany(fileList);
      const idList = setList.map(item => item._id);
      request.files = request.files.concat(idList);
    }
    await request.save();
    return getResponse(true, 'Request updated', request._id);
  }

  public getRequestPackList = async(user: IUser, query: IGetRequestPackListQuery): Promise<IResponseModel> => {
    const filter: any = {
      status: +query.status === 1 ?  RequestPackStatusEnum.active : { $ne: RequestPackStatusEnum.active },
    };
    if (user) {
      filter.user = user._id;
    } else {
      filter.deviceId = query.deviceId;
    }
    const itemCount = await RequestPackSchema.countDocuments(filter);
    if (itemCount === 0) return getResponse(true, 'Got request pack list', { itemList: [], pagesLeft: false });
    const pageCount = Math.ceil(itemCount / +query.limit);
    if (+query.pageNo > pageCount) return getResponse(false, 'PageNo must be less or equal than ' + pageCount);
    const skip = (+query.pageNo - 1) * +query.limit;
    const itemList = await RequestPackSchema.getPackListForAppUser(filter, +query.language, skip, +query.limit);
    return getResponse(true, 'Got request pack list', { itemList, pagesLeft: +query.pageNo !== pageCount });
  }

  public getRequestPackDetails = async(language: number, filter: any): Promise<IResponseModel> => {
    const details = await RequestPackSchema.getPackDetailsForUser(filter, language);
    details.requestList = await Promise.all(details.requestList.map(async item => {
      if (item.status === RequestStatusEnum.succeed) {
        item.products = await ProductSchema.getShortListWithPricing({
          _id: { $in: item.products },
          status: { $in: [ ProductStatusEnum.published, ProductStatusEnum.hidden ] },
          deleted: false
        }, language);
      } else {
        item.products = [];
      }
      return item;
    }));
    return getResponse(true, 'Got details', details);
  }

  public getRequestPackListForAdmin = async(body: IGetRequestPackListForAdminBody): Promise<IResponseModel> => {
    const filter: any = {};
    if (body.userId) {
      filter.user = new ObjectID(body.userId);
    }
    if (body.category) {
      const idList = await RequestSchema.find({
        category: body.category,
        status:
        { $in: [ RequestStatusEnum.pending, RequestStatusEnum.canceled, RequestStatusEnum.failed, RequestStatusEnum.succeed ] } })
      .distinct('_id');
      if (!idList.length) {
        return getResponse(true, 'Got requestPackList', { itemList: [], itemCount: 0, pageCount: 0 });
      } else {
        filter.requestList = { $in: idList };
      }
    }
    if (body.dateFrom) {
      filter.createdDt = { $gte: new Date(body.dateFrom) };
    }
    if (body.dateTo) {
      if (filter.createdDt) {
        filter.createdDt.$lte = new Date(body.dateTo);
      } else {
        filter.createdDt = { $lte: new Date(body.dateTo) };
      }
    }
    if (body.countFrom) {
      filter.requestCount = { $gte: body.countFrom };
    }
    if (body.countTo) {
      if (filter.requestCount) {
        filter.requestCount.$lte = body.countTo;
      } else {
        filter.requestCount = { $lte: body.countTo };
      }
    }
    if (body.search) {
      const key = regexpEscape(body.search);
      filter.$or = [
        { userEmail: new RegExp(key, 'i') },
        { userPhoneNumber: new RegExp(key, 'i') },
        { name: new RegExp(key, 'i') }
      ];
      // const idList = await UserSchema.find({ $or: [ { firstName: new RegExp(key, 'i') } , { lastName: new RegExp(key, 'i') } ] }).distinct('_id');
      // if (idList.length) {
      //   filter.$or.push({ user: { $in: idList } });
      // }
      if (this.isNumber(key)) {
        filter.$or.push({ nid: +key });
      }
    }
    if (body.status) filter.status = body.status;
    const itemCount = await RequestPackSchema.countByFilter(filter);
    if (itemCount === 0) return getResponse(true, 'Got request pack list', { itemList: [], itemCount, pageCount: 0 });
    const pageCount = Math.ceil(itemCount / body.limit);
    if (body.pageNo > pageCount) return getResponse(false, 'PageNo must be less or equal than ' + pageCount);
    const skip = (body.pageNo - 1) * body.limit;
    const sort: any = {};
    switch (body.sortBy) {
      case RequestPackSortEnum.count: {
        sort.requestCount = body.sortFrom;
        break;
      }
      case RequestPackSortEnum.nid: {
        sort.nid = body.sortFrom;
        break;
      }
      case RequestPackSortEnum.date: {
        sort.createdDt = body.sortFrom;
        break;
      }
      default: {
        sort.createdDt = -1;
        break;
      }
    }
    // const itemList = await RequestPackSchema.find(filter).select({
    //   _id: 1,
    //   nid: 1,
    //   status: 1,
    //   createdDt: 1,
    //   requestCount: 1,
    //   adminSeen: 1,
    //   userFirstName: 1,
    //   userLastName: 1
    // }).sort(sort).skip(skip).limit(body.limit);
    const itemList = await RequestPackSchema.getAdminList(filter, sort, skip, body.limit);
    
    return getResponse(true, 'Got request pack list', { itemList, itemCount, pageCount, });
  }

  public getRequestPackDetailsForAdmin = async(pack: IRequestPack<IUser, string>, query: IGetRequestPackDetailsForAdminQuery): Promise<IResponseModel> => {
    const item: any = {
      userPhoneNumber : pack.userPhoneNumber,
      userEmail       : pack.userEmail,
      userName        : pack.userLastName ? `${pack.userFirstName} ${pack.userLastName}` : pack.userFirstName,
      status          : pack.status
    };
    const filter = {
      _id: { $in: pack.requestList }
    };
    pack.adminSeen = true;
    const [packList] = await Promise.all([
      await RequestSchema.getListForAdmin(filter, +query.language),
      await pack.save()
    ]);
    item.requestList = await Promise.all(packList.map(async item => {
      if (item.products.length) {
        const products = await ProductSchema.getShortList({ _id: { $in: item.products } }, 0, null, +query.language);
        item.products = products;
      }
      return item;
    }));
    return getResponse(true, 'Got request pack details', item);
  }

  public cancelRequestPack = async(requestPack: IRequestPack): Promise<IResponseModel> => {
    requestPack.status = RequestPackStatusEnum.canceled;
    await Promise.all([
      await RequestSchema.updateMany({ _id: { $in: requestPack.requestList }, status: RequestStatusEnum.pending }, { status: RequestStatusEnum.canceled }),
      await requestPack.save(),
      await UserNotificationSchema.sendAdminNotification({ type: NotificationTypeEnum.requestCanceled, sender: requestPack.user, request: requestPack._id })
    ]);
    return getResponse(true, 'Request pack canceled');
  }

  public setRequestFailed = async(request: IRequestDoc): Promise<IResponseModel> => {
    request.status = RequestStatusEnum.failed;
    request.products = [];
    this.setRequestPackFinished(request.requestPack, request._id).catch(e => console.log(e));
    await request.save();
    if (request.user) {
      UserNotificationSchema.sendUserNotification({
        type: NotificationTypeEnum.requestFailed,
        userId: request.user,
        request: request.requestPack
      }).catch((e) => console.log(e));
    }
    // TODO Send email
    return getResponse(true, 'Status set');
  }

  public attachProductToRequest = async(body: IAttachProductToRequestBody): Promise<IResponseModel> => {
    const request = body.request;
    const newList = request.products.concat(body.productIdList);
    request.products = newList;
    await request.save();
    return getResponse(true, 'Product attached to request');
  }

  public detachProductFormRequest = async (body): Promise<IResponseModel> => {
    await RequestSchema.updateOne({ _id: body.productId }, { $pull: { products: body.productId } });
    return getResponse(true, 'Product detached');
  }

  public setRequestSucceed = async(request: IRequestDoc): Promise<IResponseModel> => {
    request.status = RequestStatusEnum.succeed;
    this.setRequestPackFinished(request.requestPack, request._id).catch(e => console.log(e));
    await request.save();
    // Send email
    if (request.user) {
      UserNotificationSchema.sendUserNotification({
        type: NotificationTypeEnum.requestSucceeded,
        userId: request.user,
        request: request.requestPack
      }).catch((e) => console.log(e));
    }
    return getResponse(true, 'Status set');
  }

  public getFileListRequest = async(body): Promise<IResponseModel> => {
    const { deviceId, userId } = body;
    const filter: any = {
      status: RequestStatusEnum.draft,
      type: RequestTypeEnum.fileList,
      requestPack: null
    };
    if (deviceId) {
      filter.deviceId = deviceId;
    } else if (userId) {
      filter.user = new ObjectID(userId);
    }
    const request = await RequestSchema.findOne(filter)
      .select({
        _id: 1,
        files: 1
      }).populate({
        path: 'files',
        select: {
          _id: 1,
          originalName: 1,
          path: 1,
          type: 1
        }
      }).lean();
    if (!request) {
      return getResponse(true, 'Missing request', null);
    }
    request.files.forEach(item => {
      if (item.path) {
        item.path = mainConfig.BASE_URL + item.path;
      }
    });
    return getResponse(true, 'Request is created', request);
  }

  private getMimeType(fileName: string): string {
    const split = fileName.split('.');
    return '.' + split[split.length - 1];
  }

  private async sortAndReNameFiles(files: IRequestFilesItem[], id: string) {
    const fileList = await Promise.all(files.map(async (file, index) => {
      let fileName = id + '-' + Date.now();
      let type = 0;
      switch (file.fieldname) {
        case 'doc': {
          fileName = `${mediaPaths.files}${index}${MediaTypeEnum.document}` + fileName;
          type = MediaTypeEnum.document;
          break;
        }
        case 'audio': {
          fileName = `${mediaPaths.audios}${index}${MediaTypeEnum.audio}` + fileName;
          type = MediaTypeEnum.audio;
          break;
        }
        case 'photo': {
          fileName = `${mediaPaths.photos}${index}${MediaTypeEnum.photo}` + fileName;
          type = MediaTypeEnum.photo;
          break;
        }
        case 'video': {
          fileName = `${mediaPaths.videos}${index}${MediaTypeEnum.video}` + fileName;
          type = MediaTypeEnum.video;
          break;
        }
      }
      const ext = this.getMimeType(file.originalname);
      if (file.fieldname === 'audio') {
        fs.renameSync(file.path, mainConfig.MEDIA_PATH + fileName + ext);
        await convert(fileName, ext);
        fileName += '.mp3';
      } else {
        fileName += ext;
        fs.renameSync(file.path, mainConfig.MEDIA_PATH + fileName);
      }
      const fileToSave = {
        type,
        path: fileName,
        request: id,
        originalName: file.originalname,
      };
      return fileToSave;
    }));
    return fileList;
  }

  private isNumber (string: string): boolean {
    let isNumber = true;
    for (let i = 0; i < string.length; i++) {
      const index = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].indexOf(string[i]);
      if (index === -1) {
        isNumber = false;
        break;
      }
    }
    return isNumber;
  }

  private setRequestPackFinished = async(packId: string, requestId: string) => {
    const request = await RequestSchema.findOne({ _id: { $ne: requestId }, requestPack: packId, status: RequestStatusEnum.pending });
    if (!request) {
      await RequestPackSchema.updateOne({ _id: packId }, { status: RequestPackStatusEnum.finished });
      // ? TODO Notify user
    }
  }

  private deleteFile = async (fileId: string): Promise<void> => {
    const file = await FileSchema.findById(fileId);
    if (file) {
      deleteFiles([file.path], true).catch(e => console.log(e));
      await FileSchema.deleteOne({ _id: fileId });
    }
  }

}

export default new RequestServices();