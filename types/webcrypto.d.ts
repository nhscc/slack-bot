// https://stackoverflow.com/a/71549452/1367414

declare module 'crypto' {
  namespace webcrypto {
    const subtle: SubtleCrypto;
  }
}
