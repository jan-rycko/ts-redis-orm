"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisOrmSchemaError = void 0;
const RedisOrmError_1 = require("./RedisOrmError");
class RedisOrmSchemaError extends RedisOrmError_1.RedisOrmError {
    constructor(message, errors) {
        super(message);
        this.errors = errors;
        Object.setPrototypeOf(this, RedisOrmSchemaError.prototype);
    }
}
exports.RedisOrmSchemaError = RedisOrmSchemaError;
