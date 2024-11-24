class BaseAgent {
  constructor(thread) {
    this.thread = thread;
  }

  // Basic methods
  prompt() { return ''; }
  success() { throw new Error('success() method not implemented'); } 
  isCompleted() { return false; }
  dataToExtraction() { return {}; }

  // GuardRails
  moderationMessages() { return true; }
  conversationScope() { return; }

  // Events
  async onDataChange(changedData) { 
    await this.thread.addAnswerData(changedData);
  }

  async onSaveData(dataToSave, run) {
    await this.onDataChange(dataToSave);

    return { ...run, force_rerun: true }
  }
  onBeforeRun() {}
  onAfterRun() {}
}

module.exports = {
  BaseAgent
}
