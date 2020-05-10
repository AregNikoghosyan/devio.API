import * as bcrypt from 'bcrypt';
import * as fs from 'fs';

import UserSchema from '../schemas/user';
import GuestUserSchema from '../schemas/guestUser';
import UserPasswordSchema from '../schemas/userPassword';
import CitySchema from '../schemas/city';
import CounterSchema from '../schemas/counter';
import PartnerSchema from '../schemas/partner';

import RequestPackSchema from '../schemas/requestPack';
import RequestSchema from '../schemas/request';

import ProductVersionSchema from '../schemas/productVersion';
import FileSchema from '../schemas/file';

import { UserTypeEnum, CounterReferenceEnum, SocialProviderEnum, UserTariffTypeEnum } from '../constants/enums';
import { cityList } from '../constants/cities';
import mainConfig from '../env';
import { mediaPaths } from '../constants/constants';
import { deleteFiles } from '../services/fileManager';

const runSeed = async () => {
  await createCounters();
  await createAdmin();
  await createCities();
  // await productImages();
  createMediaFolders();
};


const createAdmin = async () => {
  const [adminCount, superAdminCount, partnerCount] = await Promise.all([
    await UserSchema.countDocuments({ role: UserTypeEnum.admin }),
    await UserSchema.countDocuments({ role: UserTypeEnum.superAdmin }),
    await UserSchema.countDocuments({ role: UserTypeEnum.partner }),
  ]);
  if (adminCount === 0) {
    const admin = await UserSchema.create({
      email: 'ineed@gmail.com',
      role: UserTypeEnum.admin
    });
    const localPassword = await UserPasswordSchema.create({
      user: admin._id,
      provider: SocialProviderEnum.local,
      password: bcrypt.hashSync('Password1/', 12),
    });
    admin.passwords.push(localPassword._id);
    await admin.save();
    console.log('User with admin role created with email ineed@gmail.com');
  }
  if (superAdminCount === 0) {
    const superAdmin = await UserSchema.create({
      email: 'armboldmind@gmail.com',
      role: UserTypeEnum.superAdmin
    });
    const localPassword = await UserPasswordSchema.create({
      user: superAdmin._id,
      provider: SocialProviderEnum.local,
      password: bcrypt.hashSync('Password1/', 12),
    });
    superAdmin.passwords.push(localPassword._id);
    await superAdmin.save();
    console.log('User with superAdmin role created with email armboldmind@gmail.com');
  }
  if (partnerCount === 0) {
    const partner = await UserSchema.create({
      email: 'partner@gmail.com',
      role: UserTypeEnum.partner
    });
    const localPassword = await UserPasswordSchema.create({
      user: partner._id,
      provider: SocialProviderEnum.local,
      password: bcrypt.hashSync('Password1/', 12),
    });
    partner.passwords.push(localPassword._id);
    await partner.save();

    const newPartner = new PartnerSchema({
      user: partner._id,
      name: "Test Partner",
      email: partner.email,
      vatid: "123546",
      message: "Some test message",
      phoneNumber: "12345679"
    });
    await newPartner.save();
    console.log('User with partner role created with email partner@gmail.com');
  }
};

const createCounters = async () => {
  const [userCounter, requestCounter, productCounter, orderCounter, invoiceCounter] = await Promise.all([
    await CounterSchema.findOne({ reference: CounterReferenceEnum.user }),
    await CounterSchema.findOne({ reference: CounterReferenceEnum.requestPack }),
    await CounterSchema.findOne({ reference: CounterReferenceEnum.product }),
    await CounterSchema.findOne({ reference: CounterReferenceEnum.order }),
    await CounterSchema.findOne({ reference: CounterReferenceEnum.invoice })
  ]);
  if (!userCounter) {
    await CounterSchema.create({ reference: CounterReferenceEnum.user });
    console.log('User id counter is set to 0.');
  }
  if (!requestCounter) {
    await CounterSchema.create({ reference: CounterReferenceEnum.requestPack });
    console.log('Request id counter is set to 0.');
  }
  if (!productCounter) {
    await CounterSchema.create({ reference: CounterReferenceEnum.product });
    console.log('Product id counter is set to 0.');
  }
  if (!orderCounter) {
    await CounterSchema.create({ reference: CounterReferenceEnum.order });
    console.log('Order id counter is set to 0.');
  }
  if (!invoiceCounter) {
    await CounterSchema.create({ reference: CounterReferenceEnum.invoice });
    console.log('Order id counter is set to 0.');
  }
};

const createMediaFolders = () => {
  if (!fs.existsSync(mainConfig.MEDIA_PATH)) {
    fs.mkdirSync(mainConfig.MEDIA_PATH);
    console.log('Created media folder by seed');
  }
  if (!fs.existsSync(mainConfig.MEDIA_PATH + mediaPaths.icons)) {
    fs.mkdirSync(mainConfig.MEDIA_PATH + mediaPaths.icons);
    console.log(`Created ${mediaPaths.icons} folder by seed`);
  }
  if (!fs.existsSync(mainConfig.MEDIA_PATH + mediaPaths.files)) {
    fs.mkdirSync(mainConfig.MEDIA_PATH + mediaPaths.files);
    console.log(`Created ${mediaPaths.files} folder by seed`);
  }
  if (!fs.existsSync(mainConfig.MEDIA_PATH + mediaPaths.audios)) {
    fs.mkdirSync(mainConfig.MEDIA_PATH + mediaPaths.audios);
    console.log(`Created ${mediaPaths.audios} folder by seed`);
  }
  if (!fs.existsSync(mainConfig.MEDIA_PATH + mediaPaths.photos)) {
    fs.mkdirSync(mainConfig.MEDIA_PATH + mediaPaths.photos);
    console.log(`Created ${mediaPaths.photos} folder by seed`);
  }
  if (!fs.existsSync(mainConfig.MEDIA_PATH + mediaPaths.videos)) {
    fs.mkdirSync(mainConfig.MEDIA_PATH + mediaPaths.videos);
    console.log(`Created ${mediaPaths.videos} folder by seed`);
  }
};

const createCities = async () => {
  const count = await CitySchema.countDocuments();
  if (!count) {
    await CitySchema.insertMany(cityList.map(item => {
      const insertObj = {
        name: item.name,
        distance: item.distance,
        price: item.price,
        isFreeFromPrice: item.isFreeFromPrice,
        lng: item.lng,
        lat: item.lat,
        center: {
          coordinates: [item.lng, item.lat]
        }
      };
      return insertObj;
    }));
    console.log(`${cityList.length} cities created`);
  }
};

export default runSeed;