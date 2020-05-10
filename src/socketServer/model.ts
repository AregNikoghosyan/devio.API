import { Socket } from 'socket.io';

export interface ISocketUserMapObj {
  id: string;
  socketObj: Socket;
}

export interface ISocket extends Socket {
  userId?: string;
  guestId?: string;
  deviceId?: string;
  userType: number;
}