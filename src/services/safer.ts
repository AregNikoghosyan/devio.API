import * as crypto from 'crypto';
import mainConfig from '../env';

class Safe {

  private algorithm = 'aes-256-ctr';
  private key = crypto
    .createHash('sha256')
    .update(mainConfig.CRYPTO_SECRET_KEY)
    .digest();

  /**
   * Method encrypts given string and returns encrypted string
   * @param   {String} data - String to encrypt
   * @returns {String}      - Encrypted string
   */
  public encrypt = (data: string): string => {
    const iv = crypto
      .randomBytes(16)
      .toString('hex')
      .slice(0, 16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    const encrypted = cipher.update(String(data), 'utf8', 'hex') + cipher.final('hex');
    return iv + encrypted;
  }

  /**
   * Method decrypts given encrypted string and returns
   * @param   {String} data - String to decrypt
   * @returns {String}      - Decrypted string
   */
  public decrypt = (data: string): string => {
    const iv = data.slice(0, 16);
    const encrypted = data.slice(16);
    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
    return decipher.update(encrypted, 'hex', 'utf8') + decipher.final('utf8');
  }
}

export default new Safe();