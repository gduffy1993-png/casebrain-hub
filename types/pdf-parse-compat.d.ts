declare module "pdf-parse/lib/pdf.js/v2.0.550/build/pdf.js" {
  const engine: {
    disableWorker: boolean;
    getDocument(data: Uint8Array): { promise: Promise<{
      numPages: number;
      getPage(page: number): Promise<{ getTextContent(options: { normalizeWhitespace: boolean; disableCombineTextItems: boolean }): Promise<{ items: Array<{ str: string; transform: number[] }> }> }>;
      destroy(): Promise<void>;
    }> };
  };
  export default engine;
}
