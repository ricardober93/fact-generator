import { Entity, type IEntityData } from '@wabot-dev/framework'

export const ALLOWED_ASSET_MIMES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
] as const

export type IAssetMime = (typeof ALLOWED_ASSET_MIMES)[number]

export interface IAssetData extends IEntityData {
  contentHash: string
  mime: IAssetMime
  base64: string
  sizeBytes: number
}

export class Asset extends Entity<IAssetData> {
  get contentHash(): string {
    return this.data.contentHash
  }

  get mime(): IAssetMime {
    return this.data.mime
  }

  get base64(): string {
    return this.data.base64
  }

  get sizeBytes(): number {
    return this.data.sizeBytes
  }

  toDataUri(): string {
    return `data:${this.data.mime};base64,${this.data.base64}`
  }
}
