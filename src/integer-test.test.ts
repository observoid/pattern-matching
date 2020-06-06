
import { TestHarness } from 'zora';
import IntegerTest, { toIntegerTest, testInteger, ALL_INTEGERS, NO_INTEGERS } from '../lib/integer-test';

export default (t: TestHarness) => {
  t.test('toIntegerTest', t => {
    t.eq(toIntegerTest(true), {type: IntegerTest.Type.ALL});
    t.eq(toIntegerTest(false), {type: IntegerTest.Type.NONE});
    t.eq(toIntegerTest([]), {type: IntegerTest.Type.NONE});
    t.eq(toIntegerTest(12345), {type:IntegerTest.Type.EXACT, value: 12345});
    t.eq(toIntegerTest([1, 2, 3, 4, 5]), {type: IntegerTest.Type.SET, set: new Set([1, 2, 3, 4, 5])});
    t.eq(toIntegerTest([ [100, 200] ]), {type: IntegerTest.Type.RANGES, ranges: [[100, 200]]});
    t.eq(toIntegerTest([ [100, 175], [150, 200] ]), {type: IntegerTest.Type.RANGES, ranges: [[100, 200]]});
    t.throws(() => { toIntegerTest([ [200, 100] ]); });
    t.throws(() => { toIntegerTest([ [0, 100], [50, 25] ]); });
  });
  t.test('testInteger', t => {
    t.ok(testInteger(5, 5));
    t.notOk(testInteger(5, 10));
    t.ok(testInteger(5, [1, 2, 5, 10]));
    t.notOk(testInteger(5, [1, 2, 6, 10]));
    t.ok(testInteger(10, ALL_INTEGERS));
    t.notOk(testInteger(10, NO_INTEGERS));
    t.notOk(testInteger(5, [[10, 20], [30, 40]]));
    t.ok(testInteger(10, [[10, 20], [30, 40]]));
    t.ok(testInteger(15, [[10, 20], [30, 40]]));
    t.ok(testInteger(20, [[10, 20], [30, 40]]));
    t.notOk(testInteger(25, [[10, 20], [30, 40]]));
    t.ok(testInteger(30, [[10, 20], [30, 40]]));
    t.ok(testInteger(35, [[10, 20], [30, 40]]));
    t.ok(testInteger(40, [[10, 20], [30, 40]]));
    t.notOk(testInteger(45, [[10, 20], [30, 40]]));
  });
};
