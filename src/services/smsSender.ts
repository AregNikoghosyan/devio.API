import fetch from 'node-fetch';
import { parseString } from 'xml2js';
import { getResponse, IResponseModel } from '../api/mainModels';

/**
 * Send sms functionality
 * @param   {String} message     - Message to send
 * @param   {String} phoneNumber - Phone number
 * @returns {Promise<IResponseModel>}
 */
export const sendVerificationCodeViaSMS = async(message: string, phoneNumber: string): Promise<IResponseModel> => {
  const sms_id = Math.floor(Math.random() * (100000000000000 - 10000000000000)) + 10000000000000;
  const body =
    '<?xml version="1.0" encoding="UTF-8" ?>' +
    '<xml_request name="sms_send">' +
    '<xml_user lgn="' + 'inf_ineed' + '" pwd="' + 'Kmd52Uytde6' + '"/>' +
    '<sms sms_id="' + sms_id + '" number="' + phoneNumber + '" source_number="' + 'ineed' + '" ttl="1">' + message + '</sms>' +
    '</xml_request>';
  const res: any = await fetch('https://msg.am/Xml_Api/index.php', { method: 'POST', body })
  .then(res => res.text())
  .then(async text => {
    parseString(text, (error, result) => { text = result; });
    return text;
  });
  if (res.xml_result.$.res !== '0') {
    return getResponse(false, 'Sms did not send', null);
  } else {
    return getResponse(true, 'Sms sent successfully', null);
  }
};
