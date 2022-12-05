import { getLedger, ledgerTypes } from '@findora-network/findora-sdk-v2-core';
import { Keypair as KeypairApi } from '@findora-network/findora-sdk-v2-keypair';
import { Network, NetworkEnvironment } from '@findora-network/findora-sdk-v2-network';
import { DEFAULT_ASSET_RULES } from '../config/asset';
import * as FindoraWallet from '../types/findoraSdk';

const sdkEnv = {
  hostUrl: 'http://127.0.0.1',
  cachePath: './cache',
};

NetworkEnvironment.init(sdkEnv);

export interface AssetBlindRules {
  isAmountBlind?: boolean;
  isTypeBlind?: boolean;
}

export const getAssetTracingPolicies = async (
  asset: FindoraWallet.IAsset,
): Promise<ledgerTypes.TracingPolicies> => {
  const ledger = await getLedger();

  const tracingPolicies = ledger.AssetType.from_json({ properties: asset }).get_tracing_policies();

  return tracingPolicies;
};

export const getAssetDetails = async (assetCode: string): Promise<FindoraWallet.IAsset> => {
  let result;

  try {
    result = await Network.getAssetToken(assetCode);
  } catch (err) {
    const e: Error = err as Error;

    throw new Error(`Could not get asset token: "${e.message}"`);
  }

  const { response: assetResult, error: submitError } = result;

  if (submitError) {
    throw new Error(`Could not get asset details: "${submitError.message}"`);
  }

  if (!assetResult) {
    throw new Error(`Could not get asset details - asset result is missing`);
  }

  const asset = assetResult.properties;
  const issuerAddress = await KeypairApi.getAddressByPublicKey(asset.issuer.key);

  const assetDetails = {
    code: assetCode,
    issuer: asset.issuer.key,
    address: issuerAddress,
    memo: asset.memo,
    assetRules: { ...DEFAULT_ASSET_RULES, ...asset?.asset_rules },
    numbers: BigInt(0),
    name: '',
  };

  return assetDetails;
};
