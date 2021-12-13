
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
  getOne(): T {
    if (this.size === 0) {
      throw Error("Can't getOne from empty SerializedSet");
    }
    return this.values().next().value as T;
  }
  add(item: T) {
    return super.add(JSON.stringify(item));
  }
  delete(item: T) {
    return super.delete(JSON.stringify(item));
  }
  [Symbol.iterator]() {
    return this.values();
  }
  *values(): Generator<T, void, unknown> {
    for (const item of super.values()) {
      yield JSON.parse(item);
    }
  }
  forEach(fn) {
    return super.forEach((item) => {
      fn(JSON.parse(item));
    });
  }
}
