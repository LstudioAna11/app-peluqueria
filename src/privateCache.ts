// Only application data, never authentication tokens, is routed through this cache.
const PRIVATE_KEYS = new Set([
  'lst_maintenance_pending',
  'lst_raffle_pending',
  'lst_club_pending', 'lst_memories_pending', 'lst_business_config', 'lst_studio_clientes_ids', 'lst_studio_appointments',
  'lst_feedback_list', 'lst_booking_attempts', 'lst_lost_demands_detailed',
  'lst_time_blocks', 'lst_holidays_list', 'lst_traffic_events',
  'lst_clientas_respaldo_20261028',
]);
export const isPrivateCacheKey = (name: string): boolean => PRIVATE_KEYS.has(name)
  || (name.endsWith('_original_before_access_fix') && PRIVATE_KEYS.has(name.slice(0, -'_original_before_access_fix'.length)));
const bytes64 = (bytes: Uint8Array): string => {
  let value = ''; for (const byte of bytes) value += String.fromCharCode(byte);
  return btoa(value);
};
const from64 = (value: string): Uint8Array => Uint8Array.from(atob(value), c => c.charCodeAt(0));
const buffer = (bytes: Uint8Array): ArrayBuffer => new Uint8Array(bytes).buffer;

export class ProtectedCache {
  private values = new Map<string, string>();
  private encryptionKey: CryptoKey | null = null;
  private queue: Promise<void> = Promise.resolve();
  private failed = new Map<string, string | null>();
  private failure: Error | null = null;
  private epoch = 0;
  readonly prefix: string;
  constructor(private raw: Storage, private online: boolean, namespace: string,
    private reportError: (message: string) => void = () => {}) {
    this.prefix = 'lst_private_vault_v1:' + namespace + ':';
  }
  get ready(): boolean { return this.encryptionKey !== null; }
  private aad(name: string): ArrayBuffer { return buffer(new TextEncoder().encode(this.prefix + name)); }
  private async encrypt(name: string, value: string, key: CryptoKey): Promise<string> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const cipher = await crypto.subtle.encrypt({name: 'AES-GCM', iv: buffer(iv), additionalData: this.aad(name)}, key, buffer(new TextEncoder().encode(value)));
    return JSON.stringify({version: 1, iv: bytes64(iv), data: bytes64(new Uint8Array(cipher))});
  }
  private async decrypt(name: string, value: string, key: CryptoKey): Promise<string> {
    const envelope = JSON.parse(value);
    if (envelope?.version !== 1 || typeof envelope.iv !== 'string' || typeof envelope.data !== 'string') throw new Error('Formato de datos locales no válido.');
    const iv = from64(envelope.iv);
    if (iv.length !== 12) throw new Error('Protección de datos locales no válida.');
    const result = await crypto.subtle.decrypt({name: 'AES-GCM', iv: buffer(iv), additionalData: this.aad(name)}, key, buffer(from64(envelope.data)));
    return new TextDecoder().decode(result);
  }
  async unlock(hexKey: string): Promise<void> {
    if (!this.online || this.ready) return;
    if (!/^[a-f0-9]{64}$/.test(hexKey)) throw new Error('La clave de protección recibida no es válida.');
    const bytes = Uint8Array.from(hexKey.match(/../g)!, value => parseInt(value, 16));
    const key = await crypto.subtle.importKey('raw', buffer(bytes), 'AES-GCM', false, ['encrypt', 'decrypt']);
    const values = new Map<string, string>(), legacy = new Map<string, string>();
    const names = Array.from({length: this.raw.length}, (_, index) => this.raw.key(index)).filter((name): name is string => name !== null);
    for (const name of names) {
      if (name.startsWith(this.prefix)) {
        const plainName = name.slice(this.prefix.length);
        if (!isPrivateCacheKey(plainName)) continue;
        const stored = this.raw.getItem(name);
        if (stored !== null) values.set(plainName, await this.decrypt(plainName, stored, key));
      } else if (isPrivateCacheKey(name)) {
        const value = this.raw.getItem(name); if (value !== null) legacy.set(name, value);
      }
    }
    // Preserve conflicting versions for review instead of choosing one silently.
    for (const [name, value] of legacy) {
      if (values.has(name) && values.get(name) !== value) throw new Error('Hay dos versiones de datos locales. Cierra las otras pestañas y contacta con el Studio antes de continuar.');
      values.set(name, value);
    }
    // Write and verify each encrypted record before removing its plaintext copy.
    for (const [name, value] of legacy) {
      const encrypted = await this.encrypt(name, value, key);
      this.raw.setItem(this.prefix + name, encrypted);
      if (this.raw.getItem(this.prefix + name) !== encrypted) throw new Error('No se pudo guardar la protección local.');
      if (this.raw.getItem(name) !== value) throw new Error('Los datos cambiaron en otra pestaña. Ciérrala y vuelve a intentarlo.');
      this.raw.removeItem(name);
      if (this.raw.getItem(name) !== null) throw new Error('No se pudo retirar la copia local sin protección.');
    }
    this.values = values; this.encryptionKey = key;
  }
  getItem(name: string): string | null {
    if (!this.online || !isPrivateCacheKey(name)) return this.raw.getItem(name);
    return this.values.get(name) ?? null;
  }
  setItem(name: string, value: string): void {
    if (!this.online || !isPrivateCacheKey(name)) { this.raw.setItem(name, value); return; }
    this.values.set(name, String(value));
    if (this.encryptionKey) this.enqueue(name, String(value), this.encryptionKey);
    // Client data remains in memory; a client never receives the admin cache key.
  }
  removeItem(name: string): void {
    if (!this.online || !isPrivateCacheKey(name)) { this.raw.removeItem(name); return; }
    this.values.delete(name);
    if (this.encryptionKey) this.enqueue(name, null, this.encryptionKey);
  }
  private enqueue(name: string, value: string | null, key: CryptoKey): void {
    const epoch = this.epoch;
    this.queue = this.queue.then(async () => {
      try {
        if (value === null) this.raw.removeItem(this.prefix + name);
        else this.raw.setItem(this.prefix + name, await this.encrypt(name, value, key));
        if (epoch === this.epoch) {
          this.failed.delete(name);
          if (!this.failed.size) this.failure = null;
        }
      } catch (error) {
        if (epoch !== this.epoch) return;
        this.failed.set(name, value);
        this.failure = error instanceof Error ? error : new Error('No se pudieron guardar los datos locales.');
        this.reportError('No se han guardado todos los datos locales protegidos. No cierres esta pestaña; libera espacio y vuelve a intentarlo.');
      }
    });
  }
  async flush(): Promise<void> {
    await this.queue;
    if (this.encryptionKey && this.failed.size) {
      for (const [name, value] of this.failed) this.enqueue(name, value, this.encryptionKey);
      await this.queue;
    }
    if (this.failure) throw this.failure;
  }
  lock(): void {
    this.epoch++; this.encryptionKey = null; this.values.clear(); this.failed.clear(); this.failure = null;
  }
}
