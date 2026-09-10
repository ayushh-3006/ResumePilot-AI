import puppeteer from "puppeteer";
import { IPDFGenerator } from "../interfaces/IPDFGenerator.js";
import { ResumeTemplate } from "../templates/ResumeTemplate.js";

/**
 * SOLID — S (Single Responsibility): Only job is creating a PDF using Puppeteer.
 * SOLID — D (Dependency Inversion): Implements IPDFGenerator interface.
 */
export class PuppeteerGenerator implements IPDFGenerator {
  async generate(data: any, fileName?: string): Promise<Buffer> {
    // 1. Generate HTML from data
    const htmlContent = ResumeTemplate(data);

    // 2. Launch Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    try {
      const page = await browser.newPage();

      // Set content and wait for it to be loaded
      await page.setContent(htmlContent, { waitUntil: "load" });

      // Generate PDF with professional margins
      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: {
          top: "40px",
          bottom: "40px",
          left: "50px",
          right: "50px",
        },
      });

      return Buffer.from(pdfBuffer);
    } finally {
      await browser.close();
    }
  }
}
