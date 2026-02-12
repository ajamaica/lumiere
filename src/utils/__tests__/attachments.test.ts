import { toProviderAttachment, toProviderAttachments } from '../attachments'

// ---------- mocks ----------

const mockArrayBuffer = jest.fn()

jest.mock('expo-file-system', () => ({
  File: jest.fn().mockImplementation(() => ({
    arrayBuffer: mockArrayBuffer,
  })),
}))

// ---------- helpers ----------

function makeImageAttachment(overrides = {}) {
  return {
    type: 'image' as const,
    uri: 'file://photo.jpg',
    base64: 'aW1hZ2VkYXRh',
    mimeType: 'image/jpeg',
    name: 'photo.jpg',
    ...overrides,
  }
}

function makeFileAttachment(overrides = {}) {
  return {
    type: 'file' as const,
    uri: 'file://doc.pdf',
    mimeType: 'application/pdf',
    name: 'doc.pdf',
    ...overrides,
  }
}

function makeVideoAttachment(overrides = {}) {
  return {
    type: 'video' as const,
    uri: 'file://clip.mp4',
    mimeType: 'video/mp4',
    name: 'clip.mp4',
    ...overrides,
  }
}

/** Create an ArrayBuffer whose base64 is deterministic. */
function fakeArrayBuffer(text: string): ArrayBuffer {
  const encoder = new TextEncoder()
  return encoder.encode(text).buffer
}

// ---------- tests ----------

describe('toProviderAttachment', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('converts an image attachment using its existing base64', async () => {
    const result = await toProviderAttachment(makeImageAttachment())

    expect(result).toEqual({
      type: 'image',
      data: 'aW1hZ2VkYXRh',
      mimeType: 'image/jpeg',
      name: 'photo.jpg',
    })
  })

  it('returns null for an image without base64', async () => {
    const result = await toProviderAttachment(makeImageAttachment({ base64: undefined }))

    expect(result).toBeNull()
  })

  it('reads a file attachment from URI and converts to base64 document', async () => {
    mockArrayBuffer.mockResolvedValue(fakeArrayBuffer('hello'))

    const result = await toProviderAttachment(makeFileAttachment())

    expect(result).toEqual({
      type: 'document',
      data: btoa('hello'),
      mimeType: 'application/pdf',
      name: 'doc.pdf',
    })
  })

  it('reads a video attachment from URI and converts to base64 video', async () => {
    mockArrayBuffer.mockResolvedValue(fakeArrayBuffer('video'))

    const result = await toProviderAttachment(makeVideoAttachment())

    expect(result).toEqual({
      type: 'video',
      data: btoa('video'),
      mimeType: 'video/mp4',
      name: 'clip.mp4',
    })
  })

  it('defaults to application/octet-stream when file has no mimeType', async () => {
    mockArrayBuffer.mockResolvedValue(fakeArrayBuffer('data'))

    const result = await toProviderAttachment(makeFileAttachment({ mimeType: undefined }))

    expect(result).toEqual(
      expect.objectContaining({
        mimeType: 'application/octet-stream',
      }),
    )
  })

  it('returns null when reading a file fails', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    mockArrayBuffer.mockRejectedValue(new Error('read error'))

    const result = await toProviderAttachment(makeFileAttachment())

    expect(result).toBeNull()
    consoleSpy.mockRestore()
  })

  it('returns null for a file attachment without a URI', async () => {
    const result = await toProviderAttachment(makeFileAttachment({ uri: '' }))

    expect(result).toBeNull()
  })
})

describe('toProviderAttachments', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns undefined for an empty array', async () => {
    const result = await toProviderAttachments([])

    expect(result).toBeUndefined()
  })

  it('converts multiple attachments in parallel', async () => {
    mockArrayBuffer.mockResolvedValue(fakeArrayBuffer('pdf'))

    const result = await toProviderAttachments([makeImageAttachment(), makeFileAttachment()])

    expect(result).toHaveLength(2)
    expect(result![0].type).toBe('image')
    expect(result![1].type).toBe('document')
  })

  it('filters out failed conversions', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    mockArrayBuffer.mockRejectedValue(new Error('read error'))

    const result = await toProviderAttachments([
      makeImageAttachment(),
      makeFileAttachment(), // this will fail
    ])

    expect(result).toHaveLength(1)
    expect(result![0].type).toBe('image')
    consoleSpy.mockRestore()
  })

  it('returns undefined when all conversions fail', async () => {
    const result = await toProviderAttachments([makeImageAttachment({ base64: undefined })])

    expect(result).toBeUndefined()
  })
})
