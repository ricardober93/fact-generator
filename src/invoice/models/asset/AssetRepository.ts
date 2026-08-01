import { createHash } from 'node:crypto'
import { CrudRepository, CustomError, Locker, query, repository } from '@wabot-dev/framework'
import { Asset } from './Asset'
import { decodeBase64Payload, detectImageMime } from './detectImageMime'

export const MAX_ASSET_BYTES = 64 * 1024

@repository({ table: 'asset', constructor: Asset })
export class AssetRepository extends CrudRepository<Asset> {
  constructor(private readonly locker: Locker) {
    super()
  }

  @query() declare findOneByContentHash: (contentHash: string) => Promise<Asset | null>

  declare findAll: () => Promise<Asset[]>

  async upload(payload: string): Promise<Asset> {
    if (typeof payload !== 'string' || payload.length === 0) {
      throw new CustomError({ message: 'Asset payload is required', httpCode: 400 })
    }
    const bytes = decodeBase64Payload(payload)
    if (bytes.length === 0) {
      throw new CustomError({ message: 'Asset payload is not valid base64', httpCode: 400 })
    }
    if (bytes.length > MAX_ASSET_BYTES) {
      throw new CustomError({
        message: `Asset exceeds ${MAX_ASSET_BYTES} bytes`,
        humanMessage: 'La imagen es demasiado grande.',
        code: 'ASSET_TOO_LARGE',
        httpCode: 413,
        info: { sizeBytes: bytes.length, maxBytes: MAX_ASSET_BYTES },
      })
    }
    const mime = detectImageMime(bytes)
    if (!mime) {
      throw new CustomError({
        message: 'Asset content is not an allowed image format',
        humanMessage: 'Ese formato de imagen no está permitido.',
        code: 'ASSET_MIME_NOT_ALLOWED',
        httpCode: 415,
      })
    }
    return this.store(bytes, mime)
  }

  private async store(bytes: Buffer, mime: Asset['mime']): Promise<Asset> {
    const contentHash = createHash('sha256').update(bytes).digest('hex')
    return this.locker.withKey(`asset:${contentHash}`).run(async () => {
      const existing = await this.findOneByContentHash(contentHash)
      if (existing) return existing
      const asset = new Asset({
        contentHash,
        mime,
        base64: bytes.toString('base64'),
        sizeBytes: bytes.length,
      })
      await this.create(asset)
      return asset
    })
  }
}
