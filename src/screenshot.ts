import { chromium, type Browser } from "playwright";

let browser: Browser | null = null;

export async function initBrowser(): Promise<void> {
  browser = await chromium.launch();
}

export async function closeBrowser(): Promise<void> {
  await browser?.close();
  browser = null;
}

export async function captureScreenshot(
  html: string,
  width: number
): Promise<Buffer> {
  if (!browser) throw new Error("Browser not initialized");

  const context = await browser.newContext({
    viewport: { width, height: 800 },
    deviceScaleFactor: 2,
  });

  const page = await context.newPage();

  try {
    await page.setContent(html, { waitUntil: "networkidle" });

    const screenshot = await page.screenshot({
      fullPage: true,
      type: "png",
    });

    return Buffer.from(screenshot);
  } finally {
    await context.close();
  }
}
