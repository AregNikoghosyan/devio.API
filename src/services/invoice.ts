import CounterSchema from '../schemas/counter';

import { CounterReferenceEnum } from '../constants/enums';
import { ICompany } from '../schemas/company/model';
import { IAddress } from '../schemas/address/model';
import { IUser } from '../schemas/user/model';

const cromaGroup = {
  name   : '"Կրոման Գրուպ" ՍՊԸ',
  tin    : 'ՀՎՀՀ 00888954',
  bank   : '"Ամերիաբանկ" ՓԲԸ',
  bankTin: 'հ/հ 1570020377270100',
  address: 'ք. Երևան, Ավան 4/14'
};

const obzektivoGroup = {
  name   : '"ՕԲԶԵՔԹԻՎՈ" ՍՊԸ',
  tin    : 'ՀՎՀՀ 00000000',
  bank   : '"ՀԱՅԷԿՈՆՈՄԲԱՆԿ" ՓԲԸ',
  bankTin: 'հ/հ 0000000000000000',
  address: '0060, ՀՀ ք. Երևան'
};

export const invoiceTemplate = async(itemList: Array<any>, total: number, company: ICompany<string, IAddress, string>, user: IUser) => {
  const counter = await CounterSchema.findOneAndUpdate({ reference: CounterReferenceEnum.invoice }, { $inc: { count: 1 } }, { new: true });
  let html = '';
  if (itemList.length > 10) {
    for (let i = 0; i < itemList.length; i++) {
      if (i % 10 === 0) {
        html += generateInvoiceHtml(itemList.slice(i, i + 10), total, !(itemList[i + 10]), i === 0, company, counter.count, user);
      }
    }
  } else {
    html = generateInvoiceHtml(itemList, total, true, true, company, counter.count, user);
  }
  return html;
};

export const exportTemplate = async(itemList: Array<any>, company: ICompany<string, IAddress, string>, user: IUser, total: number, receivingBonuses: number) => {
  const counter = await CounterSchema.findOneAndUpdate({ reference: CounterReferenceEnum.invoice }, { $inc: { count: 1 } }, { new: true });
  let html = '';
  if (itemList.length > 10) {
    for (let i = 0; i < itemList.length; i++) {
      if (i % 10 === 0) {
        html += generateExportOrder(itemList,  company, user, true, true, total, receivingBonuses);
      }
    }
  } else {
    html = generateExportOrder(itemList,  company, user, true, true, total, receivingBonuses);
  }
  return html;
};

function getDate() {
  const months = [
    'Հունվար',
    'Փետրվար',
    'Մարտ',
    'Ապրիլ',
    'Մայիս',
    'Հունիս',
    'Հուլիս',
    'Օգոստոս',
    'Սեպտեմբեր',
    'Հոկտեմբեր',
    'Նոյեմբեր',
    'Դեկտեմբեր'
  ];
  const date = new Date();
  const day = date.getDate();
  const year = date.getFullYear();
  const month = months[date.getMonth()];
  return `${day} ${month} ${year}`;
}

function generateInvoiceHtml(itemList: Array<any>, total: number, isLastPage: boolean, isFirstPage: boolean, company: ICompany<string, IAddress, string>, invoiceId: number, user: IUser) {
  return `<body id="root">
  ${!isFirstPage ? '<div style="width: 675px; height: 7px;"></div>' : ''}
  <header style="width: 675px; height: 200px; background-color: #EEEEEE; padding: 0 50px 20px 50px; display: flex; flex-direction: column; justify-content: space-between;">
    <div style="width: 100%; height: 34%; display: flex; flex-direction: row; justify-content: space-between;">

      <div style="width: 150px; height: 100%; background-color: #29A27D; display: flex; justify-content: center; align-items: center;">
        <img src="https://api.ineed.am/photos/ineed_logo_white.png" style="height: 60%; width: 60%;"/>
      </div>

      <div style="display: flex; align-items: flex-end; width: 250px; height: 100%; font-size: 14px;">
        <div style="display: flex; justify-content: space-between; width: 250px; align-items: flex-end;">
          <p style="color: #3A3939; margin: 0;">Invoice ${toIdType(invoiceId)}</p>
          <p style="color: #3A3939; margin: 0;">${getDate()}</p>
        </div>
      </div>

    </div>
    <div style="width: 100%; height: 50%; display: flex; align-items: flex-start">
      <div style="display: flex; flex-direction: column; color: #3A3939; margin-right: 50px;  justify-content: space-between;">
        <h5 style="margin: 0";>${cromaGroup.name}</h5>
        <p style="margin: 10px 0 0 0; font-size: 12px;">${cromaGroup.bank}</p>
        <p style="margin: 3px 0 0 0; font-size: 12px;">${cromaGroup.tin}</p>
        <p style="margin: 3px 0 0 0; font-size: 12px;">${cromaGroup.bankTin}</p>
        <p style="margin: 3px 0 0 0; font-size: 12px;">${cromaGroup.address}</p>
      </div>
      ${
        company
        ?
        `
        <div style="display: flex; flex-direction: column; color: #3A3939; justify-content: space-between;">
          <h5 style="margin: 0";>${company.name}</h5>
          <p style="margin: 10px 0 0 0; font-size: 12px;">${'ՀՎՀՀ ' + company.tin}</p>
          <p style="margin: 3px 0 0 0; font-size: 12px;">${company.billingAddress.address}</p>
        </div>
        `
        :
        ''
      }
      ${
        !company && user
        ?
        `
        <div style="display: flex; flex-direction: column; color: #3A3939; justify-content: space-between;">
          <h5 style="margin: 0";>${user.fullName || ''}</h5>
          <p style="margin: 10px 0 0 0; font-size: 12px;">${user.phoneNumber ? 'Հեռ. ' + user.phoneNumber : ''}</p>
        </div>
        `
        :
        ''
      }
    </div>
  </header>

  <div id="body" style="width: 774px; height: 666px;">

    <div style="width: 100%; heigth: 20px; display: flex; flex-direction: row; margin-top: 20px; font-size: 13px; font-weight: 800;">
      <div style="width: 35px; margin-left: 20px;">#</div>
      <div style="width: 280px; margin-right: 30px;">Անվանում</div>
      <div style="width: 100px;">Քանակ</div>
      <div style="width: 80px; margin-right: 30px;">Չ/Մ</div>
      <div style="width: 100px;">Գին</div>
      <div style="width: 50px; margin-right: 30px;">ԱԱՀ</div>
      <div style="width: 100px; margin-right: 20px;">Ընդհանուր</div>
    </div>

    ${productHtmlList(itemList)}

    ${
      isLastPage
      ?
      `<hr style="width: width: 774px; margin: 20px 20px 0 20px;" />
        <div style="display: flex; flex-direction: row; justify-content: flex-end; margin: 10px 20px 0 20px;">
          <div>
            <div style="display: flex; flex-direction: row; justify-content: space-between; width: 230px; margin-right: 50px;">
              <p style="margin: 0; font-size: 14px; font-weight: 800;">Ընդհանուր\`</p>
              <p style="margin: 0; font-size: 14px; font-weight: 800;">${toDramType(total)}</p>
            </div>
            <div style="display: flex; flex-direction: row; justify-content: space-between; width: 230px; margin-right: 50px;">
              <p style="margin: 0; font-size: 14px; font-weight: 800;">Այդ թվում ԱԱՀ(20%)\`</p>
              <p style="margin: 0; font-size: 14px; font-weight: 800;">${  toDramType(total - Math.round(total / 1.2))}</p>
            </div>
          </div>
        </div>
      `
      :
      ''
    }


  </div>

  <div id="footer" style="width: 774px; height: 200px; display: flex; flex-direction: column; justify-content: flex-end; ${!isLastPage ? 'margin-bottom: 25px;' : ''}">

    ${
      isLastPage
      ?
      `
      <div style="width: 100%; align-items: flex-end; height: 724px; display: flex; flex-direction: row; justify-content: ${true ? 'flex-end' : 'space-between'};">

      ${
        false
        ?
        `
          <div style="display: flex; flex-direction: column; color: #293137; margin-left: 50px;">
            <h5 style="margin: 0;">Ընդհանուր դրույթներ և պայմաններ<h5>
            <p style="margin: 0; font-size: 12px;">Առաքման գումար՝ <span style="margin: 5px; font-weight: 400;">${toDramType(1)}</span><p>
            <p style="margin: -5px 0 0 0; font-size: 12px;">Ամսաթիվ՝ <span style="margin: 60px; font-weight: 400;">${getDate()}</span><p>
          </div>
        `
        :
        ''
      }

        <div style="height: 70px; width: 200px; display: flex; flex-direction: column; color: #293137; margin-right: 50px; position: relative;">
          <img src="https://api.ineed.am/photos/signature.png" style="height: 40px; width: 100px; position: absolute; left: 50px; top: -30px;"/>
          <hr style="width: 100%; color: #707070;" />
          <p style="margin: -3px 0 0 0; font-size: 12px; font-weight: 800;">Կորոպորատիվ մենեջեր</p>
          <p style="margin: 0 0 0 0; font-size: 12px; font-weight: 800;">Թամարա Մանուչարյան</p>
        </div>

      </div>
      `
      :
      ''
    }


    <div style="width: 100%; height: 50px; display: flex; flex-direction: row; justify-content: space-between; background-color: #EEEEEE; align-items: center; color: #293137">
      <p style="font-size: 12px; margin-left: 50px;">ՀՀ, Երևան, Ավան 4/14, 0060</p>
      <p style="font-size: 12px;">Աշխ.՝ 011200900</p>
      <p style="font-size: 12px;">Բջջ.՝ 044200900</p>
      <p style="font-size: 14px;">www.ineed.am</p>
      <p style="font-size: 14px; margin-right: 50px;">sales@ineed.am</p>
    </div>

    </div>
  </body>
  `;
}

function generateExportOrder(itemList: Array<any>, company: ICompany<string, IAddress, string>, user: IUser, isFirstPage: boolean, isLastPage: boolean, total: number, receivingBonuses: number) {
  return `<body id="root">
  ${!isFirstPage ? '<div style="width: 675px; height: 7px;"></div>' : ''}
  <header style="width: 675px; height: 200px; background-color: #EEEEEE; padding: 0 50px 20px 50px; display: flex; flex-direction: column; justify-content: space-between;">
    <div style="width: 100%; height: 34%; display: flex; flex-direction: row; justify-content: space-between;">

      <div style="width: 150px; height: 100%; background-color: #29A27D; display: flex; justify-content: center; align-items: center;">
        <img src="https://api.ineed.am/photos/ineed_logo_white.png" style="height: 60%; width: 60%;"/>
      </div>

      <div style="display: flex; align-items: flex-end; width: 250px; height: 100%; font-size: 14px;">
        <div style="display: flex; justify-content: space-between; width: 250px; align-items: flex-end;">
          <p style="color: #3A3939; margin: 0;">${getDate()}</p>
        </div>
      </div>

    </div>
    <div style="width: 100%; height: 50%; display: flex; align-items: flex-start">
      <div style="display: flex; flex-direction: column; color: #3A3939; margin-right: 50px;  justify-content: space-between;">
        <h5 style="margin: 0";>${cromaGroup.name}</h5>
        <p style="margin: 10px 0 0 0; font-size: 12px;">${cromaGroup.bank}</p>
        <p style="margin: 3px 0 0 0; font-size: 12px;">${cromaGroup.tin}</p>
        <p style="margin: 3px 0 0 0; font-size: 12px;">${cromaGroup.bankTin}</p>
        <p style="margin: 3px 0 0 0; font-size: 12px;">${cromaGroup.address}</p>
      </div>
      ${
        company
        ?
        `
        <div style="display: flex; flex-direction: column; color: #3A3939; justify-content: space-between;">
          <h5 style="margin: 0";>${company.name}</h5>
          <p style="margin: 10px 0 0 0; font-size: 12px;">${'ՀՎՀՀ ' + company.tin}</p>
          <p style="margin: 3px 0 0 0; font-size: 12px;">${company.billingAddress.address}</p>
        </div>
        `
        :
        ''
      }
      ${
        !company && user
        ?
        `
        <div style="display: flex; flex-direction: column; color: #3A3939; justify-content: space-between;">
          <h5 style="margin: 0";>${user.fullName || ''}</h5>
          <p style="margin: 10px 0 0 0; font-size: 12px;">${user.phoneNumber ? 'Հեռ. ' + user.phoneNumber : ''}</p>
        </div>
        `
        :
        ''
      }
    </div>
  </header>

  <div id="body" style="width: 774px; height: 666px;">

    <div style="width: 100%; heigth: 20px; display: flex; flex-direction: row; margin-top: 20px; font-size: 13px; font-weight: 800;">
      <div style="width: 35px; margin-left: 20px;">#</div>
      <div style="width: 280px; margin-right: 30px;">Անվանում</div>
      <div style="width: 100px;">Քանակ</div>
      <div style="width: 80px; margin-right: 30px;">Չ/Մ</div>
      <div style="width: 100px;">Գին</div>
      <div style="width: 100px; margin-right: 20px;">Ընդհանուր</div>
    </div>

    ${productHtmlList(itemList)}

    ${
      isLastPage
      ?
      `<hr style="width: width: 774px; margin: 20px 20px 0 20px;" />
        <div style="display: flex; flex-direction: row; justify-content: flex-end; margin: 10px 20px 0 20px;">
          <div>
            <div style="display: flex; flex-direction: row; justify-content: space-between; width: 230px; margin-right: 50px;">
              <p style="margin: 0; font-size: 13px; font-weight: 600;">Ստացված բոնուսները\`</p>
              <p style="margin: 0; font-size: 13px; font-weight: 600;">${toDramType(receivingBonuses)}</p>
              <p style="margin: 0; font-size: 14px; font-weight: 800;">Ընդհանուր\`</p>
              <p style="margin: 0; font-size: 14px; font-weight: 800;">${toDramType(total)}</p>
            </div>
          </div>
        </div>
      `
      :
      ''
    }


  </div>

  <div id="footer" style="width: 774px; height: 200px; display: flex; flex-direction: column; justify-content: flex-end; ${!isLastPage ? 'margin-bottom: 25px;' : ''}">

    ${
      isLastPage
      ?
      `
      <div style="width: 100%; align-items: flex-end; height: 724px; display: flex; flex-direction: row; justify-content: ${true ? 'flex-end' : 'space-between'};">

      ${
        false
        ?
        `
          <div style="display: flex; flex-direction: column; color: #293137; margin-left: 50px;">
            <h5 style="margin: 0;">Ընդհանուր դրույթներ և պայմաններ<h5>
            <p style="margin: 0; font-size: 12px;">Առաքման գումար՝ <span style="margin: 5px; font-weight: 400;">${toDramType(1)}</span><p>
            <p style="margin: -5px 0 0 0; font-size: 12px;">Ամսաթիվ՝ <span style="margin: 60px; font-weight: 400;">${getDate()}</span><p>
          </div>
        `
        :
        ''
      }

        <div style="height: 70px; width: 200px; display: flex; flex-direction: column; color: #293137; margin-right: 50px; position: relative;">
          <img src="https://api.ineed.am/photos/signature.png" style="height: 40px; width: 100px; position: absolute; left: 50px; top: -30px;"/>
          <hr style="width: 100%; color: #707070;" />
          <p style="margin: -3px 0 0 0; font-size: 12px; font-weight: 800;">Կորոպորատիվ մենեջեր</p>
          <p style="margin: 0 0 0 0; font-size: 12px; font-weight: 800;">Թամարա Մանուչարյան</p>
        </div>

      </div>
      `
      :
      ''
    }


    <div style="width: 100%; height: 50px; display: flex; flex-direction: row; justify-content: space-between; background-color: #EEEEEE; align-items: center; color: #293137">
      <p style="font-size: 12px; margin-left: 50px;">ՀՀ, Երևան, Ավան 4/14, 0060</p>
      <p style="font-size: 12px;">Աշխ.՝ 011200900</p>
      <p style="font-size: 12px;">Բջջ.՝ 044200900</p>
      <p style="font-size: 14px;">www.ineed.am</p>
      <p style="font-size: 14px; margin-right: 50px;">sales@ineed.am</p>
    </div>

    </div>
  </body>
  `;
}

function productHtmlList(productList: Array<any>) {
  let html = '';
  productList.forEach(item => {
    const divided = item.price / 1.2;
    const itemPrice = +divided.toFixed(2);
    const itemFee = +(item.price - itemPrice).toFixed(2);
    html += `
      <div style="width: 100%; heigth: 30px; display: flex; flex-direction: row; margin-top: 20px; margin-right: 10px; font-size: 12px; align-items: center;">
        <div style="width: 35px; margin-left: 20px;">${item.number}</div>
        <div style="width: 280px; display: flex; margin-right: 30px; align-items: center;">
          <div style="min-height: 30px; min-width: 30px; max-height: 30px; max-width: 30px; border: 1px solid #707070; background-image: url('${item.image}'); margin-right: 5px; border-radius: 10px; background-position: center; background-size: cover;">
          </div>
          ${item.name}
        </div>
        <div style="width: 100px;">${item.count}</div>
        <div style="width: 80px; margin-right: 30px;">${item.mu}</div>
        <div style="width: 100px;">${toDramType(itemPrice)}</div>
        <div style="width: 50px; margin-right: 30px;">${toDramType(itemFee)}</div>
        <div style="width: 100px; margin-right: 20px;">${toDramType(item.total)}</div>
      </div>
    `;
  });
  return html;
}

function toDramType (value: number): string {
  const stringValue = '' + value;
  const dividedByPointArr = stringValue.split('.');
  const toReverseString = dividedByPointArr[0];
  let dramTyped = '';
  const length = toReverseString.length;
  for (let i = toReverseString.length - 1; i > -1; i--) {
    if (i !== length - 1 && (i - length + 1) % 3 === 0) {
      dramTyped += ` ${toReverseString[i]}`;
    } else {
      dramTyped += `${toReverseString[i]}`;
    }
  }
  const arr = dramTyped.split('');
  arr.reverse();
  return dividedByPointArr[1] ? arr.join('') + '.' + dividedByPointArr[1] : arr.join('');
}

function toIdType(id: number): string {
  const idLength = 5;
  let stringId = '' + id;
  if (stringId.length < idLength) {
    const count = idLength - stringId.length;
    for (let i = 1; i < count; i++) {
      stringId = '0' + stringId;
    }
  }
  return  '#' + stringId;
}