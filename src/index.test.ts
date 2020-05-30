
import { TestHarness, Assert } from 'zora';
import { captureInput, CaptureValue, CaptureComplete, mapCaptures } from './index'
import { from, Observable } from 'rxjs';
import { toArray } from 'rxjs/operators';

function allValues<T>(obs: Observable<T>): Promise<T[]> {
  return new Promise((resolve, reject) => {
    obs.pipe( toArray() ).subscribe({
      next(value) { resolve(value); },
      error(e) { reject(e); },
    });
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
