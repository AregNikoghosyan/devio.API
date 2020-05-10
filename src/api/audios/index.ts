import * as fs from 'fs';
import * as mime from 'mime-types';
import * as ffmpeg from 'fluent-ffmpeg';

import { Router, Response } from 'express';
import { IRequest, getResponse } from '../mainModels';
import mainConfig from '../../env';


class AudioRoutes {

  public router = Router();

  constructor () {
    this.routes();
  }

  private routes() {
    this.router.get('/:filename', this.serveAudioFile);
  }

  private serveAudioFile = (req: IRequest, res: Response) => {
    const filePath = mainConfig.MEDIA_PATH + 'audios/' + req.params.filename;
    const exist = fs.existsSync(filePath);
    if (!exist) {
      return res.status(404).send(getResponse(false, 'Api not found'));
    }
    const type = mime.lookup(filePath);
    if (!type) {
      return res.status(404).send(getResponse(false, 'Api not found'));
    }
    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = <string>req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const size = (end - start) + 1;
      const file = fs.createReadStream(filePath, {start, end});
      const head = {
        'content-range'  : `bytes ${start}-${end}/${fileSize}`,
        'accept-ranges'  : 'bytes',
        'content-length' : size,
        'content-type'   : type,
      };
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        'content-length': fileSize,
        'content-type': type,
      };
      res.writeHead(206, head);
      fs.createReadStream(filePath).pipe(res);
    }
  }

}

export default new AudioRoutes().router;