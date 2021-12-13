import { SerializedSet } from "../src/SerializedSet";

describe("SerializedSet", () => {
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
