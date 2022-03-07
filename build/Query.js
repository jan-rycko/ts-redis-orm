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
exports.Query = void 0;
const RedisOrmQueryError_1 = require("./errors/RedisOrmQueryError");
const PerformanceHelper_1 = require("./helpers/PerformanceHelper");
const parser_1 = require("./parser");
const redisOrm_1 = require("./redisOrm");
class Query {
    constructor(_entityType) {
        this._entityType = _entityType;
        this._table = "";
        this._tableName = ""; // prefix + _table
        this._offset = 0;
        this._limit = -1;
        this._whereSearches = {};
        this._whereIndexes = {};
        this._sortBy = null;
        this._skipTrackingId = "";
        this.setTable(redisOrm_1.redisOrm.getDefaultTable(_entityType));
    }
    // region operation
    setTable(table) {
        this._table = table;
        this._tableName = redisOrm_1.redisOrm.getTablePrefix(this._entityType) + this._table;
        return this;
    }
    // endregion
    // region find
    find(id) {
        return __awaiter(this, void 0, void 0, function* () {
            // make sure id is valid
            if (typeof id !== "string" && typeof id !== "number") {
                return [undefined, PerformanceHelper_1.PerformanceHelper.getEmptyResult()];
            }
            // if we have a valid entity id
            const entityId = id.toString();
            const primaryKey = redisOrm_1.redisOrm.getPrimaryKey(this._entityType);
            let entity;
            const entityStorageKey = redisOrm_1.redisOrm.getEntityStorageKey(this._tableName, entityId);
            // we do internal skip tracking of performance
            const redis = yield this._getRedis();
            const performanceHelper = yield redisOrm_1.redisOrm.getPerformanceHelper(this._entityType, !!this._skipTrackingId);
            const trackingId = this._skipTracking();
            const storageStrings = yield redis.hgetall(entityStorageKey);
            const performanceResult = yield performanceHelper.getResult();
            this._resumeTracking(trackingId);
            // make sure id exists
            if (primaryKey in storageStrings) {
                entity = this._entityType.newFromStorageStrings(storageStrings);
                // update the table
                entity.setTable(this._table);
            }
            return [entity, performanceResult];
        });
    }
    findMany(ids) {
        return __awaiter(this, void 0, void 0, function* () {
            const promises = [];
            // we do internal skip tracking of performance
            const performanceHelper = yield redisOrm_1.redisOrm.getPerformanceHelper(this._entityType, !!this._skipTrackingId);
            const trackingId = this._skipTracking();
            for (const id of ids) {
                promises.push(this.find(id));
            }
            const result = yield Promise.all(promises);
            const performanceResult = yield performanceHelper.getResult();
            this._resumeTracking(trackingId);
            const entities = result.map(x => x[0]).filter(x => x);
            return [entities, performanceResult];
        });
    }
    findUnique(column, value) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!redisOrm_1.redisOrm.isUniqueKey(this._entityType, column)) {
                throw new RedisOrmQueryError_1.RedisOrmQueryError(`(${this._entityType.name}) Invalid unique column: ${column}`);
            }
            // we do internal skip tracking of performance
            const redis = yield this._getRedis();
            const performanceHelper = yield redisOrm_1.redisOrm.getPerformanceHelper(this._entityType, !!this._skipTrackingId);
            const trackingId = this._skipTracking();
            const id = yield redis.hget(redisOrm_1.redisOrm.getUniqueStorageKey(this._tableName, column), value.toString());
            let entity;
            if (id) {
                [entity] = yield this.find(id);
            }
            const performanceResult = yield performanceHelper.getResult();
            this._resumeTracking(trackingId);
            return [entity, performanceResult];
        });
    }
    findUniqueMany(column, values) {
        return __awaiter(this, void 0, void 0, function* () {
            const promises = [];
            // we do internal skip tracking of performance
            const performanceHelper = yield redisOrm_1.redisOrm.getPerformanceHelper(this._entityType);
            const trackingId = this._skipTracking();
            for (const value of values) {
                promises.push(this.findUnique(column, value));
            }
            const result = yield Promise.all(promises);
            const performanceResult = yield performanceHelper.getResult();
            this._resumeTracking(trackingId);
            const entities = result.map(x => x[0]).filter(x => x);
            return [entities, performanceResult];
        });
    }
    // endregion
    // region take
    runOnce() {
        return __awaiter(this, void 0, void 0, function* () {
            this.offset(0);
            this.limit(1);
            const [entities, performanceResult] = yield this.run();
            return [entities.length ? entities[0] : undefined, performanceResult];
        });
    }
    run() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this._run();
        });
    }
    where(column, operator, value) {
        const columnString = column;
        if (redisOrm_1.redisOrm.isIndexKey(this._entityType, columnString)) {
            if (!redisOrm_1.redisOrm.isIndexKey(this._entityType, columnString)) {
                throw new RedisOrmQueryError_1.RedisOrmQueryError(`(${this._entityType.name}) Invalid index column: ${column}`);
            }
            // convert value into string value
            if (value !== "-inf" && value !== "+inf") {
                const entityColumn = redisOrm_1.redisOrm.getEntityColumn(this._entityType, columnString);
                value = parser_1.parser.parseValueToStorageString(entityColumn.type, value);
            }
            let whereIndexType = { min: "-inf", max: "+inf" };
            if (columnString in this._whereIndexes) {
                whereIndexType = this._whereIndexes[columnString];
            }
            switch (operator) {
                case "=":
                    whereIndexType.min = value;
                    whereIndexType.max = value;
                    break;
                case ">=":
                    whereIndexType.min = value;
                    break;
                case "<=":
                    whereIndexType.max = value;
                    break;
                case ">":
                    whereIndexType.min = "(" + value;
                    break;
                case "<":
                    whereIndexType.max = "(" + value;
                    break;
                default:
                    throw new RedisOrmQueryError_1.RedisOrmQueryError(`(${this._entityType.name}) Invalid operator (${operator}) for index column: ${column}`);
            }
            this._whereIndexes[columnString] = whereIndexType;
        }
        else if (redisOrm_1.redisOrm.isSearchableColumn(this._entityType, columnString)) {
            if (!["=", "!=", "like"].includes(operator)) {
                throw new RedisOrmQueryError_1.RedisOrmQueryError(`(${this._entityType.name}) Invalid operator (${operator}) for non index column: ${column}`);
            }
            // convert value into string value
            const entityColumn = redisOrm_1.redisOrm.getEntityColumn(this._entityType, columnString);
            value = parser_1.parser.parseValueToStorageString(entityColumn.type, value);
            this._whereSearches[columnString] = { operator: operator, value };
        }
        else {
            throw new RedisOrmQueryError_1.RedisOrmQueryError(`(${this._entityType.name}) Invalid search column: ${column}`);
        }
        return this;
    }
    sortBy(column, order) {
        if (this._sortBy !== null) {
            throw new RedisOrmQueryError_1.RedisOrmQueryError(`(${this._entityType.name}) You can only order by 1 column`);
        }
        if (!redisOrm_1.redisOrm.isSortableColumn(this._entityType, column)) {
            throw new RedisOrmQueryError_1.RedisOrmQueryError(`(${this._entityType.name}) Not sortable Column: ${column}. You can only sort column type of Number, Boolean or Date`);
        }
        this._sortBy = { column: column, order };
        return this;
    }
    offset(value) {
        this._offset = value;
        return this;
    }
    limit(value) {
        this._limit = value;
        return this;
    }
    take(value) {
        this._limit = value;
        this._offset = 0;
        return this;
    }
    count(groupBy) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this._aggregate("count", "", groupBy);
        });
    }
    min(column, groupBy) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this._aggregate("min", column, groupBy);
        });
    }
    max(column, groupBy) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this._aggregate("max", column, groupBy);
        });
    }
    sum(column, groupBy) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this._aggregate("sum", column, groupBy);
        });
    }
    avg(column, groupBy) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this._aggregate("avg", column, groupBy);
        });
    }
    // endregion
    // region rank
    rank(column, id, isReverse = false) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!redisOrm_1.redisOrm.isIndexKey(this._entityType, column)) {
                throw new RedisOrmQueryError_1.RedisOrmQueryError(`(${this._entityType.name}) Invalid index column: ${column}`);
            }
            // make sure id is valid
            if (typeof id !== "string" && typeof id !== "number") {
                return [-1, PerformanceHelper_1.PerformanceHelper.getEmptyResult()];
            }
            const indexStorageKey = redisOrm_1.redisOrm.getIndexStorageKey(this._tableName, column);
            const entityId = id.toString();
            let offset = -1;
            const redis = yield this._getRedis();
            const performanceHelper = yield redisOrm_1.redisOrm.getPerformanceHelper(this._entityType);
            let tempOffset = null;
            if (isReverse) {
                tempOffset = yield redis.zrevrank(indexStorageKey, entityId);
            }
            else {
                tempOffset = yield redis.zrank(indexStorageKey, entityId);
            }
            const performanceResult = yield performanceHelper.getResult();
            if (tempOffset !== null) {
                offset = tempOffset;
            }
            return [offset, performanceResult];
        });
    }
    // endregion
    // region private methods
    _run() {
        return __awaiter(this, void 0, void 0, function* () {
            let whereIndexKeys = Object.keys(this._whereIndexes);
            const whereSearchKeys = Object.keys(this._whereSearches);
            // we add a default index
            if (whereIndexKeys.length === 0) {
                if (this._sortBy && redisOrm_1.redisOrm.isIndexKey(this._entityType, this._sortBy.column)) {
                    this.where(this._sortBy.column, "<=", "+inf");
                }
                else {
                    this.where("createdAt", "<=", "+inf");
                }
                whereIndexKeys = Object.keys(this._whereIndexes);
            }
            // if we only search with only one index and ordering is same as the index
            if (whereIndexKeys.length === 1 && whereSearchKeys.length === 0 &&
                (!this._sortBy || this._sortBy.column === whereIndexKeys[0])) {
                return this._runSimple();
            }
            // we send to redis lua to do complex query
            const params = [
                whereIndexKeys.length,
                whereSearchKeys.length,
                this._offset,
                this._limit,
                this._tableName,
                "",
                "",
                "",
                this._sortBy ? this._sortBy.column : "",
                this._sortBy ? this._sortBy.order : "",
            ];
            // whereIndexes
            for (const [column, { min, max }] of Object.entries(this._whereIndexes)) {
                params.push(column);
                params.push(min);
                params.push(max);
            }
            // whereSearches
            for (const [column, { operator, value }] of Object.entries(this._whereSearches)) {
                params.push(column);
                params.push(operator);
                params.push(value);
            }
            // calculate performance and handle skip tracking
            const redis = yield this._getRedis();
            const performanceHelper = yield redisOrm_1.redisOrm.getPerformanceHelper(this._entityType);
            const trackingId = this._skipTracking();
            const ids = yield redis.commandAtomicMixedQuery([], params);
            const [entities] = yield this.findMany(ids);
            const performanceResult = yield performanceHelper.getResult();
            this._resumeTracking(trackingId);
            return [entities, performanceResult];
        });
    }
    // only work for query with index and same ordering
    _runSimple() {
        return __awaiter(this, void 0, void 0, function* () {
            const whereIndexKeys = Object.keys(this._whereIndexes);
            const column = whereIndexKeys[0];
            const min = this._whereIndexes[column].min;
            const max = this._whereIndexes[column].max;
            const order = this._sortBy ? this._sortBy.order : "asc";
            // redis params
            const indexStorageKey = redisOrm_1.redisOrm.getIndexStorageKey(this._tableName, column);
            // collect result ids
            const redis = yield this._getRedis();
            let ids = [];
            const performanceHelper = yield redisOrm_1.redisOrm.getPerformanceHelper(this._entityType);
            const trackingId = this._skipTracking();
            if (order === "asc") {
                ids = yield redis.zrangebyscore(indexStorageKey, min, max, "LIMIT", this._offset, this._limit);
            }
            else if (order === "desc") {
                ids = yield redis.zrevrangebyscore(indexStorageKey, max, min, "LIMIT", this._offset, this._limit);
            }
            const [entities] = yield this.findMany(ids);
            const performanceResult = yield performanceHelper.getResult();
            this._resumeTracking(trackingId);
            return [entities, performanceResult];
        });
    }
    _aggregate(aggregate, aggregateColumn, groupBy) {
        return __awaiter(this, void 0, void 0, function* () {
            if (aggregate !== "count") {
                if (!redisOrm_1.redisOrm.isNumberColumn(this._entityType, aggregateColumn)) {
                    throw new RedisOrmQueryError_1.RedisOrmQueryError(`(${this._entityType.name}) Column: ${aggregateColumn} is not in the type of number`);
                }
            }
            if (groupBy) {
                if (!redisOrm_1.redisOrm.isValidColumn(this._entityType, groupBy)) {
                    throw new RedisOrmQueryError_1.RedisOrmQueryError(`(${this._entityType.name}) Invalid groupBy column: ${groupBy}`);
                }
            }
            let whereIndexKeys = Object.keys(this._whereIndexes);
            const whereSearchKeys = Object.keys(this._whereSearches);
            // we add a default index
            if (whereIndexKeys.length === 0) {
                this.where("createdAt", "<=", "+inf");
                whereIndexKeys = Object.keys(this._whereIndexes);
            }
            // aggregate in simple way
            if (aggregate === "count" && !groupBy &&
                whereIndexKeys.length === 1 && whereSearchKeys.length === 0) {
                return yield this._aggregateSimple();
            }
            const params = [
                whereIndexKeys.length,
                whereSearchKeys.length,
                this._limit,
                this._offset,
                this._tableName,
                aggregate,
                aggregateColumn,
                groupBy || "",
                "",
                "",
            ];
            // whereIndexes
            for (const [column, { min, max }] of Object.entries(this._whereIndexes)) {
                params.push(column);
                params.push(min);
                params.push(max);
            }
            // whereSearches
            for (const [column, { operator, value }] of Object.entries(this._whereSearches)) {
                params.push(column);
                params.push(operator);
                params.push(value);
            }
            const redis = yield this._getRedis();
            const performanceHelper = yield redisOrm_1.redisOrm.getPerformanceHelper(this._entityType);
            const commandResult = yield redis.commandAtomicMixedQuery([], params);
            const performanceResult = yield performanceHelper.getResult();
            let result = JSON.parse(commandResult);
            if (!groupBy) {
                result = result["*"] || 0;
            }
            return [result, performanceResult];
        });
    }
    _aggregateSimple() {
        return __awaiter(this, void 0, void 0, function* () {
            let count = 0;
            const whereIndexKeys = Object.keys(this._whereIndexes);
            const column = whereIndexKeys[0];
            const min = this._whereIndexes[column].min;
            const max = this._whereIndexes[column].max;
            const redis = yield this._getRedis();
            const performanceHelper = yield redisOrm_1.redisOrm.getPerformanceHelper(this._entityType);
            if (max === "+inf" && min === "-inf") {
                count = yield redis.zcard(redisOrm_1.redisOrm.getIndexStorageKey(this._tableName, column));
            }
            else {
                count = yield redis.zcount(redisOrm_1.redisOrm.getIndexStorageKey(this._tableName, column), min, max);
            }
            const performanceResult = yield performanceHelper.getResult();
            return [count, performanceResult];
        });
    }
    _getRedis() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield redisOrm_1.redisOrm.getRedis(this._entityType);
        });
    }
    _skipTracking() {
        if (!this._skipTrackingId) {
            this._skipTrackingId = Math.random().toString();
            return this._skipTrackingId;
        }
    }
    _resumeTracking(skipTrackingId) {
        if (skipTrackingId && this._skipTrackingId === skipTrackingId) {
            this._skipTrackingId = "";
        }
    }
}
exports.Query = Query;
