/// <reference types="ioredis" />
import { Query } from "./Query";
import { IArgvValues, IEvents, IIdType, IInstanceValues, IPerformanceResult } from "./types";
export declare class BaseEntity {
    static connect(table?: string): Promise<import("ioredis").Redis>;
    static query<T extends typeof BaseEntity>(this: T): Query<T>;
    static find<T extends typeof BaseEntity>(this: T, id: IIdType): Promise<[InstanceType<T> | undefined, IPerformanceResult]>;
    static findMany<T extends typeof BaseEntity>(this: T, ids: IIdType[]): Promise<[InstanceType<T>[], IPerformanceResult]>;
    static create<T extends typeof BaseEntity>(this: T, values: IArgvValues<InstanceType<T>>): InstanceType<T>;
    static all<T extends typeof BaseEntity>(this: T): Promise<[InstanceType<T>[], IPerformanceResult]>;
    static count(): Promise<[number, IPerformanceResult]>;
    static getRedis(): Promise<import("ioredis").Redis>;
    static resyncDb<T extends typeof BaseEntity>(this: T, table?: string): Promise<[boolean, IPerformanceResult]>;
    static truncate(className: string, table?: string): Promise<[number, IPerformanceResult]>;
    static getEvents<T extends typeof BaseEntity>(this: T): IEvents<InstanceType<T>>;
    static getSchemas(): {
        columnTypes: any;
        indexKeys: string[];
        uniqueKeys: string[];
        primaryKey: string;
        autoIncrementKey: string;
        table: string;
        tablePrefix: string;
        connection: string;
    };
    static export(file: string, table?: string): Promise<void>;
    static exportEntities<T extends BaseEntity>(entities: T[], file: string): Promise<void>;
    static import(file: string, skipSchemasCheck?: boolean, table?: string): Promise<void>;
    private _table;
    private _tableName;
    private _isNew;
    private _values;
    private _storageStrings;
    private _increments;
    constructor();
    get isNew(): boolean;
    get createdAt(): Date;
    set createdAt(value: Date);
    setTable(table: string): void;
    getTable(): string;
    getEntityId(): string;
    getValues<T extends BaseEntity>(this: T): IInstanceValues<T>;
    increment<T extends BaseEntity>(this: T, column: keyof T, value?: number): T;
    setValues<T extends BaseEntity>(this: T, values: IArgvValues<T>): T;
    save(): Promise<[this, IPerformanceResult]>;
    delete(): Promise<[this, IPerformanceResult]>;
    clone(): this;
    toJSON(): IInstanceValues<this>;
    protected assignStorageStrings(storageStrings: {
        [key: string]: string;
    }): void;
    private _get;
    private _set;
    private _saveInternal;
    private _deleteInternal;
    private _getChanges;
}
