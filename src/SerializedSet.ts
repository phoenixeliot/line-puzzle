export class SerializedSet<T> extends Set {
  constructor(items: Array<T> = []) {
    super(items);
  }
  has(item: T) {
    return super.has(JSON.stringify(item));
  }
  /**
   * get a random single item from the set
   */
  serializeItem(item: T): string {
    return JSON.stringify(item);
  }
  deserializeItem(string: string): T {
    return JSON.parse(string);
  }
  *filter(filterFn: (v: T) => boolean = () => true): Generator<T, void, unknown> {
    const values = this.values();
    let next;
    while ((next = values.next().value)) {
      if (filterFn(next)) {
        yield next;
      }
    }
  }
  getOne(filterFn?: (v: T) => boolean): T {
    let next;
    if (filterFn) {
      next = this.filter(filterFn).next().value;
    } else {
      next = this.values().next().value;
    }
    if (!next) {
      throw Error("Can't getOne from empty SerializedSet");
    }
    return next;
  }
  add(item: T) {
    return super.add(this.serializeItem(item));
  }
  delete(item: T) {
    return super.delete(this.serializeItem(item));
  }
  [Symbol.iterator]() {
    return this.values();
  }
  *values(): Generator<T, void, unknown> {
    for (const string of super.values()) {
      yield this.deserializeItem(string);
    }
  }
  forEach(fn) {
    return super.forEach((item) => {
      fn(this.deserializeItem(item));
    });
  }
  some(fn): boolean {
    return Array.from(this).some(fn);
  }
  min(compare: (a: T, b: T) => T): T {
    const items = Array.from(this);
    let currentMin = items.pop();
    for (const item of items) {
      currentMin = compare(currentMin, item);
    }
    return currentMin;
  }
}
