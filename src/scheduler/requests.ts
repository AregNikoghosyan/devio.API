import * as schedule from 'node-schedule';

import RequestSchema from '../schemas/request';
import FileSchema    from '../schemas/file';
import { RequestStatusEnum } from '../constants/enums';
import { deleteFiles } from '../services/fileManager';

export const fileManagerScheduler = () => {
  schedule.scheduleJob('fileManagerScheduler', '59 12 * * *', async() => {
    const date = new Date(Date.now() - 1000 * 60 * 60 * 24 * 3);
    const filter = {
      user        : null,
      deviceId    : null,
      requestPack : null,
      status      : RequestStatusEnum.draft,
      createdDt   : {
        $lte : date
      }
    };
    const requestIdList = await RequestSchema.find(filter).distinct('_id');
    const fileFilter = {
      request: {
        $in: requestIdList
      }
    };
    const filePaths = await FileSchema.find(fileFilter).distinct('path');
    deleteFiles(filePaths, true);
    const [ delRequests, delFiles ] = await Promise.all([
      await RequestSchema.deleteMany(filter),
      await FileSchema.deleteMany(fileFilter)
    ]);
    console.log('Draft REQUESTS DELETED by fileManagerScheduler, count - ', delRequests.n);
    console.log('Draft requests\' FILES DELETED by fileManagerScheduler, count - ', delFiles.n);
  });
};