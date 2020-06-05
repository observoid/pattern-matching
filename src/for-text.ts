
import { Observable, Subscriber, of, OperatorFunction } from 'rxjs';
import { map } from 'rxjs/operators';
import { MatchMaker } from './index';

export interface TextRange {
  sourceString: string;
  startOffset: number;
  endOffset: number;
  [Symbol.toPrimitive](hint: 'string'): string;
  slice(startOffset?: number, endOffset?: number): TextRange;
}

class StringSlice implements TextRange {
  constructor(readonly sourceString: string, startOffset = 0, endOffset = Infinity) {
    if (startOffset < 0) {
      startOffset = Math.max(0, sourceString.length + startOffset);
    }
    else {
      startOffset = Math.min(sourceString.length, startOffset);
    }
    if (endOffset < 0) {
      endOffset += sourceString.length;
    }
    else {
      endOffset = Math.min(sourceString.length, endOffset);
    }
    if (endOffset < startOffset) {
      endOffset = startOffset;
    }
    if (startOffset !== 0) {
      Object.defineProperty(this, startOffset, {value: startOffset});
    }
    if (endOffset !== sourceString.length) {
      Object.defineProperty(this, 'endOffset', {value: endOffset});
    }
  }
  [Symbol.toPrimitive]() {
    return this.sourceString.slice(this.startOffset, this.endOffset);
  }
  get length() {
    return this.endOffset - this.startOffset;
  }
  get startOffset() {
    return 0;
  }
  get endOffset() {
    return this.sourceString.length;
  }
  slice(startOffset: number, endOffset: number): StringSlice {
    const { length } = this;
    if (startOffset < 0) {
      startOffset = Math.max(0, length + startOffset);
    }
    else {
      startOffset = Math.min(length, startOffset);
    }
    if (endOffset < 0) {
      endOffset += length;
    }
    else {
      endOffset = Math.min(length, endOffset);
    }
    if (endOffset < startOffset) {
      endOffset = startOffset;
    }
    if (startOffset === 0 && endOffset === length) {
      return this;
    }
    return new StringSlice(this.sourceString, this.startOffset + startOffset, this.startOffset + endOffset);
  }
}

export function toTextRanges(): OperatorFunction<string, TextRange> {
  return map((str: string) => new StringSlice(str));
}

export function fromTextRanges() {
  return map((tr: TextRange) => tr.sourceString.slice(tr.startOffset, tr.endOffset));
}

export function matchRegExp(rx: RegExp): MatchMaker<TextRange, TextRange> {
  const fixedRx = new RegExp(rx.source, rx.flags.replace(/[gy]/, '') + 'y');
  return input => new Observable(subscriber => {
    const subbed = new Subscriber();
    subbed.add(input.subscribe(
      (textRange) => {
        const { startOffset, endOffset, sourceString } = textRange;
        fixedRx.lastIndex = startOffset;
        const match = (endOffset === sourceString.length)
          ? fixedRx.exec(sourceString)
          : fixedRx.exec(sourceString.slice(0, endOffset));
        if (match) {
          subscriber.next({
            match: textRange.slice(0, match[0].length),
            suffix: of(textRange.slice(match[0].length)),
          });
        }
        subscriber.complete();
        subbed.unsubscribe();
      },
      e => subscriber.error(e),
      () => subscriber.complete()
    ));
    return subbed;
  });
}
