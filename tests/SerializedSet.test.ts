import { SerializedSet } from "../src/SerializedSet";

describe("SerializedSet", () => {
  describe("getOne", () => {
    it("throws an error if the set is empty", () => {
      const set = new SerializedSet();
      expect(() => {
        set.getOne();
      }).toThrowError();
    });
  });
  describe("forEach", () => {
    it("calls the callback for each item", () => {
      const set = new SerializedSet([1, 2, 3]);
      const fn = jest.fn();
      set.forEach(fn);
      expect(fn).toHaveBeenCalledWith(1);
      expect(fn).toHaveBeenCalledWith(2);
      expect(fn).toHaveBeenCalledWith(3);
    });
  });
  it("iterates items correctly", () => {
    const set = new SerializedSet();
    set.add("foo");
    expect(Array.from(set.values())).toEqual(["foo"]);
  });
  it("can add and remove basic items", () => {
    const set = new SerializedSet();
    set.add("foo");
    expect(set.has("foo")).toBe(true);
    expect(set.size).toBe(1);
    set.delete("foo");
    expect(set.has("foo")).toBe(false);
    expect(set.size).toBe(0);
  });
  it("can add and remove objects", () => {
    const set = new SerializedSet();
    set.add({ x: 0, y: -1 });
    expect(set.has({ x: 0, y: -1 })).toBe(true);
    expect(set.size).toBe(1);
    set.delete({ x: 0, y: -1 });
    expect(set.has({ x: 0, y: -1 })).toBe(false);
    expect(set.size).toBe(0);
  });
});
