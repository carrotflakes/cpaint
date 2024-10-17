
export class History<T> {
  history: T[] = [];
  index = 0;

  constructor(private limit: number) { }

  push(value: T) {
    this.history.splice(this.index);
    this.history.push(value);
    if (this.history.length > this.limit) {
      this.history.shift();
    }
    this.index = this.history.length;
  }

  undo() {
    if (this.index > 0) {
      this.index--;
      return this.history[this.index];
    }
  }

  redo() {
    if (this.index < this.history.length) {
      this.index++;
      return this.history[this.index - 1];
    }
  }

  get hasUndo() {
    return this.index > 0;
  }

  get hasRedo() {
    return this.index < this.history.length;
  }

  clone() {
    const h = new History<T>(this.limit);
    h.history = this.history.slice();
    h.index = this.index
    return h;
  }
}
