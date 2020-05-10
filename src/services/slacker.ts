import * as Slack from 'slack-node';
import APIError from './APIError';

const token = '1anSrWHa751x22ic9525mhWn';
const domain = 'https://hooks.slack.com/services/T403EN866/BC3GC0NR4';

export default class ErrorSlack extends Slack {
  constructor(err: APIError) {
    super();
    this.setWebhook(`${domain}/${token}`);
    this.status = err.status;
    this.stack = err.stack;
    this.info = err.info;
    this.sendMessage();
  }
  public status: number;
  public stack: string;
  public info: string;

  /**
   * Method sends message with slack bot to set chanel
   * @returns {void}
   */
  private sendMessage = (): void => {
    this.webhook({
      attachments: [
        {
          'fallback': `*ERROR IN INeed* with status code *${this.status}*`,
          'pretext': `*ERROR IN INeed* with status code *${this.status}*`,
          'color': '#ff0000',
          'fields': [
            {
               'title': '*Error*',
               'value': `${this.stack}\n*${this.info}*`,
               'short': false
            }
          ],
          'footer': 'ArmBoldMind',
          'footer_icon': 'https://avatars2.githubusercontent.com/u/29069980?s=200&v=4',
          'ts': (new Date().getTime()) / 1000
        }
      ]
    }, (err, res) => {
      console.log(`Error message sent to slack \nSlack's response: ${res.response}`);
    });
  }
}

export const sendRejectionToSlack = (message: any): void => {
  if (message !== null && typeof message === 'object') {
    message = JSON.stringify(message);
  }
  const MySlack = new Slack();
  const slacker = MySlack.setWebhook(`${domain}/${token}`);
  slacker.webhook({
    attachments: [
      {
        'fallback': '*Rejection IN INeed*',
        'pretext': '*Rejection IN INeed*',
        'color': '#ff0000',
        'fields': [
          {
             'title': '*Rejection*',
             'value': message,
             'short': false
          }
        ],
        'footer': 'ArmBoldMind',
        'footer_icon': 'https://avatars2.githubusercontent.com/u/29069980?s=200&v=4',
        'ts': (new Date().getTime()) / 1000
      }
    ]
  }, (err, res) => {
    console.log(`Rejection message sent to slack \nSlack's response: ${res.response}`);
  });
};