import * as Joi from 'joi';
import * as bcrypt from 'bcrypt';

import APIError from '../../services/APIError';

import { Response, NextFunction } from 'express';
import { languageValidation, idValidation, idRegex, phoneNumberRegex, pagingValidation } from '../mainValidation';
import { IRequest, getErrorResponse, getResponse } from '../mainModels';
import { DeliveryTypeEnum, PaymentTypeEnum, LanguageEnum, OrderStatusEnum, UserTypeEnum, ProductStatusEnum, OsTypeEnum } from '../../constants/enums';

import { ICheckDeliveryFeeBody, ICheckPromoCodeBody, ICreateOrderBody, IGetOrderListForAdminBody, ICancelOrderBody, IGenerateInvoiceBody } from './model';

import WishListSchema  from '../../schemas/wishList';
import AddressSchema   from '../../schemas/address';
import CompanySchema   from '../../schemas/company';
import PromoCodeSchema from '../../schemas/promoCode';
import GuestUserSchema from '../../schemas/guestUser';
import UserSchema      from '../../schemas/user';
import OrderSchema     from '../../schemas/order';
import ProductSchema   from '../../schemas/product';

import { IGuestUser } from '../../schemas/guestUser/model';
import { IUser } from '../../schemas/user/model';
import { IOrder } from '../../schemas/order/model';
import { ICompany } from '../../schemas/company/model';
import { IAddress } from '../../schemas/address/model';

export const goToCheckOut = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    req.body.language = req.headers['language'];
    const body = req.body;
    const bodyValidationSchema = {
      ...languageValidation,
      bonus: Joi.number().allow(null).optional(),
      wishListId: Joi.string().regex(idRegex).allow([null, '']).optional(),
      orderId: Joi.string().regex(idRegex).allow([null, '']).optional(),
      idList: Joi.array().items({
        product: idValidation.id,
        productVersion: Joi.string().regex(idRegex).allow([null, '']).optional(),
        count: Joi.number().not([0]).required()
      }).min(1).required()
    };
    const result = Joi.validate(body, bodyValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    if (!isUniqueProductList(body.idList)) return res.send(getResponse(false, 'Wrong id list'));
    if (req.user && body.bonus && body.bonus > req.user.points) {
      return res.send(getResponse(false, 'Wrong bonus Amount'));
    }
    if (body.wishListId && req.user) {
      const wishList = await WishListSchema.findOne({
        _id: body.wishListId,
        $or: [
          { creator: req.user._id },
          { members: req.user._id }
        ]
      });
      if (!wishList) return res.send(getResponse(false, 'Wrong wishListId'));
      if (wishList.creator.toString() !== req.user._id.toString()) {
        delete req.body.wishListId;
      } else {
        req.body.wishList = wishList;
      }
    } else {
      delete req.body.wishListId;
    }
    return next();
  } catch (e) {
    new APIError(e, 500, 'getForRequest function in order/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const checkDeliveryFee = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const body: ICheckDeliveryFeeBody = req.body;
    const bodyValidationSchema = {
      ...idValidation,
      price: Joi.number().min(10).required()
    };
    const result = Joi.validate(body, bodyValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const address = await AddressSchema.findById(body.id);
    if (!address) return res.send(getResponse(false, 'Wrong Id'));
    req.body.address = address;
    return next();
  } catch (e) {
    new APIError(e, 500, 'getForRequest function in order/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const checkDeliveryDate = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const result = Joi.validate(req.body, {
      idList: Joi.array().items(idValidation.id).min(1).required()
    });
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const productList = await ProductSchema.find({
      _id: { $in: req.body.idList },
      deleted: false
    }).select('preparingDayCount');
    if (productList.length !== req.body.idList.length) {
      return res.send(getResponse(false, 'Wrong Id list'));
    }
    req.body.productList = productList;
    return next();
  } catch (e) {
    new APIError(e, 500, 'checkDeliveryDate function in order/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const checkPromoCode = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    req.body.language = +req.headers['language'];
    const body: ICheckPromoCodeBody = req.body;
    const bodyValidationSchema = {
      ...languageValidation,
      email: req.user ? Joi.equal(['', null]).optional() : Joi.string().email().required(),
      deliveryType : Joi.number().equal([DeliveryTypeEnum.delivery, DeliveryTypeEnum.pickup]).required(),
      addressId    : Joi.string().when('deliveryType', {
        is        : Joi.equal(DeliveryTypeEnum.delivery),
        then      : idValidation.id,
        otherwise : Joi.string().regex(idRegex).allow('').optional()
      }),
      code  : Joi.string().min(2).required(),
      price : Joi.number().required()
    };
    const result = Joi.validate(body, bodyValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    if (req.body.email) req.body.email = req.body.email.toLowerCase();
    const [address, promoCode, guestUser] = await Promise.all([
      await AddressSchema.findById(body.addressId),
      await PromoCodeSchema.findOne({
        code: body.code,
        deprecated: false,
        $or: [
          { startDate: null, endDate: null },
          { startDate: null, endDate: { $gt: new Date() } },
          { startDate: { $lt: new Date() }, endDate: null },
          { startDate: { $lt: new Date() }, endDate: { $gt: new Date() } }
        ]
      }),
      await GuestUserSchema.findOne({ email: req.body.email })
    ]);
    if (body.addressId && !address) return res.send(getResponse(false, 'Wrong address Id'));
    if (body.email && !guestUser) return res.send(getResponse(false, 'Wrong email'));
    req.body.guestUser = guestUser;
    req.body.address = address;
    if (!promoCode) {
      let message = '';
      if (body.language === LanguageEnum.en) message = 'Promo code does not exist';
      else if (body.language === LanguageEnum.ru) message = 'Промо-код не существует';
      else message = 'Պրոմո կոդը գոյություն չունի';
      return res.send(getResponse(false, message));
    }
    req.body.promoCode = promoCode;
    return next();
  } catch (e) {
    new APIError(e, 500, 'checkPromoCode function in order/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const sendVerificationEmail = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const result = Joi.validate(req.body, { email: Joi.string().email().required() });
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    req.body.email = req.body.email.toLowerCase();
    const user = await UserSchema.findOne({
      email: req.body.email,
    });
    if (user && user.passwords.length > 0) return res.send(getResponse(false, 'There is user with given email'));
    return next();
  } catch (e) {
    new APIError(e, 500, 'sendVerificationEmail function in order/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const verifyEmail = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const result = Joi.validate(req.body, {
      email: Joi.string().email().required(),
      code: Joi.string().length(4).required()
    });
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    req.body.email = req.body.email.toLowerCase();
    const guestUser = await GuestUserSchema.findOne({ email: req.body.email, verificationCode: { $ne: null } });
    if (!guestUser) return res.send(getResponse(false, 'Wrong email'));
    req.body.guestUser = guestUser;
    return next();
  } catch (e) {
    new APIError(e, 500, 'verifyEmail function in order/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const createOrder = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    req.body.language = +req.headers['language'];
    if (req.headers['ostype']) req.body.osType = +req.headers['ostype'];
    const body: ICreateOrderBody = req.body;
    const bodyValidationSchema = {
      ...languageValidation,
      email             : req.user ? Joi.equal([null, '']).optional() : Joi.string().email().required(),
      code              : req.user ? Joi.equal([null, '']).optional() : Joi.string().length(4).required(),
      guestName         : Joi.string().min(2).allow([null, '']).optional(),
      guestPhoneNumber  : Joi.string().regex(phoneNumberRegex).allow([null, '']).optional(),
      companyId         : Joi.string().regex(idRegex).allow([null, '']).optional(),
      deliveryDate      : Joi.date().min(new Date(Date.now() - 1000 * 60)).required(),
      deliveryMethod    : Joi.number().equal([DeliveryTypeEnum.delivery, DeliveryTypeEnum.pickup]).required(),
      deliveryAddressId : Joi.string().regex(idRegex).allow(['', null]).optional(),
      paymentMethod     : Joi.number().equal([PaymentTypeEnum.cash, PaymentTypeEnum.card, PaymentTypeEnum.transfer]).required(),
      promoCode         : Joi.string().allow([null, '']).optional(),
      bonus             : Joi.number().min(1).allow([null, '']).optional(),
      additional        : Joi.string().allow([null, '']).optional(),
      osType            : Joi.number().equal([OsTypeEnum.android, OsTypeEnum.ios, OsTypeEnum.web]).required(),
      idList            : Joi.array().items({
        product        : idValidation.id,
        productVersion : Joi.string().regex(idRegex).allow(null).optional(),
        count          : Joi.number().not([0]).required()
      }).min(1).required()
    };
    const result = Joi.validate(body, bodyValidationSchema, { allowUnknown: true });
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    if (req.body.email) req.body.email = req.body.email.toLowerCase();
    if (body.deliveryMethod === DeliveryTypeEnum.delivery && !body.deliveryAddressId) return res.send(getResponse(false, 'Delivery address ID is required'));
    if (req.user) {
      if (body.bonus && body.bonus > req.user.points) return res.send(getResponse(false, 'Too high bonus amount'));
      // if (!body.companyId && body.paymentMethod === PaymentTypeEnum.transfer) return res.send(getResponse(false, 'Payment method is not allowed to be transfer'));
      const [company, deliveryAddress, promoCode] = await Promise.all([
        body.companyId ? await CompanySchema.findOne({ _id: body.companyId, user: req.user._id }) : null,
        await AddressSchema.findOne({ _id: body.deliveryAddressId }),
        await PromoCodeSchema.findOne({
          code: body.promoCode,
          deprecated: false,
          $or: [
            { startDate: null, endDate: null },
            { startDate: null, endDate: { $gt: new Date() } },
            { startDate: { $lt: new Date() }, endDate: null },
            { startDate: { $lt: new Date() }, endDate: { $gt: new Date() } }
          ]
        })
      ]);
      if (body.companyId && !company) return res.send(getResponse(false, 'Wrong company Id'));
      if (body.deliveryMethod === DeliveryTypeEnum.delivery && !deliveryAddress) return res.send(getResponse(false, 'Wrong delivery address Id'));
      if (body.promoCode && !promoCode) return res.send(getResponse(false, 'Wrong promo code'));
      if (company) req.body.company = company;
      req.body.deliveryAddress = deliveryAddress;
      if (promoCode) req.body.promo = promoCode;
    } else {
      if (body.companyId) return res.send(getResponse(false, 'company is not allowed'));
      if (body.bonus) return res.send(getResponse(false, 'bonus is not allowed'));
      // if (body.paymentMethod === PaymentTypeEnum.transfer) return res.send(getResponse(false, 'Payment method is not allowed to be transfer'));
      const [guestUser, deliveryAddress, promoCode] = await Promise.all([
        await GuestUserSchema.findOne({ email: body.email, verified: true }),
        await AddressSchema.findOne({ _id: body.deliveryAddressId }),
        await PromoCodeSchema.findOne({
          code: body.promoCode,
          deprecated: false,
          $or: [
            { startDate: null, endDate: null },
            { startDate: null, endDate: { $gt: new Date() } },
            { startDate: { $lt: new Date() }, endDate: null },
            { startDate: { $lt: new Date() }, endDate: { $gt: new Date() } }
          ]
        })
      ]);
      if (!guestUser) return res.send(getResponse(false, 'Wrong email'));
      if (!bcrypt.compareSync(body.code, guestUser.verificationCode)) return res.send(getResponse(false, 'Wrong code'));
      req.body.guestUser = guestUser;
      if (body.deliveryMethod === DeliveryTypeEnum.delivery && !deliveryAddress) return res.send(getResponse(false, 'Wrong delivery address Id'));
      if (body.promoCode && !promoCode) return res.send(getResponse(false, 'Wrong promo code'));
      req.body.deliveryAddress = deliveryAddress;
      if (promoCode) req.body.promo = promoCode;
    }
    return next();
  } catch (e) {
    new APIError(e, 500, 'createOrder function in order/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const getListForAdmin = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const body: IGetOrderListForAdminBody = req.body;
    const bodyValidationSchema = {
      ...pagingValidation,
      search      : Joi.string().min(1).allow(['', null]).optional(),
      status      : Joi.number().equal([OrderStatusEnum.pending, OrderStatusEnum.canceled, OrderStatusEnum.finished]).allow(['', null]).optional(),
      minPrice    : Joi.number().allow(['', null]).optional(),
      maxPrice    : Joi.number().allow(['', null]).optional(),
      paymentType : Joi.number().equal([PaymentTypeEnum.cash, PaymentTypeEnum.transfer]),
      dateFrom    : Joi.date().optional(),
      dateTo      : Joi.date().optional(),
      partner     : idValidation.id.optional(),
    };
    const result = Joi.validate(body, bodyValidationSchema);
    if (result.error) return res.send(getResponse(false, result.error.details[0].message));
    if (body.minPrice && body.maxPrice && body.minPrice > body.maxPrice) {
      return res.send(getResponse(false, 'minPrice must be less than or equal to maxPrice'));
    }
    if (body.dateFrom && body.dateTo && body.dateFrom > body.dateTo) {
      return res.send(getResponse(false, 'dateFrom must be less than or equal to dateTo'));
    }
    return next();
  } catch (e) {
    new APIError(e, 500, 'getListForAdmin function in order/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const getListForUser = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    req.query.language = +req.headers['language'];
    const query = req.query;
    const queryValidationSchema = {
      ...languageValidation,
      ...pagingValidation,
      active: Joi.bool().required()
    };
    const result = Joi.validate(query, queryValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    req.query.active = req.query.active !== 'true' ? false : true;
    req.query.pageNo = +req.query.pageNo;
    req.query.limit = +req.query.limit;
    return next();
  } catch (e) {
    new APIError(e, 500, 'getListForUser function in order/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const getDetailsForAdmin = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    req.query.language = +req.headers['language'];
    const query = req.query;
    const queryValidationSchema = {
      ...languageValidation,
      ...idValidation
    };
    const result = Joi.validate(query, queryValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const order: IOrder<IUser, IGuestUser, ICompany, IAddress, IAddress, string, string, string, string> = await OrderSchema.findOne({
      _id: query.id,
      status: { $ne: OrderStatusEnum.draft }
    }).populate([{
      path: 'user',
      select: { _id: 1, firstName: 1, lastName: 1, email: 1 }
    }, {
      path: 'guestUser',
      select: { email: 1 }
    }, {
      path: 'company'
    }, {
      path: 'deliveryAddress',
      select: { contactName: 1, contactPhoneNumber: 1, address: 1 }
    }, {
      path: 'billingAddress',
      select: { address: 1 }
    }]).select({
      _id: 1,
      nid: 1,
      deliveryType: 1,
      deliveryDate: 1,
      paymentType: 1,
      status: 1,
      comment: 1,
      guestName: 1,
      guestPhoneNumber: 1,
      deliveryFee: 1,
      usedBonuses: 1,
      receivingBonuses: 1,
      promoCodeDiscountAmount: 1,
      subTotal: 1,
      discountAmount: 1,
      total: 1,
      user: 1,
      products: 1,
      guestUser: 1,
      company: 1,
      deliveryAddress: 1,
      billingAddress: 1
    });
    if (!order) return res.send(getResponse(false, 'Wrong Id'));
    req.body.order = order;
    return next();
  } catch (e) {
    new APIError(e, 500, 'getDetailsForAdmin function in order/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const getDetailsForUser = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    req.query.language = +req.headers['language'];
    const query = req.query;
    const queryValidationSchema = {
      ...languageValidation,
      ...idValidation
    };
    const result = Joi.validate(query, queryValidationSchema);
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    const order: IOrder<IUser, string, ICompany, IAddress, IAddress, string, string, string, string> = await OrderSchema.findOne({
      _id: query.id,
      // user: req.user ? req.user._id : null,
      status: { $ne: OrderStatusEnum.draft }
    }).populate([{
      path: 'user',
      select: { _id: 1, firstName: 1, lastName: 1, email: 1 }
    }, {
      path: 'guestUser',
      select: { _id: 1, email: 1 }
    }, {
      path: 'company',
      select: { name: 1 }
    }, {
      path: 'deliveryAddress',
      select: { contactName: 1, contactPhoneNumber: 1, address: 1 }
    }, {
      path: 'billingAddress',
      select: { address: 1 }
    }]).select({
      _id: 1,
      nid: 1,
      deliveryType: 1,
      deliveryDate: 1,
      paymentType: 1,
      status: 1,
      comment: 1,
      guestName: 1,
      guestPhoneNumber: 1,
      deliveryFee: 1,
      usedBonuses: 1,
      promoCodeDiscountAmount: 1,
      subTotal: 1,
      discountAmount: 1,
      total: 1,
      receivingBonuses: 1,
      user: 1,
      products: 1,
      company: 1,
      deliveryAddress: 1,
      billingAddress: 1
    });
    if (!order) return res.send(getResponse(false, 'Wrong Id'));
    req.body.order = order;
    return next();
  } catch (e) {
    new APIError(e, 500, 'getDetailsForAdmin function in order/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const cancelOrder = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const body: ICancelOrderBody = req.body;
    const result = Joi.validate(req.body, {
      ...idValidation,
      reason: Joi.string().allow(['', null]).optional(),
      email: Joi.string().email().allow(['', null]).optional(),
      code: Joi.string().allow(['', null]).optional()
    });
    if (result.error) return res.send(getResponse(false, result.error.details[0].message));
    if (!req.user && (!body.code || !body.email)) {
      return res.send(getResponse(false, 'Missing data'));
    }
    if (req.body.email) req.body.email = req.body.email.toLowerCase();
    const filter: any = {
      _id: req.body.id,
      status: OrderStatusEnum.pending
    };
    if (req.user) {
      if (req.user.role === UserTypeEnum.user) filter.user = req.user._id;
      else filter.status = { $in: [ OrderStatusEnum.pending, OrderStatusEnum.review ] };
    } else {
      filter.guestUser = { $ne: null };
      filter.code = body.code;
    }
    const order = await OrderSchema.findOne(filter).populate('user guestUser');
    if (!order) return res.send(getResponse(false, 'Wrong Id'));
    if (!req.user && order.code !== body.code) return res.send(getResponse(false, 'Wrong Id'));
    req.body.order = order;
    return next();
  } catch (e) {
    new APIError(e, 500, 'cancelOrder function in order/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const setReviewOrder = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const result = Joi.validate(req.body, {
      ...idValidation,
      email: Joi.string().email().allow(['', null]).optional(),
      code : Joi.string().allow(['', null]).optional()
    });
    if (result.error) return res.send(getResponse(false, result.error.details[0].message));
    const filter: any = {
      _id: req.body.id,
      status: OrderStatusEnum.pending,
    };
    if (req.user) {
      filter.user = req.user._id;
    } else {
      filter.guestUser = { $ne: null };
      filter.code = req.body.code;
    }
    const order = await OrderSchema.findOne(filter);
    if (!order) return res.send(getResponse(false, 'Wrong Id'));
    if (!req.user) {
      const guest = await GuestUserSchema.findOne({ _id: order.guestUser, email: req.body.email });
      if (!guest) return res.send(getResponse(false, 'Wrong Id'));
    }
    req.body.order = order;
    return next();
  } catch (e) {
    new APIError(e, 500, 'setReviewOrder function in order/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const finishOrder = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const result = Joi.validate(req.body, {
      ...idValidation,
    });
    if (result.error) return res.send(getResponse(false, result.error.details[0].message));
    const filter: any = {
      _id: req.body.id,
      status: { $in: [OrderStatusEnum.pending, OrderStatusEnum.review ] }
    };
    const order = await OrderSchema.findOne(filter).populate('user guestUser products');
    if (!order) return res.send(getResponse(false, 'Wrong Id'));
    req.body.order = order;
    return next();
  } catch (e) {
    new APIError(e, 500, 'finishOrder function in order/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const repeatOrder = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    req.body.language = +req.headers['language'];
    const result = Joi.validate(req.body, {
      ...idValidation,
      ...languageValidation
    });
    if (result.error) return res.send(getResponse(false, result.error.details[0].message));
    const filter: any = {
      _id: req.body.id,
    };
    const order = await OrderSchema.findOne(filter).populate('products');
    if (!order) return res.send(getResponse(false, 'Wrong Id'));
    req.body.order = order;
    return next();
  } catch (e) {
    new APIError(e, 500, 'repeatOrder function in order/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const getGuestOrderId = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const result = Joi.validate(req.body, {
      email: Joi.string().email().required(),
      code: Joi.string().required()
    });
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    req.body.email = req.body.email.toLowerCase();
    return next();
  } catch (e) {
    new APIError(e, 500, 'repeatOrder function in order/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

export const generateInvoice = async(req: IRequest, res: Response, next: NextFunction) => {
  try {
    const body: IGenerateInvoiceBody = req.body;
    const result = Joi.validate(body, {
      idList : Joi.array().items({
        product       : idValidation.id,
        productVersion: Joi.string().regex(idRegex).allow(null).optional(),
        count         : Joi.number().not([0]).required()
      }).min(1).required(),
      companyId: Joi.string().regex(idRegex).allow([null, '']).optional(),
      addressId: Joi.string().regex(idRegex).allow([null, '']).optional()
    });
    if (result.error) {
      return res.send(getResponse(false, result.error.details[0].message));
    }
    if (!isUniqueProductList(body.idList)) return res.send(getResponse(false, 'Wrong id list'));
    if (body.companyId) {
      const company = await CompanySchema.findOne({ _id: body.companyId, deleted: false }).populate('billingAddress');
      if (!company) return res.send(getResponse(false, 'Wrong company id'));
      req.body.company = company;
    }
    return next();
  } catch (e) {
    new APIError(e, 500, 'generateInvoice function in order/validation.ts');
    return res.status(500).send(getErrorResponse());
  }
};

function isUniqueProductList(list: Array<{ count: number, product: string, productVersion: string }>): boolean {
  for (let i = 0; i < list.length; i++) {
    for (let j = 0; j < list.length; j++) {
      if (j !== i && list[j].product === list[i].product && ((!list[j].productVersion && !list[i].productVersion) || (list[j].productVersion === list[i].productVersion))) {
        return false;
      }
    }
  }
  return true;
}