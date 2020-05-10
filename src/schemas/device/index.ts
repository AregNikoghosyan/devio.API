import * as mongoose from 'mongoose';
import { IDeviceModel, IDevice } from './model';
import { NotificationPermissionsEnum } from '../../constants/enums';
import { schemaReferences } from '../../constants/constants';

const Schema = mongoose.Schema;

const schema = new Schema({
  user: {
    type    : Schema.Types.ObjectId,
    ref     : schemaReferences.user,
    default : null
  },
  deviceId: {
    type     : String,
    required : true
  },
  deviceToken: {
    type     : String,
    default  : null
  },
  osType: {
    type     : Number,
    required : true,
  },
  language: {
    type     : Number,
    required : true,
  },
  newOffersAllowed: {
    type    : Boolean,
    default : true
  },
  deliveryStatusAllowed: {
    type    : Boolean,
    default : true
  },
  bonusesAllowed: {
    type    : Boolean,
    default : true
  },
  createdDt: {
    type    : Date,
    default : Date.now
  },
  updatedDt: {
    type    : Date,
    default : Date.now
  }
});

schema.pre('save', async function(next) {
  const _this: any = this;
  if (!_this.isNew) {
    _this.updatedDt = Date.now();
    next();
  }
});

schema.statics.reversePermission = async function(idList: string[], type: number) {
  const _this: IDeviceModel = this;
  const deviceList = await _this.find({ user: { $in: idList } });
  await Promise.all(
    deviceList.map(async item => {
      switch (type) {
        case NotificationPermissionsEnum.newOffers: {
          const value = !item.newOffersAllowed;
          item.newOffersAllowed = value;
          await item.save();
          break;
        }
        case NotificationPermissionsEnum.deliveryStatus: {
          const value = !item.deliveryStatusAllowed;
          item.deliveryStatusAllowed = value;
          await item.save();
          break;
        }
        case NotificationPermissionsEnum.bonuses: {
          const value = !item.bonusesAllowed;
          item.bonusesAllowed = value;
          await item.save();
          break;
        }
        default: break;
      }
    })
  );
};

schema.methods.reversePermission = async function(type: number) {
  const _this: IDevice = this;
  switch (type) {
    case NotificationPermissionsEnum.newOffers: {
      _this.newOffersAllowed = !_this.newOffersAllowed;
      await _this.save();
      break;
    }
    case NotificationPermissionsEnum.deliveryStatus: {
      _this.deliveryStatusAllowed = !_this.deliveryStatusAllowed;
      await _this.save();
      break;
    }
    case NotificationPermissionsEnum.bonuses: {
      _this.bonusesAllowed = !_this.bonusesAllowed;
      await _this.save();
      break;
    }
    default: break;
  }
};

export const device: IDeviceModel = mongoose.model<IDevice<any>, IDeviceModel>(schemaReferences.device, schema);
export default device;