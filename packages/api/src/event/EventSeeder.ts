import { faker } from '@faker-js/faker';
import type { IEvent } from 'types/Event.ts';
import EventService from '#api/event/EventService.ts';

const clientProfiles = [
  {
    ip: '128.59.105.24',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'sec-ch-ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'accept-language': 'en-US,en;q=0.9',
  },
  {
    ip: '128.59.105.24',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    'sec-ch-ua': '"Google Chrome";v="123", "Not:A-Brand";v="8", "Chromium";v="123"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'accept-language': 'en-US,en;q=0.9',
  },
  {
    ip: '193.136.2.228',
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'sec-ch-ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"macOS"',
    'accept-language': 'pt-PT,pt;q=0.9,en-US;q=0.8,en;q=0.7',
  },
  {
    ip: '193.136.2.228',
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    'sec-ch-ua': '"Google Chrome";v="123", "Not:A-Brand";v="8", "Chromium";v="123"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"macOS"',
    'accept-language': 'pt-PT,pt;q=0.9,en-US;q=0.8,en;q=0.7',
  },
  {
    ip: '81.2.69.142',
    'user-agent': 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:125.0) Gecko/20100101 Firefox/125.0',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Linux"',
    'accept-language': 'en-GB,en;q=0.9',
  },
  {
    ip: '81.2.69.142',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.2478.67',
    'sec-ch-ua': '"Chromium";v="124", "Microsoft Edge";v="124", "Not-A.Brand";v="99"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'accept-language': 'en-GB,en;q=0.9',
  },
  {
    ip: '133.242.0.0',
    'user-agent': 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.6367.82 Mobile Safari/537.36',
    'sec-ch-ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
    'sec-ch-ua-mobile': '?1',
    'sec-ch-ua-platform': '"Android"',
    'accept-language': 'ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7',
  },
  {
    ip: '133.242.0.0',
    'user-agent': 'Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
    'sec-ch-ua-mobile': '?1',
    'sec-ch-ua-platform': '"iPadOS"',
    'accept-language': 'ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7',
  },
  {
    ip: '41.33.0.1',
    'user-agent': 'Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.0.0 Mobile Safari/537.36',
    'sec-ch-ua': '"Not A(Brand";v="99", "Samsung Internet";v="25", "Chromium";v="121"',
    'sec-ch-ua-mobile': '?1',
    'sec-ch-ua-platform': '"Android"',
    'accept-language': 'ar-EG,ar;q=0.9,en-US;q=0.8,en;q=0.7',
  },
  {
    ip: '41.33.0.1',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'accept-language': 'ar-EG,ar;q=0.9,en-US;q=0.8,en;q=0.7',
  },
  {
    ip: '177.71.0.1',
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
    'accept-language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
  },
  {
    ip: '177.71.0.1',
    'user-agent': 'Mozilla/5.0 (Linux; Android 12; moto g(60)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Mobile Safari/537.36',
    'sec-ch-ua': '"Chromium";v="123", "Google Chrome";v="123", "Not:A-Brand";v="8"',
    'sec-ch-ua-mobile': '?1',
    'sec-ch-ua-platform': '"Android"',
    'accept-language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
  },
  {
    ip: '128.59.105.24',
    'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
    'sec-ch-ua-mobile': '?1',
    'sec-ch-ua-platform': '"iOS"',
    'accept-language': 'es-MX,es;q=0.9,en-US;q=0.8,en;q=0.7',
  },
  {
    ip: '193.136.2.228',
    'user-agent': 'Mozilla/5.0 (Linux; Android 13; SM-X906B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.6367.82 Safari/537.36',
    'sec-ch-ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
    'sec-ch-ua-mobile': '?1',
    'sec-ch-ua-platform': '"Android"',
    'accept-language': 'de-DE,de;q=0.9,en;q=0.8',
  },
  {
    ip: '128.59.105.24',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 OPR/106.0.0.0',
    'sec-ch-ua': '"Chromium";v="120", "Not:A-Brand";v="99", "Opera";v="106"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'accept-language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',
  },
  {
    ip: '193.136.2.228',
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
    'accept-language': 'es-ES,es;q=0.9,en;q=0.8',
  },
  {
    ip: '133.242.0.0',
    'user-agent': 'Mozilla/5.0 (Linux; Android 13; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Mobile Safari/537.36',
    'sec-ch-ua': '"Chromium";v="123", "Google Chrome";v="123", "Not-A.Brand";v="99"',
    'sec-ch-ua-mobile': '?1',
    'sec-ch-ua-platform': '"Android"',
    'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
  },
  {
    ip: '41.33.0.1',
    'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'sec-ch-ua': '"Chromium";v="122", "Google Chrome";v="122", "Not(A:Brand";v="99"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Linux"',
    'accept-language': 'fr-FR,fr;q=0.9,en;q=0.8',
  },
  {
    ip: '177.71.0.1',
    'user-agent': 'Mozilla/5.0 (Linux; Android 11; SAMSUNG SM-T870) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/24.0 Chrome/117.0.0.0 Safari/537.36',
    'sec-ch-ua': '"Not A(Brand";v="99", "Samsung Internet";v="24", "Chromium";v="117"',
    'sec-ch-ua-mobile': '?1',
    'sec-ch-ua-platform': '"Android"',
    'accept-language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
  },
];

export const createClientHeaders = () => {
  const profile = faker.helpers.arrayElement(clientProfiles);
  const { ip, ...headers } = profile;

  return {
    'cf-connecting-ip': ip,
    ...headers,
  };
};

export const createClientEvent = (params: Partial<IEvent.clientEvent>) => {
  const user_id = params.user_id || global.user2.id;

  const result: IEvent.clientEvent = {
    version: '1',
    user_id,
    event_name: faker.helpers.arrayElement(['view', 'interaction', 'signup', 'purchase']),
    url: faker.internet.url(),
    referrer: faker.helpers.arrayElement([null, 'https://www.google.com/search?q=pulsio', 'https://chatgpt.com/', 'https://news.ycombinator.com/']),
    width: faker.helpers.arrayElement([640, 768, 1024, 1280, 1366, 1536, 1920]),
    scroll_depth: faker.helpers.arrayElement([0, 25, 50, 75, 100]),
    props: {},
    transaction_id: null,
    revenue_amount: null,
    revenue_currency: null,
    items: [],
    ...params,
  };
  return result;
};

export const createEventRow = async (params: Partial<IEvent.clientEvent>): Promise<IEvent.rowInsert> => {
  const user_id = params.user_id || global.user2.id;

  const result = await EventService.createEventRow({
    ...createClientEvent({ ...params, user_id }),
    headers: createClientHeaders(),
    ...params,
  });
  return result;
};
