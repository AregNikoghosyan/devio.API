import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';

import {
  ISocialLoginBody,
  ISendEmailBody,
  ICheckCodeBody,
  IRegisterWebUserBody,
  IRegisterAppUserBody,
  IRedirectEmailQuery,
  ILogInWebUserBody,
  ILogInAppUserBody,
  IRestorePasswordBody,
  ILoginAdminBody,
  ISetDevice,
  IChangeOldPassword,
} from './model';
import { IResponseModel, getResponse } from '../mainModels';

import SocialMedia, { ISocialMediaData } from '../../services/socialProviders';
import { sendVerificationEmail, sendForgotEmail } from '../../services/mailer';

import UserSchema from '../../schemas/user';
import UserPasswordSchema from '../../schemas/userPassword';
import DeviceSchema from '../../schemas/device';
import PartnerSchema from '../../schemas/partner';
import GuestUserSchema from '../../schemas/guestUser';
import OrderSchema from '../../schemas/order';
import ConversationSchema from '../../schemas/conversation';
import MessageSchema from '../../schemas/message';

import { SocialProviderEnum, UserTypeEnum, OsTypeEnum, LanguageEnum, OrderStatusEnum } from '../../constants/enums';
import { IUser } from '../../schemas/user/model';
import mainConfig from '../../env';
import { IUserPassword } from '../../schemas/userPassword/model';
import { verificationCodeLength, firstLoginBonus } from '../../constants/constants';
import { deleteFiles } from '../../services/fileManager';
import { sendVerificationCodeViaSMS } from '../../services/smsSender';

class AuthServices {

  public socialLogin = async (body: ISocialLoginBody): Promise<IResponseModel> => {
    const userData = await SocialMedia.getUserData(body.provider, body.token);
    let token = '',
      userId = '';
    if (userData) {
      userData.email = userData.email.toLowerCase();
      const user: IUser<IUserPassword> = await UserSchema.findOne({
        email: userData.email,
      }).populate({
        path: 'passwords',
        match: { provider: body.provider }
      });
      if (!user) {
        // User with email doesn't exist, create
        const newUser = await this.createUserFromSocial(userData, body.provider);
        syncWithGuest(newUser).catch(e => console.log(e));
        userId = newUser._id;
        token = this.assignToken(newUser, body.provider);
      } else if (user && user.role !== UserTypeEnum.user) {
        // Email is used by another user having other role
        return getResponse(false, 'Email is already in use');
      } else if (user && user.blocked) {
        return getResponse(false, 'Email is blocked');
      } else if (user && !user.passwords.length) {
        // User exists but logins with chosen provider for the 1st time, add provider password
        const updatedUser = await this.addSocialProviderToUser(user, userData, body.provider);
        userId = updatedUser._id;
        token = this.assignToken(updatedUser, body.provider);
      } else {
        // User exists and logins with chosen provider not for the 1st time, check password and give token
        userId = user._id;
        const currentPassword = user.passwords[0];
        // if (bcrypt.compareSync(this.reverse(userData.id), currentPassword.password)) {
        token = this.assignToken(user, body.provider);
        // } else {
        // return getResponse(false, 'Not unique identifier from provider');
        // }
      }
      let bonusCount = 0;
      if (body.osType !== OsTypeEnum.web) {
        const [user] = await Promise.all([
          await UserSchema.findOne({ _id: userId, loginBonusReceived: false }),
          await this.setDeviceForUser({
            deviceId: body.deviceId,
            deviceToken: body.deviceToken,
            language: body.language,
            osType: body.osType,
            userId: userId
          })
        ]);
        if (user) {
          user.loginBonusReceived = true;
          user.points += firstLoginBonus;
          bonusCount = firstLoginBonus;
          await user.save();
        }
      }
      return getResponse(true, 'Logged in successfully', { token, bonusCount });
    }
    else {
      return getResponse(false, 'Wrong token');
    }
  }

  public sendVerificationEmail = async (body: ISendEmailBody): Promise<IResponseModel> => {
    const code = this.generateVerificationCode(verificationCodeLength);
    const verificationCode = bcrypt.hashSync(code, 12);
    if (!body.isEmail) {
      const message = `Your verification code for ineed - ${code}. Use it to save your phone number`;
      sendVerificationCodeViaSMS(message, body.email).catch(e => console.log(e));
    } else {
      sendVerificationEmail(code, body.email, body.osType);
    }
    if (body.user) {
      body.user.verificationCode = verificationCode;
      await body.user.save();
    } else {
      if (body.isEmail) {
        const newUser = new UserSchema({
          email: body.email,
          role: UserTypeEnum.user,
          verificationCode: verificationCode
        });
        await newUser.save();
      } else {
        const newUser = new UserSchema({
          phoneNumber: body.email,
          role: UserTypeEnum.user,
          verificationCode: verificationCode
        });
        await newUser.save();
      }
    }
    return getResponse(true, 'Verification email sent');
  }

  public checkVerificationCode = async (body: ICheckCodeBody): Promise<IResponseModel> => {
    if (bcrypt.compareSync(body.code, body.user.verificationCode)) {
      return getResponse(true, 'Valid code', true);
    } else {
      return getResponse(true, 'InValid code', false);
    }
  }

  public registerUser = async (bodyData): Promise<IResponseModel> => {
    if (bcrypt.compareSync(bodyData.code, bodyData.user.verificationCode)) {
      const user: IUser<IUserPassword> = bodyData.user;
      if (!user.passwords.length) {
        // This means user is new, sync all guest orders with email
        syncWithGuest(user).catch(e => console.log(e));
      }
      if (!bodyData.isEmail) {
        bodyData.user.phoneVerified = true;
      }
      let bonusCount = 0;
      if (bodyData.osType === OsTypeEnum.web) {
        const body: IRegisterWebUserBody = bodyData;
        body.user.webLanguage = body.language;
        const password = new UserPasswordSchema({
          user: body.user._id,
          provider: SocialProviderEnum.local,
          password: bcrypt.hashSync(body.password, 12),
        });
        body.user.passwords.push(password._id);
        body.user.webLanguage = body.language;
        await Promise.all([
          await body.user.save(),
          await password.save()
        ]);
      } else {
        const body: IRegisterAppUserBody = bodyData;
        await this.setDeviceForUser({
          deviceId: body.deviceId,
          deviceToken: body.deviceToken,
          userId: body.user._id,
          language: body.language,
          osType: body.osType
        });
        const password = new UserPasswordSchema({
          user: body.user._id,
          provider: SocialProviderEnum.local,
          password: bcrypt.hashSync(body.password, 12),
        });
        if (!body.user.loginBonusReceived) {
          body.user.points += firstLoginBonus;
          body.user.loginBonusReceived = true;
          await body.user.save();
          bonusCount = firstLoginBonus;
        }
        body.user.passwords.push(password._id);
        await Promise.all([
          await body.user.save(),
          await password.save()
        ]);
      }
      const token = this.assignToken(bodyData.user, SocialProviderEnum.local);
      return getResponse(true, 'Registered successfully', { token, bonusCount });
    } else {
      return getResponse(false, 'Wrong verification code');
    }
  }

  public loginUser = async (bodyData): Promise<IResponseModel> => {
    if (bcrypt.compareSync(bodyData.password, bodyData.user.passwords[0].password)) {
      if (bodyData.osType === OsTypeEnum.web) {
        const body: ILogInWebUserBody = bodyData;
        const token = this.assignToken(body.user, SocialProviderEnum.local);
        return getResponse(true, 'Logged in successfully', { token, language: body.user.webLanguage });
      } else {
        const body: ILogInAppUserBody = bodyData;
        let bonusCount = 0;
        const [user] = await Promise.all([
          await UserSchema.findOne({ _id: body.user._id, loginBonusReceived: false }),
          await this.setDeviceForUser({
            deviceId: body.deviceId,
            deviceToken: body.deviceToken,
            userId: body.user._id,
            language: body.language,
            osType: body.osType
          })
        ]);
        if (user) {
          user.loginBonusReceived = true;
          user.points += firstLoginBonus;
          bonusCount = firstLoginBonus;
          await user.save();
        }
        const token = this.assignToken(body.user, SocialProviderEnum.local);
        return getResponse(true, 'Logged in successfully', { token, bonusCount });
      }
    }
    else {
      return getResponse(false, 'Wrong password');
    }
  }

  public sendForgotEmail = async (body: ISendEmailBody): Promise<IResponseModel> => {
    const code = this.generateVerificationCode(verificationCodeLength);
    const hashedCode = bcrypt.hashSync(code, 12);
    if (!body.isEmail) {
      const message = `Seems like you forgot your password for ineed market account. If that is true, please enter following - ${code} code to restore your account.`;
      sendVerificationCodeViaSMS(message, body.email).catch(e => console.log(e));
    } else {
      sendForgotEmail(code, body.email, body.osType);
    }
    body.user.restoreCode = hashedCode;
    await body.user.save();
    return getResponse(true, 'Verification email sent');
  }

  public checkForgotCode = async (body: ICheckCodeBody): Promise<IResponseModel> => {
    if (bcrypt.compareSync(body.code, body.user.restoreCode)) {
      return getResponse(true, 'Valid code', true);
    } else {
      return getResponse(true, 'InValid code', false);
    }
  }

  public restorePassword = async (body: IRestorePasswordBody): Promise<IResponseModel> => {
    body.user.restoreCode = null;
    if (body.osType !== OsTypeEnum.web) {
      await this.setDeviceForUser({
        deviceId: body.deviceId,
        deviceToken: body.deviceToken,
        userId: body.user._id,
        language: body.language,
        osType: body.osType
      });
    }
    await Promise.all([
      await body.user.save(),
      await UserPasswordSchema.findOneAndUpdate({
        user: body.user._id,
        provider: SocialProviderEnum.local
      },
        {
          password: bcrypt.hashSync(body.password, 12)
        })
    ]);
    const token = this.assignToken(body.user, SocialProviderEnum.local);
    if (body.osType === OsTypeEnum.web) {
      return getResponse(true, 'Password updated', { token, language: body.user.webLanguage ? body.user.webLanguage : LanguageEnum.hy });
    } else {
      let bonusCount = 0;
      if (!body.user.loginBonusReceived) {
        bonusCount = firstLoginBonus;
        body.user.loginBonusReceived = true;
        body.user.points += firstLoginBonus;
        await body.user.save();
      }
      return getResponse(true, 'Password updated', { token, bonusCount });
    }
  }

  public loginAdmin = async (body: ILoginAdminBody): Promise<IResponseModel> => {
    if (bcrypt.compareSync(body.password, body.admin.passwords[0].password)) {
      const token = this.assignToken(body.admin, SocialProviderEnum.local);
      if (body.admin.role === 5) {
        const partner = await PartnerSchema.findOne({ user: body.admin.id });
        if (partner.hidden)
          return getResponse(false, 'Your account is not accepted yet');
        return getResponse(true, 'Logged in', {
          token: token,
          role: body.admin.role,
          personId: partner.id
        });
      }
      return getResponse(true, 'Logged in', {
        token: token,
        role: body.admin.role
      });
    } else {
      return getResponse(false, 'Wrong password');
    }
  }

  public logOut = async (userId: string, token: string): Promise<IResponseModel> => {
    await DeviceSchema.updateOne({ user: userId, deviceToken: token }, { deviceToken: null });
    return getResponse(true, 'Logged out', true);
  }

  public changePassword = async (body: IChangeOldPassword, userId: string) => {
    const userPassword = await UserPasswordSchema.findOne({
      user: userId,
      provider: SocialProviderEnum.local
    });
    if (userPassword) {      
        userPassword.password = bcrypt.hashSync(body.password, 12);
        await userPassword.save();     
    }
    return getResponse(true, 'User password was changed successfully', true);
  }

  private async createUserFromSocial(data: ISocialMediaData, provider: number): Promise<IUser> {
    const user = await new UserSchema({
      email: data.email,
      role: UserTypeEnum.user,
      firstName: data.firstName,
      lastName: data.lastName,
      fullName: getName(data.firstName, data.lastName)
    });
    const password = await new UserPasswordSchema({
      user: user._id,
      provider,
      password: bcrypt.hashSync(this.reverse(data.id), 12)
    });
    user.passwords.push(password._id);
    await Promise.all([
      await user.save(),
      await password.save()
    ]);
    return user;
  }

  private async addSocialProviderToUser(user: IUser<any>, data: ISocialMediaData, provider: number): Promise<IUser> {
    const password = new UserPasswordSchema({
      user: user._id,
      provider,
      password: bcrypt.hashSync(this.reverse(data.id), 12)
    });
    user.passwords.push(password._id);
    await Promise.all([
      await password.save(),
      await user.save()
    ]);
    return user;
  }

  private assignToken(user: IUser<any>, provider: number = SocialProviderEnum.local): string {
    const token = jwt.sign({ _id: user._id, role: user.role, provider }, mainConfig.JWT_SECRET, { expiresIn: '14d' });
    return token;
  }

  private reverse(toReverseString: string): string {
    const arr = toReverseString.split('');
    arr.reverse();
    return arr.join('');
  }

  private generateVerificationCode = (length: number) => {
    const charset = '0123456789';
    let text = '';
    for (let i = 0; i < length; i++) {
      const char = charset.charAt(Math.ceil(Math.random() * (charset.length - 1)));
      text += char;
    }
    return text;
  }

  private setDeviceForUser = async (details: ISetDevice) => {
    const newDevice = new DeviceSchema({
      user: details.userId,
      osType: details.osType,
      language: details.language,
      deviceId: details.deviceId,
      deviceToken: details.deviceToken
    });
    await Promise.all([
      await newDevice.save(),
      await DeviceSchema.deleteMany({ deviceId: details.deviceId, _id: { $ne: newDevice._id } }),
      await DeviceSchema.updateMany({ user: details.userId }, { language: details.language }),
      await UserSchema.updateOne({ _id: details.userId }, { webLanguage: details.language })
    ]);
  }

}

function getName(firstName: string, lastName) {
  if (firstName && lastName) return `${firstName} ${lastName}`;
  if (firstName) return firstName;
  if (lastName) return lastName;
  return null;
}

async function syncWithGuest(user: IUser<any>) {
  const guestUser = await GuestUserSchema.findOne({
    email: user.email
  });
  if (guestUser) {
    user.finishedOrderCount = guestUser.finishedOrderCount;
    user.canceledOrderCount = guestUser.canceledOrderCount;
    const [count] = await Promise.all([
      await OrderSchema.countDocuments({ guestUser: guestUser._id, status: { $ne: OrderStatusEnum.draft } }),
      await OrderSchema.updateMany({ guestUser: guestUser._id, status: { $ne: OrderStatusEnum.draft } }, {
        guestUser: null,
        user: user._id
      })
    ]);
    user.orderCount = count;
    // delete guest user, conversation ,messages
    const conversation = await ConversationSchema.findOne({ guest: guestUser._id });
    if (conversation) {
      const filePaths = await MessageSchema.find({
        conversation: conversation._id,
        file: { $ne: null }
      }).distinct('file');
      deleteFiles(filePaths, true);
      await Promise.all([
        await MessageSchema.deleteMany({ conversation: conversation._id }),
        await ConversationSchema.deleteOne({ _id: conversation._id })
      ]);
    }
    await GuestUserSchema.deleteOne({ _id: guestUser._id });
    await user.save();
  }
}

export default new AuthServices();