import * as Joi from 'joi';

const beeline = '91|99|96|43|33';
const ucom    = '55|95|41|44';
const mts     = '93|94|77|49|98';
const city    = '10|11|60';

// export const phoneNumberRegex = new RegExp(`^(374)((?:${mts}|${beeline}|${ucom})([0-9]{6}))$`);

// export const cityPhoneNumberRegex = new RegExp(`^(374)((?:${mts}|${city}|${beeline}|${ucom})([0-9]{6}))$`);
export const phoneNumberRegex = new RegExp(`^(374)([0-9]{8})$`);

export const cityPhoneNumberRegex = new RegExp(`^(374)([0-9]{8})$`);

export const tinRegex = new RegExp('^[0-9]{8}$');

export const idRegex = /^[0-9a-fA-F]{24}$/;

export const idValidation = {
  id: Joi.string().regex(idRegex).required()
};

export const pagingValidation = {
  pageNo : Joi.number().min(1).required(),
  limit  : Joi.number().min(1).required()
};

export const skipPagingValidation = {
  skip  : Joi.number().min(0).required(),
  limit : Joi.number().min(1).required()
};

export const languageValidation = {
  language: Joi.number().min(1).max(3).required()
};

export const countRemainder = (sum: number, divider: number) => {
  const sumDecimalsLength = countDecimals(sum);
  const dividerDecimalsLength = countDecimals(divider);
  const maxLength = sumDecimalsLength >= dividerDecimalsLength ? sumDecimalsLength : dividerDecimalsLength;
  let multiplier = 1;
  for (let i = 0; i < maxLength; i++) {
    multiplier *= 10;
  }
  const remainder = (sum * multiplier) % (divider * multiplier);
  multiplier = (sum * multiplier) / (divider * multiplier);
  return { remainder, multiplier };
};

function countDecimals (value: number) {
  return value % 1 ? value.toString().split('.')[1].length : 0;
}

/**
 * Function returns a nwe string with special characters in strings to be escaped
 */
export function regexpEscape (string: string) {
  return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&').trim();
}