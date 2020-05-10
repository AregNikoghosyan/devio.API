export const socialProvidersKeys = {
  facebookUrl : 'https://graph.facebook.com/me?fields=last_name,first_name,email,gender,picture.width(400)&access_token=',
  linkedinUrl : 'https://api.linkedin.com/v1/people/~:(id,email-address,picture-url,first-name,last-name)?format=json',
  googleUrl   : 'https://www.googleapis.com/oauth2/v3/tokeninfo?id_token='
};

export const fireBaseKeys = {
  serverKey : 'AAAA2ONZAzc:APA91bHHcadGkmGQEzaFhioqDaIaK0QFrlngHsms4N99uFar7lEyS1D2qMJN0_DW1ySsReT1Xy-JdN54HtPUfzryYiiUkkQShAjWBCFAu8qNeKMCwl36yekAdTQVm__Xy1uf0HoUIdIH',
  senderId  : '931527197495'
};

// TODO Change this
export const googleApiKey = 'AIzaSyDqJcJAtQJJXQcFHJ12FAkvMPhw79tE3Oc';
export const googleDistanceApiUrl = 'https://maps.googleapis.com/maps/api/distancematrix/json?';
export const googlePointApiUrl = 'https://maps.googleapis.com/maps/api/geocode/json?';

export const verificationCodeLength = 4;

export const schemaReferences = {
  address                 : 'Address',
  category                : 'Category',
  company                 : 'Company',
  counter                 : 'Counter',
  device                  : 'Device',
  categoryTranslation     : 'CategoryTranslation',
  user                    : 'User',
  userPassword            : 'UserPassword',
  wishList                : 'WishList',
  wishProduct             : 'WishProduct',
  wishDeviceProduct       : 'WishDeviceProduct',
  wishInvitation          : 'WishInvitation',
  request                 : 'Request',
  requestPack             : 'RequestPack',
  file                    : 'File',
  conversation            : 'Conversation',
  message                 : 'Message',
  guestUser               : 'GuestUser',
  product                 : 'Product',
  productTranslation      : 'ProductTranslation',
  productVersion          : 'ProductVersion',
  productFeature          : 'ProductFeature',
  productPricing          : 'ProductPricing',
  featureTranslation      : 'FeatureTranslation',
  attribute               : 'Attribute',
  attributeTranslation    : 'AttributeTranslation',
  option                  : 'Option',
  optionTranslation       : 'OptionTranslation',
  mu                      : 'MU',
  muTranslation           : 'MUTranslation',
  brand                   : 'Brand',
  promotion               : 'Promotion',
  promotionTranslation    : 'PromotionTranslation',
  proposal                : 'Proposal',
  proposalTranslation     : 'ProposalTranslation',
  promoCode               : 'PromoCode',
  userPromoCode           : 'UserPromoCode',
  city                    : 'City',
  order                   : 'Order',
  orderProduct            : 'OrderProduct',
  orderProductAttribute   : 'OrderProductAttribute',
  notification            : 'Notification',
  notificationTranslation : 'NotificationTranslation',
  userNotification        : 'UserNotification',
  vacancy                 : 'Vacancy',
  vacancyTranslation      : 'VacancyTranslation',
  supportMessage          : 'SupportMessage',
  emailMessage            : 'EmailMessage',
  contact                 : 'Contact',
  partner                 : 'Partner'
};

export const mediaPaths = {
  icons  : 'icons/',
  files  : 'files/',
  photos : 'photos/',
  videos : 'videos/',
  audios : 'audios/'
};

export const otherCategoryNames = {
  hy: 'Այլ',
  ru: 'Другое',
  en: 'Other'
};

export const guestNames = {
  hy: 'Հյուր',
  ru: 'Гость',
  en: 'Guest'
};

export const socketEventKeys = {
  connection   : 'connection',
  yourId       : 'yourId',
  newMessage   : 'newMessage',
  typing       : 'typing',
  disconnect   : 'disconnect',
  seen         : 'seen',
  notification : 'notification'
};

export const docTypes = ['pdf', 'doc', 'docx', 'xls', 'xlsx'];

export const firstLoginBonus = 5000;