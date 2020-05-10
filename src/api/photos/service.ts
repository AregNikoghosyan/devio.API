import * as RS from 'redis';
import * as bluebird from 'bluebird';
import * as sharp from 'sharp';
import * as mime from 'mime-types';
import { IGetImageBySizeBody, IGetDefaultImageBody } from './model';
import mainConfig from '../../env';
import { mediaPaths } from '../../constants/constants';

declare module 'redis' {
  // tslint:disable-next-line:interface-name
  export interface RedisClient extends NodeJS.EventEmitter {
    setAsync(key: string, value: string): Promise<void>;
    getAsync(key: string): Promise<string>;
  }
}

const Redis = bluebird.promisifyAll(RS);

const redisClient = Redis.createClient();

class ImageServices {

  public getImageBySize = async(body: IGetImageBySizeBody): Promise<{ buffer: Buffer, contentType: string }> => {
    const fullUrl = mainConfig.MEDIA_PATH + mediaPaths.photos + body.path;
    const data = await redisClient.getAsync(fullUrl + `${body.height}${body.width}`);
    let contentType = mime.lookup(fullUrl);
    if (!contentType) contentType = '';
    const expireTime = 60 * 60 * 3;
    if (data) {
      redisClient.expire(fullUrl + `${body.height}${body.width}`, expireTime);
      return { buffer: new Buffer(JSON.parse(data)), contentType };
    } else {
      const buffer = await sharp(fullUrl).resize(body.width, body.height, {
        fit: sharp.fit.inside,
        withoutEnlargement: true
       }).toBuffer();
      redisClient.set(fullUrl + `${body.height}${body.width}`, JSON.stringify(buffer));
      redisClient.expire(fullUrl + `${body.height}${body.width}`, expireTime);
      return { buffer, contentType };
    }
  }

  public getImageByDefault = async(body: IGetDefaultImageBody): Promise<{ buffer: Buffer, contentType: string }> => {
    const fullUrl = mainConfig.MEDIA_PATH + body.path;
    const defaultSize = 800;
    const data = await redisClient.getAsync(fullUrl + 'default');
    let contentType = mime.lookup(fullUrl);
    if (!contentType) contentType = '';
    const expireTime = 60 * 60 * 3;
    if (data) {
      redisClient.expire(fullUrl + 'default', expireTime);
      return { buffer: new Buffer(JSON.parse(data)), contentType };
    } else {
      const buffer = await sharp(fullUrl).resize(defaultSize, defaultSize, {
        fit: sharp.fit.inside,
        withoutEnlargement: true
       }).toBuffer();
      redisClient.set(fullUrl + 'default', JSON.stringify(buffer), Redis.print);
      redisClient.expire(fullUrl + 'default', expireTime);
      return { buffer, contentType };
    }
  }

}

export default new ImageServices();