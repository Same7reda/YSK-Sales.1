import { get, set } from './idb';

const DIRECTORY_HANDLE_KEY = 'directory_handle';

export async function saveDirectoryHandle(handle: FileSystemDirectoryHandle): Promise<void> {
    await set(DIRECTORY_HANDLE_KEY, handle);
}

export async function loadDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
    return await get<FileSystemDirectoryHandle>(DIRECTORY_HANDLE_KEY);
}

// FIX: Define a local interface for the permission descriptor to satisfy TypeScript.
interface FileSystemHandlePermissionDescriptor {
    mode: 'read' | 'readwrite';
}

export async function verifyPermission(handle: FileSystemDirectoryHandle, readWrite: boolean): Promise<boolean> {
    const options: FileSystemHandlePermissionDescriptor = readWrite ? { mode: 'readwrite' } : { mode: 'read' };
    // FIX: Cast handle to `any` to access experimental API methods `queryPermission` and `requestPermission`,
    // which may not exist in the standard TypeScript DOM library, thus preventing type errors.
    if ((await (handle as any).queryPermission(options)) === 'granted') {
        return true;
    }
    if ((await (handle as any).requestPermission(options)) === 'granted') {
        return true;
    }
    return false;
}

export async function readFile(dirHandle: FileSystemDirectoryHandle, fileName: string): Promise<any | null> {
    try {
        const fileHandle = await dirHandle.getFileHandle(fileName);
        const file = await fileHandle.getFile();
        const content = await file.text();
        return JSON.parse(content);
    } catch (e: any) {
        if (e.name === 'NotFoundError') {
            return null; // File doesn't exist, which is fine
        }
        console.error(`Error reading file ${fileName}:`, e);
        return null;
    }
}

export async function writeFile(dirHandle: FileSystemDirectoryHandle, fileName: string, data: any): Promise<void> {
    try {
        const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(JSON.stringify(data, null, 2));
        await writable.close();
    } catch (e) {
        console.error(`Error writing file ${fileName}:`, e);
    }
}

export async function listFileNames(dirHandle: FileSystemDirectoryHandle): Promise<string[]> {
    const fileNames: string[] = [];
    for await (const entry of dirHandle.values()) {
        if (entry.kind === 'file' && entry.name.endsWith('.json')) {
            fileNames.push(entry.name);
        }
    }
    return fileNames;
}