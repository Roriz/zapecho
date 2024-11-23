class Base2Agent {
  constructor(thread) {
    this.thread = thread;
  }

  isCompleted() {}
  success() {}
  dataToExtraction() {}
  prompt() {}

  // GuardRails
  moderationMessages() { return true; }
  conversationScope() { return; }

  // optional events
  beforeExtract() {}
  beforeRun() {}
  afterRun() {}
  onDataChange() {}

}

module.exports = {
  BaseAgent
}
