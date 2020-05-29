
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
        subscriber.complete();
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

export function mapCaptures<TInput, TCapIn, TCapOut>(
  mapFunc: (capture: TCapIn) => TCapOut
): OperatorFunction<Capture<TInput, TCapIn>, Capture<TInput, TCapOut>> {
  return input => new Observable(subscriber => {
    return input.subscribe(
      (step) => {
        if (step.complete) {
          subscriber.next(step);
        }
        else {
          subscriber.next({capture: mapFunc(step.capture)});
        }
      },
      (error) => subscriber.error(error),
      () => subscriber.complete()
    )
  });
}

export function captureRepeatedMatch<TInput, TMatch>(
  matcher: OperatorFunction<TInput, Match<TInput, TMatch>>,
  minCount = 1,
  maxCount = Infinity
): OperatorFunction<TInput, Capture<TInput, TMatch>> {
  return input => new Observable(subscriber => {
    const subs = new Subscription();
    function next(count: number, input: Observable<TInput>) {
      if (count === maxCount) {
        subscriber.next({complete:true, suffix:input});
        subscriber.complete();
        return;
      }
      const sub = matcher(input).subscribe(
        ({ match, suffix }) => {
          subs.remove(sub);
          subscriber.next({ capture: match });
          next(count + 1, suffix);
        },
        (error) => subscriber.error(error),
        () => {
          if (count >= minCount) {
            subscriber.next({complete: true, suffix: input});
          }
          subscriber.complete();
        },
      );
      subs.add(sub);      
    }
    next(0, input);
    return subs;
  });
}