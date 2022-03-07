"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisOrmQueryError = void 0;
const RedisOrmError_1 = require("./RedisOrmError");
class RedisOrmQueryError extends RedisOrmError_1.RedisOrmError {
    constructor(message) {
        super(message);
        Object.setPrototypeOf(this, RedisOrmQueryError.prototype);
    }
}
exports.RedisOrmQueryError = RedisOrmQueryError;
