import { BaseEntity } from "./BaseEntity";
import { IEvents, IEventsType } from "./types";
declare class EventEmitters {
    private _eventEmitters;
    getEventEmitter<T extends typeof BaseEntity>(target: T): IEvents<InstanceType<T>>;
    emit<T extends BaseEntity>(eventType: IEventsType, entity: T): void;
}
export declare const eventEmitters: EventEmitters;
export {};
