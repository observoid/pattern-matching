
import { TestHarness } from 'zora';
import { captureInput, CaptureValue, CaptureComplete, mapCaptures } from './index'
import { from, Observable } from 'rxjs';
import { toArray } from 'rxjs/operators';

export default (t: TestHarness) => {

  t.test('captureInput', t => new Promise((resolve, reject) => {
    const testValues = ['banana', 33, true] as const;
    from(testValues)
    .pipe(
      captureInput(),
      toArray()
    )
    .subscribe({
      next(val) {
        t.eq(val.length, testValues.length + 1);
        for (let i = 0; i < testValues.length; i++) {
          let obj = (val[i] || {}) as CaptureValue<any>;
          t.falsy(obj.complete);
          t.eq(obj.capture, testValues[i]);
        }
        let last = (val[testValues.length] || {}) as CaptureComplete<any>;
        t.eq(last.complete, true);
        t.ok(last.suffix instanceof Observable);
        last.suffix.pipe( toArray() ).subscribe({
          next(val) {
            t.eq(val.length, 0);
          },
          complete() {
            resolve();
          },
          error(e) {
            reject(e);
          },
        });
      },
      error(e) {
        reject(e);
      },
    });
  }));

  t.test('mapCaptures', t => new Promise((resolve, reject) => {
    const testValues = [1, 2, 3];
    from(testValues)
    .pipe(
      captureInput(),
      mapCaptures(v => v * 100),
      toArray()
    )
    .subscribe({
      next(val) {
        t.eq(val.length, testValues.length + 1);
        for (let i = 0; i < testValues.length; i++) {
          let obj = (val[i] || {}) as CaptureValue<any>;
          t.falsy(obj.complete);
          t.eq(obj.capture, testValues[i] * 100);
        }
        let last = (val[testValues.length] || {}) as CaptureComplete<any>;
        t.eq(last.complete, true);
        t.ok(last.suffix instanceof Observable);
        last.suffix.pipe( toArray() ).subscribe({
          next(val) {
            t.eq(val.length, 0);
          },
          complete() {
            resolve();
          },
          error(e) {
            reject(e);
          },
        });
      },
      error(e) {
        reject(e);
      },
    });
  }));

}
