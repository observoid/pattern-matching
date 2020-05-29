
import { captureAllInput, Capture, CaptureValue, CaptureComplete } from '../index'
import { from } from 'rxjs';
import { toArray } from 'rxjs/operators';

test('captureAllInput works', done => {
  const testValues = ['banana', 33, true];
  from(testValues)
  .pipe(
    captureAllInput(),
    toArray()
  )
  .subscribe({
    next(val) {
      expect(val).toHaveLength(testValues.length + 1);
      for (let i = 0; i < testValues.length; i++) {
        let obj = (val[i] || {}) as CaptureValue<any>;
        expect(obj.complete).toBeFalsy();
        expect(obj.capture).toBe(testValues[i]);
      }
      let last = (val[testValues.length] || {}) as CaptureComplete<any>;
      expect(last.complete).toBe(true);
    },
    complete() {
      done();
    },
    error(e) {
      throw e;
    },
  });
});
