declare module "pdfjs-dist/build/pdf.mjs" {
  export function getDocument(opts: {
    data: Uint8Array;
    useSystemFonts?: boolean;
  }): {
    promise: Promise<{
      numPages: number;
      getPage(n: number): Promise<{
        getTextContent(): Promise<{
          items: Array<{ str?: string }>;
        }>;
      }>;
    }>;
  };
}
