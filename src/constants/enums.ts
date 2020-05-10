export enum UserTypeEnum {
  superAdmin = 1,
  admin,
  user,
  guest,
  partner
}

export enum SocialProviderEnum {
  facebook = 1,
  linkedin,
  google,
  local
}

export enum CounterReferenceEnum {
  user = 1,
  requestPack,
  product,
  order,
  invoice
}

export enum OsTypeEnum {
  android = 1,
  ios,
  web
}

export enum LanguageEnum {
  hy = 1,
  ru,
  en
}

export enum NotificationPermissionsEnum {
  newOffers = 1,
  deliveryStatus,
  bonuses
}

export enum MeasurementUnitEnum {
  item = 1,
  kg,
  meter,
  meterSquare,
  liter
}

export enum MediaTypeEnum {
  document = 1,
  audio,
  photo,
  video
}

export enum RequestStatusEnum {
  draft = 1,
  pending,
  succeed,
  failed,
  canceled,
  preparing
}

export enum RequestTypeEnum {
  usual = 1,
  fileList
}

export enum RequestPackStatusEnum {
  active = 1,
  finished,
  canceled
}

export enum MessageTypeEnum {
  question = 1,
  answer
}

export enum MessageMediaTypeEnum {
  text = 1,
  photo,
  audio
}

export enum RequestPackSortEnum {
  nid = 1,
  count,
  date
}

export enum ProductStatusEnum {
  preparing = 1,
  published,
  unapproved,
  hidden
}

export enum AttributeTypeEnum {
  usual = 1,
  color
}

export enum ColorTypeEnum {
  multiColor = 1,
  oneColor,
  twoColor,
}

export enum WishListParticipationTypeEnum {
  creator = 1,
  invited
}

export enum WishProductStatusEnum {
  approved = 1,
  unapproved
}

export enum ProductToWishListActionTypeEnum {
  add = 1,
  remove
}

export enum ProductTypeEnum {
  usual = 1,
  special
}

export enum PromotionTypeEnum {
  product = 1,
  category
}

export enum ProductSortByEnum {
  bestSelling = 1,
  priceLowToHigh,
  priceHighToLow,
  discountLowToHigh,
  discountHighToLow
}

export enum PromoCodeTypeEnum {
  percent = 1,
  amount,
  freeShipping
}

export enum PromoCodeStatusEnum {
  draft = 1,
  active,
  finished
}

export enum UserPromoCodeStatusEnum {
  pending = 1,
  used
}

export enum DeliveryTypeEnum {
  delivery = 1,
  pickup
}

export enum OrderStatusEnum {
  draft = 1,
  pending,
  finished,
  canceled,
  review
}

export enum PaymentTypeEnum {
  cash = 1,
  card,
  transfer
}

export enum UserTariffTypeEnum {
  usual = 1,
  silver,
  gold
}

export enum NotificationTypeEnum {
  newRequest = 1, // To Admin
  requestCanceled, // To Admin or / and to user
  requestFailed, // To User
  requestSucceeded, // To User
  newOrder, // To admin
  orderCanceled, // To admin or user
  orderSetToReview, // To admin
  orderFinished, // To user,
  wishListNewProduct, // to user
  wishListRemoveProduct, // to user
  wishlistApprove, // to user
  wishListUnApprove, // to user
  wishListLeave, // to user
  wishListDelete, // to user
  wishListProductRequest, // to user
  wishListKick, // to user
  wishListNewMember, // to user
  custom // to users
}

export enum NotificationStatusEnum {
  draft = 1,
  sent
}

export enum WebRedirectTypeEnum {
  register = 1,
  forgot = 2
}