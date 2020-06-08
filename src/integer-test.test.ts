
import { TestHarness } from 'zora';
import IntegerTest, { toIntegerTest, testInteger, ALL_INTEGERS, NO_INTEGERS, maskedAnd32, invertIntegerTest } from '../lib/integer-test';

export default (t: TestHarness) => {
  t.test('toIntegerTest', t => {
    t.eq(toIntegerTest(true), {type: IntegerTest.Type.ALL});
    t.eq(toIntegerTest(false), {type: IntegerTest.Type.NONE});
    t.eq(toIntegerTest([]), {type: IntegerTest.Type.NONE});
    t.eq(toIntegerTest(12345), {type:IntegerTest.Type.EXACT, value: 12345});
    t.eq(toIntegerTest([1, 2, 3, 4, 5]), {type: IntegerTest.Type.SET, set: new Set([1, 2, 3, 4, 5])});
    t.eq(toIntegerTest([ {min:100, max:200} ]), {type: IntegerTest.Type.RANGES, ranges: [{min:100, max:200}]});
    t.eq(toIntegerTest([ {min:100, max:175}, {min:150, max:200} ]), {type: IntegerTest.Type.RANGES, ranges: [{min: 100, max: 200}]});
    t.throws(() => { toIntegerTest([ {min:200, max:100} ]); });
    t.throws(() => { toIntegerTest([ {min:0, max:100}, {min:50, max:25} ]); });
  });
  t.test('testInteger', t => {
    t.ok(testInteger(5, 5));
    t.notOk(testInteger(5, 10));
    t.ok(testInteger(5, [1, 2, 5, 10]));
    t.notOk(testInteger(5, [1, 2, 6, 10]));
    t.ok(testInteger(10, ALL_INTEGERS));
    t.notOk(testInteger(10, NO_INTEGERS));
    t.notOk(testInteger(5, [{min:10, max:20}, {min:30, max:40}]));
    t.ok(testInteger(10, [{min:10, max:20}, {min:30, max:40}]));
    t.ok(testInteger(15, [{min:10, max:20}, {min:30, max:40}]));
    t.ok(testInteger(20, [{min:10, max:20}, {min:30, max:40}]));
    t.notOk(testInteger(25, [{min:10, max:20}, {min:30, max:40}]));
    t.ok(testInteger(30, [{min:10, max:20}, {min:30, max:40}]));
    t.ok(testInteger(35, [{min:10, max:20}, {min:30, max:40}]));
    t.ok(testInteger(40, [{min:10, max:20}, {min:30, max:40}]));
    t.notOk(testInteger(45, [{min:10, max:20}, {min:30, max:40}]));
  });
  t.test('maskedAnd32', t => {
    const mask = maskedAnd32(0xff00, 0x3a00);
    t.eq(mask, {type: IntegerTest.Type.BAND32, mask: 0xff00, testMasked: {type: IntegerTest.Type.EXACT, value: 0x3a00}});
    t.ok(testInteger(0x3a72, mask));
    t.notOk(testInteger(0x1a72, mask));
  });
  t.test('invertIntegerTest', t => {
    const inverted = invertIntegerTest(100);
    t.eq(inverted, {type: IntegerTest.Type.INVERTED, invert: {type: IntegerTest.Type.EXACT, value: 100}});
    t.ok(testInteger(101, inverted));
    t.notOk(testInteger(100, inverted));
    t.eq(invertIntegerTest(inverted), {type: IntegerTest.Type.EXACT, value: 100});
    t.eq(invertIntegerTest(true), {type: IntegerTest.Type.NONE});
    t.eq(invertIntegerTest(false), {type: IntegerTest.Type.ALL});
  });
};
