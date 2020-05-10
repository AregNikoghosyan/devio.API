import * as jwt from 'jsonwebtoken';

import SocketStore   from './store';
import SocketHandler from './handler';
import { ISocket }   from './model';

import APIError   from '../services/APIError';
import mainConfig from '../env';

import { IJwtDetails } from '../api/jwtValidation';

import UserSchema      from '../schemas/user';
import GuestUserSchema from '../schemas/guestUser';
import { UserTypeEnum } from '../constants/enums';
import { socketEventKeys } from '../constants/constants';

const socketMainHandler = async(socket: ISocket) => {
  try {
    const bearerToken: string = socket.handshake.query.authorization;
    const deviceId: string    = socket.handshake.query.deviceId;
    const webGuest: boolean   = socket.handshake.query.webGuest;
    const guestId: string    = socket.handshake.query.guestId;
    if (!bearerToken) {
      if (deviceId) {
        socket.deviceId = deviceId;
        socket.userType = UserTypeEnum.guest;
        SocketStore.addToStore(deviceId, UserTypeEnum.guest, socket);
      } else if (webGuest) {
        if (guestId) {
          const guest = await GuestUserSchema.findById(guestId);
          if (guest) {
            socket.guestId = guest._id;
            socket.userType = UserTypeEnum.guest;
            return SocketStore.addToStore(guest._id.toString(), UserTypeEnum.guest, socket);
          }
        }
        const guest = new GuestUserSchema();
        socket.guestId = guest._id;
        socket.userType = UserTypeEnum.guest;
        SocketStore.addToStore(guest._id.toString(), UserTypeEnum.guest, socket);
        await guest.save();
        socket.emit(socketEventKeys.yourId, guest._id);
      } else {
        return socket.disconnect();
      }
    } else {
      const token = bearerToken.replace('%20', ' ').slice(7);
      jwt.verify(token, mainConfig.JWT_SECRET, async(err, details: IJwtDetails) => {
        if (err) {
          return socket.disconnect();
        }
        const user = await UserSchema.findOne({ _id: details._id, role: details.role });
        if (!user) {
          return socket.disconnect();
        }
        socket.userId = user._id;
        socket.userType = details.role;
        SocketStore.addToStore(user._id.toString(), details.role, socket);
        SocketHandler(socket);
      });
    }
  } catch (e) {
    new APIError(e, 500, 'socketHandler function in socketServer/index.ts');
    return socket.disconnect();
  }
};

export default socketMainHandler;