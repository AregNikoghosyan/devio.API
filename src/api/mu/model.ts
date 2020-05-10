import { IMU } from '../../schemas/mu/model';

interface ITranslation {
  language: number;
  name: string;
}

export interface IAddMuBody {
  translations: Array<ITranslation>;
}

export interface IUpdateMuBody extends IAddMuBody {
  id: string;
  mu: IMU<any>;
}