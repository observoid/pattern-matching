
import { TestHarness, Assert } from 'zora';
import { captureInput, CaptureValue, CaptureComplete, mapCaptures } from '../lib/index'
import { from, Observable, empty, throwError, Subscription } from 'rxjs';
import { toArray } from 'rxjs/operators';

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

    t.test('error', async t => {
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

}
