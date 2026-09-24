import { faker } from '@faker-js/faker';
import type { ClientEvent, EventRowInsert } from 'types/Event.ts';
import EventService from '#api/event/EventService.ts';

const IPs = { 'New York': '128.59.105.24', Lisbon: '193.136.2.228' };

const acceptLanguages = ['it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7', 'en-US,en;q=0.9', 'pt-PT,pt;q=0.9,en-US;q=0.8,en;q=0.7', 'es-ES,es;q=0.9,en;q=0.8', 'de-DE,de;q=0.9,en;q=0.8'];

const clientProfiles = [
  {
    deviceType: 'windows desktop',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'sec-ch-ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
  },
  {
    deviceType: 'windows laptop',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    'sec-ch-ua': '"Google Chrome";v="123", "Not:A-Brand";v="8", "Chromium";v="123"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
  },
  {
    deviceType: 'apple desktop',
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'sec-ch-ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"macOS"',
  },
  {
    deviceType: 'apple laptop',
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    'sec-ch-ua': '"Google Chrome";v="123", "Not:A-Brand";v="8", "Chromium";v="123"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"macOS"',
  },
  {
    deviceType: 'apple tablet',
    'user-agent': 'Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/124.0.6367.60 Mobile/15E148 Safari/604.1',
    'sec-ch-ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
    'sec-ch-ua-mobile': '?1',
    'sec-ch-ua-platform': '"iOS"',
  },
  {
    deviceType: 'apple smartphone',
    'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/124.0.6367.60 Mobile/15E148 Safari/604.1',
    'sec-ch-ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
    'sec-ch-ua-mobile': '?1',
    'sec-ch-ua-platform': '"iOS"',
  },
  {
    deviceType: 'android smartphone',
    'user-agent': 'Mozilla/5.0 (Linux; Android 14; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
    'sec-ch-ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
    'sec-ch-ua-mobile': '?1',
    'sec-ch-ua-platform': '"Android"',
  },
  {
    deviceType: 'android tablet',
    'user-agent': 'Mozilla/5.0 (Linux; Android 13; SM-X906B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'sec-ch-ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
    'sec-ch-ua-mobile': '?1',
    'sec-ch-ua-platform': '"Android"',
  },
];

export const createClientHeaders = () => {
  const profile = faker.helpers.arrayElement(clientProfiles);
  const { deviceType, ...headers } = profile;

  return {
    'cf-connecting-ip': faker.helpers.arrayElement(Object.values(IPs)),
    'accept-language': faker.helpers.arrayElement(acceptLanguages),
    ...headers,
  };
};

export const createClientEvent = (params: Partial<ClientEvent> = {}) => {
  const result: ClientEvent = {
    version: '1',
    event_name: faker.helpers.arrayElement(['view', 'interaction', 'signup', 'purchase']),
    user_id: faker.string.uuid(),
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

export const createEventRow = async (params: Partial<ClientEvent> = {}): Promise<EventRowInsert> => {
  const result = await EventService.createEventRow({
    ...createClientEvent(),
    headers: createClientHeaders(),
    ...params,
  });
  return result;
};
