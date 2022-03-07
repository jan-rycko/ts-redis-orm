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
exports.PerformanceHelper = void 0;
class PerformanceHelper {
    constructor(_redis, _options = {}) {
        this._redis = _redis;
        this._options = _options;
        this._timer = [0, 0];
        this._initCommandStats = {};
        this._initRedisInfo = {};
        //
    }
    static getEmptyResult() {
        return {
            executionTime: 0,
            commandStats: {},
            diffCommandStats: {},
            usedCpuSys: 0,
            diffUsedCpuSys: 0,
            usedCpuUser: 0,
            diffUsedCpuUser: 0,
            usedMemory: 0,
            diffUsedMemory: 0,
        };
    }
    snakeToCamel(value) {
        return value.replace(/(_\w)/g, (m) => m[1].toUpperCase());
    }
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this._options.skipTracking) {
                this._timer = process.hrtime();
                if (this._options.trackRedisInfo) {
                    const redisInfoAll = yield this._getRedisInfoAll();
                    this._initCommandStats = redisInfoAll[0];
                    this._initRedisInfo = redisInfoAll[1];
                }
            }
            return this;
        });
    }
    getResult() {
        return __awaiter(this, void 0, void 0, function* () {
            let commandStats = {};
            let redisInfo = {};
            let executionTime = 0;
            const diffCommandStats = this._initCommandStats;
            const diffRedisInfo = this._initRedisInfo;
            if (!this._options.skipTracking) {
                if (this._options.trackRedisInfo) {
                    const redisInfoAll = yield this._getRedisInfoAll();
                    commandStats = redisInfoAll[0];
                    redisInfo = redisInfoAll[1];
                    for (const key of Object.keys(this._initCommandStats)) {
                        diffCommandStats[key] = commandStats[key] - diffCommandStats[key];
                    }
                    for (const key of Object.keys(this._initRedisInfo)) {
                        diffRedisInfo[this.snakeToCamel(`diff_${key}`)] = redisInfo[key] - diffRedisInfo[key];
                    }
                }
                // execution time
                const diff = process.hrtime(this._timer);
                executionTime = diff[0] * 1000 + (diff[1] / 1000000);
            }
            return Object.assign(Object.assign({ executionTime,
                commandStats,
                diffCommandStats }, redisInfo), diffRedisInfo);
        });
    }
    _getRedisInfoAll() {
        return __awaiter(this, void 0, void 0, function* () {
            const commandStats = yield this._redis.info("all");
            const stats = commandStats.split(/\r?\n/).splice(1);
            const myCommandStats = {};
            const myRedisInfo = {};
            for (const stat of stats) {
                const matches = stat.match(/cmdstat_([a-z]*):calls=([0-9]*)/);
                if (matches) {
                    myCommandStats[matches[1]] = Number(matches[2]);
                }
                const usedMatches = stat.match(/(used_memory|used_cpu_sys|used_cpu_user):([0-9\.]*)/);
                if (usedMatches) {
                    myRedisInfo[this.snakeToCamel(usedMatches[1])] = Number(usedMatches[2]);
                }
            }
            return [myCommandStats, myRedisInfo];
        });
    }
}
exports.PerformanceHelper = PerformanceHelper;
