import * as multer from 'multer';
import mainConfig from '../env';
import { mediaPaths, docTypes } from '../constants/constants';

export const uploadIcon = multer({
  storage: multer.diskStorage({
    destination: `${mainConfig.MEDIA_PATH}${mediaPaths.icons}/`,
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}${file.originalname}`);
    }
  }),
  fileFilter: function (req, file, cb) {
    const isValid = /[^\\]*\.(\w+)$/.test(file.originalname);
    if (!isValid) {
      return cb(null, false);
    }
    const mimeType = file.mimetype.slice(0, 5);
    if (mimeType !== 'image') cb(null, false);
    else cb(null, true);
  }
}).single('icon');

export const uploadCover = multer({
  storage: multer.diskStorage({
    destination: `${mainConfig.MEDIA_PATH}${mediaPaths.icons}/`,
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}${file.originalname}`);
    }
  }),
  fileFilter: function (req, file, cb) {
    const isValid = /[^\\]*\.(\w+)$/.test(file.originalname);
    if (!isValid) {
      return cb(null, false);
    }
    const mimeType = file.mimetype.slice(0, 5);
    if (mimeType !== 'image') cb(null, false);
    else cb(null, true);
  }
}).single('cover');

export const uploadImage = multer({
  storage: multer.diskStorage({
    destination: `${mainConfig.MEDIA_PATH}${mediaPaths.icons}/`,
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}${file.originalname}`);
    }
  }),
  fileFilter: function (req, file, cb) {
    const isValid = /[^\\]*\.(\w+)$/.test(file.originalname);
    if (!isValid) {
      return cb(null, false);
    }
    const mimeType = file.mimetype.slice(0, 5);
    if (mimeType !== 'image') cb(null, false);
    else cb(null, true);
  }
}).single('image');

export const uploadDifferent = multer({
  storage: multer.diskStorage({
    destination: `${mainConfig.MEDIA_PATH}`,
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}${file.originalname}`);
    }
  }),
  fileFilter: function (req, file, cb) {
    const isValid = /[^\\]*\.(\w+)$/.test(file.originalname);
    if (!isValid) {
      return cb(null, false);
    }
    const type = getMimeType(file.originalname);
    switch (file.fieldname) {
      case 'doc': {
        if (docTypes.indexOf(type) === -1) {
          cb(null, false);
        } else {
          cb(null, true);
        }
        break;
      }
      case 'audio': {
        const mimeType = file.mimetype.slice(0, 5);
        if (mimeType === 'audio') cb (null, true);
        else cb(null, false);
        break;
      }
      case 'photo': {
        const mimeType = file.mimetype.slice(0, 5);
        if (mimeType === 'image') cb(null, true);
        else cb(null, false);
        break;
      }
      case 'video': {
        const mimeType = file.mimetype.slice(0, 5);
        if (mimeType === 'video') cb(null, true);
        else cb(null, false);
        break;
      }
      default: {
        cb (null, false);
        break;
      }
    }
  }
}).any();

export const uploadRequestFile = multer({
  storage: multer.diskStorage({
    destination: `${mainConfig.MEDIA_PATH}`,
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}${file.originalname}`);
    }
  }),
  fileFilter: function (req, file, cb) {
    const isValid = /[^\\]*\.(\w+)$/.test(file.originalname);
    if (!isValid) {
      return cb(null, false);
    }
    const type = getMimeType(file.originalname);
    const mimeType = file.mimetype.slice(0, 5);
    switch (mimeType) {
      case 'audio': {
        cb (null, true);
        break;
      }
      case 'image': {
        cb (null, true);
        break;
      }
      case 'video': {
        cb (null, true);
        break;
      }
      default: break;
    }
    if (docTypes.indexOf(type) === -1) {
      cb(null, false);
    } else {
      cb(null, true);
    }
  }
}).single('file');

export const uploadForChat = multer({
  storage: multer.diskStorage({
    destination: `${mainConfig.MEDIA_PATH}`,
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}${file.originalname}`);
    }
  }),
  fileFilter: function (req, file, cb) {
    const isValid = /[^\\]*\.(\w+)$/.test(file.originalname);
    if (!isValid) {
      return cb(null, false);
    }
    const mimeType = file.mimetype.slice(0, 5);
    if (mimeType === 'audio' || mimeType === 'image') {
      cb(null, true);
    } else {
      cb(null, false);
    }
  }
}).single('file');

export const uploadForProduct = multer({
  storage: multer.diskStorage({
    destination: `${mainConfig.MEDIA_PATH}`,
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}${file.originalname}`);
    }
  }),
  fileFilter: function (req, file, cb) {
    const isValid = /[^\\]*\.(\w+)$/.test(file.originalname);
    if (!isValid) {
      return cb(null, false);
    }
    const mimeType = file.mimetype.slice(0, 5);
    if (mimeType === 'image') {
      cb(null, true);
    } else {
      cb(null, false);
    }
  }
}).array('image');

export const uploadLogo = multer({
  storage: multer.diskStorage({
    destination: `${mainConfig.MEDIA_PATH}${mediaPaths.icons}/`,
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}${file.originalname}`);
    }
  }),
  fileFilter: function (req, file, cb) {
    const isValid = /[^\\]*\.(\w+)$/.test(file.originalname);
    if (!isValid) {
      return cb(null, false);
    }
    const mimeType = file.mimetype.slice(0, 5);
    if (mimeType !== 'image') cb(null, false);
    else cb(null, true);
  }
}).single('logo');

function getMimeType(fileName: string) {
  const split = fileName.split('.');
  return split[split.length - 1];
}