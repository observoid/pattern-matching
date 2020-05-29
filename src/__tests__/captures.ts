
import { captureAllInput, CaptureValue, CaptureComplete, mapCaptures } from '../index'
import { from, Observable } from 'rxjs';
import { toArray } from 'rxjs/operators';

test('captureAllInput', done => {
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
      expect(last.suffix).toBeInstanceOf(Observable);
      last.suffix.pipe( toArray() ).subscribe({
        next(val) {
          expect(val).toHaveLength(0);
        },
        complete() {
          done();
        },
        error(e) {
          done(e);
        },
      });
    },
    error(e) {
      done(e);
    },
  });
});

test('mapCaptures', done => {
  const testValues = [1, 2, 3];
  from(testValues)
  .pipe(
    captureAllInput(),
    mapCaptures(v => v * 100),
    toArray()
  )
  .subscribe({
    next(val) {
      expect(val).toHaveLength(testValues.length + 1);
      for (let i = 0; i < testValues.length; i++) {
        let obj = (val[i] || {}) as CaptureValue<any>;
        expect(obj.complete).toBeFalsy();
        expect(obj.capture).toBe(testValues[i] * 100);
      }
      let last = (val[testValues.length] || {}) as CaptureComplete<any>;
      expect(last.complete).toBe(true);
      expect(last.suffix).toBeInstanceOf(Observable);
      last.suffix.pipe( toArray() ).subscribe({
        next(val) {
          expect(val).toHaveLength(0);
        },
        complete() {
          done();
        },
        error(e) {
          done(e);
        },
      });
    },
    error(e) {
      done(e);
    },
  });
});
