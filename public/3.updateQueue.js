class Update {
  constructor(payload, nextUpdate) {
    this.payload = payload;
    this.nextUpdate = nextUpdate;
  }
}

class UpdateQueue {
  constructor() {
    this.baseState = null;
    this.firstUpdate = null;
    this.lastUpdate = null;
  }
  enqueueUpdate(update) {
    if (this.firstUpdate == null) {
      this.firstUpdate = this.lastUpdate = update;
    } else {
      this.lastUpdate.nextUpdate = update;
      this.lastUpdate = update;
    }
  }
  forceUpdate() {
    let currentState = this.baseState || {};
    let currentUpdate = this.firstUpdate;
    while (currentUpdate) {
      const nextState =
        typeof currentUpdate.payload === "function"
          ? currentUpdate.payload(currentState)
          : currentUpdate.payload;
      currentState = { ...currentState, ...nextState };
      currentUpdate = currentUpdate.nextUpdate;
    }
    this.baseState = currentState;
    this.firstUpdate = this.lastUpdate = null;
    return currentState;
  }
}
const queue = new UpdateQueue();

queue.enqueueUpdate(new Update({ number: 0 }));
queue.enqueueUpdate(new Update({ name: "mojie" }));
queue.enqueueUpdate(new Update((state) => ({ number: state.number + 1 })));
queue.enqueueUpdate(new Update((state) => ({ number: state.number + 1 })));
queue.enqueueUpdate(new Update({ age: 18 }));
queue.forceUpdate();
console.log('queue.baseState', queue.baseState);
