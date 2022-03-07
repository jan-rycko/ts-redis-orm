import "reflect-metadata";
import { IEntityColumnBase } from "../types";
export declare function Column(entityColumn?: {
    [P in keyof IEntityColumnBase]?: IEntityColumnBase[P];
}): (target: object, column: string) => void;
