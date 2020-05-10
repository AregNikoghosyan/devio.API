import * as bcrypt from 'bcrypt';
import * as fs from 'fs';

import { IGoToCheckOutBody, ICheckDeliveryFeeBody, ICheckPromoCodeBody, ICreateOrderBody, IGetOrderListForAdminBody, IGetOrderListForUserQuery, ICancelOrderBody, IGenerateInvoiceBody } from './model';
import { IResponseModel, getResponse } from '../mainModels';
import { getCartList } from '../product/service';
import { IUser } from '../../schemas/user/model';

import CompanySchema from '../../schemas/company';
import UserSchema from '../../schemas/user';
import AddressSchema from '../../schemas/address';
import GuestUserSchema from '../../schemas/guestUser';
import UserPromoCodeSchema from '../../schemas/userPromoCode';
import OrderSchema from '../../schemas/order';
import OrderProductSchema from '../../schemas/orderProduct';
import OrderProductAttributeSchema from '../../schemas/orderProductAttribute';
import ProductTranslationSchema from '../../schemas/productTranslation';
import AttributeTranslationSchema from '../../schemas/attributeTranslation';
import OptionTranslationSchema from '../../schemas/optionTranslation';
import ProductSchema from '../../schemas/product';
import PartnerSchema from '../../schemas/partner';
import ProductVersionSchema from '../../schemas/productVersion';
import UserNotificationSchema from '../../schemas/userNotification';

import ProductServices from '../product/service';

import { ICompany } from '../../schemas/company/model';
import { IAddress } from '../../schemas/address/model';
import { getCityByAddress } from '../../services/geolocation';
import { ICity } from '../../schemas/city/model';
import { PromoCodeTypeEnum, LanguageEnum, PaymentTypeEnum, OrderStatusEnum, DeliveryTypeEnum, ProductStatusEnum, NotificationTypeEnum, UserTypeEnum } from '../../constants/enums';
import { sendOrderVerifyEmail, sendOrderCreateEmail } from '../../services/mailer';
import { IGuestUser } from '../../schemas/guestUser/model';
import { IOrder } from '../../schemas/order/model';
import { ObjectID, ObjectId } from 'bson';
import { IOrderProduct } from '../../schemas/orderProduct/model';
import mainConfig from '../../env';
import { mediaPaths } from '../../constants/constants';
import { IProduct } from '../../schemas/product/model';
import { generateInvoice, generateExport } from '../../services/fileManager';
import { regexpEscape } from '../mainValidation';


class OrderServices {

  public goToCheckOut = async (body: IGoToCheckOutBody, user: IUser): Promise<IResponseModel> => {
    const data = await getCartList(body.idList, body.language, user && user.tariffPlan);
    if (data.deletedList && data.deletedList.length) return getResponse(false, 'Wrong id list');
    let dayCount = 1;
    const productList = await ProductSchema.find({ _id: { $in: body.idList.map(item => item.product) } });
    for (let i = 0; i < productList.length; i++) {
      if (productList[i].preparingDayCount && productList[i].preparingDayCount > dayCount) {
        dayCount = productList[i].preparingDayCount;
      }
    }
    let deliveryAddress, billingAddress, companyName, companyId, userName;
    if (body.wishList && body.wishList.company) {
      const company: ICompany<string, IAddress, IAddress> = await CompanySchema.findById(body.wishList.company).populate([
        {
          path: 'billingAddress',
          select: { _id: 1, contactName: 1, contactPhoneNumber: 1, address: 1, lat: 1, lng: 1, }
        },
        {
          path: 'deliveryAddresses',
          select: { _id: 1, contactName: 1, contactPhoneNumber: 1, address: 1, lat: 1, lng: 1, }
        }
      ]);
      if (company) {
        companyId = company._id;
        companyName = company.name;
        billingAddress = company.billingAddress;
        deliveryAddress = company.deliveryAddresses[0];
      }
    }
    if (user && !companyId) {
      if (user.firstName && user.lastName) userName = `${user.firstName} ${user.lastName}`;
      else if (user.firstName) userName = user.firstName;
      else if (user.lastName) userName = user.lastName;
      else userName = user.email;
      const address = await AddressSchema.findOne({ user: user._id, isUserDefaultAddress: true }).select('_id contactName contactPhoneNumber address lat lng');
      if (address) deliveryAddress = address;
    }
    const subTotal = data.subTotal;
    let total = data.total;
    let usedBonus = 0;
    if (user && body.bonus) {
      if (body.bonus > (data.total * 0.2)) return getResponse(false, 'Wrong bonus amount');
      usedBonus = body.bonus;
      total -= body.bonus;
    }
    let deliveryFee;
    if (deliveryAddress) {
      const city = await getCityByAddress(deliveryAddress.lat, deliveryAddress.lng);
      deliveryFee = this.calculateDeliveryFee(city, total);
      if (deliveryFee) total += deliveryFee;
    }
    const result = {
      userName: userName || null,
      companyId: companyId || null,
      companyName: companyName || null,
      deliveryAddress: deliveryAddress || null,
      billingAddress: billingAddress || null,
      subTotal,
      discount: data.discount,
      usedBonus,
      total,
      imageList: data.itemList.map(item => item.filePath),
      deliveryFee: deliveryFee || null,
      dayCount
    };
    return getResponse(true, 'Got details', result);
  }

  public getPayerListForUser = async (user: IUser): Promise<IResponseModel> => {
    const [defaultAddress, companyList]: [IAddress, Array<ICompany<string, IAddress, IAddress>>] = await Promise.all([
      await AddressSchema.findOne({ user: user._id, isUserDefaultAddress: true }).select({ _id: 1, address: 1, contactName: 1, contactPhoneNumber: 1 }),
      await CompanySchema.find({ user: user._id, deleted: false }).populate([
        {
          path: 'billingAddress',
          select: { _id: 1, address: 1, contactName: 1, contactPhoneNumber: 1 }
        },
        {
          path: 'deliveryAddresses',
          select: { _id: 1, address: 1, contactName: 1, contactPhoneNumber: 1 }
        }
      ])
    ]);
    const itemList = companyList.map(item => {
      return {
        companyId: item._id,
        companyName: item.name,
        deliveryAddress: item.deliveryAddresses[0],
        billingAddress: item.billingAddress
      };
    });
    const userAddress = {
      companyId: '',
      companyName: '',
      deliveryAddress: defaultAddress,
      billingAddress: null
    };
    return getResponse(true, 'Got payers list', [userAddress, ...itemList]);
  }

  public checkDeliveryFee = async (body: ICheckDeliveryFeeBody): Promise<IResponseModel> => {
    const city = await getCityByAddress(body.address.lat, body.address.lng);
    const deliveryFee = this.calculateDeliveryFee(city, body.price);
    return getResponse(true, 'Calculated delivery fee', deliveryFee);
  }

  public checkDeliveryDate = (productList: Array<IProduct>): IResponseModel => {
    let dayCount = 1;
    for (let i = 0; i < productList.length; i++) {
      if (productList[i].preparingDayCount && productList[i].preparingDayCount > dayCount) {
        dayCount = productList[i].preparingDayCount;
      }
    }
    return getResponse(true, 'Got', dayCount);
  }

  public checkPromoCode = async (body: ICheckPromoCodeBody, user: IUser | IGuestUser, userType: number = 1): Promise<IResponseModel> => {
    const promoCode = body.promoCode;
    if (user) {
      const userTypeEnum = { user: 1, guestUser: 2 };
      const filter: any = { promoCode: body.promoCode._id };
      if (userType === userTypeEnum.user) filter.user = user._id;
      else filter.guestUser = user._id;
      const usedCount = await UserPromoCodeSchema.countDocuments(filter);
      if (usedCount >= promoCode.usageCount) {
        let message = '';
        if (body.language === LanguageEnum.en) message = 'Promo code is already used';
        else if (body.language === LanguageEnum.ru) message = 'Промо код уже использован';
        else message = 'Պրոմո կոդն արդեն իսկ օգտագործված է';
        return getResponse(false, message);
      }
    }
    let deliveryFee;
    if (body.deliveryType !== DeliveryTypeEnum.pickup && body.address) {
      const city = await getCityByAddress(body.address.lat, body.address.lng);
      deliveryFee = this.calculateDeliveryFee(city, body.price);
    }
    if (promoCode.minPrice && body.price < promoCode.minPrice) {
      let message = '';
      if (body.language === LanguageEnum.en) message = `The price of Your order must be more than ${promoCode.minPrice} drams to use this promo code`;
      else if (body.language === LanguageEnum.ru) message = `Для использования этого промо-кода цена Вашего заказа должна быть более ${promoCode.minPrice} драмов`;
      else message = `Պրոմո կոդն օգտագործելու համար Ձեր պատվերի գինը պետք է գերազանցի ${promoCode.minPrice} դրամը`;
      return getResponse(false, message);
    }
    if (promoCode.maxPrice && body.price > promoCode.maxPrice) {
      let message = '';
      if (body.language === LanguageEnum.en) message = `The price of Your order must be leess than ${promoCode.maxPrice} drams to use this promo code`;
      else if (body.language === LanguageEnum.ru) message = `Для использования этого промо-кода цена Вашего заказа должна быть менее ${promoCode.maxPrice} драмов`;
      else message = `Պրոմո կոդն օգտագործելու համար Ձեր պատվերի գինը չպետք է գերազանցի ${promoCode.maxPrice} դրամը`;
      return getResponse(false, message);
    }
    if (!deliveryFee && promoCode.type === PromoCodeTypeEnum.freeShipping) {
      let message = '';
      if (body.language === LanguageEnum.en) message = 'Promo code cannot be used, because shipping is already free';
      else if (body.language === LanguageEnum.ru) message = 'Промо-код не может быть использован, потому что доставка уже бесплатна';
      else message = 'Պրոմո կոդը չի կարող օգտագործվել, քանի որ առաքումն արդեն իսկ անվճար է';
      return getResponse(false, message);
    }
    let discountAmount, isFreeShipping;
    switch (promoCode.type) {
      case PromoCodeTypeEnum.freeShipping: {
        isFreeShipping = true;
        deliveryFee = 0;
        discountAmount = 0;
        break;
      }
      case PromoCodeTypeEnum.amount: {
        isFreeShipping = promoCode.freeShipping;
        if (promoCode.freeShipping) deliveryFee = 0;
        discountAmount = promoCode.amount;
        break;
      }
      case PromoCodeTypeEnum.percent: {
        isFreeShipping = promoCode.freeShipping;
        if (promoCode.freeShipping) deliveryFee = 0;
        discountAmount = body.price - getDiscountedPrice(body.price, promoCode.amount);
        break;
      }
    }
    return getResponse(true, 'Valid promo', { discountAmount, isFreeShipping, deliveryFee });
  }

  public sendVerificationEmail = async (email: string): Promise<IResponseModel> => {
    const code = generateVerificationCode(4);
    const hashedCode = bcrypt.hashSync(code, 12);
    const guestUser = await GuestUserSchema.findOne({ email });
    if (guestUser) {
      guestUser.verificationCode = hashedCode;
      guestUser.verified = false;
      await guestUser.save();
    } else {
      await GuestUserSchema.create({
        email,
        verificationCode: hashedCode
      });
    }
    sendOrderVerifyEmail(code, email);
    return getResponse(true, 'Email sent');
  }

  public verifyEmail = async (guestUser: IGuestUser, code: string): Promise<IResponseModel> => {
    if (bcrypt.compareSync(code, guestUser.verificationCode)) {
      guestUser.verified = true;
      await guestUser.save();
      return getResponse(true, 'Valid code', true);
    } else {
      return getResponse(true, 'Invalid code', false);
    }
  }

  public createOrder = async (user: IUser, body: ICreateOrderBody): Promise<IResponseModel> => {
    const data = await getCartList(body.idList, body.language, user && user.tariffPlan);
    if (data.deletedList.length) return getResponse(false, 'Wrong Id List');
    const { subTotal, itemList, discount } = data;
    let total = data.total;
    let usedBonus = 0;
    if (user && body.bonus) {
      if (body.bonus > (data.total * 0.2)) return getResponse(false, 'Wrong bonus amount');
      usedBonus = body.bonus;
      total -= body.bonus;
    }
    let deliveryFee = 0;
    if (body.deliveryMethod === DeliveryTypeEnum.delivery) {
      const city = await getCityByAddress(body.deliveryAddress.lat, body.deliveryAddress.lng);
      deliveryFee = this.calculateDeliveryFee(city, total);
    }
    let promoDiscount = 0;
    if (body.promo) {
      const promoResult = await this.checkPromoCode({
        language: body.language,
        deliveryType: body.deliveryMethod,
        addressId: body.deliveryAddressId,
        code: body.code,
        price: total,
        address: body.deliveryAddress,
        promoCode: body.promo
      }, user ? user : body.guestUser, user ? 1 : 2);
      if (!promoResult.success) return promoResult;
      if (promoResult.data.freeShipping) deliveryFee = 0;
      promoDiscount = promoResult.data.discountAmount;
    }
    if (usedBonus) {
      user.points -= usedBonus;
      await user.save();
    }
    total = total + deliveryFee - promoDiscount;
    const order = new OrderSchema();
    if (user) {
      order.user = user._id;
      user.orderCount++;
      await user.save();
      if (data.bonus) order.receivingBonuses = data.bonus;
    } else {
      order.guestUser = body.guestUser._id;
      if (body.guestName) order.guestName = body.guestName;
      if (body.guestPhoneNumber) order.guestPhoneNumber = body.guestPhoneNumber;
    }
    if (body.deliveryAddress) {
      const deliveryAddress = new AddressSchema({
        order: order._id,
        address: body.deliveryAddress.address,
        lat: body.deliveryAddress.lat,
        lng: body.deliveryAddress.lng,
        house: body.deliveryAddress.house,
        apartment: body.deliveryAddress.apartment,
        contactName: body.deliveryAddress.contactName,
        contactPhoneNumber: body.deliveryAddress.contactPhoneNumber
      });
      order.deliveryAddress = deliveryAddress._id;
      await deliveryAddress.save();
    }
    if (body.company) {
      order.company = body.companyId;
      const compBillAddress = await AddressSchema.findById(body.company.billingAddress);
      const billingAddress = new AddressSchema({
        order: order._id,
        address: compBillAddress.address,
        lat: compBillAddress.lat,
        lng: compBillAddress.lng,
        house: compBillAddress.house,
        apartment: compBillAddress.apartment
      });
      order.billingAddress = billingAddress._id;
      await billingAddress.save();
    }
    order.usedBonuses = usedBonus;
    if (body.osType) {
      order.osType = body.osType;
    }
    if (body.promoCode) {
      order.promoCodeDiscountAmount = promoDiscount;
      order.promoCode = body.promo._id;
      body.promo.usedCount++;
      if (body.promo.usedCount === body.promo.usageCount) body.promo.deprecated = true;
      await Promise.all([
        await body.promo.save(),
        await UserPromoCodeSchema.create({
          user: user ? user._id : null,
          guestUser: body.guestUser ? body.guestUser._id : null,
          promoCode: body.promo._id,
          order: order._id
        })
      ]);
    }
    order.discountAmount = discount;
    order.subTotal = subTotal;
    order.total = total;
    order.comment = body.additional;
    order.code = await OrderSchema.getUniqueCode();
    order.deliveryType = body.deliveryMethod;
    order.deliveryDate = body.deliveryDate;
    order.deliveryFee = deliveryFee;
    order.paymentType = body.paymentMethod;
    if (order.deliveryType === DeliveryTypeEnum.pickup) order.deliveryAddress = null;
    if (body.paymentMethod === PaymentTypeEnum.card) order.status = OrderStatusEnum.draft;
    else order.status = OrderStatusEnum.pending;
    console.log(itemList);
    order.products = await this.createOrderProducts(order._id, itemList);
    await Promise.all([
      await order.save(),
      await UserNotificationSchema.sendAdminNotification({ type: NotificationTypeEnum.newOrder, sender: order.user, order: order._id })
    ]);
    if (order.guestUser) {
      sendOrderCreateEmail(body.guestUser.email, order.code, order.guestName);
    } else {
      // sendOrderCreateEmail(user.email, order.code, user.fullName || null);
    }
    return getResponse(true, 'Order created');
  }

  public getListForAdmin = async (body: IGetOrderListForAdminBody): Promise<IResponseModel> => {
    let filter: any = {
      status: { $ne: OrderStatusEnum.draft }
    };
    if (body.userId && !body.search) {
      filter.user = new ObjectID(body.userId);
    }
    if (body.search) {
      const key = regexpEscape(body.search);
      const [userIdList, guestUserIdList] = await Promise.all([
        await UserSchema.find({
          $or: [{ fullName: new RegExp(key, 'i') }, { email: new RegExp(key, 'i') }, { phoneNumber: new RegExp(key, 'i') }]
        }).distinct('_id'),
        await GuestUserSchema.find({
          $or: [{ email: new RegExp(key, 'i') }]
        }).distinct('_id')
      ]);
      filter.$or = [
        { user: { $in: userIdList } },
        { guestUser: { $in: guestUserIdList } },
        { guestName: new RegExp(key, 'i') },
        { guestPhoneNumber: new RegExp(key, 'i') }
      ];
      if (!isNaN(+key)) filter.$or.push({ nid: +key });
    }
    if (body.paymentType) filter.paymentType = body.paymentType;
    if (body.status) filter.status = body.status;
    if (body.dateFrom) {
      filter.createdDt = { $gte: body.dateFrom };
    }
    if (body.dateTo) {
      if (filter.createdDt) {
        filter.createdDt.$lte = body.dateTo;
      } else {
        filter.createdDt = { $lte: body.dateTo };
      }
    }
    if (body.minPrice) {
      filter.total = { $gte: body.minPrice };
    }
    if (body.maxPrice) {
      if (filter.total) {
        filter.total.$lte = body.maxPrice;
      } else {
        filter.total = { $lte: body.maxPrice };
      }
    }

    if (body.partner) {
      const productIds = await OrderProductSchema.find({ partner: body.partner }).select({ _id: 1 });
      filter.products = { $in: productIds };
    }

    const itemCount = await OrderSchema.countDocuments(filter);
    if (!itemCount) return getResponse(true, 'Got item list', { pageCount: 0, itemList: [], itemCount: 0 });
    const pageCount = Math.ceil(itemCount / body.limit);
    if (body.pageNo > pageCount) return getResponse(false, 'PageNo must be less or equal than ' + pageCount);
    const skip = (body.pageNo - 1) * body.limit;
    const list = await OrderSchema.find(filter).skip(skip).limit(body.limit).sort({ createdDt: -1 }).populate([
      {
        path: 'user',
        select: { firstName: 1, lastName: 1, email: 1, role: 1 }
      },
      {
        path: 'guestUser',
        select: { email: 1 }
      }
    ]).select({ _id: 1, nid: 1, user: 1, guestUser: 1, status: 1, total: 1, guestName: 1, paymentType: 1, createdDt: 1 });    
    const itemList = list.map(item => {
      return {
        _id: item._id,
        userName: item.user ? getUserNameOrEmail(item.user) : item.guestName ? item.guestName : item.guestUser.email,
        nid: item.nid,
        paymentType: item.paymentType,
        total: item.total,
        status: item.status,
        createdDt: item.createdDt,
        role: item.user ? item.user.role : null,
        userId: item.user ? item.user._id : null,
      };
    });
    return getResponse(true, 'Got item list', { pageCount, itemList, itemCount });
  }

  public getDetailsForAdmin = async (order: IOrder<IUser, IGuestUser, ICompany, IAddress, IAddress, string, string, string, string>, language: number): Promise<IResponseModel> => {
    let companyBilAddress: IAddress;
    if (order.company) {
      companyBilAddress = await AddressSchema.findOne({
        company: order.company._id,
        contactName: { $ne: null }
      });
    }
    const returnObj = {
      _id: order._id,
      nid: order.nid,
      deliveryType: order.deliveryType,
      deliveryDate: order.deliveryDate,
      paymentType: order.paymentType,
      status: order.status,
      comment: order.comment,
      subTotal: order.subTotal,
      points: order.usedBonuses,
      discount: order.discountAmount,
      promoDiscount: order.promoCodeDiscountAmount,
      deliveryFee: order.deliveryFee,
      total: order.total,
      receivingBonuses: order.receivingBonuses,
      company: order.company ? order.company.name : null,
      companyName: order.company ? order.company.name : null,
      companyTin: order.company ? order.company.tin : null,
      companyContactName: companyBilAddress ? companyBilAddress.contactName : null,
      companyContactPhone: companyBilAddress ? companyBilAddress.contactPhoneNumber : null,
      billingAddress: order.billingAddress ? order.billingAddress.address : null,
      deliveryAddress: order.deliveryAddress,
      userName: '',
      userEmail: '',
      userPhoneNumber: '',
      products: []
    };
    if (order.user) {
      returnObj.userEmail = order.user.email;
      returnObj.userPhoneNumber = order.user.phoneNumber || null;
      returnObj.userName = getUserName({ firstName: order.user.firstName, lastName: order.user.lastName });
    } else {
      returnObj.userEmail = order.guestUser.email;
      returnObj.userPhoneNumber = order.guestPhoneNumber;
      returnObj.userName = order.guestName;
    }
    returnObj.products = await OrderProductSchema.getListForAdmin(order.products, language);
    return getResponse(true, 'Got details', returnObj);
  }

  public getDetailsForUser = async (order: IOrder<IUser, IGuestUser, ICompany, IAddress, IAddress, string, string, string, string>, language: number): Promise<IResponseModel> => {
    const returnObj = {
      _id: order._id,
      nid: order.nid,
      deliveryType: order.deliveryType,
      deliveryDate: order.deliveryDate,
      paymentType: order.paymentType,
      status: order.status,
      comment: order.comment,
      subTotal: order.subTotal,
      points: order.usedBonuses,
      discount: order.discountAmount,
      promoDiscount: order.promoCodeDiscountAmount,
      deliveryFee: order.deliveryFee,
      total: order.total,
      receivingBonuses: order.receivingBonuses,
      billingAddress: order.billingAddress ? order.billingAddress.address : null,
      deliveryAddress: order.deliveryAddress,
      payer: '',
      products: []
    };
    if (order.company) {
      returnObj.payer = order.company.name;
    } else if (order.user) {
      returnObj.payer = getUserName({ firstName: order.user.firstName, lastName: order.user.lastName });
    } else {
      returnObj.payer = order.guestUser.email;
    }
    returnObj.products = await OrderProductSchema.getListForAdmin(order.products, language);
    await Promise.all(returnObj.products.map(async (item, index) => {
      if (item.productVersionId) {
        returnObj.products[index].navigate = true;
        const product = await ProductSchema.findOne({
          _id: item.productId,
          deleted: false,
          status: ProductStatusEnum.published,
          versionsHidden: false
        });
        if (!product) {
          returnObj.products[index].navigate = false;
        } else {
          const body = {
            id: item.productId,
            chosen: [],
            language: LanguageEnum.en,
            product
          };
          item.attributes.forEach(fItem => {
            if (fItem && fItem.attributeId && fItem.optionId) {
              body.chosen.push({
                attribute: fItem.attributeId,
                option: fItem.optionId,
              });
            }
          });
          if (body.chosen.length !== product.attributes.length) {
            returnObj.products[index].navigate = false;
          } else {
            const response = await ProductServices.getProductVersion(body);
            if (!response.success) returnObj.products[index].navigate = false;
          }
        }
      } else {
        const product = await ProductSchema.findOne({
          _id: item.productId,
          status: ProductStatusEnum.published,
          deleted: false,
          'versions.0': { $exists: false },
          'attributes.0': { $exists: false },
        });
        returnObj.products[index].navigate = (!!product);
      }
    }));
    return getResponse(true, 'Got details', returnObj);
  }

  public getListForUser = async (user: IUser, query: IGetOrderListForUserQuery): Promise<IResponseModel> => {
    const filter = {
      user: new ObjectId(user._id),
      status: query.active ? { $in: [OrderStatusEnum.pending, OrderStatusEnum.review] } : { $in: [OrderStatusEnum.finished, OrderStatusEnum.canceled] }
    };
    const itemCount = await OrderSchema.countDocuments(filter);
    if (!itemCount) return getResponse(true, 'Got item list', { itemList: [], pagesLeft: false });
    const pageCount = Math.ceil(itemCount / query.limit);
    if (query.pageNo > pageCount) return getResponse(false, 'PageNo must be less or equal than ' + pageCount);
    const skip = (query.pageNo - 1) * query.limit;
    const itemList = await OrderSchema.getListForUser(filter, skip, query.limit, query.language);
    return getResponse(true, 'Got item list', { itemList, pagesLeft: query.pageNo !== pageCount });
  }

  public cancelOrder = async (body: ICancelOrderBody, user: IUser): Promise<IResponseModel> => {
    const order = body.order;
    if (body.reason) order.cancelReason = body.reason;
    order.status = OrderStatusEnum.canceled;
    order.canceledBy = user ? user._id : null;
    order.canceledDt = new Date();
    if (order.paymentType === PaymentTypeEnum.card) {
      // TODO Add what to de when card pay is ready
    }
    if (order.usedBonuses && order.user) {
      order.user.points += order.usedBonuses;
      order.user.canceledOrderCount++;
      await order.user.save();
    }
    if (order.guestUser) {
      order.guestUser.canceledOrderCount++;
      await order.guestUser.save();
    }
    if (order.promoCode) {
      await UserPromoCodeSchema.deleteOne({
        order: order._id,
        promoCode: order.promoCode,
        guestUser: order.guestUser ? order.guestUser._id : null,
        user: order.user ? order.user._id : null
      });
    }
    if (!user || (user.role !== UserTypeEnum.superAdmin && user.role !== UserTypeEnum.admin)) {
      UserNotificationSchema.sendAdminNotification({
        type: NotificationTypeEnum.orderCanceled,
        order: order._id,
        sender: user ? user._id : null
      }).catch(e => console.log(e));
    } else {
      if (order.user) {
        UserNotificationSchema.sendUserNotification({
          type: NotificationTypeEnum.orderCanceled,
          order: order._id,
          userId: order.user._id
        }).catch(e => console.log(e));
      } else {
        // TODO Email sending or smth else ?
      }
    }
    await order.save();
    return getResponse(true, 'Order canceled');
  }

  public repeatOrder = async (order: IOrder<string, string, string, string, string, string, IOrderProduct, string, string>, language: number, user: IUser): Promise<IResponseModel> => {
    const idList = order.products.map(item => {
      return {
        product: item.productId,
        productVersion: item.productVersionId,
        count: item.stepCount * item.step
      };
    });
    const data = await getCartList(idList, language, user ? user.tariffPlan : null);
    if (!data.itemList.length) return getResponse(false, 'Wrong Id');
    return getResponse(true, 'Exported successfully', {
      orderNid: order.nid,
      itemCount: data.itemList.length,
      itemList: data.itemList,
      deletedList: data.deletedList,
      subTotal: data.subTotal,
      discount: data.discount,
      total: data.total,
      tariffPlan: user ? user.tariffPlan : null,
      bonus: user ? user.points : null
    });
  }

  public setReviewOrder = async (order: IOrder): Promise<IResponseModel> => {
    order.status = OrderStatusEnum.review;
    await Promise.all([
      await order.save(),
      await UserNotificationSchema.sendAdminNotification({ type: NotificationTypeEnum.orderSetToReview, order: order._id, sender: order.user })
    ]);
    return getResponse(true, 'Order sent to review');
  }

  public finishOrder = async (body: { order: IOrder<IUser, IGuestUser, string, string, string, string, IOrderProduct, string, string>, reason?: string }, user: IUser): Promise<IResponseModel> => {
    const order = body.order;
    order.status = OrderStatusEnum.finished;
    order.finishedDt = new Date();
    order.finishedBy = user._id;
    if (order.user) {
      order.user.finishedOrderCount++;
      order.user.points += order.receivingBonuses;
      await order.user.save();
      // Send email ?
      UserNotificationSchema.sendUserNotification({
        type: NotificationTypeEnum.orderFinished,
        order: order._id,
        userId: order.user._id,
      }).catch(e => console.log(e));
    }
    await ProductSchema.updateMany({ _id: { $in: order.products.map(item => item.productId) } }, { $inc: { boughtCount: 1 } });
    if (order.guestUser) {
      order.guestUser.finishedOrderCount++;
      await order.guestUser.save();
    }
    await order.save();
    return getResponse(true, 'Finished successfully');
  }

  public getGuestOrderId = async (body: { email: string, code: string }): Promise<IResponseModel> => {
    const [guestUser, user] = await Promise.all([
      await GuestUserSchema.findOne({ email: body.email }),
      await UserSchema.findOne({ email: body.email, 'passwords.0': { $exists: true } }),
    ]);
    if (!guestUser && !user) {
      return getResponse(false, 'Wrong email');
    }
    const order = await OrderSchema.findOne({
      user: user ? user._id : null,
      guestUser: guestUser ? guestUser._id : null,
      code: body.code,
      status: { $ne: OrderStatusEnum.draft }
    });
    if (order) return getResponse(true, 'Order found', order._id);
    else return getResponse(false, 'Wrong code or email', null);
  }

  public generateInvoice = async (body: IGenerateInvoiceBody, user: IUser): Promise<IResponseModel> => {
    const data = await getCartList(body.idList, LanguageEnum.hy, user && user.tariffPlan);
    const path = await generateInvoice(data, body.company, user);
    if (data.deletedList.length) return getResponse(false, 'Wrong Id List');
    return getResponse(true, 'ok', mainConfig.BASE_URL + path);
  }

  public generateInvoiceNew = async (body: IGenerateInvoiceBody, user: IUser): Promise<IResponseModel> => {
    const data = await getCartList(body.idList, LanguageEnum.hy, user && user.tariffPlan);
    const path = await generateExport(data, body.company, user);
    if (data.deletedList.length) return getResponse(false, 'Wrong Id List');
    return getResponse(true, 'ok', mainConfig.BASE_URL + path);
  }

  private calculateDeliveryFee = (city: ICity, orderPrice: number): number => {
    if (orderPrice < city.isFreeFromPrice) return city.price;
    else return 0;
  }

  private createOrderProducts = async (orderId: string, itemList: any[]): Promise<string[]> => {
    const idList = [];
    await Promise.all(itemList.map(async (item: any) => {
      const orderProduct = new OrderProductSchema({
        order: orderId,
        productId: item.product,
        productVersionId: item.productVersion,
        step: item.step,
        count: item.count,
        stepCount: item.stepCount,
        price: item.defaultPrice,
        discountedPrice: item.discountedPrice,
        discount: item.discountAmount,
        image: item.image,
        translations: [],
        partner: item.partner
      });
      if (fs.existsSync(mainConfig.MEDIA_PATH + item.image)) {
        const newPath = `${mediaPaths.photos}${Date.now()}-${orderProduct._id}${this.getMimeType(item.image)}`;
        fs.copyFileSync(mainConfig.MEDIA_PATH + item.image, mainConfig.MEDIA_PATH + newPath);
        orderProduct.image = newPath;
      }
      const translations = await ProductTranslationSchema.find({ product: orderProduct.productId });
      orderProduct.translations = translations.map(item => {
        return {
          language: item.language,
          name: item.name
        };
      });
      const itemList = await Promise.all(item.attributes.map(async attribute => {
        const returnObj: any = {
          orderProduct: orderProduct._id,
          attributeId: attribute.attributeId,
          optionId: attribute.optionId,
        };
        const [attributeTranslations, optionTranslations] = await Promise.all([
          await AttributeTranslationSchema.find({ attribute: attribute.attributeId }),
          await OptionTranslationSchema.find({ option: attribute.optionId })
        ]);
        returnObj.translations = [
          {
            language: LanguageEnum.hy,
            attributeName: attributeTranslations.find(fItem => fItem.language === LanguageEnum.hy).name,
            optionName: optionTranslations.find(fItem => fItem.language === LanguageEnum.hy).name
          },
          {
            language: LanguageEnum.ru,
            attributeName: attributeTranslations.find(fItem => fItem.language === LanguageEnum.ru).name,
            optionName: optionTranslations.find(fItem => fItem.language === LanguageEnum.ru).name
          },
          {
            language: LanguageEnum.en,
            attributeName: attributeTranslations.find(fItem => fItem.language === LanguageEnum.en).name,
            optionName: optionTranslations.find(fItem => fItem.language === LanguageEnum.en).name
          }
        ];
        return returnObj;
      }));
      orderProduct.attributes = await OrderProductAttributeSchema.insertMany(itemList);
      idList.push(orderProduct._id);
      await orderProduct.save();
    }));
    return idList;
  }

  private getMimeType(fileName: string): string {
    const split = fileName.split('.');
    return '.' + split[split.length - 1];
  }


}

function getDiscountedPrice(price: number, discount: number) {
  let discountedPrice = price - (Math.round((price * discount) / 100));
  const pre = discountedPrice % 10;
  if (pre >= 5) {
    discountedPrice += (10 - pre);
  } else {
    discountedPrice -= pre;
  }
  return discountedPrice;
}

function generateVerificationCode(length: number) {
  const charset = '0123456789';
  let text = '';
  for (let i = 0; i < length; i++) {
    const char = charset.charAt(Math.ceil(Math.random() * (charset.length - 1)));
    text += char;
  }
  return text;
}

function getUserNameOrEmail(user: { firstName: string, lastName: string, email: string }): string {
  if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`;
  else if (user.firstName) return user.firstName;
  else if (user.lastName) return user.lastName;
  else return user.email;
}

function getUserName(user: { firstName: string, lastName: string }): string {
  if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`;
  else if (user.firstName) return user.firstName;
  else if (user.lastName) return user.lastName;
  else return null;
}



export default new OrderServices();