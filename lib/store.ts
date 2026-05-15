import { ApiKey } from './types'

// In-memory fallback for local dev without KV
const memStore: Record<string, ApiKey> = {}

function isKVAvailable() {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
}

async function getKV() {
  if (!isKVAvailable()) return null
  const { kv } = await import('@vercel/kv')
  return kv
}

export async function saveKey(apiKey: ApiKey): Promise<void> {
  const kv = await getKV()
  if (kv) {
    await kv.set(`key:${apiKey.id}`, JSON.stringify(apiKey))
    await kv.sadd('keys:all', apiKey.id)
  } else {
    memStore[apiKey.id] = apiKey
  }
}

export async function getKey(id: string): Promise<ApiKey | null> {
  const kv = await getKV()
  if (kv) {
    const raw = await kv.get<string>(`key:${id}`)
    return raw ? JSON.parse(raw as string) : null
  }
  return memStore[id] ?? null
}

export async function getAllKeys(): Promise<ApiKey[]> {
  const kv = await getKV()
  if (kv) {
    const ids = await kv.smembers('keys:all') as string[]
    if (!ids.length) return []
    const raws = await Promise.all(ids.map(id => kv.get<string>(`key:${id}`)))
    return raws.filter(Boolean).map(r => JSON.parse(r as string))
  }
  return Object.values(memStore)
}

export async function findKeyByValue(keyValue: string): Promise<ApiKey | null> {
  const all = await getAllKeys()
  return all.find(k => k.key === keyValue) ?? null
}

export async function updateKey(apiKey: ApiKey): Promise<void> {
  const kv = await getKV()
  if (kv) {
    await kv.set(`key:${apiKey.id}`, JSON.stringify(apiKey))
  } else {
    memStore[apiKey.id] = apiKey
  }
}

export async function deleteKey(id: string): Promise<void> {
  const kv = await getKV()
  if (kv) {
    await kv.del(`key:${id}`)
    await kv.srem('keys:all', id)
  } else {
    delete memStore[id]
  }
}
