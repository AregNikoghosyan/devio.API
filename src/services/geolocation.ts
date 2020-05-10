import fetch from 'node-fetch';
import { googlePointApiUrl, googleApiKey, googleDistanceApiUrl } from '../constants/constants';
import APIError from './APIError';

import CitySchema from '../schemas/city';
import { ICity } from '../schemas/city/model';

export const getCityNameFromMapByGoogleMaps = async (lat: number, lng: number): Promise<string> => {
  const url = `${googlePointApiUrl}latlng=${lat},${lng}&language=en&key=${googleApiKey}`;
  const result = await fetch(url);
  if (result.ok) {
    const body = await result.json();
    const results = body.results;
    let city = '';
    for (let i = 0; i < results.length; i++) {
      if (results[i].address_components) {
        const cityName = getByType(results[i].address_components);
        if (cityName) {
          city = cityName;
          break;
        }
      }
    }
    return city || null;
  } else {
    console.log('Google Points API did not give city name by coordinates');
    return null;
  }
};

export const calculateDistanceByGoogleMaps = async(origin: string, destination: string): Promise<number> => {
  try {
    const googleUri = googleDistanceApiUrl + `origins=${origin}&destinations=${destination}&key=${googleApiKey}`;
    const result = await fetch(googleUri);
    if (result.ok) {
      const body = await result.json();
      if (body.status === 'OK' && body.rows[0].elements[0].distance) {
        return Math.round(body.rows[0].elements[0].distance.value / 1000);
      }
    }
    console.log('Google Distance API did not give distance by coordinates');
    return null;
  } catch (e) {
    return null;
  }
};

export const getCityByAddress = async(lat: number, lng: number): Promise<ICity> => {
  const cityName = await getCityNameFromMapByGoogleMaps(lat, lng);
  if (!cityName) {
    return await getNearestCity(lat, lng);
  } else {
    const city = await CitySchema.findOne({ name: cityName });
    if (city) {
      return city;
    } else {
      return await getNearestCity(lat, lng);
    }
  }
};


async function getNearestCity(lat: number, lng: number): Promise<ICity> {
  const cityList: any = await CitySchema.getNearestCities(lat, lng, 3);
  try {
    const distanceList = [];
    for (let i = 0; i < cityList.length; i++) {
      const distance = await calculateDistanceByGoogleMaps(`${lat},${lng}`, `${cityList[i].lat},${cityList[i].lng}`);
      if (distance) distanceList.push(distance);
    }
    if (distanceList.length !== cityList.length) {
      return cityList[0];
    }
    const city = cityList[distanceList.indexOf(getMin(distanceList))];
    return city;
  } catch (e) {
    return cityList[0];
  }
}

function getByType(addressComponents: Array<{ long_name?: string, short_name: string, types: string[] }>): string {
  const cityType = ['locality', 'political'];
  const subLocalityType = ['political', 'sublocality', 'sublocality_level_1'];
  const postalCodeType = ['postal_code'];
  const administrativeAreaType = ['administrative_area_level_1', 'political'];
  let city, subLocality, postalCode, administrativeArea;
  for (let i = 0; i < addressComponents.length; i++) {
    const isCity = arraysEqual(cityType, addressComponents[i].types);
    const isSubLocality =  arraysEqual(subLocalityType, addressComponents[i].types);
    const isPostalCode = arraysEqual(postalCodeType, addressComponents[i].types);
    const isAdministrativeArea = arraysEqual(administrativeAreaType, addressComponents[i].types);
    if (isCity && addressComponents[i].long_name) {
      city = addressComponents[i].long_name;
    } else if (isSubLocality && addressComponents[i].long_name) {
      subLocality = addressComponents[i].long_name;
    } else if (isPostalCode && addressComponents[i].long_name) {
      postalCode = addressComponents[i].long_name;
    } else if (isAdministrativeArea && addressComponents[i].long_name) {
      administrativeArea = addressComponents[i].long_name;
    }
  }
  if (city === 'Yerevan' && administrativeArea !== 'Yerevan') return null;
  if (city === 'Yerevan' && subLocality === 'Nubarashen') return subLocality;
  if (city === 'Vagharshapat' && subLocality === 'Zvartnots') return subLocality;
  if (city === 'Ashtarak' && subLocality === 'Mughni') return subLocality;
  if (city === 'Katnaghbyur') return `Katnaghbyur ${postalCode}`;
  if (city === 'Martuni') return `Martuni ${postalCode || 'Arcakh'}`;
  if (city === 'Chermug') return 'Jermuk';
  if (city === 'Kəlbəcər') return 'Karvachar';
  if (city === 'Şuşa') return 'Shushi';
  if (city === 'Xankəndi') return 'Stepanakert';
  if (city === 'Əsgəran') return 'Askeran';
  if (city === 'Ağdərə') return 'Martakert';
  return city;
}

function arraysEqual(arr1: any[], arr2: any[]) {
  arr1.sort();
  arr2.sort();
  if (arr1.length !== arr2.length) return false;
  for (let i = arr1.length; i--;) {
    if (arr1[i].toString() !== arr2[i].toString()) return false;
  }
  return true;
}

function getMin(arr: number[]): number {
  let minNumber;
  for (let i = 0; i < arr.length; i++) {
    if (!minNumber || arr[i] < minNumber) minNumber = arr[i];
  }
  return minNumber;
}