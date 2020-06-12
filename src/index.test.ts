
import {
  match, MatchMaker, matchCaptureArray, firstMatch, constantMatch, optionalMatch,
  capture, CaptureMaker, CaptureValue, CaptureComplete, reduceCaptures, 
  lookahead, negativeLookahead,
} from '../lib/index';
import { TestHarness } from 'zora';
import { from, of, throwError, ObservableInput } from 'rxjs';
import { toArray, concatAll } from 'rxjs/operators';

export default async (t: TestHarness) => {

  await t.test('match', async t => {

    await t.test('filter passes', async t => {
      t.eq(
        await testMatch([1, 2, 3], match(num => num % 2 === 1)),
        {status: 'matched', match: 1, consumedNoInput: false, suffix: [2, 3]},
      );
    });

    await t.test('filter fails', async t => {
      t.eq(
        await testMatch([1, 2, 3], match(num => num % 2 === 0)),
        {status: 'failed'},
      );
    });

    await t.test('pass-through passes', async t => {
      t.eq(
        await testMatch([1, 2, 3], match(true)),
        {status: 'matched', match: 1, consumedNoInput: false, suffix: [2, 3]},
      );
    });

    await t.test('pass-through fails', async t => {
      t.eq(
        await testMatch([], match(true)),
        {status: 'failed'}
      )
    });

    await t.test('match error', async t => {
      const testError = new Error('test error');
      t.eq(
        await testMatch(throwError(testError), match(true)),
        {status: 'matchError', error: testError},
      );
    });

    await t.test('suffix error', async t => {
      const testError = new Error('test error');
      t.eq(
        await testMatch(of([1], throwError(testError)).pipe(concatAll()), match(true)),
        {status: 'suffixError', error: testError},
      );
    });

  });

  await t.test('capture', async t => {

    await t.test('as many as possible', async t => {
      t.eq(
        await testCapture([1, 2, 3], capture(match(true))),
        {status: 'captured', consumedNoInput: false, captures: [1, 2, 3], suffix: []},
      )
    });

    await t.test('at least 3', async t => {
      t.eq(
        await testCapture([1, 2, 3, 4, 5], capture(match(true), 3)),
        {status: 'captured', consumedNoInput: false, captures: [1, 2, 3, 4, 5], suffix: []},
      )
    });

    await t.test('at least 3, but fail', async t => {
      t.eq(
        await testCapture([1, 2], capture(match(true), 3)),
        {status: 'failed'},
      )
    });

    await t.test('at most 3', async t => {
      t.eq(
        await testCapture([1, 2, 3, 4, 5], capture(match(true), 0, 3)),
        {status: 'captured', consumedNoInput: false, captures: [1, 2, 3], suffix: [4, 5]},
      )
    });

    await t.test('error', async t => {
      const testError = new Error('test error');
      t.eq(
        await testCapture(throwError(testError), capture(match(true))),
        {status: 'captureError', error: testError},
      );
    });

  });

  t.test('matchCaptureArray', async t => {

    t.test('basic usage', async t => {
      t.eq(
        await testMatch([1, 2, 3, 4, 5], matchCaptureArray(capture(match(true), 3, 3))),
        {status: 'matched', match: [1, 2, 3], consumedNoInput: false, suffix: [4, 5]}
      )
    });

  });

  t.test('lookahead', async t => {

    t.test('basic usage', async t => {
      t.eq(
        await testMatch([1, 2, 3, 4, 5], lookahead(match(true))),
        {status: 'matched', match: 1, consumedNoInput: true, suffix: [1, 2, 3, 4, 5]}
      )
    });

  });

  t.test('negativeLookahead', async t => {

    t.test('basic usage', async t => {
      t.eq(
        await testMatch([1, 2, 3, 4, 5], negativeLookahead(match(v => v !== 1))),
        {status: 'matched', match: true, consumedNoInput: true, suffix: [1, 2, 3, 4, 5]}
      )
    });

  });

  t.test('firstMatch', async t => {

    t.test('basic usage', async t => {
      t.eq(
        await testMatch(['a', 'b', 'c'], firstMatch(match(v => typeof v === 'boolean'), match(v => typeof v === 'string'))),
        { status: 'matched', match: 'a', suffix: ['b', 'c'], consumedNoInput: false }
      )
    });

    t.test('failure', async t => {
      t.eq(
        await testMatch(['a', 'b', 'c'], firstMatch(match(v => typeof v === 'boolean'), match(v => typeof v === 'number'))),
        { status: 'failed' }
      )
    });

  });

  t.test('reduceCaptures', async t => {

    t.test('basic usage', async t => {
      t.eq(
        await testMatch([1, 2, 3], reduceCaptures(capture(match(true)), () => 0, (value, capture) => value + capture)),
        { status: 'matched', match: 6, consumedNoInput: false, suffix: [] }
      )
    });

  });

  t.test('constantMatch', async t => {

    t.test('basic usage', async t => {
      const UNIQUE = Symbol();
      t.eq(
        await testMatch([1, 2, 3], constantMatch(UNIQUE)),
        { status: 'matched', match: UNIQUE, consumedNoInput: true, suffix: [1, 2, 3] }
      )
    });

  });

  t.test('optionalMatch', async t => {

    t.test('basic usage', async t => {

      t.eq(
        await testMatch([1, 2, 3], optionalMatch(match(v => v === 1))),
        { status: 'matched', match: 1, consumedNoInput: false, suffix: [2, 3] }
      );

      t.eq(
        await testMatch([1, 2, 3], optionalMatch(match(v => v === -1))),
        { status: 'matched', match: null, consumedNoInput: true, suffix: [1, 2, 3] }
      );
      
    });

    t.test('error', async t => {
      const error = new Error('test error');

      t.eq(
        await testMatch(throwError(error), optionalMatch(match(true))),
        { status: 'matchError', error }
      );

    });

  });

}

type MatchTestResult<TInput, TMatch> = {status:'failed'}
  | {status:'matched', match:TMatch, suffix: TInput[], consumedNoInput: boolean}
  | {status:'matchError' | 'suffixError', error?: any};

async function testMatch<TInput, TMatch>(input: ObservableInput<TInput>, matcher: MatchMaker<TInput, TMatch>)
: Promise<MatchTestResult<TInput, TMatch>> {
  try {
    const results = await from(input).pipe(matcher, toArray()).toPromise();
    if (results.length === 0) return {status:'failed'};
    if (results.length === 1) {
      try {
        return {
          status: 'matched',
          match: results[0].match,
          consumedNoInput: !!results[0].consumedNoInput,
          suffix: await results[0].suffix.pipe( toArray() ).toPromise()
        };
      }
      catch (e) {
        return {status:'suffixError', error: e};
      }
    }
    return {status:'matchError', error: `matcher provided ${results.length} values`};
  }
  catch (e) {
    return {status:'matchError', error: e};
  }
}

type CaptureTestResult<TInput, TCapture> = {status:'failed'}
  | {status:'captured', captures: TCapture[], suffix: TInput[], consumedNoInput: boolean}
  | {status:'captureError' | 'suffixError', error?: any};

async function testCapture<TInput, TCapture>(input: ObservableInput<TInput>, capturer: CaptureMaker<TInput, TCapture>)
: Promise<CaptureTestResult<TInput, TCapture>> {
  try {
    const results = await from(input).pipe(capturer, toArray()).toPromise();
    if (results.length === 0 || !results[results.length-1].complete) return {status:'failed'};
    const captureValues = results.slice(0, -1) as CaptureValue<TCapture>[];
    const captureResult = results[results.length-1] as CaptureComplete<TInput>;
    try {
      const suffix = await captureResult.suffix.pipe( toArray() ).toPromise();
      return {
        status: 'captured',
        captures: captureValues.map(v => v.capture),
        consumedNoInput: !!captureResult.consumedNoInput,
        suffix,
      };
    }
    catch (e) {
      return {status:'suffixError', error: e};
    }
  }
  catch (e) {
    return {status:'captureError', error: e};
  }
}
