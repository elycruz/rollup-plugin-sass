import { RollupAssetInfo, RollupChunkInfo, RollupPluginSassOptions } from "./types";
import { Plugin } from 'rollup';
export interface RollupPluginSass {
    intro(): any;
    transform(code: string, file: string): Promise<any>;
    generateBundle(generateOptions: {
        file?: string;
    }, bundle: {
        [fileName: string]: RollupAssetInfo | RollupChunkInfo;
    }, isWrite: boolean): Promise<any>;
}
export default function plugin(options?: RollupPluginSassOptions): Plugin;
