import { Socket } from 'socket.io';
import { ISocket } from './model';
import { UserTypeEnum } from '../constants/enums';

const adminStore = new Map<string, ISocket>();
const userStore = new Map<string, ISocket>();
const guestStore = new Map<string, ISocket>();

class SocketStore {

  public addToStore = (id: string, userType: number, socketObj: ISocket): void => {
    let currentStore: Map<string, ISocket>;
    switch (userType) {
      case UserTypeEnum.admin:
      case UserTypeEnum.superAdmin: {
        currentStore = adminStore;
        break;
      }
      case UserTypeEnum.user: {
        currentStore = userStore;
        break;
      }
      case UserTypeEnum.guest: {
        currentStore = guestStore;
        break;
      }
      default: {
        break;
      }
    }
    if (currentStore) currentStore.set(id, socketObj);
  }

  public emitAdmins = (idList: string[], eventName: string, payload: any): void => {
    idList = idList.map(item => item.toString());
    idList.forEach(id => {
      if (adminStore.has(id)) adminStore.get(id).emit(eventName, payload);
    });
  }

  public emitAllAdmins = (eventName: string, payload: any): void => {
    adminStore.forEach(socketObj => {
      socketObj.emit(eventName, payload);
    });
  }

  public emitGuests = (idList: string[], eventName: string, payload: any = null): void => {
    idList = idList.map(item => item.toString());
    idList.forEach(id => {
      if (guestStore.has(id)) guestStore.get(id).emit(eventName, payload);
    });
  }

  public emitUsers = (idList: string[], eventName: string, payload: any = null): void => {
    idList = idList.map(item => item.toString());
    idList.forEach(id => {
      if (userStore.has(id)) {
        userStore.get(id).emit(eventName, payload);
      }
    });
  }

  public deleteFromStore = (id: string, userType: number): void => {
    let currentStore: Map<string, ISocket>;
    switch (userType) {
      case UserTypeEnum.admin:
      case UserTypeEnum.superAdmin: {
        currentStore = adminStore;
        break;
      }
      case UserTypeEnum.user: {
        currentStore = userStore;
        break;
      }
      case UserTypeEnum.guest: {
        currentStore = guestStore;
        break;
      }
      default: {
        break;
      }
    }
    if (currentStore)
      if (currentStore.has(id)) currentStore.delete(id);
  }

}

export default new SocketStore();