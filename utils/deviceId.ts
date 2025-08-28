import { get, set } from '../hooks/idb';

const DEVICE_ID_KEY = 'app_device_id';

function generateId(): string {
    const randomPart = Math.random().toString(36).substring(2, 10);
    const timePart = Date.now().toString(36);
    return `dev_${timePart}_${randomPart}`;
}

export async function getDeviceId(): Promise<string> {
    let deviceId = await get<string>(DEVICE_ID_KEY);
    if (!deviceId) {
        deviceId = generateId();
        await set(DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
}
