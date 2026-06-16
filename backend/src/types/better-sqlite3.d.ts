declare module "better-sqlite3" {
  export type RunResult = {
    changes: number;
    lastInsertRowid: number | bigint;
  };

  export class Statement {
    all(...params: unknown[]): unknown[];
    get(...params: unknown[]): unknown;
    run(...params: unknown[]): RunResult;
  }

  export default class Database {
    constructor(filename: string);
    name: string;
    pragma(source: string): unknown;
    exec(source: string): this;
    prepare(source: string): Statement;
  }
}
