declare class Parser {
    parseStorageStringToValue(type: any, storageString: string): any;
    parseValueToStorageString(type: any, value: any): string;
    private _parseDate;
}
export declare const parser: Parser;
export {};
