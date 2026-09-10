export interface IPDFGenerator {
  generate(data: any, fileName?: string): Promise<Buffer>;
}
