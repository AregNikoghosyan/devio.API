import * as nodeMailer from 'nodemailer';
import { OsTypeEnum, WebRedirectTypeEnum } from '../constants/enums';
import mainConfig from '../env';


const transporter = nodeMailer.createTransport({
  service: 'Mail.ru',
  auth: {
    user: 'noreply@ineed.am',
    pass: 'noreply002'
  }
});

export const sendVerificationEmail = (code: string, email: string, osType: number) => {
  let html = `
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            .img-wrap {
              width: 25%;
              margin: auto;
            }
            img {
              max-width: 100%;

            }
        </style>
      </head>
      <body>
        <div style="width: 100%; min-height: 250px;">
          <div style="width: 500px; position: absolute; left: 0; right: 0; margin: 0 auto; padding: 5px;">
            <div>
              <img class="img-wrap" src="https://api.ineed.am/photos/logo_main.png" alt="logo">
            </div>
            <div style="min-height: 160px;border: 1px solid rgba(0,0,0,0.15);margin-top: 20px;border-radius: 5px;padding: 10px 25px;font-size: 14px;">
              <p>Thanks for creating your ineed market account. To continue, please enter this verification code bellow.</p>
              <div style="width: 100%; height: 35px;">
                <div style="border: none; height: 35px; width: 100px; color: white; font-weight: 800; background-color: #29a27d; border-radius: 5px; margin: 0 auto;">
                  <p style="margin: 0; line-height: 35px; text-align: center;">${code}</p>
                </div>
              </div>
              <p style="font-size: 12px; color: grey;">If you didn't create this account, please ignore this message.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
  if (osType === OsTypeEnum.web) {
    let link = mainConfig.WEB_CLIENT_BASE_URL;
    link += `?email=${email}`;
    link += `&code=${code}`;
    link += `&type=${WebRedirectTypeEnum.register}`;
    html = `
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            .img-wrap {
              width: 25%;
              margin: auto;
            }
            img {
              max-width: 100%;

            }
        </style>
      </head>
      <body>
        <div style="width: 100%; min-height: 250px;">
          <div style="width: 500px; position: absolute; left: 0; right: 0; margin: 0 auto; padding: 5px;">
            <div>
              <img class="img-wrap" src="https://api.ineed.am/photos/logo_main.png" alt="logo">
            </div>
            <div style="min-height: 160px;border: 1px solid rgba(0,0,0,0.15);margin-top: 20px;border-radius: 5px;padding: 10px 25px;font-size: 14px;">
              <p>Thanks for creating your ineed market account. To continue, please verify your email address by clicking the button below.</p>
              <div style="width: 100%; height: 35px;">
                <div style="border: none; height: 35px; width: 100px; color: white; font-weight: 800; background-color: #29a27d; border-radius: 5px; margin: 0 auto;">
                  <a style="display: block; color: white;margin: 0; line-height: 35px; text-align: center; text-decoration: none;" href="${link}" target="_blank" rel="noopener noreferrer">
                    Verify email
                  </a>
                </div>
              </div>
              <p style="font-size: 12px; color: grey;">If you didn't create this account, please ignore this message.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
  }
  const emailOptions = {
    from: 'noreply@ineed.am',
    to: email,
    subject: 'Verify your email for ineed market',
    html
  };
  transporter.sendMail(emailOptions, (err, info) => {
    if (err) console.log(err);
    else console.log(info);
  });
};

export const sendForgotEmail = (code: string, email: string, osType: number) => {
  let html = `
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            .img-wrap {
              width: 25%;
              margin: auto;
            }
            img {
              max-width: 100%;

            }
        </style>
      </head>
      <body>
        <div style="width: 100%; min-height: 250px;">
          <div style="width: 500px; position: absolute; left: 0; right: 0; margin: 0 auto; padding: 5px;">
            <div>
              <img class="img-wrap" src="https://api.ineed.am/photos/logo_main.png" alt="logo">
            </div>
            <div style="min-height: 160px;border: 1px solid rgba(0,0,0,0.15);margin-top: 20px;border-radius: 5px;padding: 10px 25px;font-size: 14px;">
              <p>Seems like you forgot your password for ineed market account. If that is true, please enter this restore code bellow.</p>
              <div style="width: 100%; height: 35px;">
                <div style="border: none; height: 35px; width: 100px; color: white; font-weight: 800; background-color: #29a27d; border-radius: 5px; margin: 0 auto;">
                  <p style="margin: 0; line-height: 35px; text-align: center; font-size: 15px;">${code}</p>
                </div>
              </div>
              <p style="font-size: 12px; color: grey;">If you didn't forget your password, please ignore this message.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
  if (osType === OsTypeEnum.web) {
    let link = mainConfig.WEB_CLIENT_BASE_URL;
    link += `?email=${email}`;
    link += `&code=${code}`;
    link += `&type=${WebRedirectTypeEnum.forgot}`;
    html = `
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            .img-wrap {
              width: 25%;
              margin: auto;
            }
            img {
              max-width: 100%;

            }
        </style>
      </head>
      <body>
        <div style="width: 100%; min-height: 250px;">
          <div style="width: 500px; position: absolute; left: 0; right: 0; margin: 0 auto; padding: 5px;">
            <div>
              <img class="img-wrap" src="https://api.ineed.am/photos/logo_main.png" alt="logo">
            </div>
            <div style="min-height: 160px;border: 1px solid rgba(0,0,0,0.15);margin-top: 20px;border-radius: 5px;padding: 10px 25px;font-size: 14px;">
              <p>Seems like you forgot your password for ineed market account. If that is true, click bellow to reset your password.</p>
              <div style="width: 100%; height: 35px;">
                <div style="border: none; height: 35px; width: 150px; color: white; font-weight: 800; background-color: #29a27d; border-radius: 5px; margin: 0 auto;">
                  <a style="display: block; color: white;margin: 0; line-height: 35px; text-align: center; text-decoration: none;" href="${link}" target="_blank" rel="noopener noreferrer">
                    Reset
                  </a>
                </div>
              </div>
              <p style="font-size: 12px; color: grey;">If you didn't forgot your password, please ignore this message.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
  }
  const emailOptions = {
    from: 'noreply@ineed.am',
    to: email,
    subject: 'Restore your password of ineed market account',
    html
  };
  transporter.sendMail(emailOptions, (err, info) => {
    if (err) console.log(err);
    else console.log(info);
  });
};

export const sendOrderVerifyEmail = (code: string, email: string) => {
  const html = `
  <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            .img-wrap {
              width: 25%;
              margin: auto;
            }
            img {
              max-width: 100%;

            }
        </style>
      </head>
      <body>
        <div style="width: 100%; min-height: 250px;">
          <div style="width: 500px; position: absolute; left: 0; right: 0; margin: 0 auto; padding: 5px;">
            <div>
              <img class="img-wrap" src="https://api.ineed.am/photos/logo_main.png" alt="logo">
            </div>
            <div style="min-height: 160px;border: 1px solid rgba(0,0,0,0.15);margin-top: 20px;border-radius: 5px;padding: 10px 25px;font-size: 14px;">
              <p>You have requested verifying email for Ineed order. To continue, please enter this verification code bellow.</p>
              <div style="width: 100%; height: 35px;">
                <div style="border: none; height: 35px; width: 100px; color: white; font-weight: 800; background-color: #29a27d; border-radius: 5px; margin: 0 auto;">
                  <p style="margin: 0; line-height: 35px; text-align: center;">${code}</p>
                </div>
              </div>
              <p style="font-size: 12px; color: grey;">If you have not requested verification email, please ignore this message.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
  const emailOptions = {
    from: 'noreply@ineed.am',
    to: email,
    subject: 'Verify your email for ineed market order',
    html
  };
  transporter.sendMail(emailOptions, (err, info) => {
    if (err) console.log(err);
    else console.log(info);
  });
};

export const sendOrderCreateEmail = (email: string, code: string, name: string) => {
  const link = mainConfig.WEB_CLIENT_BASE_URL + `?orderEmail=${email}&orderCode=${code}`;
  const html = `
  <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            .img-wrap {
              width: 25%;
              margin: auto;
            }
            img {
              max-width: 100%;

            }
        </style>
      </head>
      <body>
        <div style="width: 100%; min-height: 250px;">
          <div style="width: 500px; position: absolute; left: 0; right: 0; margin: 0 auto; padding: 5px;">
            <div>
              <img class="img-wrap" src="https://api.ineed.am/photos/logo_main.png" alt="logo">
            </div>
            <div style="min-height: 160px;border: 1px solid rgba(0,0,0,0.15);margin-top: 20px;border-radius: 5px;padding: 10px 25px;font-size: 14px;">
              <p>
                Dear ${name ? name : 'Customer'}. We're processing your order. You can always get your order's details on our web site by this <a href=${link}>link</a>
                or in our applications with inserting your email and code shown below.
              </p>
              <div style="width: 100%; height: 35px;">
                <div style="border: none; height: 35px; width: 100px; color: white; font-weight: 800; background-color: #29a27d; border-radius: 5px; margin: 0 auto;">
                  <p style="margin: 0; line-height: 35px; text-align: center;">${code}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
  const emailOptions = {
    from: 'noreply@ineed.am',
    to: email,
    subject: 'Order details',
    html
  };
  transporter.sendMail(emailOptions, (err, info) => {
    if (err) console.log(err);
    else console.log(info);
  });
};