import {
  detectAndLoadPromptImages,
  formatAttachmentForGateway,
  parseDataUri,
  toDataUri,
} from '../attachments'

describe('toDataUri', () => {
  it('builds a data-URI from base64 and mimeType', () => {
    expect(toDataUri('abc123', 'image/png')).toBe('data:image/png;base64,abc123')
  })

  it('handles different MIME types', () => {
    expect(toDataUri('payload', 'application/pdf')).toBe('data:application/pdf;base64,payload')
  })
})

describe('parseDataUri', () => {
  it('extracts mimeType and data from a valid data-URI', () => {
    const result = parseDataUri('data:image/jpeg;base64,/9j/4AAQ')
    expect(result).toEqual({ mimeType: 'image/jpeg', data: '/9j/4AAQ' })
  })

  it('returns null for non-data-URI strings', () => {
    expect(parseDataUri('not a data uri')).toBeNull()
    expect(parseDataUri('https://example.com/img.png')).toBeNull()
    expect(parseDataUri('')).toBeNull()
  })

  it('returns null for data-URIs without base64 encoding marker', () => {
    expect(parseDataUri('data:text/plain,hello')).toBeNull()
  })
})

describe('formatAttachmentForGateway', () => {
  it('converts raw base64 to a data-URI in the content field', () => {
    const result = formatAttachmentForGateway({
      type: 'image',
      data: 'iVBORw0KGgo=',
      mimeType: 'image/png',
      name: 'photo.png',
    })

    expect(result).toEqual({
      type: 'image',
      mimeType: 'image/png',
      content: 'data:image/png;base64,iVBORw0KGgo=',
      fileName: 'photo.png',
    })
  })

  it('passes through data that is already a data-URI', () => {
    const dataUri = 'data:image/jpeg;base64,/9j/4AAQ'
    const result = formatAttachmentForGateway({
      type: 'image',
      data: dataUri,
      mimeType: 'image/jpeg',
    })

    expect(result.content).toBe(dataUri)
  })

  it('defaults mimeType to application/octet-stream when missing', () => {
    const result = formatAttachmentForGateway({
      type: 'document',
      data: 'YWJj',
    })

    expect(result.mimeType).toBe('application/octet-stream')
    expect(result.content).toBe('data:application/octet-stream;base64,YWJj')
  })

  it('handles missing data gracefully', () => {
    const result = formatAttachmentForGateway({
      type: 'image',
      mimeType: 'image/png',
    })

    expect(result.content).toBe('data:image/png;base64,')
  })
})

describe('detectAndLoadPromptImages', () => {
  it('extracts data-URI images from prompt text', () => {
    const text = 'Look at this image: data:image/png;base64,iVBORw0KGgo= and this one too'
    const result = detectAndLoadPromptImages(text)

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      mimeType: 'image/png',
      data: 'iVBORw0KGgo=',
      source: 'data:image/png;base64,iVBORw0KGgo=',
    })
  })

  it('extracts multiple images from the same prompt', () => {
    const text = 'Image 1: data:image/png;base64,AAA= Image 2: data:image/jpeg;base64,BBB='
    const result = detectAndLoadPromptImages(text)

    expect(result).toHaveLength(2)
    expect(result[0].mimeType).toBe('image/png')
    expect(result[1].mimeType).toBe('image/jpeg')
  })

  it('returns an empty array when there are no images', () => {
    expect(detectAndLoadPromptImages('Hello, no images here')).toEqual([])
  })

  it('returns an empty array for empty input', () => {
    expect(detectAndLoadPromptImages('')).toEqual([])
  })

  it('ignores non-image data-URIs', () => {
    const text = 'data:application/pdf;base64,JVBERi0='
    expect(detectAndLoadPromptImages(text)).toEqual([])
  })
})
