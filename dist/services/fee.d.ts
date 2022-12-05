import { ledgerTypes } from '@findora-network/findora-sdk-v2-core';
import * as FindoraWallet from '../types/findoraSdk';
export interface AssetBlindRules {
    isAmountBlind?: boolean;
    isTypeBlind?: boolean;
}
export declare const getAssetTracingPolicies: (asset: FindoraWallet.IAsset) => Promise<ledgerTypes.TracingPolicies>;
export declare const getAssetDetails: (assetCode: string) => Promise<FindoraWallet.IAsset>;
