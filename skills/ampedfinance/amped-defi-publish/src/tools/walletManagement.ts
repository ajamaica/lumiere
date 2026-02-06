/**
 * Wallet Management Tools
 * 
 * Agent-driven wallet configuration:
 * - Add wallets with nicknames
 * - Rename existing wallets
 * - Remove wallets
 * - Set default wallet
 * 
 * Changes persist to: ~/.openclaw/extensions/amped-defi/wallets.json
 */

import { Static,Type } from '@sinclair/typebox';

import { getWalletManager } from '../wallet';
import type { WalletBackendType,WalletConfig } from '../wallet/types';

// ============================================================================
// TypeBox Schemas
// ============================================================================

/**
 * Schema for amped_add_wallet
 */
const AddWalletSchema = Type.Object({
  nickname: Type.String({
    description: 'Nickname for the wallet (e.g., "trading", "savings", "degen")',
  }),
  source: Type.Union([
    Type.Literal('evm-wallet-skill'),
    Type.Literal('bankr'),
    Type.Literal('env'),
  ], {
    description: 'Wallet source type',
  }),
  // For evm-wallet-skill
  path: Type.Optional(Type.String({
    description: 'Path to wallet JSON file (for evm-wallet-skill). Defaults to ~/.evm-wallet.json',
  })),
  // For bankr
  apiKey: Type.Optional(Type.String({
    description: 'Bankr API key (for bankr source)',
  })),
  apiUrl: Type.Optional(Type.String({
    description: 'Bankr API URL (optional, defaults to https://api.bankr.bot)',
  })),
  // For env
  address: Type.Optional(Type.String({
    description: 'Wallet address (for env source)',
  })),
  privateKey: Type.Optional(Type.String({
    description: 'Private key (for env source). WARNING: Will be stored in config file.',
  })),
  // Chain restrictions
  chains: Type.Optional(Type.Array(Type.String(), {
    description: 'Optional list of chains this wallet can use',
  })),
});

/**
 * Schema for amped_rename_wallet
 */
const RenameWalletSchema = Type.Object({
  currentNickname: Type.String({
    description: 'Current wallet nickname',
  }),
  newNickname: Type.String({
    description: 'New wallet nickname',
  }),
});

/**
 * Schema for amped_remove_wallet
 */
const RemoveWalletSchema = Type.Object({
  nickname: Type.String({
    description: 'Wallet nickname to remove',
  }),
  confirm: Type.Optional(Type.Boolean({
    description: 'Set to true to confirm removal',
    default: false,
  })),
});

/**
 * Schema for amped_set_default_wallet
 */
const SetDefaultWalletSchema = Type.Object({
  nickname: Type.String({
    description: 'Wallet nickname to set as default',
  }),
});

// ============================================================================
// Type Definitions
// ============================================================================

type AddWalletParams = Static<typeof AddWalletSchema>;
type RenameWalletParams = Static<typeof RenameWalletSchema>;
type RemoveWalletParams = Static<typeof RemoveWalletSchema>;
type SetDefaultWalletParams = Static<typeof SetDefaultWalletSchema>;

interface AgentTools {
  register(tool: {
    name: string;
    summary: string;
    description?: string;
    schema: unknown;
    handler: (params: unknown) => Promise<unknown>;
  }): void;
}

// ============================================================================
// Handlers
// ============================================================================

/**
 * Add a new wallet with a nickname
 */
async function handleAddWallet(params: AddWalletParams): Promise<unknown> {
  const { nickname, source, path, apiKey, apiUrl, address, privateKey, chains } = params;

  console.log('[walletManagement:addWallet] Adding wallet', { nickname, source });

  // Validate required fields based on source
  if (source === 'bankr' && !apiKey) {
    throw new Error('Bankr wallet requires apiKey');
  }
  if (source === 'env' && (!address || !privateKey)) {
    throw new Error('Env wallet requires both address and privateKey');
  }

  // Build config
  const config: WalletConfig = {
    source: source as WalletBackendType,
    chains,
  };

  if (source === 'evm-wallet-skill') {
    if (path) config.path = path;
  } else if (source === 'bankr') {
    config.apiKey = apiKey;
    if (apiUrl) config.apiUrl = apiUrl;
  } else if (source === 'env') {
    config.address = address as `0x${string}`;
    config.privateKey = privateKey as `0x${string}`;
  }

  // Add wallet
  const walletManager = getWalletManager();
  await walletManager.addWallet(nickname, config);

  // Get the new wallet info
  const wallet = await walletManager.resolve(nickname);
  const walletAddress = await wallet.getAddress();

  return {
    success: true,
    message: `Wallet "${nickname}" added successfully`,
    wallet: {
      nickname: nickname.toLowerCase(),
      type: source,
      address: walletAddress,
      chains: wallet.supportedChains,
    },
    hint: `You can now use: "swap 100 USDC to ETH using ${nickname}"`,
  };
}

/**
 * Rename a wallet
 */
async function handleRenameWallet(params: RenameWalletParams): Promise<unknown> {
  const { currentNickname, newNickname } = params;

  console.log('[walletManagement:renameWallet] Renaming wallet', { 
    from: currentNickname, 
    to: newNickname 
  });

  const walletManager = getWalletManager();
  
  // Get current info before rename
  const wallet = await walletManager.resolve(currentNickname);
  const address = await wallet.getAddress();

  // Rename
  await walletManager.renameWallet(currentNickname, newNickname);

  return {
    success: true,
    message: `Wallet renamed from "${currentNickname}" to "${newNickname}"`,
    wallet: {
      nickname: newNickname.toLowerCase(),
      type: wallet.type,
      address,
    },
    hint: `Now use: "swap 100 USDC using ${newNickname}"`,
  };
}

/**
 * Remove a wallet
 */
async function handleRemoveWallet(params: RemoveWalletParams): Promise<unknown> {
  const { nickname, confirm } = params;

  console.log('[walletManagement:removeWallet] Removing wallet', { nickname, confirm });

  const walletManager = getWalletManager();
  
  // Get wallet info before removal
  const wallet = await walletManager.resolve(nickname);
  const address = await wallet.getAddress();

  if (!confirm) {
    return {
      success: false,
      requiresConfirmation: true,
      message: `Are you sure you want to remove wallet "${nickname}" (${address})?`,
      wallet: {
        nickname: nickname.toLowerCase(),
        type: wallet.type,
        address,
      },
      hint: 'Call again with confirm: true to proceed',
    };
  }

  // Remove
  await walletManager.removeWallet(nickname);

  // List remaining wallets
  const remainingWallets = await walletManager.listWallets();

  return {
    success: true,
    message: `Wallet "${nickname}" removed`,
    remainingWallets: remainingWallets.map(w => ({
      nickname: w.nickname,
      type: w.type,
      isDefault: w.isDefault,
    })),
  };
}

/**
 * Set default wallet
 */
async function handleSetDefaultWallet(params: SetDefaultWalletParams): Promise<unknown> {
  const { nickname } = params;

  console.log('[walletManagement:setDefaultWallet] Setting default', { nickname });

  const walletManager = getWalletManager();
  
  // Validate wallet exists
  const wallet = await walletManager.resolve(nickname);
  const address = await wallet.getAddress();

  // Set default
  await walletManager.setDefaultWallet(nickname);

  return {
    success: true,
    message: `Default wallet set to "${nickname}"`,
    wallet: {
      nickname: nickname.toLowerCase(),
      type: wallet.type,
      address,
      chains: [...wallet.supportedChains],
    },
    hint: 'Operations without a wallet specified will now use this wallet',
  };
}

// ============================================================================
// Error Wrapper
// ============================================================================

function wrapHandler<T>(handler: (params: T) => Promise<unknown>) {
  return async (params: unknown): Promise<unknown> => {
    try {
      return await handler(params as T);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[walletManagement] Error:', message);
      return {
        success: false,
        error: message,
      };
    }
  };
}

// ============================================================================
// Tool Registration
// ============================================================================

/**
 * Register wallet management tools
 */
export function registerWalletManagementTools(agentTools: AgentTools): void {
  // 1. Add wallet
  agentTools.register({
    name: 'amped_add_wallet',
    summary: 'Add a new wallet with a nickname for easy reference',
    description:
      'Add a wallet from evm-wallet-skill, Bankr, or environment variables. ' +
      'Give it a memorable nickname like "trading", "savings", or "degen". ' +
      'The wallet will be saved to config and available across sessions.',
    schema: AddWalletSchema,
    handler: wrapHandler(handleAddWallet),
  });

  // 2. Rename wallet
  agentTools.register({
    name: 'amped_rename_wallet',
    summary: 'Rename a wallet to a new nickname',
    description:
      'Change the nickname of an existing wallet. ' +
      'The wallet address and configuration remain the same, only the nickname changes.',
    schema: RenameWalletSchema,
    handler: wrapHandler(handleRenameWallet),
  });

  // 3. Remove wallet
  agentTools.register({
    name: 'amped_remove_wallet',
    summary: 'Remove a wallet from configuration',
    description:
      'Remove a wallet by nickname. This only removes it from the config file, ' +
      'it does NOT delete the actual wallet or funds. Requires confirmation.',
    schema: RemoveWalletSchema,
    handler: wrapHandler(handleRemoveWallet),
  });

  // 4. Set default wallet
  agentTools.register({
    name: 'amped_set_default_wallet',
    summary: 'Set which wallet to use by default',
    description:
      'Set the default wallet for operations. When you don\'t specify a wallet, ' +
      'this one will be used automatically.',
    schema: SetDefaultWalletSchema,
    handler: wrapHandler(handleSetDefaultWallet),
  });
}

// Export schemas and handlers for testing
export {
  AddWalletSchema,
  handleAddWallet,
  handleRemoveWallet,
  handleRenameWallet,
  handleSetDefaultWallet,
  RemoveWalletSchema,
  RenameWalletSchema,
  SetDefaultWalletSchema,
};
