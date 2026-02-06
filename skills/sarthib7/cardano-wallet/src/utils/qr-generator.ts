import QRCode from 'qrcode'

import type { Network } from '../../../shared/types/config'

/**
 * Generate QR code for wallet funding
 *
 * Creates a QR code containing the Cardano address for easy wallet funding.
 * For Preprod network, also includes faucet URL.
 *
 * @param address - Cardano address (addr1...)
 * @param network - Cardano network (Preprod or Mainnet)
 * @returns QR code data URL and metadata
 */
export async function generateWalletFundingQR(
  address: string,
  network: Network,
): Promise<{
  qrDataUrl: string
  address: string
  network: Network
  faucetUrl?: string
  message: string
}> {
  // Generate QR code as data URL
  const qrDataUrl = await QRCode.toDataURL(address, {
    errorCorrectionLevel: 'M',
    type: 'image/png',
    width: 300,
    margin: 2,
  })

  // For Preprod, include faucet URL
  const faucetUrl =
    network === 'Preprod' ? 'https://docs.cardano.org/cardano-testnet/tools/faucet' : undefined

  const message =
    network === 'Preprod'
      ? `Scan QR code to fund wallet. Use Cardano Preprod faucet: ${faucetUrl}`
      : 'Scan QR code to fund wallet with ADA'

  return {
    qrDataUrl,
    address,
    network,
    faucetUrl,
    message,
  }
}

/**
 * Generate QR code and save to file
 *
 * @param address - Cardano address
 * @param network - Cardano network
 * @param outputPath - Optional path to save QR code image
 * @returns QR code data URL and file path if saved
 */
export async function generateWalletFundingQRFile(
  address: string,
  network: Network,
  outputPath?: string,
): Promise<{
  qrDataUrl: string
  qrImagePath?: string
  address: string
  network: Network
  faucetUrl?: string
}> {
  const qrDataUrl = await QRCode.toDataURL(address, {
    errorCorrectionLevel: 'M',
    type: 'image/png',
    width: 300,
    margin: 2,
  })

  let qrImagePath: string | undefined

  if (outputPath) {
    await QRCode.toFile(outputPath, address, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      width: 300,
      margin: 2,
    })
    qrImagePath = outputPath
  }

  const faucetUrl =
    network === 'Preprod' ? 'https://docs.cardano.org/cardano-testnet/tools/faucet' : undefined

  return {
    qrDataUrl,
    qrImagePath,
    address,
    network,
    faucetUrl,
  }
}
