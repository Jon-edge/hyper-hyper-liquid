import { asArray, asEither, asNull, asNumber, asObject, asOptional, asString } from "cleaners"

// Common cleaners

export const asPosition = asObject({
  coin: asString,
  szi: asString,
  entryPx: asString,
  positionValue: asString,
  unrealizedPnl: asString,
  returnOnEquity: asString,
  liquidationPx: asEither(asString, asNull),
  marginUsed: asString,
  // Define specific structures for optional fields
  leverage: asOptional(asObject({
    rawUsd: asOptional(asString),
    type: asOptional(asString),
    value: asOptional(asNumber)
  })),
  cumFunding: asOptional(asObject({
    allTime: asOptional(asString),
    sinceChange: asOptional(asString),
    sinceOpen: asOptional(asString)
  })),
  maxLeverage: asOptional(asNumber)
})
export type Position = ReturnType<typeof asPosition>

export const asAssetPosition = asObject({
  type: asString, // 'oneWay'
  position: asPosition
})
export type AssetPosition = ReturnType<typeof asAssetPosition>

export const asMarginSummary = asObject({
  accountValue: asString,
  totalMarginUsed: asString,
  totalNtlPos: asString,
  totalRawUsd: asString,
  leverage: asOptional(asString)
})
export type MarginSummary = ReturnType<typeof asMarginSummary>

// Fetched cleaners

// {
//   "assetPositions": [
//     {
//       "position": {
//         "coin": "ETH",
//         "cumFunding": {
//           "allTime": "514.085417",
//           "sinceChange": "0.0",
//           "sinceOpen": "0.0"
//         },
//         "entryPx": "2986.3",
//         "leverage": {
//           "rawUsd": "-95.059824",
//           "type": "isolated",
//           "value": 20
//         },
//         "liquidationPx": "2866.26936529",
//         "marginUsed": "4.967826",
//         "maxLeverage": 50,
//         "positionValue": "100.02765",
//         "returnOnEquity": "-0.0026789",
//         "szi": "0.0335",
//         "unrealizedPnl": "-0.0134"
//       },
//       "type": "oneWay"
//     }
//   ],
//   "crossMaintenanceMarginUsed": "0.0",
//   "crossMarginSummary": {
//     "accountValue": "13104.514502",
//     "totalMarginUsed": "0.0",
//     "totalNtlPos": "0.0",
//     "totalRawUsd": "13104.514502"
//   },
//   "marginSummary": {
//     "accountValue": "13109.482328",
//     "totalMarginUsed": "4.967826",
//     "totalNtlPos": "100.02765",
//     "totalRawUsd": "13009.454678"
//   },
//   "time": 1708622398623,
//   "withdrawable": "13104.514502"
// }
export const asFetchedClearinghouseState = asObject({
  assetPositions: asArray(asAssetPosition),
  crossMarginSummary: asMarginSummary, // Same structure as marginSummary
  marginSummary: asOptional(asMarginSummary), 
  withdrawable: asString,
  crossMaintenanceMarginUsed: asOptional(asString),
  time: asNumber
})
export type FetchedClearinghouseState = ReturnType<typeof asFetchedClearinghouseState>

// WebSocket data cleaners. Subset of FetchedClearinghouseState

export const asWsClearinghouseState = asObject({
  crossMarginSummary: asOptional(asMarginSummary),
  withdrawable: asOptional(asString),
  assetPositions: asOptional(asArray(asAssetPosition))
})
export type WsClearinghouseState = ReturnType<typeof asWsClearinghouseState>

export const asWsWebdata2 = asObject({
  clearinghouseState: asOptional(asWsClearinghouseState),
  crossMarginSummary: asOptional(asMarginSummary),
  withdrawable: asOptional(asString),
  assetPositions: asOptional(asArray(asAssetPosition))
})
export type WsWebdata2 = ReturnType<typeof asWsWebdata2>

// Market data cleaners
export const asAllMids = asObject({
  mids: asObject(asString)
})
export type AllMids = ReturnType<typeof asAllMids>

// UI data
export interface AccountState {
  assetPositions: AssetPosition[],
  crossMarginSummary?: MarginSummary,
  marginSummary?: MarginSummary, // Same structure as crossMarginSummary
  withdrawable?: string,
  crossMaintenanceMarginUsed?: string,
  midPrices?: Record<string, string> // Map of coin to mid price
}