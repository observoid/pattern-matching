
import { Observable, OperatorFunction, ReplaySubject, Subscription, empty, from } from 'rxjs';

export interface Match<TInput, TMatch> {
  match: TMatch;
  consumedNoInput?: boolean;
  suffix: Observable<TInput>;
}

export type MatchMaker<TInput, TMatch> = OperatorFunction<TInput, Match<TInput, TMatch>>;

export interface CaptureValue<TCapture> {
  complete?: false;
  capture: TCapture;
}

export interface CaptureComplete<TInput> {
  complete: true;
  consumedNoInput?: boolean;
  suffix: Observable<TInput>;
}

export type Capture<TInput, TCapture> = CaptureValue<TCapture> | CaptureComplete<TInput>;

export type CaptureMaker<TInput, TCapture> = OperatorFunction<TInput, Capture<TInput, TCapture>>;

export function match<TInput>(always: true): MatchMaker<TInput, TInput>;
export function match<TInput>(testInput: (value: TInput) => boolean): MatchMaker<TInput, TInput>;
export function match<TInput>(
  test: true | ((value: TInput) => boolean) = true
): MatchMaker<TInput, TInput> {
  const testFunc = test === true ? () => true : test;
  return input => new Observable(subscriber => {
    let onComplete = () => subscriber.complete();
    let onError = (error: any) => subscriber.error(error);
    let onInput = (match: TInput) => {
      if (!testFunc(match)) {
        subscriber.complete();
        return;
      }
      const suffix = new ReplaySubject<TInput>();
      onInput = match => suffix.next(match);
      onComplete = () => suffix.complete();
      onError = (error) => suffix.error(error);
      subscriber.next({match, suffix});
      subscriber.complete();
    };
    input.subscribe(
      input => onInput(input),
      error => onError(error),
      () => onComplete());
  });
}

export function capture<TInput, TMatch>(
  matcher: MatchMaker<TInput, TMatch>,
  minCount = 1,
  maxCount = Infinity
): OperatorFunction<TInput, Capture<TInput, TMatch>> {
  return input => new Observable(subscriber => {
    function next(count: number, input: Observable<TInput>, consumedInput: boolean) {
      if (count === maxCount) {
        subscriber.next({complete: true, suffix: input, consumedNoInput: !consumedInput});
        subscriber.complete();
        return;
      }
      let onError = (e: any) => subscriber.error(e);
      let onComplete = () => {
        if (count >= minCount) {
          subscriber.next({complete: true, suffix: empty(), consumedNoInput: !consumedInput});
        }
        subscriber.complete();
      };
      let onMatch = ({match, suffix, consumedNoInput}: Match<TInput, TMatch>) => {
        onMatch = () => {};
        onError = () => {};
        onComplete = () => {};
        subscriber.next({ capture: match });
        next(count + 1, suffix, consumedInput || !consumedNoInput);
      };
      matcher(input).subscribe(
        m => onMatch(m),
        e => onError(e),
        () => onComplete(),
      );
    }
    next(0, input, false);
  });
}

export function reduceCaptures<TInput, TCapture, TReduced>(
  capturer: CaptureMaker<TInput, TCapture>,
  createInitial: () => TReduced,
  reduce: (current: TReduced, capture: TCapture) => TReduced,
): MatchMaker<TInput, TReduced> {
  return input => new Observable(subscriber => {
    let value = createInitial();
    capturer(input).subscribe(
      (c) => {
        if (c.complete) {
          subscriber.next({
            match: value,
            suffix: c.suffix,
            consumedNoInput: c.consumedNoInput
          });
        }
        else {
          value = reduce(value, c.capture);
        }
      },
      (e) => subscriber.error(e),
      () => subscriber.complete(),
    );
  });
}

export function matchCaptureArray<TInput, TCapture>(capturer: CaptureMaker<TInput, TCapture>): MatchMaker<TInput, TCapture[]> {
  return input => new Observable(subscriber => {
    const results = new Array<TCapture>();
    capturer(input).subscribe(
      (cap) => {
        if (cap.complete) {
          subscriber.next({match: results, suffix: cap.suffix, consumedNoInput: cap.consumedNoInput});
        }
        else {
          results.push(cap.capture);
        }
      },
      (e) => subscriber.error(e),
      () => {
        subscriber.complete();
      },
    );
  });
}

export function lookahead<TInput, TMatch>(matcher: MatchMaker<TInput, TMatch>): MatchMaker<TInput, TMatch> {
  return input => new Observable(subscriber => {
    matcher(input).subscribe(
      (m) => subscriber.next({match: m.match, suffix: input, consumedNoInput: true}),
      (e) => subscriber.error(e),
      () => subscriber.complete(),
    );
  });
}

export function negativeLookahead<TInput>(matcher: MatchMaker<TInput, unknown>): MatchMaker<TInput, true> {
  return input => new Observable(subscriber => {
    let matched = false;
    matcher(input).subscribe(
      (_) => { matched = true; },
      (e) => subscriber.error(e),
      () => {
        if (!matched) subscriber.next({match: true, suffix: input, consumedNoInput: true});
        subscriber.complete();
      },
    );
  });
}

export function firstMatch<TInput, TMatch>(...matchers: MatchMaker<TInput, TMatch>[]): MatchMaker<TInput, TMatch> {
  return input => new Observable(subscriber => {
    function next(i: number) {
      if (i === matchers.length) {
        subscriber.complete();
        return;
      }
      let matched = false;
      matchers[i](input).subscribe(
        (m) => {
          matched = true;
          subscriber.next(m);
          subscriber.complete();
        },
        (e) => subscriber.error(e),
        () => { if (!matched) next(i + 1); },
      );
    }
    next(0);
  });
}

export function constantMatch<TInput, TConstant>(constant: TConstant): MatchMaker<TInput, TConstant> {
  return input => new Observable(subscriber => {
    subscriber.next({match: constant, suffix: input, consumedNoInput: true});
    subscriber.complete();
  });  
}

export function optionalMatch<TInput, TMatch extends Exclude<unknown, null>>(matcher: MatchMaker<TInput, TMatch>)
: MatchMaker<TInput, TMatch | null> {
  return input => new Observable(subscriber => {
    let matched = false;
    matcher(input).subscribe(
      (m) => {
        matched = true;
        subscriber.next(m);
        subscriber.complete();
      },
      (e) => subscriber.error(e),
      () => {
        if (!matched) {
          subscriber.next({match: null, consumedNoInput: true, suffix: input});
        }
      }
    )
  });
}
