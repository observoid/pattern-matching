
import { Observable, OperatorFunction, empty } from 'rxjs';

export interface CaptureValue<TCapture> {
  complete?: false;
  capture: TCapture;
}

export interface CaptureComplete<TInput> {
  complete: true;
  suffix: Observable<TInput>;
}

export type Capture<TInput, TCapture> = CaptureValue<TCapture> | CaptureComplete<TInput>;

export function captureInput<TInput>(): OperatorFunction<TInput, Capture<TInput, TInput>> {
  return input => new Observable(subscriber => {
    input.subscribe(
      capture => {
        subscriber.next({capture});
      },
      error => {
        subscriber.error(error);
      },
      () => {
        subscriber.next({complete: true, suffix: empty()});
      });
  });
}
