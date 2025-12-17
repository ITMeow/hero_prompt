import { SnowflakeIdv1 } from 'simple-flakeid';
import { v4 as uuidv4 } from 'uuid';

export function getUuid(): string {
  return uuidv4();
}

export function getUniSeq(prefix: string = ''): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 8);

  return `${prefix}${randomPart}${timestamp}`;
}

export function getNonceStr(length: number): string {
  const characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const charactersLength = characters.length;

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charactersLength);
    result += characters[randomIndex];
  }

  return result;
}

/**
 * get snow id
 */
export function getSnowId(): string {
  const workerId = Math.floor(Math.random() * 1024);
  const gen = new SnowflakeIdv1({ workerId });
  const snowId = gen.NextId();

  const suffix = Math.floor(Math.random() * 100)
    .toString()
    .padStart(2, '0');

  return `${snowId}${suffix}`;
}
