import * as IORedis from "ioredis";
import { BaseEntity } from "./BaseEntity";
export declare type ConnectionConfig = {
    host: string;
    port: number;
    connectTimeout: number;
    db: number;
    trackRedisInfo: boolean;
    showFriendlyErrorStack: boolean;
    maxConnectRetry: number;
    retryStrategy?: (times: number) => number;
};
export declare type IPerformanceResult = {
    executionTime: number;
    commandStats: any;
    diffCommandStats: any;
    usedCpuSys: number;
    diffUsedCpuSys: number;
    usedCpuUser: number;
    diffUsedCpuUser: number;
    usedMemory: number;
    diffUsedMemory: number;
};
export declare type IEntityColumns = {
    [key: string]: IEntityColumn;
};
export interface IEntityColumnBase {
    autoIncrement: boolean;
    index: boolean;
    unique: boolean;
}
export interface IEntityColumn extends IEntityColumnBase {
    primary: boolean;
    type: any;
}
export interface IEntityBaseMeta {
    table: string;
    tablePrefix: string;
    connection: string;
}
export interface IEntityMeta extends IEntityBaseMeta {
    redisMaster: IRedisContainer | null;
}
export interface IRedisContainer {
    redis: IORedis.Redis;
    connecting: boolean;
    ready: boolean;
    schemaErrors: string[];
    error: Error | null;
}
export declare type IIndexOperator = ">" | ">=" | "<" | "<=" | "=";
export declare type IStringOperator = "=" | "!=" | "like";
export declare type IValueType = string | number | boolean | Date | null;
export declare type IUniqueValueType = string | number;
export declare type IDateValueType = Date | number;
export declare type IOrder = "asc" | "desc";
export declare type IAggregateObject = {
    [key: string]: number;
};
export declare type IWhereStringType = {
    operator: IStringOperator;
    value: string;
};
export declare type IWhereIndexType = {
    min: string;
    max: string;
};
export declare type ISaveResult = {
    error: string;
    entityId: string;
    autoIncrementKeyValue: number;
    increments: number[];
};
export declare type IArgvColumns<T> = Exclude<keyof T, keyof BaseEntity> | "createdAt";
export declare type IArgvColumn<T extends typeof BaseEntity> = IArgvColumns<InstanceType<T>>;
export declare type IArgvValues<T> = {
    [P in Exclude<keyof T, keyof BaseEntity>]?: T[P];
} | {
    createdAt: Date;
};
export declare type IInstanceValues<T> = {
    [P in Exclude<keyof T, keyof BaseEntity>]: T[P];
} & {
    createdAt: Date;
};
export declare type IIdType = number | string;
export declare type IEventsType = "create" | "update" | "delete";
export interface IEvents<T> {
    on(type: IEventsType, callback: (entity: T) => void): this;
    addListener(type: IEventsType, callback: (entity: T) => void): this;
    removeListener(type: IEventsType, callback: (entity: T) => void): this;
    once(type: IEventsType, callback: (entity: T) => void): this;
    off(type: IEventsType, callback: (entity: T) => void): this;
    emit(type: IEventsType, entity: T): void;
}
