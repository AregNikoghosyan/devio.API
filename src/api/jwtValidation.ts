import * as jwt	from 'jsonwebtoken';

import UserSchema   	from '../schemas/user';

import APIError 		from '../services/APIError';
import mainConfig       from '../env';

import { Response, NextFunction } from 'express';
import { IRequest } from './mainModels';
import { UserTypeEnum } from '../constants/enums';


/**
 *  Middleware checks JWT and role access
 *  @param {Array<number>} userTypes
 */
const createJwtValidation = (userTypes: number[]) =>  {
	return async (req: IRequest, res: Response, next: NextFunction) => {
		try {
			const bearerToken = req.headers.authorization;
			if (!bearerToken) return res.sendStatus(401);
			const token = bearerToken.slice(7);
			jwt.verify(token, mainConfig.JWT_SECRET, async (error, dtls: IJwtDetails) => {
				if (error) {
					new APIError('UNAUTHORIZED', 401);
					return res.sendStatus(401);
				}
				if (!userTypes.includes(dtls.role)) {
					new APIError('FORBIDDEN', 403);
					return res.sendStatus(403);
				}
				const user = await UserSchema.findOne({ _id: dtls._id, role: dtls.role });
				if (user && !user.blocked) {
					req.user = user;
					return next();
				} else {
					new APIError('UNAUTHORIZED', 401);
					return res.sendStatus(401);
				}
			});
		} catch (err) {
			new APIError(err.message ? err.message : 'INTERNAL SERVER ERROR', 500);
			return res.sendStatus(500);
		}
	};
};

/**
 * Middleware checks if user is guest or logged in
 */
const createGuestJwtValidation = () =>  {
	return async (req: IRequest, res: Response, next: NextFunction) => {
		try {
			const bearerToken = req.headers.authorization;
			if (!bearerToken) {
				return next();
			}
			const token = bearerToken.slice(7);
			jwt.verify(token, mainConfig.JWT_SECRET, async (error, dtls: IJwtDetails) => {
				if (error) {
					return res.sendStatus(401);
				}
        const user = await UserSchema.findOne({ _id: dtls._id });
        if (user) {
          req.user = user;
          return next();
        } else {
          return res.sendStatus(401);
        }
			});
		} catch (err) {
			new APIError(err.message ? err.message : 'INTERNAL SERVER ERROR', 500);
			return res.sendStatus(500);
		}
	};
};


export default {
	validateSuperAdmin: createJwtValidation([UserTypeEnum.superAdmin]),
	validateAdmin: createJwtValidation([UserTypeEnum.superAdmin, UserTypeEnum.admin]),
	validatePartner: createJwtValidation([UserTypeEnum.superAdmin, UserTypeEnum.admin, UserTypeEnum.partner]),
  	validateUser: createJwtValidation([UserTypeEnum.superAdmin, UserTypeEnum.admin, UserTypeEnum.user, UserTypeEnum.partner]),
  	validateGuestOrUser: createGuestJwtValidation()
};

export interface IJwtDetails {
	_id: string;
  role: number;
  provider: number;
	iat: number;
  exp: number;
}