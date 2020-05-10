import { NotificationTypeEnum, LanguageEnum } from './enums';

const staticNotifications = [
  {
    type: NotificationTypeEnum.orderFinished,
    translations: [
      {
        language: LanguageEnum.hy,
        title: 'Ձեր պատվերն ավարտված է',
        body: 'Սեղմեք մանրամասները տեսնելու եւ բոնուսները ստանալու համար:'
      },
      {
        language: LanguageEnum.ru,
        title: 'Ваш заказ завершен',
        body: 'Нажмите, чтобы увидеть детали и получить бонусы.'
      },
      {
        language: LanguageEnum.en,
        title: 'Your order is finished',
        body: 'Tap to see details and get bonuses.'
      }
    ]
  },
  {
    type: NotificationTypeEnum.orderFinished,
    translations: [
      {
        language: LanguageEnum.hy,
        title: 'Ձեր պատվերն ավարտված է',
        body: 'Սեղմեք մանրամասները տեսնելու եւ բոնուսները ստանալու համար:'
      },
      {
        language: LanguageEnum.ru,
        title: 'Ваш заказ завершен',
        body: 'Нажмите, чтобы увидеть детали и получить бонусы.'
      },
      {
        language: LanguageEnum.en,
        title: 'Your order is finished',
        body: 'Tap to see details and get bonuses.'
      }
    ]
  },
  {
    type: NotificationTypeEnum.orderFinished,
    translations: [
      {
        language: LanguageEnum.hy,
        title: 'Ձեր պատվերն ավարտված է',
        body: 'Սեղմեք մանրամասները տեսնելու եւ բոնուսները ստանալու համար:'
      },
      {
        language: LanguageEnum.ru,
        title: 'Ваш заказ завершен',
        body: 'Нажмите, чтобы увидеть детали и получить бонусы.'
      },
      {
        language: LanguageEnum.en,
        title: 'Your order is finished',
        body: 'Tap to see details and get bonuses.'
      }
    ]
  },
  {
    type: NotificationTypeEnum.orderFinished,
    translations: [
      {
        language: LanguageEnum.hy,
        title: 'Ձեր պատվերն ավարտված է',
        body: 'Սեղմեք մանրամասները տեսնելու եւ բոնուսները ստանալու համար:'
      },
      {
        language: LanguageEnum.ru,
        title: 'Ваш заказ завершен',
        body: 'Нажмите, чтобы увидеть детали и получить бонусы.'
      },
      {
        language: LanguageEnum.en,
        title: 'Your order is finished',
        body: 'Tap to see details and get bonuses.'
      }
    ]
  },
];

export const getStaticNotificationData = (type: number) => {
  let translations;
  switch (type) {
    case NotificationTypeEnum.newRequest: {

      break;
    }
    case NotificationTypeEnum.requestCanceled: {

      break;
    }
    case NotificationTypeEnum.requestFailed: {
      translations = [
          {
            language: LanguageEnum.hy,
            title: 'Ձեր հարցումն ավարտված է',
            body: 'Ներեցեք, բայց մենք չենք գտել Ձեր կողմից հարցված ապրանքը'
          },
          {
            language: LanguageEnum.ru,
            title: 'Ваш запрос не выполнен',
            body: 'Извините, но мы не смогли найти нужный Вам товар'
          },
          {
            language: LanguageEnum.en,
            title: 'Your request failed',
            body: 'Sorry, but we could not find Your requested product'
          }
        ];
      break;
    }
    case NotificationTypeEnum.requestSucceeded: {
      translations = [
        {
          language: LanguageEnum.hy,
          title: 'Ձեր հարցումն ավարտված է',
          body: 'Սեղմեք Ձեր փնտրած ապրանքի մանրամասները տեսնելու համար'
        },
        {
          language: LanguageEnum.ru,
          title: 'Ваш запрос выполнен',
          body: 'Нажмите, чтобы увидеть детали о найденном товаре'
        },
        {
          language: LanguageEnum.en,
          title: 'Your request succeed',
          body: 'Click to see found product\'s details'
        }
      ];
      break;
    }
    case NotificationTypeEnum.newOrder: {

      break;
    }
    case NotificationTypeEnum.orderCanceled: {
      translations = [
        {
          language: LanguageEnum.hy,
          title: 'Ձեր պատվերը չեղարկվել է',
          body: 'Սեղմեք մանրամասները տեսնելու համար:'
        },
        {
          language: LanguageEnum.ru,
          title: 'Ваш заказ отменен',
          body: 'Нажмите, чтобы увидеть детали.'
        },
        {
          language: LanguageEnum.en,
          title: 'Your order is canceled',
          body: 'Tap to see details.'
        }
      ];
      break;
    }
    case NotificationTypeEnum.orderSetToReview: {

      break;
    }
    case NotificationTypeEnum.orderFinished: {
      translations = [
        {
          language: LanguageEnum.hy,
          title: 'Ձեր պատվերն ավարտված է',
          body: 'Սեղմեք մանրամասները տեսնելու եւ բոնուսները ստանալու համար:'
        },
        {
          language: LanguageEnum.ru,
          title: 'Ваш заказ завершен',
          body: 'Нажмите, чтобы увидеть детали и получить бонусы.'
        },
        {
          language: LanguageEnum.en,
          title: 'Your order is finished',
          body: 'Tap to see details and get bonuses.'
        }
      ];
      break;
    }
    case NotificationTypeEnum.wishListDelete: {
      translations = [
        {
          language: LanguageEnum.hy,
          title: 'Գնումների ցուցակ է հեռացվել',
          body: 'Ցավոք, Ձեր գնումների ցուցակներից մեկը հեռացվել է'
        },
        {
          language: LanguageEnum.ru,
          title: 'Список покупок удален',
          body: 'К сожалению, один из ваших списков покупок был удален его создателем'
        },
        {
          language: LanguageEnum.en,
          title: 'Wish list was deleted',
          body: 'Oops, one of your wish lists was deleted by it\'s creator'
        }
      ];
      break;
    }
    case NotificationTypeEnum.wishListLeave: {
      translations = [
        {
          language: LanguageEnum.hy,
          title: 'Անդամը լքել է գնումների ցանկը',
          body: 'Ցավոք, անդամներից մեկը լքել է գնումների ցանկը'
        },
        {
          language: LanguageEnum.ru,
          title: 'Участник вышел из списка желаний',
          body: 'К сожалению, участник покинул ваш список желаний'
        },
        {
          language: LanguageEnum.en,
          title: 'Member left from wish list',
          body: 'Oops, member left from your wish list.'
        }
      ];
      break;
    }
    case NotificationTypeEnum.wishListNewProduct: {
      translations = [
        {
          language: LanguageEnum.hy,
          title: 'Նոր ապրանքատեսակ',
          body: 'Նոր ապրանքատեսակ է ավելացվել գնումների ցանկում'
        },
        {
          language: LanguageEnum.ru,
          title: 'Новый продукт',
          body: 'Новый продукт был добавлен в список покупок .'
        },
        {
          language: LanguageEnum.en,
          title: 'New product',
          body: 'The new product has been added to the  shopping list'
        }
      ];
      break;
    }
    case NotificationTypeEnum.wishListRemoveProduct: {
      translations = [
        {
          language: LanguageEnum.hy,
          title: 'Ապրանքատեսակի հեռացում',
          body: 'Ապրանքատեսակ է հեռացվել գնումների ցանկից'
        },
        {
          language: LanguageEnum.ru,
          title: 'Продукт удален',
          body: 'Продукт был удален из списка покупок.'
        },
        {
          language: LanguageEnum.en,
          title: 'Product removed',
          body: 'The product has been removed from the wish list'
        }
      ];
      break;
    }
    case NotificationTypeEnum.wishListProductRequest: {
      translations = [
        {
          language: LanguageEnum.hy,
          title: 'Ապրանքատեսակի ավելացում',
          body: 'Գնումների ցանկում օգտատերը ցանկանում է ավելացնել նոր ապրաքատեսակ'
        },
        {
          language: LanguageEnum.ru,
          title: 'Добавление продукта',
          body: 'Участник хочет добавить новый продукт в список покупок'
        },
        {
          language: LanguageEnum.en,
          title: 'Product add',
          body: 'Member wants to add a new product to the wish list.'
        }
      ];
      break;
    }
    case NotificationTypeEnum.wishListUnApprove: {
      translations = [
        {
          language: LanguageEnum.hy,
          title: 'Ապրանքատեսակի մերժում',
          body: 'Ձեր կողմից հարցված ապրանքատեսակը հաստատվել է գնումների ցանկում'
        },
        {
          language: LanguageEnum.ru,
          title: 'Отклонение продукта',
          body: 'Запрашиваемый продукт был отклонен в списке покупок.'
        },
        {
          language: LanguageEnum.en,
          title: 'Product Rejection',
          body: 'Requested product has been rejected in wish list'
        }
      ];
      break;
    }
    case NotificationTypeEnum.wishlistApprove: {
      translations = [
        {
          language: LanguageEnum.hy,
          title: 'Ապրանքատեսակի հաստատոմ',
          body: 'Ձեր կողմից հարցված ապրանքատեսակը հաստատվել է գնումների ցանկում'
        },
        {
          language: LanguageEnum.ru,
          title: 'Одобрение продукта',
          body: 'Запрашиваемый продукт был одобрен в списке покупок.'
        },
        {
          language: LanguageEnum.en,
          title: 'Product approvement',
          body: 'Requested product has been approved in wish list'
        }
      ];
      break;
    }
    case NotificationTypeEnum.wishListKick: {
      translations = [
        {
          language: LanguageEnum.hy,
          title: 'Գնումների ցանկի անդամակցում',
          body: 'Ցավոք, Դուք հեռացվել եք գնումների ցանկից'
        },
        {
          language: LanguageEnum.ru,
          title: 'Членство списка покупок',
          body: 'К сожалению, вы были удалены из списка желаний'
        },
        {
          language: LanguageEnum.en,
          title: 'Wish list membership',
          body: 'Oops, you were deleted from wish list by it\'s creator'
        }
      ];
      break;
    }
    case NotificationTypeEnum.wishListNewMember: {
      translations = [
        {
          language: LanguageEnum.hy,
          title: 'Գնումների ցանկի անդամակցում',
          body: 'Նոր անդամ է միացել գնումների ցանկին'
        },
        {
          language: LanguageEnum.ru,
          title: 'Членство списка покупок',
          body: 'Новый участник присоединился к списку покупок'
        },
        {
          language: LanguageEnum.en,
          title: 'Wish list membership',
          body: 'A new member has joined the shopping list'
        }
      ];
      break;
    }
  }
  return translations;
};