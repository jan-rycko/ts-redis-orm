"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseEntity = void 0;
const entityExporter_1 = require("./entityExporter");
const RedisOrmOperationError_1 = require("./errors/RedisOrmOperationError");
const RedisOrmSchemaError_1 = require("./errors/RedisOrmSchemaError");
const eventEmitters_1 = require("./eventEmitters");
const PerformanceHelper_1 = require("./helpers/PerformanceHelper");
const parser_1 = require("./parser");
const Query_1 = require("./Query");
const redisOrm_1 = require("./redisOrm");
class BaseEntity {
    constructor() {
        // endregion
        // region constructor / variables
        this._table = "";
        this._tableName = "";
        // flags
        this._isNew = true;
        // cache the column values
        this._values = {};
        // the actual storage value in redis
        this._storageStrings = {};
        // store the increment commands
        this._increments = {};
        const now = new Date();
        this.createdAt = now;
        this.setTable(redisOrm_1.redisOrm.getDefaultTable(this.constructor));
    }
    // region static methods
    static connect(table = "") {
        return __awaiter(this, void 0, void 0, function* () {
            // validate the schema
            table = table || redisOrm_1.redisOrm.getDefaultTable(this);
            const tableName = redisOrm_1.redisOrm.getTablePrefix(this) + table;
            const schemaErrors = yield redisOrm_1.redisOrm.compareSchemas(this, tableName);
            if (schemaErrors.length) {
                throw new RedisOrmSchemaError_1.RedisOrmSchemaError(`(${this.name}, ${tableName}) Mismatch with remote Schemas`, schemaErrors);
            }
            return yield redisOrm_1.redisOrm.getRedis(this);
        });
    }
    /** @internal */
    static newFromStorageStrings(storageStrings) {
        const entity = this.create({});
        entity.assignStorageStrings(storageStrings);
        return entity;
    }
    static query() {
        return new Query_1.Query(this);
    }
    static find(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.query().find(id);
        });
    }
    static findMany(ids) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.query().findMany(ids);
        });
    }
    static create(values) {
        return new this().setValues(values);
    }
    static all() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.query().run();
        });
    }
    static count() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.query().count();
        });
    }
    // get the current redis instance, do not use internally
    static getRedis() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield redisOrm_1.redisOrm.getRedis(this, false);
        });
    }
    static resyncDb(table = "") {
        return __awaiter(this, void 0, void 0, function* () {
            // get redis,
            table = table || redisOrm_1.redisOrm.getDefaultTable(this);
            const tableName = redisOrm_1.redisOrm.getTablePrefix(this) + table;
            const redis = yield redisOrm_1.redisOrm.getRedis(this);
            const remoteSchemas = yield redisOrm_1.redisOrm.getRemoteSchemas(this, tableName);
            // we resync only if we found any schema exist
            if (remoteSchemas) {
                // prepare arguments
                const keys = [];
                const params = [
                    redisOrm_1.redisOrm.getSchemasJson(this),
                    tableName,
                ];
                // remove everything
                const performanceHelper = yield redisOrm_1.redisOrm.getPerformanceHelper(this);
                const commandResult = yield redis.commandAtomicResyncDb(keys, params);
                const performanceResult = yield performanceHelper.getResult();
                const saveResult = JSON.parse(commandResult);
                if (saveResult.error) {
                    throw new RedisOrmOperationError_1.RedisOrmOperationError(`(${this.name}, ${tableName}) ${saveResult.error}`);
                }
                return [true, performanceResult];
            }
            else {
                return [false, PerformanceHelper_1.PerformanceHelper.getEmptyResult()];
            }
        });
    }
    static truncate(className, table = "") {
        return __awaiter(this, void 0, void 0, function* () {
            if (className !== this.name) {
                throw new RedisOrmOperationError_1.RedisOrmOperationError(`(${this.name}, ${table}) You need to provide the class name for truncate`);
            }
            // get redis,
            table = table || redisOrm_1.redisOrm.getDefaultTable(this);
            const tableName = redisOrm_1.redisOrm.getTablePrefix(this) + table;
            const redis = yield redisOrm_1.redisOrm.getRedis(this);
            const remoteSchemas = yield redisOrm_1.redisOrm.getRemoteSchemas(this, tableName);
            const performanceHelper = yield redisOrm_1.redisOrm.getPerformanceHelper(this);
            // we truncate only if we found any schema exist
            let total = 0;
            if (remoteSchemas) {
                // prepare arguments
                const keys = [];
                const params = [tableName];
                const commandResult = yield redis.commandAtomicTruncate(keys, params);
                const result = JSON.parse(commandResult);
                total = result.total;
            }
            const performanceResult = yield performanceHelper.getResult();
            return [total, performanceResult];
        });
    }
    static getEvents() {
        return eventEmitters_1.eventEmitters.getEventEmitter(this);
    }
    static getSchemas() {
        const entityColumns = redisOrm_1.redisOrm.getEntityColumns(this);
        const indexKeys = redisOrm_1.redisOrm.getIndexKeys(this);
        const uniqueKeys = redisOrm_1.redisOrm.getUniqueKeys(this);
        const primaryKey = redisOrm_1.redisOrm.getPrimaryKey(this);
        const autoIncrementKey = redisOrm_1.redisOrm.getAutoIncrementKey(this);
        const entityMeta = redisOrm_1.redisOrm.getEntityMeta(this);
        // convert to column objects
        const columnTypes = Object.keys(entityColumns)
            .reduce((a, b) => Object.assign(a, { [b]: entityColumns[b].type }), {});
        return {
            columnTypes,
            indexKeys,
            uniqueKeys,
            primaryKey,
            autoIncrementKey,
            table: entityMeta.table,
            tablePrefix: entityMeta.tablePrefix,
            connection: entityMeta.connection,
        };
    }
    // endregion
    // region static method: import/export
    static export(file, table = "") {
        return __awaiter(this, void 0, void 0, function* () {
            table = table || redisOrm_1.redisOrm.getDefaultTable(this);
            const [allEntities] = yield this.query().setTable(table).run();
            yield this.exportEntities(allEntities, file);
        });
    }
    static exportEntities(entities, file) {
        return __awaiter(this, void 0, void 0, function* () {
            yield entityExporter_1.entityExporter.exportEntities(this, entities, file);
        });
    }
    static import(file, skipSchemasCheck = false, table = "") {
        return __awaiter(this, void 0, void 0, function* () {
            table = table || redisOrm_1.redisOrm.getDefaultTable(this);
            yield entityExporter_1.entityExporter.import(this, file, skipSchemasCheck, table);
        });
    }
    // endregion
    // region public get properties: conditions
    get isNew() {
        return this._isNew;
    }
    // endregion
    // region public properties
    get createdAt() {
        return this._get("createdAt");
    }
    set createdAt(value) {
        this._set("createdAt", value);
    }
    // endregion
    // region public methods
    setTable(table) {
        this._table = table;
        this._tableName = redisOrm_1.redisOrm.getTablePrefix(this.constructor) + table;
    }
    getTable() {
        return this._table;
    }
    getEntityId() {
        const primaryKey = redisOrm_1.redisOrm.getPrimaryKey(this.constructor);
        const values = [];
        const value = this._get(primaryKey);
        if (typeof value === "number") {
            if (value && Number.isInteger(value)) {
                return value.toString();
            }
            else {
                throw new RedisOrmOperationError_1.RedisOrmOperationError(`(${this.constructor.name}, ${this._tableName}) Invalid number value: ${value} for primary key: ${primaryKey}`);
            }
        }
        else if (typeof value === "string") {
            if (value) {
                return value;
            }
            else {
                throw new RedisOrmOperationError_1.RedisOrmOperationError(`(${this.constructor.name}, ${this._tableName}) Invalid string value: '${value}' for primary key: ${primaryKey}`);
            }
        }
        else {
            throw new RedisOrmOperationError_1.RedisOrmOperationError(`(${this.constructor.name}, ${this._tableName}) Invalid value: ${value} for primary key: ${primaryKey}`);
        }
    }
    getValues() {
        const values = {};
        const columns = redisOrm_1.redisOrm.getColumns(this.constructor);
        for (const column of columns) {
            values[column] = this._get(column);
        }
        return values;
    }
    increment(column, value = 1) {
        if (this.isNew) {
            throw new RedisOrmOperationError_1.RedisOrmOperationError(`(${this.constructor.name}, ${this._tableName}) You cannot increment a new entity`);
        }
        if (redisOrm_1.redisOrm.isPrimaryKey(this.constructor, column)) {
            throw new RedisOrmOperationError_1.RedisOrmOperationError(`(${this.constructor.name}, ${this._tableName}) You cannot increment primary key`);
        }
        if (redisOrm_1.redisOrm.isUniqueKey(this.constructor, column)) {
            throw new RedisOrmOperationError_1.RedisOrmOperationError(`(${this.constructor.name}, ${this._tableName}) You cannot increment unique key`);
        }
        if (!redisOrm_1.redisOrm.isNumberColumn(this.constructor, column)) {
            throw new RedisOrmOperationError_1.RedisOrmOperationError(`(${this.constructor.name}, ${this._tableName}) Column need to be in the type of Number`);
        }
        if (!Number.isInteger(value)) {
            throw new RedisOrmOperationError_1.RedisOrmOperationError(`(${this.constructor.name}, ${this._tableName}) Increment value need to be an integer`);
        }
        this._increments[column] = value;
        return this;
    }
    setValues(values) {
        Object.assign(this, { _values: Object.assign(Object.assign({}, this._values), values) });
        return this;
    }
    save() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this._saveInternal();
        });
    }
    delete() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this._deleteInternal();
        });
    }
    clone() {
        const entity = new this.constructor();
        entity.setValues(this.getValues());
        return entity;
    }
    toJSON() {
        return this.getValues();
    }
    // endregion
    // region protected methods
    assignStorageStrings(storageStrings) {
        this._isNew = false;
        this._storageStrings = storageStrings;
        // we preserve default values by removing existing _values only
        for (const column of Object.keys(storageStrings)) {
            delete this._values[column];
        }
    }
    // endregion
    // region private methods: value get / set
    _get(column) {
        if (!(column in this._values)) {
            const entityColumns = redisOrm_1.redisOrm.getEntityColumn(this.constructor, column);
            this._values[column] = parser_1.parser.parseStorageStringToValue(entityColumns.type, this._storageStrings[column]);
        }
        return this._values[column];
    }
    _set(column, value, updateStorageString = false) {
        const entityColumns = redisOrm_1.redisOrm.getEntityColumn(this.constructor, column);
        const storageString = parser_1.parser.parseValueToStorageString(entityColumns.type, value);
        this._values[column] = parser_1.parser.parseStorageStringToValue(entityColumns.type, storageString);
        if (updateStorageString) {
            this._storageStrings[column] = storageString;
        }
    }
    // endregion
    // region private methods: common
    _saveInternal() {
        return __awaiter(this, void 0, void 0, function* () {
            const changes = this._getChanges();
            if (Object.keys(changes).length === 0) {
                // no changes and no increments, no need to save
                if (Object.keys(this._increments).length === 0) {
                    return [this, PerformanceHelper_1.PerformanceHelper.getEmptyResult()];
                }
            }
            // prepare redis lua command parameters
            const indexKeys = redisOrm_1.redisOrm.getIndexKeys(this.constructor);
            const uniqueKeys = redisOrm_1.redisOrm.getUniqueKeys(this.constructor);
            const autoIncrementKey = redisOrm_1.redisOrm.getAutoIncrementKey(this.constructor);
            let entityId = "";
            // we must assign an entity id for the following case
            // - if it's not new
            // - if it's not auto increment
            // - if the auto increment key is not 0
            if (!this.isNew || !autoIncrementKey || changes[autoIncrementKey] !== "0") {
                entityId = this.getEntityId();
            }
            // prepare argument
            const params = [
                redisOrm_1.redisOrm.getSchemasJson(this.constructor),
                entityId,
                this.isNew,
                this._tableName,
                autoIncrementKey,
                JSON.stringify(indexKeys),
                JSON.stringify(uniqueKeys),
                JSON.stringify(changes),
                JSON.stringify(this._increments),
            ];
            const redis = yield redisOrm_1.redisOrm.getRedis(this.constructor);
            const performanceHelper = yield redisOrm_1.redisOrm.getPerformanceHelper(this.constructor);
            const commandResult = yield redis.commandAtomicSave([], params);
            const saveResult = JSON.parse(commandResult);
            const performanceResult = yield performanceHelper.getResult();
            if (saveResult.error) {
                if (saveResult.error === "Mismatch with remote Schemas") {
                    const schemaErrors = yield redisOrm_1.redisOrm.compareSchemas(this.constructor, this._tableName);
                    throw new RedisOrmSchemaError_1.RedisOrmSchemaError(`(${this.constructor.name}, ${this._tableName}) ${saveResult.error}`, schemaErrors);
                }
                else {
                    throw new RedisOrmOperationError_1.RedisOrmOperationError(`(${this.constructor.name}, ${this._tableName}) ${saveResult.error}`);
                }
            }
            // update storage strings
            Object.assign(this._storageStrings, changes);
            // if we do not have id and it's auto increment
            if (this.isNew && autoIncrementKey && saveResult.autoIncrementKeyValue) {
                this._set(autoIncrementKey, saveResult.autoIncrementKeyValue, true);
            }
            // if we have increment result
            if (saveResult.increments) {
                for (const [column, value] of Object.entries(saveResult.increments)) {
                    this._set(column, value, true);
                }
            }
            // clean up
            this._increments = {};
            this._values = {};
            // update the flags
            const isNew = this._isNew;
            this._isNew = false;
            // fire event
            if (isNew) {
                eventEmitters_1.eventEmitters.emit("create", this);
            }
            else {
                eventEmitters_1.eventEmitters.emit("update", this);
            }
            return [this, performanceResult];
        });
    }
    _deleteInternal() {
        return __awaiter(this, void 0, void 0, function* () {
            // checking
            if (this.isNew) {
                throw new RedisOrmOperationError_1.RedisOrmOperationError(`(${this.constructor.name}, ${this._tableName}) You cannot delete a new entity`);
            }
            // if it's soft delete
            const entityMeta = redisOrm_1.redisOrm.getEntityMeta(this.constructor);
            // prepare redis lua command parameters
            const entityId = this.getEntityId();
            const indexKeys = redisOrm_1.redisOrm.getIndexKeys(this.constructor);
            const uniqueKeys = redisOrm_1.redisOrm.getUniqueKeys(this.constructor);
            const keys = [];
            const params = [
                redisOrm_1.redisOrm.getSchemasJson(this.constructor),
                entityId,
                this._tableName,
                JSON.stringify(indexKeys),
                JSON.stringify(uniqueKeys),
            ];
            const redis = yield redisOrm_1.redisOrm.getRedis(this.constructor);
            const performanceHelper = yield redisOrm_1.redisOrm.getPerformanceHelper(this.constructor);
            const commandResult = yield redis.commandAtomicDelete(keys, params);
            const saveResult = JSON.parse(commandResult);
            const performanceResult = yield performanceHelper.getResult();
            // throw error if there is any
            if (saveResult.error) {
                if (saveResult.error === "Mismatch with remote Schemas") {
                    const schemaErrors = yield redisOrm_1.redisOrm.compareSchemas(this.constructor, this._tableName);
                    throw new RedisOrmSchemaError_1.RedisOrmSchemaError(`(${this.constructor.name}, ${this._tableName}) ${saveResult.error}`, schemaErrors);
                }
                else {
                    throw new RedisOrmOperationError_1.RedisOrmOperationError(`(${this.constructor.name}, ${this._tableName}) ${saveResult.error}`);
                }
            }
            // fire event
            eventEmitters_1.eventEmitters.emit("delete", this);
            return [this, performanceResult];
        });
    }
    _getChanges() {
        let hasChanges = false;
        const changes = {};
        const entityColumns = redisOrm_1.redisOrm.getEntityColumns(this.constructor);
        for (const [column, entityColumn] of Object.entries(entityColumns)) {
            // if no such value before, it must be a changes
            const currentValue = this._get(column);
            const storageString = parser_1.parser.parseValueToStorageString(entityColumn.type, currentValue);
            if (!(column in this._storageStrings) || storageString !== this._storageStrings[column]) {
                changes[column] = storageString;
                hasChanges = true;
            }
        }
        return changes;
    }
}
exports.BaseEntity = BaseEntity;
