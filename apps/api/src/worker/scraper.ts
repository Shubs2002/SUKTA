import * as cheerio from "cheerio";

export async function scrapeWebsite(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);

    // Remove unwanted elements
    $("script, style, nav, footer, header, noscript, iframe, svg").remove();

    // Get text content
    const text = $("body").text().trim().replace(/\s+/g, " ");

    console.log(`Scraped ${text.length} chars from ${url}`);

    // Limit to 4000 characters for AI context
    return text.substring(0, 4000);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to scrape ${url}: ${message}`);
  }
}
