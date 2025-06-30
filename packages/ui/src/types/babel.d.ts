// Type declarations to resolve missing Babel types
declare module '@babel/core' {
  const babel: any;
  export = babel;
}

declare module '@babel/*' {
  const babel: any;
  export = babel;
}
