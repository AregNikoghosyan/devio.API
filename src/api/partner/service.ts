import * as bcrypt from 'bcrypt';

import { IUser } from "../../schemas/user/model";
import { IResponseModel, getResponse, IPaginationQuery } from "../mainModels";
import PartnerSchema from '../../schemas/partner';
import UserSchema from '../../schemas/user';
import UserPasswordSchema from '../../schemas/userPassword';
import { ICreatePartnerBody } from "./model";
import { UserTypeEnum, SocialProviderEnum } from "../../constants/enums";
import { IPartner } from '../../schemas/partner/model';
class PartnerServices {
    public createPartner = async (body: ICreatePartnerBody, user: IUser): Promise<IResponseModel> => {
        const partnerExist = await PartnerSchema.findOne({
            name: body.name
        });
        if (partnerExist)
            return getResponse(false, 'Partner with exists');

        const partner = await UserSchema.create({
            email: body.email,
            role: UserTypeEnum.partner
        });
        const localPassword = await UserPasswordSchema.create({
            user: partner._id,
            provider: SocialProviderEnum.local,
            password: bcrypt.hashSync(body.phoneNumber, 12),
        });
        partner.passwords.push(localPassword._id);
        await partner.save();

        const newPartner = new PartnerSchema({
            user: partner._id,
            name: body.name,
            email: body.email,
            vatid: body.vatid,
            message: body.message,
            phoneNumber: body.phoneNumber,
        });
        await newPartner.save();
        return getResponse(true, 'Partner was created successfully');
    }

    public requestPartner = async (body: ICreatePartnerBody, user: IUser): Promise<IResponseModel> => {
        const partnerExist = await PartnerSchema.findOne({
            name: body.name
        });
        if (partnerExist)
            return getResponse(false, 'Partner with following name already exists');

        const partner = await UserSchema.create({
            email: body.email,
            role: UserTypeEnum.partner
        });
        const localPassword = await UserPasswordSchema.create({
            user: partner._id,
            provider: SocialProviderEnum.local,
            password: bcrypt.hashSync(body.phoneNumber, 12),
        });
        partner.passwords.push(localPassword._id);
        await partner.save();

        const newPartner = new PartnerSchema({
            user: partner._id,
            name: body.name,
            email: body.email,
            vatid: body.vatid,
            message: body.message,
            phoneNumber: body.phoneNumber,
            hidden: true,
        });
        await newPartner.save();
        return getResponse(true, 'Partner was created successfully');
    }

    public getListForSelect = async (): Promise<IResponseModel> => {
        const partners = await PartnerSchema.find({ hidden: false }).select({
            _id: 1,
            name: 1
        });
        return getResponse(true, 'Partner list for select was retrieved successfully', partners);
    }

    public activatePartner = async (partner: IPartner): Promise<IResponseModel> => {
        partner.hidden = !partner.hidden;
        await partner.save();
        return getResponse(true, `Partner set to ${partner.hidden ? 'hidden' : 'unHidden'}`);
    }

    public getListForAdmin = async (body: IPaginationQuery): Promise<IResponseModel> => {
        const itemCount = await PartnerSchema.countDocuments();
        if (!itemCount)
            return getResponse(true, 'Got item list', { pageCount: 0, itemList: [], itemCount: 0 });

        const pageCount = Math.ceil(itemCount / body.limit);
        if (body.pageNo > pageCount)
            return getResponse(false, 'PageNo must be less or equal than ' + pageCount);

        const skip = (body.pageNo - 1) * body.limit;
        const list = await PartnerSchema.find().skip(skip).limit(body.limit);
        return getResponse(true, 'Partner list for select was retrieved successfully', { pageCount, list, itemCount });
    }

    public getPartnerDetails = async (partnerId: string): Promise<IResponseModel> => {
        const partner = await PartnerSchema.findById(partnerId);
        if (!partner)
            return getResponse(false, 'Partner does not exists or id is incorrect');

        return getResponse(true, 'Partner details was retrieved successfully', partner);
    }
}

export default new PartnerServices();