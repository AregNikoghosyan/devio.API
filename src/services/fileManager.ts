import * as fs from 'fs';
import * as jo from 'jpeg-autorotate';
import * as ffmpeg from 'fluent-ffmpeg';
import * as puppeteer from 'puppeteer';

import MuTranslationSchema from '../schemas/muTranslation';

import mainConfig from '../env';
import { mediaPaths } from '../constants/constants';
import { invoiceTemplate, exportTemplate } from './invoice';
import { IGenerateVersionsBody, IGetCartListModel } from '../api/product/model';
import { getCartList } from '../api/product/service';
import { IGenerateInvoiceBody } from '../api/order/model';
import { LanguageEnum } from '../constants/enums';
import { ICompany } from '../schemas/company/model';
import { IAddress } from '../schemas/address/model';
import { IUser } from '../schemas/user/model';


export const deleteFiles = async(pathList: string[], concat: boolean) => {
  return new Promise((resolve, reject) => {
    try {
      const length = pathList.length;
      for (let i = 0; i < length; i++) {
        const path = concat ? mainConfig.MEDIA_PATH + pathList[i] : pathList[i];
        if (fs.existsSync(path)) {
          fs.unlink(path, err => {
            if (err) {
              console.log(err);
            }
          });
        }
      }
      return resolve(true);
    } catch (e) {
      console.log(e);
      return reject (e);
    }
  });
};

export const autorotate = async(imagePathList: string[]) => {
  return new Promise((resole, reject) => {
    try {
      imagePathList.forEach(path => {
        jo.rotate(path, {}, function(err, buffer, orientation, dimensions) {
          if (err) {
            console.log(err);
          } else {
            fs.writeFile(path, buffer, (err => console.log(err)));
          }
        });
      });
      resole();
    } catch (e) {
      reject(e);
    }
  });
};

export const convert = async(name: string, ext: string) => {
  return new Promise((resolve, reject) => {
    try {
      const input =  mainConfig.MEDIA_PATH + name + ext;
      const output = mainConfig.MEDIA_PATH + name + '.mp3';
      ffmpeg(input)
      .output(output)
      .on('end', () => resolve())
      .on('error', (e) => reject(e))
      .run();
    } catch (e) {
      reject(e);
    }
  });
};

export const generateInvoice = async(data: IGetCartListModel, company: ICompany<string, IAddress, string>, user: IUser): Promise<string> => {
  const itemList = await Promise.all(data.itemList.map(async(item, index) => {
    const price = item.discountedPrice ? item.discountedPrice : item.defaultPrice;
    const muTranslation = await MuTranslationSchema.findOne({ mu: item.mu, language: LanguageEnum.hy });
    return {
      number: index + 1,
      image: item.filePath,
      name: item.name,
      price,
      count: item.stepCount,
      mu: muTranslation.name,
      total: item.stepCount * price
    };
  }));
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.setContent(await invoiceTemplate(itemList, data.total, company, user));
  await page.emulateMedia('screen');
  const fileName = mediaPaths.files + `${Date.now()}.pdf`;
  await page.pdf({
    path: mainConfig.MEDIA_PATH + fileName,
    format: 'A4',
    printBackground: true,
  });
  await browser.close();
  return fileName;
};

export const generateExport = async (data: IGetCartListModel, company: ICompany<string, IAddress, string>, user: IUser): Promise<string> => {
  const itemList = await Promise.all(data.itemList.map(async(item, index) => {
    const price = item.discountedPrice ? item.discountedPrice : item.defaultPrice;
    const muTranslation = await MuTranslationSchema.findOne({ mu: item.mu, language: LanguageEnum.hy });
    return {
      number: index + 1,
      image: item.filePath,
      name: item.name,
      price,
      count: item.stepCount,
      mu: muTranslation.name,
      total: item.stepCount * price
    };
  }));
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.setContent(await exportTemplate(itemList, company, user, data.total, data.bonus));
  await page.emulateMedia('screen');
  const fileName = mediaPaths.files + `${Date.now()}.pdf`;
  await page.pdf({
    path: mainConfig.MEDIA_PATH + fileName,
    format: 'A4',
    printBackground: true,
  });
  await browser.close();
  return fileName;
};