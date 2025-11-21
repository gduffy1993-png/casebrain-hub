declare module "pdf-parse" {
  export type PdfParseResult = {
    text: string;
    numpages: number;
    numrender: number;
    info: unknown;
    metadata: unknown;
    version: string;
  };

  export default function pdfParse(
    dataBuffer: Buffer,
    options?: Record<string, unknown>,
  ): Promise<PdfParseResult>;
}

declare module "mammoth" {
  export function extractRawText(options: { path?: string; buffer?: Buffer }): Promise<{
    value: string;
    messages: Array<{ type: string; message: string }>;
  }>;
}

declare module "diff" {
  export function diffWords(oldStr: string, newStr: string): Array<{
    value: string;
    added?: boolean;
    removed?: boolean;
  }>;
}

