import * as fs from 'fs';

import mainConfig from '../../env';

import SocketStore        from '../../socketServer/store';

import ConversationSchema from '../../schemas/conversation';
import MessageSchema      from '../../schemas/message';
import FileSchema         from '../../schemas/file';
import UserSchema         from '../../schemas/user';

import { IUser } from '../../schemas/user/model';
import { IFile } from '../../schemas/file/model';

import { IResponseModel, getResponse } from '../mainModels';

import {
  IGetMessagesQuery,
  ICreateEmptyConversationBody,
  ISendAnswerForAdminBody,
  ISendMessageForUserOrDeviceBody,
  ISendMessageForWebGuestBody,
  IGetConversationListQuery,
  IGetMessageListForAdminQuery,
  IGetMessageListForUserOrDeviceQuery,
  IGetMessageListForWebGuestQuery } from './model';

import {
  UserTypeEnum,
  MediaTypeEnum,
  MessageMediaTypeEnum,
  MessageTypeEnum } from '../../constants/enums';

import { mediaPaths, socketEventKeys }       from '../../constants/constants';
import { IMessage } from '../../schemas/message/model';
import { ObjectId } from 'mongodb';
import { regexpEscape } from '../mainValidation';


class ConversationServices {

  public getMessages = async(user: IUser, query: IGetMessagesQuery): Promise<IResponseModel> => {
    let conversationId = '';
    if (user) {
      if (user.role === UserTypeEnum.user) {
        const conversation = await ConversationSchema.findOne({ user: user._id });
        if (conversation) conversationId = conversation._id;
      } else {
        conversationId = query.conversationId;
      }
    } else {
      const conversation = await ConversationSchema.findOne({ deviceId: query.deviceId });
      if (conversation) conversationId = conversation._id;
    }
    if (!conversationId) {
      const template = MessageSchema.getTemplateMessage(+query.language);
      const data = {
        itemList  : [ template ],
        pagesLeft : false
      };
      return getResponse(true, 'Got messages', data);
    }
    const filter = {
      conversation: conversationId
    };
    const itemCount = await MessageSchema.countDocuments(filter);
    const pageCount = Math.ceil(itemCount / +query.limit);
    if (pageCount === 0) {
      const template = await MessageSchema.getTemplateMessage(+query.language);
      return getResponse(true, 'Got message list', { itemList: [template], pagesLeft: false });
    } else {
      if (+query.pageNo > pageCount) return getResponse(false, 'PageNo must be less or equal than ' + pageCount);
      const skip = (+query.pageNo - 1) * +query.limit;
      const itemList = await MessageSchema.getList(filter, skip, +query.limit);
      return getResponse(true, 'Got message list', { itemList, pagesLeft: +query.pageNo !== pageCount });
    }
  }

  public createEmptyConversation = async(body: ICreateEmptyConversationBody): Promise<IResponseModel> => {
    const conversation = new ConversationSchema({
      guest: body.guestId
    });
    await conversation.save();
    return getResponse(true, 'Empty conversation created', conversation._id);
  }

  public sendAnswerForAdmin = async(admin: IUser, body: ISendAnswerForAdminBody, file: Express.Multer.File): Promise<IResponseModel> => {
    if (body.message )body.message = body.message.trim();
    const newMessage = new MessageSchema({
      conversation: body.conversationId,
      sender: admin._id,
      messageType: MessageTypeEnum.answer,
    });
    let filePath = null;
    if (file) {
      const { fileObj, messageMediaType } = await this.createMessageFile(file, newMessage._id);
      newMessage.file = fileObj._id;
      filePath = mainConfig.BASE_URL + fileObj.path;
      newMessage.messageMediaType = messageMediaType;
    } else {
      newMessage.message = body.message;
    }
    await Promise.all([
      await newMessage.save(),
      await ConversationSchema.updateOne({ _id: body.conversationId }, { $inc: { messageCount: 1 }, updatedDt: Date.now() })
    ]);
    this.emitParticipant(body.conversationId, newMessage, filePath).catch(e => console.log(e));
    return getResponse(true, 'ok', {
      _id: newMessage._id,
      messageMediaType: newMessage.messageMediaType,
      message: newMessage.message,
      messageType: newMessage.messageType,
      createdDt: newMessage.createdDt,
      filePath
    });
  }

  public sendMessageForUserOrDevice = async(user: IUser, body: ISendMessageForUserOrDeviceBody, file: Express.Multer.File): Promise<IResponseModel> => {
    if (body.message )body.message = body.message.trim();
    const filter: any = {};
    if (!user) {
      filter.deviceId = body.deviceId;
    } else {
      filter.user = user._id;
    }
    let conversationId;
    const conversation = await ConversationSchema.findOne(filter);
    if (!conversation) {
      const newConversation = await ConversationSchema.create({
        ...filter
      });
      conversationId = newConversation._id;
    } else {
      conversationId = conversation._id;
    }
    const newMessage = new MessageSchema({
      conversation: conversationId,
      messageType: MessageTypeEnum.question,
    });
    if (user) {
      newMessage.sender = user._id;
    }
    let filePath = null;
    if (file) {
      const { fileObj, messageMediaType } = await this.createMessageFile(file, newMessage._id);
      newMessage.file = fileObj._id;
      filePath = mainConfig.BASE_URL + fileObj.path;
      newMessage.messageMediaType = messageMediaType;
    } else {
      newMessage.message = body.message;
    }
    await Promise.all([
      await newMessage.save(),
      await ConversationSchema.updateOne({ _id: conversationId }, { $inc: { messageCount: 1 }, updatedDt: Date.now() })
    ]);
    this.emitParticipant(conversationId, newMessage, filePath).catch(e => console.log(e));
    return getResponse(true, 'ok', {
      conversationId,
      message: {
        _id              : newMessage._id,
        messageMediaType : newMessage.messageMediaType,
        message          : newMessage.message,
        messageType      : newMessage.messageType,
        createdDt        : newMessage.createdDt,
        filePath
      }
    });
  }

  public sendMessageForWebGuest = async(body: ISendMessageForWebGuestBody, file: Express.Multer.File): Promise<IResponseModel> => {
    if (body.message )body.message = body.message.trim();
    const newMessage = new MessageSchema({
      conversation: body.conversation._id,
      messageType: MessageTypeEnum.question,
    });
    let filePath = null;
    if (file) {
      const { fileObj, messageMediaType } = await this.createMessageFile(file, newMessage._id);
      newMessage.file = fileObj._id;
      filePath = mainConfig.BASE_URL + fileObj.path;
      newMessage.messageMediaType = messageMediaType;
    } else {
      newMessage.message = body.message;
    }
    await Promise.all([
      await newMessage.save(),
      await ConversationSchema.updateOne({ _id: body.conversation._id }, { $inc: { messageCount: 1 }, updatedDt: Date.now() })
    ]);
    this.emitParticipant(body.conversation._id, newMessage, filePath).catch(e => console.log(e));
    return getResponse(true, 'ok', newMessage);
  }

  public getConversationList = async(query: IGetConversationListQuery): Promise<IResponseModel> => {
    const filter: any = { messageCount: { $gt: 0 } };
    if (query.search) {
      const key = regexpEscape(query.search);
      const [ conversationIdList, userIdList ] = await Promise.all([
        await MessageSchema.find({ message: new RegExp(key, 'i') }).distinct('conversation'),
        await UserSchema.findByName(key)
      ]);
      filter.$or = [
        { _id: { $in: conversationIdList } },
        { user: { $in: userIdList } }
      ];
    }
    const count = await ConversationSchema.countDocuments(filter);
    if (count === 0) return getResponse(true, 'Conversation list get', []);
    if (+query.skip > count - 1) return getResponse(false, `Skip must be less than ${count - 1}`);
    const itemList = await ConversationSchema.getListForAdmin(filter, +query.language, +query.skip, +query.limit);
    return getResponse(true, 'Conversation list get', itemList);
  }

  public getMessageListForAdmin = async(query: IGetMessageListForAdminQuery) => {
    const filter: any = { conversation: new ObjectId(query.id) };
    const count = await MessageSchema.countDocuments(filter);
    if (count === 0) return getResponse(true, 'Message list get', { itemList: [], pagesLeft: false});
    if (+query.skip > count - 1) return getResponse(false, `Skip must be less than ${count - 1}`);
    const itemList = await MessageSchema.getList(filter, +query.skip, +query.limit);
    filter.messageType = MessageTypeEnum.question;
    MessageSchema.updateMany(filter, { seen: true }).catch(e => console.log(e));
    const pagesLeft = +query.skip + itemList.length !== count;
    return getResponse(true, 'Message list get', { itemList, pagesLeft });
  }

  public getMessageListForUserOrDevice = async(user: IUser, query: IGetMessageListForUserOrDeviceQuery) => {
    query.language = +query.language;
    query.skip     = +query.skip;
    query.limit    = +query.limit;
    const filter: any = {};
    if (user) {
      filter.user = user._id;
    } else {
      filter.deviceId = query.deviceId;
    }
    const [ conversation, message ] = await Promise.all([
      await ConversationSchema.findOne(filter),
      await MessageSchema.getTemplateMessage(+query.language)
    ]);
    if (!conversation) {
      return getResponse(true, 'Got messages', { itemList: [message], itemsLeft: false, conversationId: null });
    }
    const messageFilter: any = {
      conversation: conversation._id
    };
    let itemsLeft = true;
    const count = await MessageSchema.countDocuments(messageFilter);
    if (count === 0) {
      return getResponse(true, 'Got messages', { itemList: [message], itemsLeft: false, conversationId: null });
    } else {
      if (query.skip >= count + 1) {
        return getResponse(false, 'Too high skip');
      }
    }
    const itemList = await MessageSchema.getList(messageFilter, query.skip, query.limit);
    if (query.limit > itemList.length || !itemList.length) {
      itemsLeft = false;
      itemList.push(message);
    }
    messageFilter.messageType = MessageTypeEnum.answer;
    MessageSchema.updateMany(messageFilter, { seen: true }).catch(e => console.log(e));
    return getResponse(true, 'Got messages', { itemList, itemsLeft, conversationId: conversation._id });
  }

  public getMessageListForWebGuest = async(query: IGetMessageListForWebGuestQuery) => {
    query.language = +query.language;
    query.pageNo     = +query.pageNo;
    query.limit    = +query.limit;
    const message = await MessageSchema.getTemplateMessage(+query.language);
    const messageFilter: any = {
      conversation: new ObjectId(query.conversation._id)
    };
    let itemsLeft = true;
    const count = await MessageSchema.countDocuments(messageFilter);
    if (count === 0) {
      return getResponse(true, 'Got messages', { itemList: [message], itemsLeft: false });
    }
    const pageCount = Math.ceil(count / query.limit);
    if (query.pageNo > pageCount) return getResponse(false, 'Too high page no');
    const skip = (query.pageNo - 1) * query.limit;
    const itemList = await MessageSchema.getList(messageFilter, skip, query.limit);
    if (query.limit > itemList.length || !itemList.length) {
      itemsLeft = false;
      itemList.push(message);
    }
    messageFilter.messageType = MessageTypeEnum.answer;
    MessageSchema.updateMany(messageFilter, { seen: true }).catch(e => console.log(e));
    return getResponse(true, 'Got messages', { itemList, itemsLeft });
  }

  public getAdminBadge = async(): Promise<IResponseModel> => {
    const idList = await MessageSchema.find({ messageType: MessageTypeEnum.question, seen: false }).distinct('conversation');
    return getResponse(true, 'Got badge', idList.length);
  }

  public getUserBadge = async(user: IUser, deviceId: string): Promise<IResponseModel> => {
    const filter: any = {};
    if (user) {
      filter.user = user._id;
    } else {
      filter.deviceId = deviceId;
    }
    const conversation = await ConversationSchema.findOne(filter);
    if (!conversation) {
      return getResponse(true, 'Got badge', 0);
    } else {
      const count = await MessageSchema.countDocuments({ conversation: conversation._id, messageType: MessageTypeEnum.answer, seen: false });
      return getResponse(true, 'Got badge', count);
    }
  }

  private createMessageFile = async(file: Express.Multer.File, messageId: string): Promise<{ fileObj: IFile, messageMediaType: number }>  => {
    const mimeType = file.mimetype.slice(0, 5);
    let fileName = '';
    if (mimeType === 'image') {
      fileName = mediaPaths.photos;
    } else {
      fileName = mediaPaths.audios;
    }
    fileName = fileName + messageId + '-' + Date.now() + this.getMimeType(file.filename);
    const newFile = new FileSchema({
      type: mimeType === 'image' ? MediaTypeEnum.photo : MediaTypeEnum.audio,
      path: fileName,
      message: messageId
    });
    fs.rename(file.path, mainConfig.MEDIA_PATH + fileName, () => {});
    const messageMediaType = mimeType === 'image' ? MessageMediaTypeEnum.photo : MessageMediaTypeEnum.audio;
    await newFile.save();
    return { fileObj: newFile, messageMediaType };
  }

  private emitParticipant = async(conversationId: string, message: IMessage, filePath: string) => {
    if (message.messageType == MessageTypeEnum.answer) {
      const userMessageObj = {
        _id: message._id,
        messageMediaType: message.messageMediaType,
        message: message.message,
        messageType: message.messageType,
        createdDt: message.createdDt,
        filePath: filePath
      };
      const conversation = await ConversationSchema.findById(conversationId);
      if (conversation.user) {
        SocketStore.emitUsers([conversation.user], socketEventKeys.newMessage, userMessageObj);
      } else if (conversation.guest) {
        SocketStore.emitGuests([conversation.guest], socketEventKeys.newMessage, userMessageObj);
      } else if (conversation.deviceId) {
        SocketStore.emitGuests([conversation.deviceId], socketEventKeys.newMessage, userMessageObj);
      }
    } else {
      const adminMessageObj = {
        _id: message._id,
        messageMediaType: message.messageMediaType,
        message: message.message,
        messageType: message.messageType,
        createdDt: message.createdDt,
        filePath: filePath
      };
      SocketStore.emitAllAdmins(socketEventKeys.newMessage, { message: adminMessageObj, conversationId });
    }
  }

  private getMimeType(fileName: string) {
    const split = fileName.split('.');
    return '.' + split[split.length - 1];
  }

}

export default new ConversationServices();