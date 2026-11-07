/**
 * OpenPDF Studio - Command Pattern Undo / Redo Manager
 */

import { State } from "./state.js";

export const HistoryManager = {
  undoStack: [],
  redoStack: [],
  maxStackSize: 50,

  record(command) {
    // command: { type: string, item: any, undo: Function, redo: Function }
    this.undoStack.push(command);
    if (this.undoStack.length > this.maxStackSize) {
      this.undoStack.shift();
    }
    // Clear redo stack on new action
    this.redoStack = [];
    this.updateButtons();
    State.emit("historyChanged", { canUndo: this.canUndo(), canRedo: this.canRedo() });
  },

  undo() {
    if (!this.canUndo()) return;
    const command = this.undoStack.pop();
    if (command && typeof command.undo === "function") {
      command.undo();
      this.redoStack.push(command);
      this.updateButtons();
      State.emit("historyChanged", { canUndo: this.canUndo(), canRedo: this.canRedo() });
      State.emit("toast", { type: "info", message: `Undone: ${command.description || command.type}` });
    }
  },

  redo() {
    if (!this.canRedo()) return;
    const command = this.redoStack.pop();
    if (command && typeof command.redo === "function") {
      command.redo();
      this.undoStack.push(command);
      this.updateButtons();
      State.emit("historyChanged", { canUndo: this.canUndo(), canRedo: this.canRedo() });
      State.emit("toast", { type: "info", message: `Redone: ${command.description || command.type}` });
    }
  },

  canUndo() {
    return this.undoStack.length > 0;
  },

  canRedo() {
    return this.redoStack.length > 0;
  },

  updateButtons() {
    const undoBtn = document.getElementById("header-undo-btn");
    const redoBtn = document.getElementById("header-redo-btn");

    if (undoBtn) {
      undoBtn.disabled = !this.canUndo();
      const lastUndo = this.undoStack[this.undoStack.length - 1];
      undoBtn.title = this.canUndo() ? `Undo: ${lastUndo?.description || "last action"} (Ctrl+Z)` : "Undo (Ctrl+Z)";
    }
    if (redoBtn) {
      redoBtn.disabled = !this.canRedo();
      const lastRedo = this.redoStack[this.redoStack.length - 1];
      redoBtn.title = this.canRedo() ? `Redo: ${lastRedo?.description || "last action"} (Ctrl+Y)` : "Redo (Ctrl+Y)";
    }
  },

  clear() {
    this.undoStack = [];
    this.redoStack = [];
    this.updateButtons();
  }
};
