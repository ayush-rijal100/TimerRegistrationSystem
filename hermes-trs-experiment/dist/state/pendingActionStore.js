"use strict";
// Pending Action Store keeps draft-confirm-execute state between terminal runs.
// Because `npm run dev -- "..."` starts a fresh process each time, an in-memory
// variable would disappear before the user can reply "yes". A small local JSON
// file is enough for this MVP and keeps the behavior easy to inspect.
Object.defineProperty(exports, "__esModule", { value: true });
exports.savePendingAction = savePendingAction;
exports.loadPendingAction = loadPendingAction;
exports.clearPendingAction = clearPendingAction;
const promises_1 = require("node:fs/promises");
const node_path_1 = require("node:path");
const pendingActionFilePath = (0, node_path_1.join)(process.cwd(), ".harness-state", "pending-action.json");
async function savePendingAction(action) {
    await (0, promises_1.mkdir)((0, node_path_1.dirname)(pendingActionFilePath), { recursive: true });
    await (0, promises_1.writeFile)(pendingActionFilePath, JSON.stringify(action, null, 2), "utf8");
}
async function loadPendingAction() {
    try {
        const raw = await (0, promises_1.readFile)(pendingActionFilePath, "utf8");
        return JSON.parse(raw);
    }
    catch {
        return null;
    }
}
async function clearPendingAction() {
    await (0, promises_1.rm)(pendingActionFilePath, { force: true });
}
