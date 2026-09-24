declare module "bun:sqlite" {
  export class Database {
    constructor(path: string, options?: Record<string, unknown>);
    exec(sql: string): void;
    close(): void;
    query(sql: string): {
      run(params?: Record<string, unknown>): unknown;
      get(...args: unknown[]): unknown;
      all(...args: unknown[]): unknown;
    };
    transaction<T>(fn: () => T): () => T;
  }
}

declare module "bun:test" {
  export function describe(name: string, fn: () => void): void;
  export function test(name: string, fn: () => void | Promise<void>): void;
  export function expect(value: unknown): {
    toBe(expected: unknown): void;
    toEqual(expected: unknown): void;
    toContain(expected: unknown): void;
    not: {
      toBe(expected: unknown): void;
      toEqual(expected: unknown): void;
    };
  };
}

declare const Bun: {
  sleep(ms: number): Promise<void>;
};

interface ImportMeta {
  main?: boolean;
  env?: Record<string, string | undefined>;
}
