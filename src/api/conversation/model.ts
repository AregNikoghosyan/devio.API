import { IIdInQuery, ISkipPaginationQuery, ILanguageInQuery, IPaginationQuery } from '../mainModels';
import { IConversation } from '../../schemas/conversation/model';

export interface IGetMessagesQuery {
  pageNo: number;
  limit: number;
  language?: number;
  deviceId?: string;
  conversationId?: string;
}

export interface ISendMessageBody {
  message: string;
}


export interface ICreateEmptyConversationBody {
  guestId: string;
}

export interface ISendAnswerForAdminBody extends ISendMessageBody {
  conversationId: string;
}

export interface ISendMessageForUserOrDeviceBody extends ISendMessageBody {
  deviceId: string;
}

export interface ISendMessageForWebGuestBody extends ISendMessageBody {
  guestId: string;
  // conversationId: string;
  conversation: IConversation;
}

export interface IGetConversationListQuery extends ISkipPaginationQuery, ILanguageInQuery {
  search: string;
}

export interface IGetMessageListForAdminQuery extends IIdInQuery, ISkipPaginationQuery {

}

export interface IGetMessageListForUserOrDeviceQuery extends ISkipPaginationQuery, ILanguageInQuery {
  deviceId?: string;
}

export interface IGetMessageListForWebGuestQuery extends IPaginationQuery, ILanguageInQuery {
  guestId: string;
  // conversationId: string;
  conversation: IConversation;
}