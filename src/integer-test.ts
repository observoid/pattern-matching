
export default IntegerTest;

export namespace IntegerTest {

  export const enum Type {
    EXACT = 'exact',
    SET = 'set',
    ALL = 'all',
    NONE = 'none',
  }

  export interface Exact {
    readonly type: Type.EXACT;
    readonly value: number;
  }

  export interface Set {
    readonly type: Type.SET;
    readonly set: ReadonlySet<number>;
  }

  export interface All {
    readonly type: Type.ALL;
  }

  export interface None {
    readonly type: Type.NONE;
  }

}

export type IntegerTest = IntegerTest.Exact | IntegerTest.Set | IntegerTest.All | IntegerTest.None;

type Compatible = number | Iterable<number> | boolean | IntegerTest;

type CompatMap<T extends Compatible> = T extends IntegerTest ? T : (
  (true extends T ? IntegerTest.All : never)
  | (false extends T ? IntegerTest.None : never)
  | (number extends T ? IntegerTest.Exact : never)
  | (Iterable<number> extends T ? IntegerTest.Set : never)
);

export const ALL_INTEGERS: IntegerTest.All = {type: IntegerTest.Type.ALL};
export const NO_INTEGERS: IntegerTest.None = {type: IntegerTest.Type.NONE};

export function toIntegerTest(allOrNone: true): IntegerTest.All;
export function toIntegerTest(allOrNone: false): IntegerTest.None;
export function toIntegerTest(exact: number): IntegerTest.Exact;
export function toIntegerTest(set: Iterable<number>): IntegerTest.Set;
export function toIntegerTest<T extends IntegerTest>(test: T): T;
export function toIntegerTest(src: Compatible): IntegerTest;
  export function toIntegerTest(src: Compatible): any {
  if (src === true) return ALL_INTEGERS;
  if (src === false) return NO_INTEGERS;
  if (typeof src === 'number') return {type: IntegerTest.Type.EXACT, value:src};
  if (Symbol.iterator in src) return {type: IntegerTest.Type.SET, set: new Set(src as Iterable<number>)};
  return src;
}

export function testInteger(value: number, test: Compatible): boolean {
  const testObject = toIntegerTest(test);
  switch (testObject.type) {
    case IntegerTest.Type.ALL: return true;
    case IntegerTest.Type.NONE: return false;
    case IntegerTest.Type.EXACT: return testObject.value === value;
    case IntegerTest.Type.SET: return testObject.set.has(value);
  }
}
