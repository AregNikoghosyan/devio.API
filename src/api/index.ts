import * as express from 'express';

import AddressRoutes      from './address';
import AttributeRoutes    from './attribute';
import AuthRoutes         from './auth';
import BrandRoutes        from './brand';
import CategoryRoutes     from './category';
import CompanyRoutes      from './company';
import ConversationRoutes from './conversation';
import DeviceRoutes       from './device';
import MuRoutes           from './mu';
import NotificationRoutes from './notification';
import OrderRoutes        from './order';
import ProductRoutes      from './product';
import PromotionRoutes    from './promotion';
import ProposalRoutes     from './proposal';
import RequestRoutes      from './request';
import UserRoutes         from './user';
import VacancyRoutes      from './vacancy';
import WishRoutes         from './wishList';
import PromoCodeRoutes    from './promoCode';
import DashboardRoutes    from './dashboard';
import SupportRoutes      from './supportMessage';
import ContactRoutes      from './contact';
import PartnerRoutes      from './partner';
import IdramRoutes        from './idram';

class Routes {

  public router = express.Router();

  constructor() {
    this.routes();
  }

  private routes = () => {
    this.router.use('/address',      AddressRoutes);
    this.router.use('/attribute',    AttributeRoutes);
    this.router.use('/auth',         AuthRoutes);
    this.router.use('/brand',        BrandRoutes);
    this.router.use('/category',     CategoryRoutes);
    this.router.use('/company',      CompanyRoutes);
    this.router.use('/conversation', ConversationRoutes);
    this.router.use('/device',       DeviceRoutes);
    this.router.use('/mu',           MuRoutes);
    this.router.use('/notification', NotificationRoutes);
    this.router.use('/order',        OrderRoutes);
    this.router.use('/product',      ProductRoutes);
    this.router.use('/promo',        PromoCodeRoutes);
    this.router.use('/promotion',    PromotionRoutes);
    this.router.use('/proposal',     ProposalRoutes);
    this.router.use('/request',      RequestRoutes);
    this.router.use('/user',         UserRoutes);
    this.router.use('/vacancy',      VacancyRoutes);
    this.router.use('/wish',         WishRoutes);
    this.router.use('/dashboard',    DashboardRoutes);
    this.router.use('/support',      SupportRoutes);
    this.router.use('/partner',      PartnerRoutes);
    this.router.use('/idram',        IdramRoutes);
    this.router.use('/contact',      ContactRoutes);
  }
}

export default new Routes().router;