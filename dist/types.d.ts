import { types } from 'sass';
export interface IdCodePair {
    id?: string;
    content?: string;
}
export declare type RollupPluginSassOutputFn = (styles: string, styleNodes: IdCodePair[]) => any;
export declare type RollupPluginSassProcessorFn<T = string | {
    css: string;
}> = (styles: string, id: string) => Promise<T> | T;
export interface RollupPluginSassOptions {
    exclude?: string | string[];
    include?: string | string[];
    insert?: boolean;
    options?: SassOptions;
    processor?: RollupPluginSassProcessorFn;
    output?: boolean | string | RollupPluginSassOutputFn;
    runtime?: any;
}
export interface SassImporterResult {
    file?: string;
    contents?: string;
}
export declare type SassDoneFn<T extends SassImporterResult = SassImporterResult> = (result: T) => void | T;
export declare type SassImporter<T extends SassImporterResult = SassImporterResult> = (url: string, prev: string, done: SassDoneFn<T>) => void | T;
export interface SassFunctionsObject {
    [index: string]: types.Color | types.Number | types.String | types.List | types.Map | types.Null;
}
export interface SassOptions {
    data?: string;
    file?: string;
    functions?: SassFunctionsObject;
    importer?: SassImporter | SassImporter[];
    includePaths?: string[];
    indentType?: 'space' | 'tab';
    indentWidth?: number;
    indentedSyntax?: boolean;
    linefeed?: string;
    omitSourceMapUrl?: boolean;
    outFile?: string;
    outputStyle?: 'compressed' | 'expanded';
    sourceMapContents?: boolean;
    sourceMapEmbed?: boolean;
    sourceMapRoot?: string;
    sourceMap?: boolean | string | undefined;
}
