"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisOrmDecoratorError = void 0;
const RedisOrmError_1 = require("./RedisOrmError");
class RedisOrmDecoratorError extends RedisOrmError_1.RedisOrmError {
    constructor(message) {
        super(message);
        Object.setPrototypeOf(this, RedisOrmDecoratorError.prototype);
    }
}
exports.RedisOrmDecoratorError = RedisOrmDecoratorError;
