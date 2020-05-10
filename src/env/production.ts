import * as path from 'path';

import { IMainConfig } from '.';

const config: IMainConfig = {
  NODE_ENV: 'production',
  PORT: 6066,
  BASE_URL: 'https://api.ineed.am/',
  MONGO_URL: 'mongodb://localhost:27017/INeedLive',
  JWT_SECRET: 's%4p^a3rHdGoHkkx#x5x#$6A$2@!#',
  MEDIA_PATH: path.resolve(__dirname, '..', '..', 'media') + '/',
  CRYPTO_SECRET_KEY: '%4^3paraSineed6vc*-asd5Di**%02#*tdox8A',
  WEB_CLIENT_BASE_URL: 'https://ineed.am/'
};

export default config;