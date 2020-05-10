import { IUser } from '../../schemas/user/model';
import { IUserPassword } from '../../schemas/userPassword/model';

export interface ISocialLoginBody {
  osType: number;
  provider: number;
  token: string;
  language: number;
  deviceId: string;
  deviceToken: string;
}

export interface ISendEmailBody {
  osType: number;
  email: string;
  user?: IUser<IUserPassword>;
  isEmail: boolean;
}

export interface ICheckCodeBody {
  email: string;
  code: string;
  user?: IUser<IUserPassword>;
}

export interface IChangeOldPassword {
  password: string;
  confirmPassword: string;
  oldPassword: string;
}

export interface ILogInWebUserBody {
  osType: number;
  email: string;
  password: string;
  user: IUser<IUserPassword>;
}

export interface ILogInAppUserBody extends ILogInWebUserBody {
  deviceId: string;
  deviceToken: string;
  language: number;
}

export interface ILoginAdminBody {
  email: string;
  password: string;
  admin: IUser<IUserPassword>;
}

export interface IRegisterAppUserBody extends ILogInAppUserBody {
  code: string;
}

export interface IRegisterWebUserBody extends ILogInWebUserBody {
  language: number;
  code: string;
}

export interface IRedirectEmailQuery {
  email: string;
  code: string;
}

export interface IRestorePasswordBody {
  osType: number;
  email: string;
  code: string;
  password: string;
  user: IUser<IUserPassword>;
  language: number;
  deviceId: string;
  deviceToken: string;
}

export interface ISetDevice {
  userId: string;
  osType: number;
  language: number;
  deviceId: string;
  deviceToken: string;
}