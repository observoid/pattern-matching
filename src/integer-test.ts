
export default IntegerTest;

export namespace IntegerTest {

  export const enum Type {
    EXACT = 'exact',
    SET = 'set',
    RANGES = 'ranges',
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

  export interface Ranges {
    readonly type: Type.RANGES;
    /**
     * Ranges must be in the order [min, max] where max >= min.
     * Ranges must be sorted and contain no overlap.
     */
    readonly ranges: readonly (readonly [number, number])[];
  }

  export interface All {
    readonly type: Type.ALL;
  }

  export interface None {
    readonly type: Type.NONE;
  }

}

export type IntegerTest = IntegerTest.Exact | IntegerTest.Set | IntegerTest.Ranges | IntegerTest.All | IntegerTest.None;

type Compatible = number | Iterable<number> | Iterable<[number, number]> | boolean | IntegerTest;

type CompatMap<T extends Compatible> = T extends IntegerTest ? T : (
  (true extends T ? IntegerTest.All : never)
  | (false extends T ? IntegerTest.None : never)
  | (number extends T ? IntegerTest.Exact : never)
  | ([] extends T ? IntegerTest.None : never)
  | (Iterable<number> extends T ? IntegerTest.Set : never)
  | (Iterable<[number, number]> extends T ? IntegerTest.Ranges : never)
);

export const ALL_INTEGERS: IntegerTest.All = {type: IntegerTest.Type.ALL};
export const NO_INTEGERS: IntegerTest.None = {type: IntegerTest.Type.NONE};

export function toIntegerTest(allOrNone: true): IntegerTest.All;
export function toIntegerTest(allOrNone: false): IntegerTest.None;
export function toIntegerTest(exact: number): IntegerTest.Exact;
export function toIntegerTest(empty: []): IntegerTest.None;
export function toIntegerTest(set: [number, ...number[]]): IntegerTest.Set;
export function toIntegerTest(set: Iterable<number>): IntegerTest.Set | IntegerTest.None;
export function toIntegerTest(ranges: [[number, number], ...[number, number][]]): IntegerTest.Ranges;
export function toIntegerTest(ranges: Iterable<[number, number]>): IntegerTest.Ranges | IntegerTest.None;
export function toIntegerTest<T extends IntegerTest>(test: T): T;
export function toIntegerTest(src: Compatible): IntegerTest;
export function toIntegerTest(src: Compatible): IntegerTest {
  if (src === true) return ALL_INTEGERS;
  if (src === false) return NO_INTEGERS;
  if (typeof src === 'number') return {type: IntegerTest.Type.EXACT, value:src};
  if (Symbol.iterator in src) {
    const values = [...src as Iterable<number | [number, number]>];
    if (values.length === 0) return NO_INTEGERS;
    if (typeof values[0] === 'number') {
      return {type: IntegerTest.Type.SET, set: new Set(values as number[])};
    }
    const minMaxPairs = (values as [number, number][]).sort(([minA], [minB]) => minA - minB);
    for (let i = 0; i < minMaxPairs.length; i++) {
      const [ min, max ] = minMaxPairs[i];
      // avoid changing to > to handle NaNs
      if (!(min <= max)) {
        throw new Error('invalid min/max pair');
      }
      for (let nextPair = minMaxPairs[i+1]; nextPair && max >= nextPair[0]; nextPair = minMaxPairs[i+1]) {
        if (!(nextPair[0] < nextPair[1])) {
          throw new Error('invalid min/max pair');
        }
        minMaxPairs.splice(i, 2, [min, nextPair[1]]);
      }
    }
    return {type: IntegerTest.Type.RANGES, ranges: minMaxPairs};
  }
  return src as IntegerTest;
}

export function testInteger(value: number, test: Compatible): boolean {
  const testObject = toIntegerTest(test);
  switch (testObject.type) {
    case IntegerTest.Type.ALL: return true;
    case IntegerTest.Type.NONE: return false;
    case IntegerTest.Type.EXACT: return testObject.value === value;
    case IntegerTest.Type.SET: return testObject.set.has(value);
    case IntegerTest.Type.RANGES: {
      const { ranges } = testObject;
      let left = 0, right = ranges.length - 1;
      while (left <= right) {
        const middle = (left + right) >>> 1;
        if (value < ranges[middle][0]) {
          right = middle-1;
        }
        else if (value > ranges[middle][1]) {
          left = middle + 1;
        }
        else {
          return true;
        }
      }
      return false;
    }
  }
}
