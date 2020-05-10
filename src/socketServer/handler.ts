import { ISocket } from './model';
import SocketStore from './store';
import { MessageTypeEnum } from '../constants/enums';
import { socketEventKeys } from '../constants/constants';

import ConversationSchema from '../schemas/conversation';
import MessageSchema      from '../schemas/message';
import { IMessage } from '../schemas/message/model';
import { IConversation } from '../schemas/conversation/model';

const typingHandler = async(data: { conversationId: string, messageType: number }) => {
  const { conversationId, messageType } = data;
  const key = socketEventKeys.typing;
  if (messageType === MessageTypeEnum.question) {
    SocketStore.emitAllAdmins(key, conversationId);
  } else {
    const conversation = await ConversationSchema.findById(conversationId);
    if (conversation.user) {
      SocketStore.emitUsers([ conversation.user ], key);
    } else if (conversation.guest) {
      SocketStore.emitGuests([ conversation.guest ], key);
    } else {
      SocketStore.emitGuests([ conversation.deviceId ], key);
    }
  }
};

const seenHandler = async(id: string) => {
  const message: IMessage<IConversation, string, string> = await MessageSchema.findById(id).populate('conversation');
  if (message) {
    message.seen = true;
    const key = socketEventKeys.seen;
    if (message.conversation) {
      if (message.messageType === MessageTypeEnum.question) {
        SocketStore.emitAllAdmins(key, message.conversation._id);
      } else {
        if (message.conversation.user) {
          SocketStore.emitUsers([ message.conversation.user ], key);
        } else if (message.conversation.guest) {
          SocketStore.emitGuests([ message.conversation.guest ], key);
        } else {
          SocketStore.emitGuests([ message.conversation.deviceId ], key);
        }
      }
    }
  }
};

const socketHandler = (socket: ISocket) => {

  socket.on(socketEventKeys.typing, typingHandler);

  socket.on(socketEventKeys.disconnect, () => {
    if (socket.userId) {
      SocketStore.deleteFromStore(socket.userId, socket.userType);
    } else if (socket.guestId) {
      SocketStore.deleteFromStore(socket.guestId, socket.userType);
    } else if (socket.deviceId) {
      SocketStore.deleteFromStore(socket.deviceId, socket.userType);
    }
  });

  socket.on(socketEventKeys.seen, seenHandler);

};

export default socketHandler;