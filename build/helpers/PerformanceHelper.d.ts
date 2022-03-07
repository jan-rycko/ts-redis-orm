import IORedis from "ioredis";
import { IPerformanceResult } from "../types";
declare type IOptions = {
    trackRedisInfo?: boolean;
    skipTracking?: boolean;
};
export declare class PerformanceHelper {
    private _redis;
    private _options;
    static getEmptyResult(): IPerformanceResult;
    private _timer;
    private _initCommandStats;
    private _initRedisInfo;
    constructor(_redis: IORedis.Redis, _options?: IOptions);
    snakeToCamel(value: string): string;
    start(): Promise<this>;
    getResult(): Promise<IPerformanceResult>;
    private _getRedisInfoAll;
}
export {};
