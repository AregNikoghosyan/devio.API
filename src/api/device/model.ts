import { IDevice } from '../../schemas/device/model';

export interface IChangePermissionBody {
  type: number;
  deviceId?: string;
  deviceToken?: string;
  device: IDevice;
}

export interface ICreateDeviceBody {
  osType: number;
  language: number;
  deviceId: string;
  deviceToken: string;
}

export interface IChangeLanguageBody {
  language: number;
  deviceId?: string;
  deviceToken?: string;
  device: IDevice;
}

export interface ISetDeviceTokenBody {
  deviceId: string;
  deviceToken: string;
  device: IDevice;
}