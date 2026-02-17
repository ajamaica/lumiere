import { atom } from 'jotai'

/** Whether the Molt gateway is connected */
export const gatewayConnectedAtom = atom<boolean>(false)

/** Whether a gateway connection is in progress */
export const gatewayConnectingAtom = atom<boolean>(false)

/** Gateway connection error message, or null if no error */
export const gatewayErrorAtom = atom<string | null>(null)

/** Whether the gateway is awaiting admin approval for device pairing */
export const gatewayAwaitingApprovalAtom = atom<boolean>(false)
