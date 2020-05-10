import fetch from 'node-fetch';

import { SocialProviderEnum } from '../constants/enums';
import { socialProvidersKeys } from '../constants/constants';

class SocialProviderServices {

  public getUserData = async(socialProvider: number, token: string): Promise<ISocialMediaData> => {
    switch (socialProvider) {
      case SocialProviderEnum.facebook: {
        const data = await this.getFacebookData(token);
        return data;
      }
      case SocialProviderEnum.linkedin: {
        const data = await this.getLinkedInData(token);
        return data;
      }
      case SocialProviderEnum.google: {
        const data = await this.getGoogleData(token);
        return data;
      }
      default: {
        return;
      }
    }
  }

  private async getFacebookData(token: string): Promise<ISocialMediaData> {
    const data: IFacebookData = await fetch( socialProvidersKeys.facebookUrl + token, { method: 'GET' }).then(res => {
      if (res.status === 200) {
        const data = res.json();
        return data;
      } else {
        return;
      }
    });
    if (data) {
      const socialData: ISocialMediaData = {
        id: data.id,
        email: data.email.toLowerCase(),
        firstName: data.first_name,
        lastName: data.last_name,
        profilePicture: data.picture && data.picture.data && data.picture.data.url
      };
      return socialData;
    } else {
      return;
    }
  }

  private async getLinkedInData(token: string): Promise<ISocialMediaData> {
    const headers = {
      'Authorization': 'Bearer ' + token,
      'x-li-src': 'msdk',
    };
    const data: ILinkedInData = await fetch(socialProvidersKeys.linkedinUrl, { method: 'GET', headers }).then(res => {
      if (res.status === 200) {
        const data = res.json();
        return data;
      } else {
        return;
      }
    });
    if (data) {
      const socialData: ISocialMediaData = {
        id: data.id,
        email: data.emailAddress.toLowerCase(),
        firstName: data.firstName,
        lastName: data.lastName,
        profilePicture: data.pictureUrl,
      };
      return socialData;
    } else {
      return;
    }
  }

  private async getGoogleData(token: string): Promise<ISocialMediaData> {
    const data: IGoogleData = await fetch( socialProvidersKeys.googleUrl + token, { method: 'GET' }).then(res => {
      if (res.status === 200) {
        const data = res.json();
        return data;
      } else {
        return;
      }
    });
    if (data) {
      const socialData: ISocialMediaData = {
        id: data.sub,
        email: data.email.toLowerCase(),
        firstName: data.given_name,
        lastName: data.family_name,
        profilePicture: data.picture,
      };
      return socialData;
    } else {
      return;
    }
  }
}

export default new SocialProviderServices();

export interface ISocialMediaData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  profilePicture?: string;
}

interface ILinkedInData {
  id: string;
  emailAddress: string;
  firstName: string;
  lastName: string;
  pictureUrl: string;
}

interface IFacebookData {
  id: string;
  email: string;
  last_name: string;
  first_name: string;
  picture: {
    data: {
      height: number;
      is_silhouette: boolean,
      url: string;
      width: number;
    }
  };
}

interface IGoogleData {
  sub: string;
  email: string;
  given_name: string;
  family_name: string;
  picture: string;
}