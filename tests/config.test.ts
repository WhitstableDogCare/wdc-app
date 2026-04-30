import { vi, describe, it, expect, beforeEach } from 'vitest'

// Mock fs before importing the module under test.
// vi.mock is hoisted automatically, so this runs before all imports.
vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
  },
}))

import fs from 'fs'
import { readConfig, writeConfig } from '../lib/config'

const mockedFs = vi.mocked(fs)

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── readConfig ───────────────────────────────────────────────────────────────

describe('readConfig', () => {

  it('returns empty object when config file does not exist', () => {
    mockedFs.existsSync.mockReturnValue(false)
    expect(readConfig()).toEqual({})
    expect(mockedFs.readFileSync).not.toHaveBeenCalled()
  })

  it('returns parsed config when file exists and JSON is valid', () => {
    mockedFs.existsSync.mockReturnValue(true)
    mockedFs.readFileSync.mockReturnValue(JSON.stringify({
      businessName: 'Whitstable Dog Care',
      nextInvoiceNumber: 42,
    }))
    expect(readConfig()).toEqual({
      businessName: 'Whitstable Dog Care',
      nextInvoiceNumber: 42,
    })
  })

  it('returns empty object when file contains invalid JSON', () => {
    mockedFs.existsSync.mockReturnValue(true)
    mockedFs.readFileSync.mockReturnValue('not { valid json')
    expect(readConfig()).toEqual({})
  })

  it('returns empty object when file contains empty string', () => {
    mockedFs.existsSync.mockReturnValue(true)
    mockedFs.readFileSync.mockReturnValue('')
    expect(readConfig()).toEqual({})
  })

  it('returns all config fields when present', () => {
    const fullConfig = {
      businessName: 'WDC',
      businessEmail: 'test@example.com',
      businessPhone: '01227 000000',
      businessAddress: '1 Beach Rd',
      paymentInfo: 'Sort: 12-34-56',
      nextInvoiceNumber: 99,
      gmailAppPassword: 'secret',
    }
    mockedFs.existsSync.mockReturnValue(true)
    mockedFs.readFileSync.mockReturnValue(JSON.stringify(fullConfig))
    expect(readConfig()).toEqual(fullConfig)
  })

  it('returns empty object when readFileSync throws', () => {
    mockedFs.existsSync.mockReturnValue(true)
    mockedFs.readFileSync.mockImplementation(() => { throw new Error('disk error') })
    expect(readConfig()).toEqual({})
  })

})

// ─── writeConfig ──────────────────────────────────────────────────────────────

describe('writeConfig', () => {

  it('creates the config directory when it does not exist', () => {
    mockedFs.existsSync.mockReturnValue(false)
    writeConfig({ businessName: 'WDC' })
    expect(mockedFs.mkdirSync).toHaveBeenCalledWith(expect.any(String), { recursive: true })
  })

  it('does not create the directory when it already exists', () => {
    mockedFs.existsSync.mockReturnValue(true)
    writeConfig({ businessName: 'WDC' })
    expect(mockedFs.mkdirSync).not.toHaveBeenCalled()
  })

  it('writes JSON with 2-space indentation', () => {
    mockedFs.existsSync.mockReturnValue(true)
    const config = { businessName: 'WDC', nextInvoiceNumber: 10 }
    writeConfig(config)
    expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
      expect.any(String),
      JSON.stringify(config, null, 2),
    )
  })

  it('writes to the correct file path (inside Application Support)', () => {
    mockedFs.existsSync.mockReturnValue(true)
    writeConfig({ businessName: 'WDC' })
    const [filePath] = vi.mocked(mockedFs.writeFileSync).mock.calls[0] as [string, ...unknown[]]
    expect(filePath).toContain('wdc-app')
    expect(filePath).toContain('config.json')
  })

  it('writes an empty object as valid JSON', () => {
    mockedFs.existsSync.mockReturnValue(true)
    writeConfig({})
    expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
      expect.any(String),
      JSON.stringify({}, null, 2),
    )
  })

  it('preserves nextInvoiceNumber correctly (important for invoice counter)', () => {
    mockedFs.existsSync.mockReturnValue(true)
    writeConfig({ nextInvoiceNumber: 77 })
    const written = vi.mocked(mockedFs.writeFileSync).mock.calls[0][1] as string
    expect(JSON.parse(written).nextInvoiceNumber).toBe(77)
  })

})
