import * as mongoose from 'mongoose';
import { schemaReferences } from '../../constants/constants';
import { ICityModel, ICity } from './model';

const Schema = mongoose.Schema;

const schema = new Schema({
  name: {
    type: String,
    required: true
  },
  distance: {
    type: Number,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  isFreeFromPrice: {
    type: Number
  },
  lng: {
    type: Number,
    required: true
  },
  lat: {
    type: Number,
    required: true
  },
  center: {
    type: { type: String, default: 'Point' },
    coordinates: { type: [Number] }
  }
});

schema.index({ 'center': '2dsphere' });

schema.statics.getNearestCities = async function(lat: number, lng: number, count: number ): Promise<Array<ICity>> {
  const _this: ICityModel = this;
  const aggregation = [
    {
      $geoNear: {
        near: { type: 'Point', coordinates: [lng, lat] },
        key: 'center',
        distanceField: 'dist',
        spherical: true
      }
    },
    {
      $sort: { dist: 1 }
    },
    {
      $limit: count
    }
  ];
  const list = await _this.aggregate(aggregation);
  return list;
};

export const city: ICityModel = mongoose.model<ICity, ICityModel>(schemaReferences.city, schema);
export default city;