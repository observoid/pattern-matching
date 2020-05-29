
import { Observable, OperatorFunction, empty, ReplaySubject, Subscription } from 'rxjs';

export interface CaptureValue<TCapture> {
  complete?: false;
  capture: TCapture;
}

export interface CaptureComplete<TInput> {
  complete: true;
  suffix: Observable<TInput>;
}

export type Capture<TInput, TCapture> = CaptureValue<TCapture> | CaptureComplete<TInput>;

export function captureAllInput<TInput>(): OperatorFunction<TInput, Capture<TInput, TInput>> {
  return input => new Observable(subscriber => {
    return input.subscribe(
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

export interface Match<TInput, TMatch> {
  match: TMatch;
  suffix: Observable<TInput>;
}

export function matchAnyInput<TInput>(): OperatorFunction<TInput, Match<TInput, TInput>> {
  return input => new Observable(subscriber => {
    const subscription = new Subscription();
    let onComplete = () => subscriber.complete();
    let onError = (error: any) => subscriber.error(error);
    let onInput = (match: TInput) => {
      const suffix = new ReplaySubject<TInput>();
      subscription.add(suffix);
      onInput = match => suffix.next(match);
      onComplete = () => suffix.complete();
      onError = (error) => suffix.error(error);
      subscriber.next({match, suffix});
      subscriber.complete();
    };
    subscription.add(input.subscribe(
      input => onInput(input),
      error => onError(error),
      () => onComplete()));
    return subscription;
  });
}
