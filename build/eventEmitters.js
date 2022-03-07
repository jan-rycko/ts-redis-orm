"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventEmitters = void 0;
const events_1 = require("events");
class EventEmitters {
    constructor() {
        this._eventEmitters = new Map();
    }
    getEventEmitter(target) {
        if (!this._eventEmitters.has(target)) {
            this._eventEmitters.set(target, new events_1.EventEmitter());
        }
        return this._eventEmitters.get(target);
    }
    emit(eventType, entity) {
        const eventEmitter = this.getEventEmitter(entity.constructor);
        if (eventEmitter) {
            setImmediate(() => eventEmitter.emit(eventType, entity));
        }
    }
}
exports.eventEmitters = new EventEmitters();
