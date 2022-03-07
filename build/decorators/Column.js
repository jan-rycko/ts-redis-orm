"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Column = void 0;
require("reflect-metadata");
const __1 = require("..");
const redisOrm_1 = require("../redisOrm");
function validEntityColumn(target, name, entityColumn) {
    if (entityColumn.primary) {
        if (entityColumn.type !== String && entityColumn.type !== Number) {
            throw new __1.RedisOrmDecoratorError(`(${target.name}) Primary key only supports String or Number`);
        }
        if (entityColumn.unique) {
            throw new __1.RedisOrmDecoratorError(`(${target.name}) Primary key should not be set to unique`);
        }
    }
    if (entityColumn.autoIncrement && !entityColumn.primary) {
        throw new __1.RedisOrmDecoratorError(`(${target.name}) AutoIncrement can be applied on primary key only`);
    }
    if (entityColumn.index) {
        if (entityColumn.type !== Number && entityColumn.type !== Boolean && entityColumn.type !== Date) {
            throw new __1.RedisOrmDecoratorError(`(${target.name}) Index only supports Number, Boolean or Date`);
        }
    }
    if (entityColumn.unique) {
        if (entityColumn.type !== String && entityColumn.type !== Number) {
            throw new __1.RedisOrmDecoratorError(`(${target.name}) Unique only supports String or Number`);
        }
    }
    if (name === "createdAt") {
        throw new __1.RedisOrmDecoratorError(`(${target.name}) createdAt is a preserved column name`);
    }
}
function Column(entityColumn = {}) {
    return (target, column) => {
        const propertyType = Reflect.getMetadata("design:type", target, column);
        let newEntityColumn = {
            type: propertyType,
            primary: column === "id",
            autoIncrement: false,
            index: false,
            unique: false,
        };
        newEntityColumn = Object.assign(newEntityColumn, entityColumn);
        // validate column
        validEntityColumn(target.constructor, column, newEntityColumn);
        // everything ok , add the column
        redisOrm_1.redisOrm.addColumn(target.constructor, column, newEntityColumn);
        // define getter / setter
        if (!Object.getOwnPropertyDescriptor(target.constructor.prototype, column)) {
            Object.defineProperty(target.constructor.prototype, column, {
                get() {
                    return this._get(column);
                },
                set(value) {
                    return this._set(column, value);
                },
            });
        }
    };
}
exports.Column = Column;
