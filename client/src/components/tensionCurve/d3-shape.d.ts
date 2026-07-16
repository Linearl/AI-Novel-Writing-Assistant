declare module "d3-shape" {
  export function line<T>(): {
    x(fn: (d: T) => number): this;
    y(fn: (d: T) => number): this;
    curve(curve: unknown): this;
    (data: T[]): string | null;
  };
  export const curveMonotoneX: unknown;
}
