
import { TestHarness, Assert } from 'zora';
import { captureInput, CaptureValue, CaptureComplete, mapCaptures, matchInput, transformMatch } from '../lib/index'
import { from, Observable, empty, throwError, Subscription, of } from 'rxjs';
import { toArray, concatAll } from 'rxjs/operators';

function allValues<T>(obs: Observable<T>): Promise<T[]> {
  return new Promise((resolve, reject) => {
    obs.pipe( toArray() ).subscribe({
      next(value) { resolve(value); },
      error(e) { reject(e); },
    });
  });
}

function onlyThrowsError(obs: Observable<unknown>): Promise<any> {
  return new Promise((resolve, reject) => {
    const subs = new Subscription();
    subs.add(obs.subscribe({
      next(val) {
        subs.unsubscribe();
        reject('observable yielded a value');
      },
      complete() {
        reject('observable completed');
      },
      error(e) {
        resolve(e);
      },
    }));
  });
}

async function assertEmptyObservable<T>(t: Assert, obs: Observable<T>): Promise<void> {
  const result = await allValues(obs);
  t.eq(result.length, 0);
}

const mixedContent = ['banana', 33, true] as const;

const mapInput = [1, 2, 3] as const;
const mapFunc = (v: number) => v * 100;
const mapOutput = [100, 200, 300] as const;

export default (t: TestHarness) => {

  t.test('captureInput', async t => {

    t.test('all input, any number', async t => {
      const val = await allValues(
        from(mixedContent)
        .pipe(
          captureInput()
        )
      );
      t.eq(val.length, mixedContent.length + 1);
      for (let i = 0; i < mixedContent.length; i++) {
        let obj = (val[i] || {}) as CaptureValue<any>;
        t.falsy(obj.complete);
        t.eq(obj.capture, mixedContent[i]);
      }
      let last = (val[mixedContent.length] || {}) as CaptureComplete<any>;
      t.eq(last.complete, true);
      t.ok(last.suffix instanceof Observable);
      await assertEmptyObservable(t, last.suffix);
    });

    t.test('specific input, any number', async t => {
      const val = await allValues(
        from(mixedContent)
        .pipe(
          captureInput(v => typeof(v) !== 'boolean')
        )
      );
      t.eq(val.length, mixedContent.length - 1 + 1);
      for (let i = 0; i < mixedContent.length-1; i++) {
        let obj = (val[i] || {}) as CaptureValue<any>;
        t.falsy(obj.complete);
        t.eq(obj.capture, mixedContent[i]);
      }
      let last = (val[mixedContent.length-1] || {suffix:empty()}) as CaptureComplete<any>;
      t.eq(last.complete, true);
      t.ok(last.suffix instanceof Observable);
      const suffixValues = await allValues(last.suffix);
      t.eq(suffixValues.length, 1);
      t.eq(suffixValues[0], true);
    });

    t.test('all input, max count', async t => {
      const val = await allValues(
        from(mixedContent)
        .pipe(
          captureInput('*', 0, 2)
        )
      );
      t.eq(val.length, 2 + 1);
      for (let i = 0; i < 2; i++) {
        let obj = (val[i] || {}) as CaptureValue<any>;
        t.falsy(obj.complete);
        t.eq(obj.capture, mixedContent[i]);
      }
      let last = (val[2] || {}) as CaptureComplete<any>;
      t.eq(last.complete, true);
      t.ok(last.suffix instanceof Observable);
      const suffixValues = await allValues(last.suffix);
      t.eq(suffixValues, mixedContent.slice(2));
    });

    t.test('filtered input, min count, failure', async t => {
      const val = await allValues(
        from(mixedContent)
        .pipe(
          captureInput(v => typeof v !== 'boolean', 3)
        )
      );
      t.falsy(val[val.length-1]?.complete);
    });

    t.test('error on capture', async t => {
      const myError = new Error('test error');
      let gotError, errorMessage;
      try {
        gotError = await onlyThrowsError(throwError(myError).pipe(captureInput()));
        errorMessage = null;
      }
      catch (msg) {
        gotError = null;
        errorMessage = msg;
      }
      t.ok(gotError === myError, 'throws correct error');
    });

    t.test('error on suffix', async t => {
      const myError = new Error('test error');
      const val = await allValues(
        of( of(1), throwError(myError) )
        .pipe(
          concatAll(),
          captureInput('*', 1, 1)
        )
      );
      t.eq(val.length, 2);
      let gotError;
      try {
        gotError = await onlyThrowsError(((val[1] || {}) as CaptureComplete<any>).suffix || empty());
      }
      catch (e) {
        console.error(e);
        gotError = null;
      }
      t.eq(gotError, myError, 'throws correct error');
    });

    t.test('error on suffix of zero length capture', async t => {
      const myError = new Error('test error');
      const val = await allValues(
        throwError(myError)
        .pipe(
          captureInput('*', 0, 0)
        )
      );
      t.eq(val.length, 1);
      let gotError;
      try {
        gotError = await onlyThrowsError(((val[0] || {}) as CaptureComplete<any>).suffix || empty());
      }
      catch (e) {
        console.error(e);
        gotError = null;
      }
      t.eq(gotError, myError, 'throws correct error');
    });

  });

  t.test('mapCaptures', async t => {
    const val = await allValues(
      from(mapInput)
      .pipe(
        captureInput(),
        mapCaptures(mapFunc),
      )
    );
    t.eq(val.length, mapOutput.length + 1);
    for (let i = 0; i < mapOutput.length; i++) {
      let obj = (val[i] || {}) as CaptureValue<any>;
      t.falsy(obj.complete);
      t.eq(obj.capture, mapOutput[i]);
    }
    let last = (val[mapOutput.length] || {}) as CaptureComplete<any>;
    t.eq(last.complete, true);
    t.ok(last.suffix instanceof Observable);
    await assertEmptyObservable(t, last.suffix);
  });

  t.test('matchInput', async t => {

    t.test('any input', async t => {
      const val = await allValues(
        from(mixedContent)
        .pipe(
          matchInput(),
        )
      );
      t.eq(val.length, 1);
      t.eq(val[0].match, mixedContent[0]);
      const suffixValues = await allValues(val[0].suffix);
      t.eq(suffixValues.length, mixedContent.length-1);
      for (let i = 1; i < mixedContent.length; i++) {
        t.eq(suffixValues[i-1], mixedContent[i]);
      }
    });

    t.test('filtered input, success', async t => {
      const val = await allValues(
        from(mixedContent)
        .pipe(
          matchInput(v => typeof v === 'string'),
        )
      );
      t.eq(val.length, 1);
      t.eq(val[0].match, mixedContent[0]);
      const suffixValues = await allValues(val[0].suffix);
      t.eq(suffixValues.length, mixedContent.length-1);
      for (let i = 1; i < mixedContent.length; i++) {
        t.eq(suffixValues[i-1], mixedContent[i]);
      }
    });

    t.test('filtered input, failure', async t => {
      const val = await allValues(
        from(mixedContent)
        .pipe(
          matchInput(_ => false),
        )
      );
      t.eq(val.length, 0);
    });

    t.test('no input', async t => {
      const val = await allValues(
        empty()
        .pipe(
          matchInput(),
        )
      );
      t.eq(val.length, 0);
    });

    t.test('error on match', async t => {
      const myError = new Error('test error');
      let gotError, errorMessage;
      try {
        gotError = await onlyThrowsError(throwError(myError).pipe(matchInput()));
        errorMessage = null;
      }
      catch (msg) {
        gotError = null;
        errorMessage = msg;
      }
      t.ok(gotError === myError, 'throws correct error');
    });

    t.test('error on suffix', async t => {
      const myError = new Error('test error');
      const val = await allValues(
        of( of(1), throwError(myError) )
        .pipe(
          concatAll(),
          matchInput()
        )
      );
      t.eq(val.length, 1);
      let gotError;
      try {
        gotError = await onlyThrowsError((val[0] || {}).suffix || empty());
      }
      catch (e) {
        gotError = null;
      }
      t.eq(gotError, myError, 'throws correct error');
    });

  });

  t.test('transformMatch', async t => {

    t.test('success', async t => {
      
      const val = await allValues(
        of(1, 2, 3)
        .pipe(
          matchInput(),
          transformMatch(v => v * 10)
        )
      );

      t.eq(val.length, 1);
      t.eq(val[0].match, 1 * 10);

      const suffixValues = await allValues(val[0].suffix);

      t.eq(suffixValues, [2, 3]);

    });

    t.test('failure', async t => {
      
      const val = await allValues(
        empty()
        .pipe(
          transformMatch(v => v)
        )
      );

      t.eq(val.length, 0);

    });

    t.test('input error', async t => {
      
      const myError = new Error('test error');

      let gotError, errorMessage;
      try {
        gotError = await onlyThrowsError(
          throwError(myError)
          .pipe(
            transformMatch(v => v)
          )
        );
        errorMessage = null;
      }
      catch (msg) {
        gotError = null;
        errorMessage = msg;
      }
      t.ok(gotError === myError, 'throws correct error');
      
    });

  });

}
