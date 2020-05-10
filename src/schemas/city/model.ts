import { Document, Model } from 'mongoose';

interface ICityDocument extends Document {
  name: string;
  distance: number;
  price: number;
  isFreeFromPrice: number;
  lng: number;
  lat: number;
}

export interface ICity extends ICityDocument {

}

export interface ICityModel extends Model<ICity> {
  getNearestCities(lat: number, lng: number, count: number ): Promise<Array<ICity>>;
}