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
exports.entityExporter = void 0;
const fs_1 = __importDefault(require("fs"));
const readline = __importStar(require("readline"));
const redisOrm_1 = require("./redisOrm");
class EntityExporter {
    exportEntities(entityType, entities, file) {
        return new Promise((resolve, reject) => {
            const writeStream = fs_1.default.createWriteStream(file, { encoding: "utf-8" });
            // write the meta
            const meta = {
                createdAt: new Date(),
                class: entityType.name,
                tablePrefix: redisOrm_1.redisOrm.getTablePrefix(entityType),
                table: redisOrm_1.redisOrm.getDefaultTable(entityType),
                schemas: redisOrm_1.redisOrm.getSchemasJson(entityType),
                total: entities.length,
            };
            writeStream.write(JSON.stringify(meta, redisOrm_1.schemaJsonReplacer) + "\r\n");
            // write all the models
            for (const entity of entities) {
                writeStream.write(JSON.stringify(entity.getValues()) + "\r\n");
            }
            writeStream.on("error", err => {
                reject(err);
            });
            writeStream.on("finish", () => {
                resolve();
            });
            writeStream.end();
        });
    }
    import(entityType, file, skipSchemasCheck, table) {
        return __awaiter(this, void 0, void 0, function* () {
            const readStream = fs_1.default.createReadStream(file, { encoding: "utf8" });
            const r1 = readline.createInterface({ input: readStream });
            return new Promise((resolve, reject) => {
                const valuesList = [];
                let meta = null;
                let closed = false;
                const saveModelPromise = null;
                let promiseRunning = false;
                let currentError = null;
                function checkComplete() {
                    if (closed) {
                        r1.removeAllListeners();
                        r1.close();
                        readStream.close();
                        if (!promiseRunning) {
                            resolve(true);
                        }
                    }
                }
                function checkError() {
                    if (currentError) {
                        r1.removeAllListeners();
                        r1.close();
                        readStream.close();
                        if (!promiseRunning) {
                            reject(currentError);
                        }
                    }
                }
                function saveEntity() {
                    if (!promiseRunning) {
                        promiseRunning = true;
                        asyncSaveModel().then(() => {
                            promiseRunning = false;
                            checkError();
                            checkComplete();
                            r1.resume();
                        }).catch(err => {
                            promiseRunning = false;
                            currentError = err;
                            checkError();
                        });
                    }
                }
                function asyncSaveModel() {
                    return __awaiter(this, void 0, void 0, function* () {
                        while (valuesList.length > 0) {
                            const values = valuesList.shift();
                            try {
                                const entity = new entityType();
                                entity.setTable(table);
                                entity.setValues(values);
                                yield entity.save();
                            }
                            catch (err) {
                                err.message = `data: ${JSON.stringify(values)}\r\n` + err.message;
                                throw err;
                            }
                        }
                    });
                }
                r1.on("line", data => {
                    r1.pause();
                    // the first line will be meta
                    if (!meta) {
                        try {
                            meta = JSON.parse(data);
                            r1.resume();
                        }
                        catch (err) {
                            err.message = `data: ${data}\r\n` + err.message;
                            currentError = err;
                            checkError();
                        }
                        if (!skipSchemasCheck) {
                            const className = entityType.name;
                            const clientSchemas = redisOrm_1.redisOrm.getSchemasJson(entityType);
                            if (meta.class !== className) {
                                const err = new Error();
                                err.message = `Class name "${className}" does not match with the import file "${meta.class}"`;
                                currentError = err;
                                checkError();
                            }
                            else if (meta.schemas !== clientSchemas) {
                                const err = new Error();
                                err.message = `Current Schemas "${clientSchemas}" does not match with the import file "${meta.schemas}"`;
                                currentError = err;
                                checkError();
                            }
                        }
                    }
                    else {
                        try {
                            const values = JSON.parse(data);
                            valuesList.push(values);
                            saveEntity();
                        }
                        catch (err) {
                            err.message = `data: ${data}\r\n` + err.message;
                            currentError = err;
                            checkError();
                        }
                    }
                });
                r1.on("error", err => {
                    currentError = err;
                    checkError();
                });
                r1.on("close", () => {
                    closed = true;
                    checkComplete();
                });
            });
        });
    }
}
exports.entityExporter = new EntityExporter();
