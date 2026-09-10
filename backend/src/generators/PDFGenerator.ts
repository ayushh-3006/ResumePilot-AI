import PDFDocument from "pdfkit";
import { IPDFGenerator } from "../interfaces/IPDFGenerator.js";

/**
 * SOLID — S (Single Responsibility): Only job is creating a PDF file from text.
 * SOLID — D (Dependency Inversion): Implements IPDFGenerator interface.
 *
 * OOP — Encapsulation: PDFKit library details are hidden inside this class.
 *                      The rest of the app just calls .generate() and gets a buffer back.
 */

export class PDFGenerator implements IPDFGenerator {
  async generate(text: string, fileName?: string): Promise<Buffer> {
    // PDFKit works with streams, so we wrap it in a Promise
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const buffers: Buffer[] = [];

      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });
      doc.on("error", reject);

      doc
        .fontSize(11)
        .font("Helvetica")
        .text(text, { align: "left", lineGap: 4 });

      doc.end();
    });
  }
}
