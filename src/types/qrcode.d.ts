declare module "qrcode" {
  type ErrorCorrectionLevel = "L" | "M" | "Q" | "H";

  interface QRCodeModules {
    size: number;
    data: Array<boolean | null>;
  }

  interface QRCodeInstance {
    modules: QRCodeModules;
  }

  interface QRCodeCreateOptions {
    errorCorrectionLevel?: ErrorCorrectionLevel;
  }

  export function create(
    text: string,
    options?: QRCodeCreateOptions,
  ): QRCodeInstance;

  const qrcode: {
    create: typeof create;
  };

  export default qrcode;
}
