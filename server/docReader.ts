import mammoth from "mammoth";
// @ts-ignore
import WordExtractor from "word-extractor";
import * as cheerio from "cheerio";

export async function extractTextFromFile(
  buffer: Buffer,
  filename: string
): Promise<{ text: string; html?: string }> {
  const lower = filename.toLowerCase();

  if (lower.endsWith(".docx")) {
    try {
      const textResult = await mammoth.extractRawText({ buffer });
      const htmlResult = await mammoth.convertToHtml({ buffer });
      return {
        text: textResult.value,
        html: htmlResult.value,
      };
    } catch (err: any) {
      throw new Error(`Failed to read docx file "${filename}": ${err.message}`);
    }
  }

  if (lower.endsWith(".doc")) {
    try {
      const extractor = new WordExtractor();
      const extracted = await extractor.extract(buffer);
      const text = extracted.getBody();
      return { text };
    } catch (err: any) {
      // Fallback for doc if WordExtractor fails on non-standard stream
      const text = buffer.toString("utf8").replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, " ");
      return { text };
    }
  }

  if (lower.endsWith(".html") || lower.endsWith(".htm")) {
    try {
      const content = buffer.toString("utf8");
      const $ = cheerio.load(content);
      return {
        text: $("body").text().replace(/\s+/g, " "),
        html: content,
      };
    } catch (err: any) {
      throw new Error(`Failed to read html file "${filename}": ${err.message}`);
    }
  }

  // Default: text or fallback
  const text = buffer.toString("utf8").replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, " ");
  return { text };
}
