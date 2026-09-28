import { type Browser, chromium, type Page } from 'playwright';

const headed = process.env.E2E_HEADED === '1';
export const keepBrowserOpen = process.env.E2E_KEEP_OPEN === '1';
const timing = { actionDelay: headed ? 800 : 0, keyDelay: headed ? 10 : 0 };
const locatorTimeout = 5_000;

type OpenBrowserInput = { viewport?: { height: number; width: number }; window?: { height: number; width: number; x: number; y: number } };

export const openBrowser = async ({ viewport = { width: 1280, height: 700 }, window }: OpenBrowserInput = {}): Promise<{ browser: Browser; page: Page }> => {
  const args = headed && window ? [`--window-position=${window.x},${window.y}`, `--window-size=${window.width},${window.height}`] : [];
  const browser = await chromium.launch({ args, channel: 'chromium', headless: !headed, slowMo: timing.actionDelay });
  const context = await browser.newContext({ locale: 'en', viewport });
  context.setDefaultTimeout(locatorTimeout);
  const page = await context.newPage();
  return { browser, page };
};

export const type = async ({ page, selector, value }: { page: Page; selector: string; value: string }): Promise<void> => {
  await page.locator(selector).pressSequentially(value, { delay: timing.keyDelay });
};

export const pause = async ({ page }: { page: Page }): Promise<void> => {
  if (keepBrowserOpen) await page.pause();
};
