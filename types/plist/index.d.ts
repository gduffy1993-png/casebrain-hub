/** Ambient @types/plist stub — broken empty npm @types/plist package causes Next typecheck failure. */
declare module "plist" {
  const plist: {
    parse: (xml: string) => unknown;
    build: (obj: unknown) => string;
  };
  export = plist;
}
