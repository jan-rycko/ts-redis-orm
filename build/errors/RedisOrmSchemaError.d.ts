import { RedisOrmError } from "./RedisOrmError";
export declare class RedisOrmSchemaError extends RedisOrmError {
    readonly errors: string[];
    constructor(message: string, errors: string[]);
}
