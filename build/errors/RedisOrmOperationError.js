"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisOrmOperationError = void 0;
const RedisOrmError_1 = require("./RedisOrmError");
class RedisOrmOperationError extends RedisOrmError_1.RedisOrmError {
    constructor(message) {
        super(message);
        Object.setPrototypeOf(this, RedisOrmOperationError.prototype);
    }
}
exports.RedisOrmOperationError = RedisOrmOperationError;
