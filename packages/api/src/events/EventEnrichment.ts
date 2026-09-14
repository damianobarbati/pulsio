import maxmind, { type CityResponse, type Reader } from 'maxmind';
import { UAParser as UserAgentParser } from 'ua-parser-js';

const geoip: Reader<CityResponse> = await maxmind.open<CityResponse>(new URL('../../GeoLite2-City.mmdb', import.meta.url).pathname);

const sources: Record<'search' | 'social' | 'video' | 'shopping' | 'ai', RegExp> = {
  search: /(^|\.)(google\.[a-z.]+|bing\.com|duckduckgo\.com|search\.yahoo\.com|search\.brave\.com|baidu\.com|yandex\.[a-z.]+|ecosia\.org|search\.aol\.com|ask\.com|qwant\.com)$/,
  social:
    /(^|\.)(facebook\.com|fb\.com|instagram\.com|linkedin\.com|lnkd\.in|t\.co|twitter\.com|x\.com|reddit\.com|pinterest\.[a-z.]+|bsky\.app|mastodon\.[a-z.]+|threads\.net|tumblr\.com|snapchat\.com|tiktok\.com)$/,
  video: /(^|\.)(youtube\.com|youtu\.be|vimeo\.com|dailymotion\.com|twitch\.tv|tiktok\.com)$/,
  shopping: /(^|\.)(amazon\.[a-z.]+|ebay\.[a-z.]+|etsy\.com|shopping\.google\.com|aliexpress\.com|walmart\.com|target\.com)$/,
  ai: /(^|\.)(chatgpt\.com|chat\.openai\.com|claude\.ai|perplexity\.ai|gemini\.google\.com|copilot\.microsoft\.com|poe\.com|you\.com|phind\.com)$/,
};

const hasKnownSource = (pattern: RegExp, source: string) => pattern.test(source) || pattern.test(`${source}.com`);
const paidMedium = (medium: string) => /(?:cp|ppc|retargeting|^paid)/.test(medium);
export const enrichEvent = ({ ip, userAgent, url, referrer }: { ip: string; userAgent: string; url: URL; referrer: string | null }) => {
  const ua = new UserAgentParser(userAgent).getResult();
  const geo = geoip ? geoip.get(ip) : null;
  const country = geo?.country?.iso_code || '(not set)';
  const region = geo?.subdivisions?.[0]?.names?.en || '(not set)';
  const city = geo?.city?.names?.en || '(not set)';
  const referringHost = referrer ? new URL(referrer).hostname.replace(/^www\./, '') : '';
  const externalHost = referringHost !== url.hostname.replace(/^www\./, '') ? referringHost : '';
  const source = url.searchParams.get('utm_source') || externalHost || 'Direct / None';
  const medium = (url.searchParams.get('utm_medium') || '').toLowerCase();
  const normalizedSource = source.toLowerCase().replace(/^www\./, '');
  const campaign = (url.searchParams.get('utm_campaign') || '').toLowerCase();
  const isSearch = hasKnownSource(sources.search, normalizedSource);
  const isSocial =
    hasKnownSource(sources.social, normalizedSource) ||
    /^(ig|fb)$/.test(normalizedSource) ||
    /(^|[-_ ])(?:facebook|instagram|linkedin|twitter|tiktok|reddit|pinterest)(?:[-_ ]?(?:feed)?[-_ ]?ads?)?$/.test(normalizedSource);
  const isVideo = hasKnownSource(sources.video, normalizedSource) || normalizedSource === 'yt' || /(^|[-_ ])(?:youtube|tiktok|vimeo|twitch)(?:[-_ ]?ads?)?$/.test(normalizedSource);
  const isShopping = hasKnownSource(sources.shopping, normalizedSource) || /(^|[^a-df-z])shop|shopping/.test(campaign);
  const isAI = hasKnownSource(sources.ai, normalizedSource);
  const isPaid = paidMedium(medium);
  const isPaidSearchSource = normalizedSource === 'adwords' || /^(google|bing).*ads?$/.test(normalizedSource);
  let channel = source === 'Direct / None' ? 'Direct' : 'Referral';

  if (isAI) channel = 'AI Assistants';
  else if (medium === 'affiliate') channel = 'Affiliates';
  else if (medium === 'audio') channel = 'Audio';
  else if (medium === 'cross-network') channel = 'Cross-network';
  else if (['display', 'banner', 'expandable', 'interstitial', 'cpm'].includes(medium)) channel = 'Display';
  else if (['gmail', 'email', 'e-mail', 'e_mail', 'e mail'].includes(normalizedSource) || ['email', 'e-mail', 'e_mail', 'e mail'].includes(medium)) channel = 'Email';
  else if (normalizedSource === 'firebase' || ['mobile', 'notification'].includes(medium) || medium.endsWith('push')) channel = 'Mobile Push Notifications';
  else if (normalizedSource === 'sms' || medium === 'sms') channel = 'SMS';
  else if ((isSearch && isPaid) || isPaidSearchSource) channel = 'Paid Search';
  else if (isShopping && isPaid) channel = 'Paid Shopping';
  else if (isSocial && (isPaid || /(?:^|[-_])ads?$/.test(normalizedSource))) channel = 'Paid Social';
  else if (isVideo && (isPaid || /(?:^|[-_])ads?$/.test(normalizedSource))) channel = 'Paid Video';
  else if (isPaid) channel = 'Paid Other';
  else if (isSearch || medium === 'organic') channel = 'Organic Search';
  else if (isShopping) channel = 'Organic Shopping';
  else if (isSocial || ['social', 'social-network', 'social-media', 'sm', 'social network', 'social media'].includes(medium)) channel = 'Organic Social';
  else if (isVideo || /video/.test(medium)) channel = 'Organic Video';
  else if (['referral', 'app', 'link'].includes(medium)) channel = 'Referral';
  return {
    browser: ua.browser.name || '(not set)',
    browser_version: ua.browser.version || '(not set)',
    os: ua.os.name || '(not set)',
    os_version: ua.os.version || '(not set)',
    device: ua.device.type === 'mobile' ? 'Mobile' : ua.device.type === 'tablet' ? 'Tablet' : 'Desktop',
    country,
    region,
    city,
    source,
    channel,
  };
};
