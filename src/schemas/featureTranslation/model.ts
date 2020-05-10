import { Document, Model } from 'mongoose';

interface IFeatureTranslationDocument<F = string> extends Document {
  feature: F;
  language: number;
  name: string;
  value: string;
}

export interface IFeatureTranslation<O = string> extends IFeatureTranslationDocument<O> {

}

export interface IFeatureTranslationModel extends Model<IFeatureTranslation<any>> {

}