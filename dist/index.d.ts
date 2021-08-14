import { RollupPluginSassOptions } from "./types";
export default function plugin(options?: RollupPluginSassOptions): {
    name: string;
    intro(): string;
    transform(code: any, file: any): Promise<any>;
    generateBundle(generateOptions: any, bundle: any, isWrite: any): Promise<any>;
};
