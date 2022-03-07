"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Entity = void 0;
const __1 = require("..");
const redisOrm_1 = require("../redisOrm");
function Entity(entityMeta = {}) {
    return (target) => {
        var _a, _b;
        // validate from entity
        if (!redisOrm_1.redisOrm.hasPrimaryKey(target)) {
            throw new __1.RedisOrmDecoratorError(`(${target.name}) No primary keys exist for this entity`);
        }
        if (((_a = entityMeta.table) === null || _a === void 0 ? void 0 : _a.match(/:/)) || ((_b = entityMeta.tablePrefix) === null || _b === void 0 ? void 0 : _b.match(/:/))) {
            throw new __1.RedisOrmDecoratorError(`(${target.name}) table and tablePrefix must not contains ":"`);
        }
        // add entity meta
        let newEntityMeta = {
            table: "",
            tablePrefix: "",
            connection: "default",
            redisMaster: null,
        };
        newEntityMeta = Object.assign(newEntityMeta, entityMeta);
        redisOrm_1.redisOrm.addEntity(target, newEntityMeta);
        // add createdAt
        const schema = {
            type: Date,
            primary: false,
            autoIncrement: false,
            index: true,
            unique: false,
        };
        redisOrm_1.redisOrm.addColumn(target, "createdAt", schema);
    };
}
exports.Entity = Entity;
