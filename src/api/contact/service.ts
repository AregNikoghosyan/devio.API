import { ICreateContactBody } from './model';
import { IResponseModel, getResponse, IPaginationQuery } from '../mainModels';

import ContactSchema from '../../schemas/contact';

class ContactServices {
  public createContact = async(body: ICreateContactBody): Promise<IResponseModel> => {
    await ContactSchema.create({
      address: body.address,
      email: body.email,
      phone: body.phone,
      latitude : body.latitude,
      longitude : body.longitude,
    });
    return getResponse(true, 'ok');
  };

 
}




export default new ContactServices();