import * as Joi from 'joi';
import * as bcrypt from 'bcrypt';
import { Response, NextFunction } from 'express';
import { IRequest, getResponse, getErrorResponse } from '../mainModels';
import APIError from '../../services/APIError';
import { ISocialLoginBody, ISendEmailBody, ICheckCodeBody, IRedirectEmailQuery, IRestorePasswordBody, ILoginAdminBody } from './model';
import Safe from '../../services/safer';

import UserSchema from '../../schemas/user';
import { SocialProviderEnum, UserTypeEnum, LanguageEnum, OsTypeEnum } from '../../constants/enums';
import { verificationCodeLength } from '../../constants/constants';
import { IUserPassword } from '../../schemas/userPassword/model';
import { IUser } from '../../schemas/user/model';
import { phoneNumberRegex, pagingValidation, idValidation, languageValidation } from '../mainValidation';

export const socialLogin = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const body: ISocialLoginBody = req.body;
    const bodyValidationSchema: any = {
      osType: Joi.number().min(1).max(3).required(),
      provider: Joi.number().min(1).max(3).required(),
      token: Joi.string().required()
    };
    if (req.body.osType !== OsTypeEnum.web) {
      bodyValidationSchema.deviceId = Joi.string().required();
      bodyValidationSchema.deviceToken = Joi.string().optional();
      bodyValidationSchema.language = Joi.number().min(1).max(3).required();
    }
    const result = Joi.validate(body, bodyValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    return next();
  } catch (e) {
    new APIError(e, 500, 'socialLogin function in auth/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const sendVerificationEmail = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const body: ISendEmailBody = req.body;
    let bodyValidationSchema = {
      osType: Joi.number().min(1).max(3).required(),
      email: Joi.string().email().required(),
    };
    body.email = body.email.toLowerCase();
    let result = Joi.validate(body, bodyValidationSchema);
    if (result.error) {
      bodyValidationSchema = {
        osType: Joi.number().min(1).max(3).required(),
        email: Joi.string().regex(phoneNumberRegex).allow('').required(),
      };
      result = Joi.validate(body, bodyValidationSchema);
      if (result.error) {
        return res.send(getResponse(false, result.error.details[0].message));
      }
      else {
        const user = await UserSchema.findOne({ phoneNumber: body.email }).populate({
          path: 'passwords',
          match: { provider: SocialProviderEnum.local }
        });
        if (user && (user.role !== UserTypeEnum.user || user.passwords.length)) {
          return res.send(getResponse(false, 'Phone number is already being used'));
        }
        req.body.user = user;
        req.body.isEmail = false;
      }
    } else {
      const user = await UserSchema.findOne({ email: body.email }).populate({
        path: 'passwords',
        match: { provider: SocialProviderEnum.local }
      });
      if (user && (user.role !== UserTypeEnum.user || user.passwords.length)) {
        return res.send(getResponse(false, 'Email is already being used'));
      }
      req.body.user = user;
      req.body.isEmail = true;
    }
    return next();
  } catch (e) {
    new APIError(e, 500, 'verifyEmail function in auth/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const checkVerificationCode = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const body: ICheckCodeBody = req.body;
    const bodyValidationSchema = {
      email: Joi.string().email().required(),
      code: Joi.string().length(verificationCodeLength).required()
    };
    const result = Joi.validate(body, bodyValidationSchema);

    if (result.error) {
      const bodyValidationSchema = {
        email: Joi.string().regex(phoneNumberRegex).allow('').required(),
        code: Joi.string().length(verificationCodeLength).required()
      };
      const result = Joi.validate(body, bodyValidationSchema);
      if (result.error) {
        return res.send(getResponse(false, result.error.details[0].message));
      } else {
        body.email = body.email.toLowerCase();
        const user = await UserSchema.findOne({ phoneNumber: body.email, role: UserTypeEnum.user }).populate({
          path: 'passwords',
          match: { provider: SocialProviderEnum.local }
        });
        if (!user || user.passwords.length || !user.verificationCode) {
          return res.send(getResponse(false, 'Wrong phone number'));
        }
        req.body.user = user;
      }
    } else {
      body.email = body.email.toLowerCase();
      const user = await UserSchema.findOne({ email: body.email, role: UserTypeEnum.user }).populate({
        path: 'passwords',
        match: { provider: SocialProviderEnum.local }
      });
      if (!user || user.passwords.length || !user.verificationCode) {
        return res.send(getResponse(false, 'Wrong email'));
      }
      req.body.user = user;
    }

    return next();
  } catch (e) {
    new APIError(e, 500, 'checkVerificationCode function in auth/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const registerUser = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    if (req.body.osType && !isNaN(req.body.osType) && req.body.osType >= 1 && req.body.osType <= 3) {
      let isEmail = false;
      const body = req.body;
      let emailValidation = Joi.validate({ email: body.email }, { email: Joi.string().email().required() });
      if (emailValidation.error) {
        const phoneValidation = Joi.validate({ email: body.email }, { email: Joi.string().regex(phoneNumberRegex).allow('').required() });
        if (phoneValidation.error)
          return res.send(getResponse(false, 'Please check correctness of email or phone number'));
        else isEmail = false;
      } else isEmail = true;

      const bodyValidationSchema: any = {
        osType: Joi.number().min(1).max(3).required(),
        password: Joi.string().min(6).required(),
        language: Joi.number().min(1).max(3).required(),
        code: Joi.string().length(verificationCodeLength).required()
      };

      body.email = body.email.toLowerCase();
      if (isEmail)
        bodyValidationSchema.email = Joi.string().email().required();
      else bodyValidationSchema.email = Joi.string().regex(phoneNumberRegex).allow('').required();

      if (req.body.osType !== OsTypeEnum.web) {
        bodyValidationSchema.deviceId = Joi.string().required();
        bodyValidationSchema.deviceToken = Joi.string().optional();
      }
      const result = Joi.validate(body, bodyValidationSchema);
      if (result.error) {
        return res.send(getResponse(false, result.error.details[0].message));
      }
      let filter = {};
      if (isEmail)
        filter = { email: body.email };
      else filter = { phoneNumber: body.email }
      const user = await UserSchema.findOne(filter).populate({
        path: 'passwords',
        match: { provider: SocialProviderEnum.local }
      });
      if (!user || user.passwords.length || !user.verificationCode || user.role !== UserTypeEnum.user) {
        return res.send(getResponse(false, isEmail ? 'Wrong email' : 'Wrong phone number'));
      }
      req.body.user = user;
      req.body.isEmail = isEmail;
    } else {
      return res.send(getResponse(false, 'Missing or wrong OS type'));
    }
    return next();
  } catch (e) {
    new APIError(e, 500, 'registerUser function in auth/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const sendForgotEmail = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const body: ISendEmailBody = req.body;

    let isEmail = false;
    let emailValidation = Joi.validate({ email: body.email }, { email: Joi.string().email().required() });
    if (emailValidation.error) {
      const phoneValidation = Joi.validate({ email: body.email }, { email: Joi.string().regex(phoneNumberRegex).allow('').required() });
      if (phoneValidation.error)
        return res.send(getResponse(false, 'Please check correctness of email or phone number'));
      else isEmail = false;
    } else isEmail = true;

    const bodyValidationSchema: any = {
      osType: Joi.number().min(1).max(3).required()
    };

    if (isEmail)
      bodyValidationSchema.email = Joi.string().email().required();
    else bodyValidationSchema.email = Joi.string().regex(phoneNumberRegex).allow('').required();

    const result = Joi.validate(body, bodyValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    body.email = body.email.toLowerCase();
    let filter = {};
    if (isEmail)
      filter = { email: body.email, role: UserTypeEnum.user };
    else filter = { phoneNumber: body.email, role: UserTypeEnum.user }
    const user = await UserSchema.findOne(filter).populate({
      path: 'passwords',
      match: { provider: SocialProviderEnum.local }
    });
    if (!user || (user && !user.passwords.length)) {
      return res.send(getResponse(false, isEmail ? 'Wrong email' : 'Wrong phone number'));
    }
    req.body.user = user;
    req.body.isEmail = isEmail;
    return next();
  } catch (e) {
    new APIError(e, 500, 'sendForgotEmail function in auth/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const checkForgotCode = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const body: ICheckCodeBody = req.body;

    let isEmail = false;
    let emailValidation = Joi.validate({ email: body.email }, { email: Joi.string().email().required() });
    if (emailValidation.error) {
      const phoneValidation = Joi.validate({ email: body.email }, { email: Joi.string().regex(phoneNumberRegex).allow('').required() });
      if (phoneValidation.error)
        return res.send(getResponse(false, 'Please check correctness of email or phone number'));
      else isEmail = false;
    } else isEmail = true;

    const bodyValidationSchema: any = {
      code: Joi.string().length(verificationCodeLength).required()
    };

    if (isEmail)
      bodyValidationSchema.email = Joi.string().email().required();
    else bodyValidationSchema.email = Joi.string().regex(phoneNumberRegex).allow('').required();

    const result = Joi.validate(body, bodyValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    body.email = body.email.toLowerCase();
    let filter = {};
    if (isEmail)
      filter = { email: body.email, role: UserTypeEnum.user };
    else filter = { phoneNumber: body.email, role: UserTypeEnum.user };

    const user = await UserSchema.findOne(filter).populate({
      path: 'passwords',
      match: { provider: SocialProviderEnum.local }
    });
    if (!user || !user.restoreCode) {
      return res.send(getResponse(false, 'Wrong email'));
    }
    req.body.user = user;
    return next();
  } catch (e) {
    new APIError(e, 500, 'checkVerificationCode function in auth/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const loginUser = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    if (req.body.osType && !isNaN(req.body.osType) && req.body.osType >= 1 && req.body.osType <= 3) {

      let isEmail = false;
      let emailValidation = Joi.validate({ email: req.body.email }, { email: Joi.string().email().required() });
      if (emailValidation.error) {
        const phoneValidation = Joi.validate({ email: req.body.email }, { email: Joi.string().regex(phoneNumberRegex).allow('').required() });
        if (phoneValidation.error)
          return res.send(getResponse(false, 'Please check correctness of email or phone number'));
        else isEmail = false;
      } else isEmail = true;

      const bodyValidationSchema: any = {
        password: Joi.string().min(6).required(),
        osType: Joi.number().min(1).max(3).required()
      };

      if (isEmail)
        bodyValidationSchema.email = Joi.string().email().required();
      else bodyValidationSchema.email = Joi.string().regex(phoneNumberRegex).allow('').required();

      if (req.body.osType !== OsTypeEnum.web) {
        bodyValidationSchema.deviceId = Joi.string().required();
        bodyValidationSchema.deviceToken = Joi.string().optional();
        bodyValidationSchema.language = Joi.number().min(1).max(3).required();
      }
      const result = Joi.validate(req.body, bodyValidationSchema);
      if (result.error) {
        return res.send(getResponse(false, result.error.details[0].message));
      }
      req.body.email = req.body.email.toLowerCase();

      let filter = {};
      if (isEmail)
        filter = { email: req.body.email, role: UserTypeEnum.user };
      else filter = { phoneNumber: req.body.email, role: UserTypeEnum.user }

      const user = await UserSchema.findOne(filter).populate({
        path: 'passwords',
        match: { provider: SocialProviderEnum.local }
      });
      if (!user || !user.passwords.length) {
        return res.send(getResponse(false, 'Wrong email'));
      } else if (user && user.blocked) {
        return res.send(getResponse(false, 'Account is blocked'));
      }
      req.body.user = user;
      return next();
    } else {
      return res.send(getResponse(false, 'Missing or wrong OS type'));
    }
  } catch (e) {
    new APIError(e, 500, 'loginUser function in auth/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const loginAdmin = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const body: ILoginAdminBody = req.body;
    const bodyValidationSchema = {
      email: Joi.string().email().required(),
      password: Joi.string().min(6).required()
    };
    const result = Joi.validate(body, bodyValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    body.email = body.email.toLowerCase();
    const admin = await UserSchema.findOne({ email: body.email, role: { $in: [UserTypeEnum.admin, UserTypeEnum.superAdmin, UserTypeEnum.partner] } }).populate({
      path: 'passwords',
      match: { provider: SocialProviderEnum.local }
    });
    if (!admin || !admin.passwords.length) return res.send(getResponse(false, 'Wrong email'));
    req.body.admin = admin;
    return next();
  } catch (e) {
    new APIError(e, 500, 'loginAdmin function in auth/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const restorePassword = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const body: IRestorePasswordBody = req.body;
    let isEmail = false;
    let emailValidation = Joi.validate({ email: req.body.email }, { email: Joi.string().email().required() });
    if (emailValidation.error) {
      const phoneValidation = Joi.validate({ email: req.body.email }, { email: Joi.string().regex(phoneNumberRegex).allow('').required() });
      if (phoneValidation.error)
        return res.send(getResponse(false, 'Please check correctness of email or phone number'));
      else isEmail = false;
    } else isEmail = true;

    const bodyValidationSchema: any = {
      osType: Joi.number().min(1).max(3).required(),
      code: Joi.string().required(),
      password: Joi.string().min(6).required()
    };

    if (isEmail)
      bodyValidationSchema.email = Joi.string().email().required();
    else bodyValidationSchema.email = Joi.string().regex(phoneNumberRegex).allow('').required();

    if (body.osType !== OsTypeEnum.web) {
      bodyValidationSchema.deviceId = Joi.string().required();
      bodyValidationSchema.deviceToken = Joi.string().optional();
      bodyValidationSchema.language = Joi.number().min(1).max(3).required();
    }
    const result = Joi.validate(body, bodyValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    body.email = body.email.toLowerCase();

    let filter = {};
    if (isEmail)
      filter = { email: req.body.email, role: UserTypeEnum.user };
    else filter = { phoneNumber: req.body.email, role: UserTypeEnum.user };

    const user: IUser<IUserPassword> = await UserSchema.findOne(filter).populate({
      path: 'passwords',
      match: { provider: SocialProviderEnum.local }
    });
    if (!user || !user.passwords.length || !user.restoreCode) {
      return res.send(getResponse(false, 'Wrong email'));
    }
    if (!bcrypt.compareSync(body.code, user.restoreCode)) {
      return res.send(getResponse(false, 'Wrong restore code'));
    }
    req.body.user = user;
    return next();
  } catch (e) {
    new APIError(e, 500, 'restorePassword function in auth/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const logOut = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const bodyValidationSchema = {
      deviceToken: Joi.string().required()
    };
    const result = Joi.validate(req.body, bodyValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    return next();
  } catch (e) {
    new APIError(e, 500, 'restorePassword function in auth/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const changePassword = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const bodyValidationSchema = {
      oldPassword:     Joi.string().min(6).required(),
      password:        Joi.string().min(6).required(),
      confirmPassword: Joi.string().equal(Joi.ref('password')).required(),
    };
    const result = Joi.validate(req.body, bodyValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    return next();
  } catch (e) {
    new APIError(e, 500, 'restorePassword function in auth/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};