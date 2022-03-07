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
Object.defineProperty(exports, "__esModule", { value: true });
exports.configLoader = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const RedisOrmOperationError_1 = require("./errors/RedisOrmOperationError");
class ConfigLoader {
    getConfigFile() {
        let configFiles = [`redisorm.default.json`];
        if (process.env.NODE_ENV) {
            const name = process.env.NODE_ENV || "default";
            configFiles.splice(0, 0, `redisorm.${name}.json`);
        }
        if (process.env.REDISORM_CONFIG_PATH) {
            configFiles = [process.env.REDISORM_CONFIG_PATH];
        }
        for (const configFile of configFiles) {
            try {
                const result = fs.accessSync(configFile, fs.constants.F_OK);
                return path.isAbsolute(configFile) ? configFile : path.join(process.cwd(), configFile);
            }
            catch (err) {
                //
            }
        }
        throw new RedisOrmOperationError_1.RedisOrmOperationError(`Config file cannot not be found on the paths: ${configFiles.join(", ")}.`);
    }
}
exports.configLoader = new ConfigLoader();
