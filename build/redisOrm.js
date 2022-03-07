"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.schemaJsonReplacer = exports.redisOrm = void 0;
const fs = __importStar(require("fs"));
const ioredis_1 = __importDefault(require("ioredis"));
const path = __importStar(require("path"));
const configLoader_1 = require("./configLoader");
const RedisOrmDecoratorError_1 = require("./errors/RedisOrmDecoratorError");
const PerformanceHelper_1 = require("./helpers/PerformanceHelper");
const IOREDIS_ERROR_RETRY_DELAY = 1000;
const IOREDIS_CONNECT_TIMEOUT = 10000;
const IOREDIS_REIGSTER_LUA_DELAY = 100;
// Notes: Schemas is similar to entitySchemas, schemas refers to entire table structure while entityColumns refer to decorator structure
class RedisOrm {
    constructor() {
        this._entityMetas = new Map();
        this._entityColumns = new Map();
        this._entitySchemasJsons = new Map(); // cache for faster JSON.stringify
        // endregion
    }
    // region public methods: set
    /** @internal */
    addEntity(target, entityMeta) {
        if (!this._entityMetas.has(target)) {
            this._entityMetas.set(target, entityMeta);
        }
    }
    /** @internal */
    addColumn(target, column, entityColumn) {
        let columns = this._entityColumns.get(target);
        if (!columns) {
            columns = {};
            this._entityColumns.set(target, columns);
        }
        columns[column] = entityColumn;
    }
    // endregion
    // region public methods: get
    getConnectionConfig(target) {
        const connection = this.getConnection(target);
        return this.getConnectionConfigByConnection(connection);
    }
    getConnectionConfigByConnection(connection) {
        if (!this._connectionConfigs) {
            const configFile = configLoader_1.configLoader.getConfigFile();
            const rawData = fs.readFileSync(configFile);
            const connectionConfigs = JSON.parse(rawData.toString());
            // add retry add retry strategy if needed to trigger connect error
            for (const key of Object.keys(connectionConfigs)) {
                const connectionConfig = connectionConfigs[key];
                const maxConnectRetry = connectionConfig.maxConnectRetry;
                if (maxConnectRetry) {
                    const connectTimeout = connectionConfig.connectTimeout || IOREDIS_CONNECT_TIMEOUT;
                    connectionConfig.retryStrategy = (times) => {
                        return times > maxConnectRetry ? null : IOREDIS_ERROR_RETRY_DELAY;
                    };
                }
            }
            this._connectionConfigs = connectionConfigs;
        }
        if (!(connection in this._connectionConfigs)) {
            throw new RedisOrmDecoratorError_1.RedisOrmDecoratorError(`Invalid connection: ${connection}. Please check ${configLoader_1.configLoader.getConfigFile()}`);
        }
        return this._connectionConfigs[connection];
    }
    getEntityMeta(target) {
        return this._entityMetas.get(target);
    }
    getDefaultTable(target) {
        return this.getEntityMeta(target).table;
    }
    getTablePrefix(target) {
        return this.getEntityMeta(target).tablePrefix;
    }
    getConnection(target) {
        return this.getEntityMeta(target).connection;
    }
    hasPrimaryKey(target) {
        const entityColumns = this.getEntityColumns(target);
        return Object.entries(entityColumns).some(x => x[1].primary);
    }
    getPrimaryKey(target) {
        return "id";
    }
    getAutoIncrementKey(target) {
        const entityColumns = this.getEntityColumns(target);
        const filteredEntityColumns = Object.entries(entityColumns).find(x => x[1].primary && x[1].autoIncrement);
        return filteredEntityColumns ? filteredEntityColumns[0] : "";
    }
    getIndexKeys(target) {
        const entityColumns = this.getEntityColumns(target);
        return Object.entries(entityColumns).filter(x => x[1].index).map(x => x[0]);
    }
    getUniqueKeys(target) {
        const entityColumns = this.getEntityColumns(target);
        return Object.entries(entityColumns).filter(x => x[1].unique).map(x => x[0]);
    }
    getEntityColumns(target) {
        return this._entityColumns.get(target) || {};
    }
    getSchemasJson(target) {
        if (!this._entitySchemasJsons.has(target)) {
            const entityColumns = this.getEntityColumns(target);
            const keys = Object.keys(entityColumns).sort();
            const sortedEntityColumns = keys.reduce((a, b) => Object.assign(a, { [b]: entityColumns[b] }), {});
            this._entitySchemasJsons.set(target, JSON.stringify(sortedEntityColumns, schemaJsonReplacer));
        }
        return this._entitySchemasJsons.get(target);
    }
    getEntityColumn(target, column) {
        const entityColumn = this.getEntityColumns(target);
        return entityColumn[column];
    }
    getColumns(target) {
        const entityColumns = this._entityColumns.get(target) || {};
        return Object.keys(entityColumns);
    }
    // endregion
    // region public methods: conditions
    isIndexKey(target, column) {
        const keys = this.getIndexKeys(target);
        return keys.includes(column);
    }
    isValidColumn(target, column) {
        const keys = exports.redisOrm.getColumns(target);
        return keys.includes(column);
    }
    isSearchableColumn(target, column) {
        const entityColumns = exports.redisOrm.getEntityColumns(target);
        return (column in entityColumns && [String, Number, Date, Boolean].includes(entityColumns[column].type));
    }
    isUniqueKey(target, column) {
        const keys = exports.redisOrm.getUniqueKeys(target);
        return keys.includes(column);
    }
    isPrimaryKey(target, column) {
        const key = exports.redisOrm.getPrimaryKey(target);
        return key === column;
    }
    isSortableColumn(target, column) {
        const entityColumns = exports.redisOrm.getEntityColumn(target, column);
        return entityColumns.type === Number || entityColumns.type === Boolean || entityColumns.type === Date;
    }
    isNumberColumn(target, column) {
        const entityColumns = exports.redisOrm.getEntityColumn(target, column);
        return entityColumns.type === Number;
    }
    isDateColumn(target, column) {
        const entityColumns = exports.redisOrm.getEntityColumn(target, column);
        return entityColumns.type === Date;
    }
    // endregion
    // region redis
    getRedis(target, registerRedis = true) {
        return __awaiter(this, void 0, void 0, function* () {
            const entityMeta = this.getEntityMeta(target);
            let redisContainer = entityMeta.redisMaster;
            if (!redisContainer) {
                const connectionConfig = this.getConnectionConfig(target);
                redisContainer = {
                    redis: new ioredis_1.default(connectionConfig),
                    connecting: false,
                    ready: false,
                    schemaErrors: [],
                    error: null,
                };
                entityMeta.redisMaster = redisContainer;
            }
            if (registerRedis) {
                yield this._registerLuaLock(target, redisContainer);
            }
            return redisContainer.redis;
        });
    }
    compareSchemas(target, tableName) {
        return __awaiter(this, void 0, void 0, function* () {
            let errors = [];
            try {
                const remoteSchemas = yield this.getRemoteSchemas(target, tableName);
                if (remoteSchemas) {
                    // we do such indirect case is to convert primitive types to strings
                    const clientSchemasJson = this.getSchemasJson(target);
                    const clientSchemas = JSON.parse(clientSchemasJson);
                    errors = this._validateSchemas(clientSchemas, remoteSchemas);
                }
            }
            catch (err) {
                // just throw directly
                throw err;
            }
            return errors;
        });
    }
    getRemoteSchemas(target, tableName) {
        return __awaiter(this, void 0, void 0, function* () {
            const redis = yield exports.redisOrm.getRedis(target);
            const storageKey = this.getSchemasStorageKey();
            const remoteSchemasString = yield redis.hget(storageKey, tableName);
            if (remoteSchemasString) {
                return JSON.parse(remoteSchemasString);
            }
            return null;
        });
    }
    // endregion
    // region public methods: storage key
    getEntityStorageKey(tableName, entityId) {
        return `entity:${tableName}:${entityId}`;
    }
    getIndexStorageKey(tableName, column) {
        return `index:${tableName}:${column}`;
    }
    getUniqueStorageKey(tableName, column) {
        return `unique:${tableName}:${column}`;
    }
    getSchemasStorageKey() {
        return `meta:schemas`;
    }
    // endregion
    // region operations
    getEntityTypes() {
        return [...this._entityMetas.keys()];
    }
    getRemoteSchemasList(connection = "default") {
        return __awaiter(this, void 0, void 0, function* () {
            const schemasList = {};
            const connectionConfig = exports.redisOrm.getConnectionConfigByConnection(connection);
            if (connectionConfig) {
                const redis = new ioredis_1.default(connectionConfig);
                const storageKey = exports.redisOrm.getSchemasStorageKey();
                const result = yield redis.hgetall(storageKey);
                for (const [table, schemasString] of Object.entries(result)) {
                    schemasList[table] = JSON.parse(schemasString);
                }
            }
            return schemasList;
        });
    }
    getPerformanceHelper(target, skipTracking) {
        return __awaiter(this, void 0, void 0, function* () {
            // remove everything
            const redis = yield exports.redisOrm.getRedis(target);
            const connectionConfig = this.getConnectionConfig(target);
            const performanceHelper = new PerformanceHelper_1.PerformanceHelper(redis, { trackRedisInfo: connectionConfig.trackRedisInfo, skipTracking });
            yield performanceHelper.start();
            return performanceHelper;
        });
    }
    // endregion
    // region private methods
    _registerLuaLock(target, redisContainer) {
        return __awaiter(this, void 0, void 0, function* () {
            // allow multiple call to registerLua for same model if it's not completed registering yet
            while (redisContainer.connecting) {
                yield new Promise(resolve => setTimeout(resolve, IOREDIS_REIGSTER_LUA_DELAY));
            }
            if (!redisContainer.ready) {
                redisContainer.connecting = true;
                // register lua
                try {
                    yield this._registerLua(target, redisContainer);
                }
                catch (err) {
                    redisContainer.error = err;
                }
                redisContainer.ready = true;
                redisContainer.connecting = false;
            }
        });
    }
    _registerLua(target, redisContainer) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const luaShared = fs.readFileSync(path.join(__dirname, "../lua/shared.lua"), { encoding: "utf8" });
                const lua1 = fs.readFileSync(path.join(__dirname, "../lua/atomicResyncDb.lua"), { encoding: "utf8" });
                yield redisContainer.redis.defineCommand("commandAtomicResyncDb", { numberOfKeys: 0, lua: luaShared + lua1 });
                const lua2 = fs.readFileSync(path.join(__dirname, "../lua/atomicMixedQuery.lua"), { encoding: "utf8" });
                yield redisContainer.redis.defineCommand("commandAtomicMixedQuery", { numberOfKeys: 0, lua: luaShared + lua2 });
                const lua3 = fs.readFileSync(path.join(__dirname, "../lua/atomicSave.lua"), { encoding: "utf8" });
                yield redisContainer.redis.defineCommand("commandAtomicSave", { numberOfKeys: 0, lua: luaShared + lua3 });
                const lua4 = fs.readFileSync(path.join(__dirname, "../lua/atomicDelete.lua"), { encoding: "utf8" });
                yield redisContainer.redis.defineCommand("commandAtomicDelete", { numberOfKeys: 0, lua: luaShared + lua4 });
                const lua5 = fs.readFileSync(path.join(__dirname, "../lua/atomicTruncate.lua"), { encoding: "utf8" });
                yield redisContainer.redis.defineCommand("commandAtomicTruncate", { numberOfKeys: 0, lua: luaShared + lua5 });
            }
            catch (err) {
                // just throw directly
                throw err;
            }
        });
    }
    _validateSchemas(clientSchemas, remoteSchemas) {
        const errors = [];
        // check remote schemas has all keys in client schemas
        for (const column of Object.keys(clientSchemas)) {
            if (!(column in remoteSchemas)) {
                errors.push(`Column: ${column} does not exist in remote schemas`);
                continue;
            }
            const clientEntityColumn = clientSchemas[column];
            const remoteEntityColumn = remoteSchemas[column];
            if (clientEntityColumn.type !== remoteEntityColumn.type) {
                errors.push(`Incompatible type on column: ${column}, current value: ${clientEntityColumn.type}, remove value: ${remoteEntityColumn.type}`);
            }
            if (clientEntityColumn.index !== remoteEntityColumn.index) {
                errors.push(`Incompatible index on column: ${column}, current value: ${clientEntityColumn.index}, remove value: ${remoteEntityColumn.index}`);
            }
            if (clientEntityColumn.unique !== remoteEntityColumn.unique) {
                errors.push(`Incompatible unique on column: ${column}, current value: ${clientEntityColumn.unique}, remove value: ${remoteEntityColumn.unique}`);
            }
            if (clientEntityColumn.autoIncrement !== remoteEntityColumn.autoIncrement) {
                errors.push(`Incompatible autoIncrement on column: ${column}, current value: ${clientEntityColumn.autoIncrement}, remove value: ${remoteEntityColumn.autoIncrement}`);
            }
            if (clientEntityColumn.primary !== remoteEntityColumn.primary) {
                errors.push(`Incompatible primary on column: ${column}, current value: ${clientEntityColumn.primary}, remove value: ${remoteEntityColumn.primary}`);
            }
        }
        // check client schemas has all keys in remote schemas
        for (const column of Object.keys(remoteSchemas)) {
            if (!(column in clientSchemas)) {
                errors.push(`Column: ${column} does not exist in current schemas`);
            }
        }
        return errors;
    }
    _openFile(file) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                fs.readFile(file, "utf8", (err, text) => {
                    if (err) {
                        return reject(err);
                    }
                    else {
                        resolve(text);
                    }
                });
            });
        });
    }
}
exports.redisOrm = new RedisOrm();
function schemaJsonReplacer(key, value) {
    if (key === "type" && [String, Number, Boolean, Date, Array, Object].includes(value)) {
        return value.name;
    }
    return value;
}
exports.schemaJsonReplacer = schemaJsonReplacer;
