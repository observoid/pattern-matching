
import { Observable, OperatorFunction, empty, ReplaySubject, Subscription } from 'rxjs';

export interface Match<TInput, TMatch> {
  match: TMatch;
  suffix: Observable<TInput>;
}

export type MatchMaker<TInput, TMatch> = OperatorFunction<TInput, Match<TInput, TMatch>>;

export interface CaptureValue<TCapture> {
  complete?: false;
  capture: TCapture;
}

export interface CaptureComplete<TInput> {
  complete: true;
  suffix: Observable<TInput>;
}

export type Capture<TInput, TCapture> = CaptureValue<TCapture> | CaptureComplete<TInput>;

export type CaptureMaker<TInput, TCapture> = OperatorFunction<TInput, Capture<TInput, TCapture>>;

export function captureInput<TInput>(
  test: ((value: TInput) => boolean) | '*' = '*',
  minCount = 0,
  maxCount = Infinity
): CaptureMaker<TInput, TInput> {
  const testFunc = (test === '*') ? () => true : test;
  return input => new Observable(subscriber => {
    let count = 0;
    const sub = new Subscription();
    let onError = (e: any) => subscriber.error(e);
    let onComplete = () => {
      if (count >= minCount) {
        subscriber.next({complete: true, suffix: empty()});
      }
      subscriber.complete();
    };
    let onValue = (value: TInput) => {
      if (testFunc(value)) {
        subscriber.next({capture: value});
        if (++count < maxCount) return;
      }
      else if (count >= minCount) {
        const suffix = new ReplaySubject<TInput>();
        suffix.next(value);
        onError = e => suffix.error(e);
        onComplete = () => suffix.complete();
        onValue = value => suffix.next(value);
        subscriber.next({complete:true, suffix:suffix});
      }
      sub.unsubscribe();
      subscriber.complete();
    };
    sub.add(input.subscribe(
      value => onValue(value),
      e => onError(e),
      () => onComplete()
    ));
    return sub;
  });
}

export function matchInput<TInput>(
  test: ((value: TInput) => boolean) | '*' = '*'
): MatchMaker<TInput, TInput> {
  const testFunc = test === '*' ? () => true : test;
  return input => new Observable(subscriber => {
    const subscription = new Subscription();
    let onComplete = () => subscriber.complete();
    let onError = (error: any) => subscriber.error(error);
    let onInput = (match: TInput) => {
      if (!testFunc(match)) {
        subscription.unsubscribe();
        subscriber.complete();
        return;
      }
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
  matcher: MatchMaker<TInput, TMatch>,
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

export function matchTuple<TInput, TMatch, TTuple extends TMatch[]>(
  ...matchers: { [P in keyof TTuple]: MatchMaker<TInput, TTuple[P]> }
): MatchMaker<TInput, TTuple> {
  return input => new Observable(subscriber => {
    const tuple = new Array<TMatch>(matchers.length);
    const subs = new Subscription();
    function next(i: number, tokens: Observable<TInput>) {
      if (i === tuple.length) {
        subscriber.next({match:tuple as TTuple, suffix:tokens});
        subscriber.complete();
        return;
      }
      const sub = matchers[i](tokens).subscribe(
        ({ match, suffix }) => {
          tuple[i] = match;
          next(i + 1, suffix);
          subs.remove(sub);
        },
        (error) => {
          subscriber.error(error);
        },
        () => {
          subscriber.complete();
        }
      );
      subs.add(sub);
    }
    next(0, input);
    return subs;
  });
}
