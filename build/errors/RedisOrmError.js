"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisOrmError = void 0;
class RedisOrmError extends Error {
    constructor(message) {
        super(message);
        Object.setPrototypeOf(this, RedisOrmError.prototype);
    }
}
exports.RedisOrmError = RedisOrmError;
