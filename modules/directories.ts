import * as path from 'path';
import * as shFiles from './shatabang_files';
import { Config } from './types';

export function populatesDirectories(config: Config): void {
    const filteredDir = path.join(config.storageDir, 'filtered');
    config.deletedDir = path.join(filteredDir, 'deleted');
    config.uploadDir = path.join(config.storageDir, 'upload');
    config.importDir = path.join(config.storageDir, 'import');

    config.dirs = {
        storage: config.storageDir,
        import: config.importDir,
        upload: config.uploadDir,
        cache: config.cacheDir,
        filtered: filteredDir,
        info: path.join(config.cacheDir, 'info'),
        deleted: config.deletedDir,
        duplicates: path.join(filteredDir, 'duplicates'),
        unknown: path.join(filteredDir, 'unknown')
    };
}

export function checkDirectories(config: Config): void {
    // Check that directories exists
    if (!config.dirs) return;
    
    Object.values(config.dirs).forEach((directory: string) => {
        if (!shFiles.exists(directory)) {
            console.log("Directory dir does not exists. Trying to create it.", directory);
            shFiles.mkdirsSync(directory);
        }
    });
}
