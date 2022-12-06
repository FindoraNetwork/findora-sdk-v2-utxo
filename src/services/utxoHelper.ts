// import * as Network from '../api/network';
import { getLedger, ledgerTypes } from '@findora-network/findora-sdk-v2-core';
import { WalletKeypar } from '@findora-network/findora-sdk-v2-keypair';
import { NetworkTypes, NetworkEnvironment, Network } from '@findora-network/findora-sdk-v2-network';

// import {
// ClientAssetRecord as LedgerClientAssetRecord,
// OwnerMemo as LedgerOwnerMemo,
// TxoRef as LedgerTxoRef,
// } from './ledger/types';

type LedgerOwnerMemo = ledgerTypes.OwnerMemo;
type LedgerTxoRef = ledgerTypes.TxoRef;

export interface LedgerUtxoItem {
  sid: number;
  utxo: NetworkTypes.LedgerUtxo;
  ownerMemo: LedgerOwnerMemo | undefined;
}

export interface AddUtxoItem extends LedgerUtxoItem {
  address: string;
  body: {
    amount: number;
    asset_type: string;
  };
  memoData: NetworkTypes.OwnedMemoResponse | undefined;
}

export interface UtxoOutputItem extends LedgerUtxoItem {
  originAmount: BigInt;
  amount: BigInt;
  memoData: NetworkTypes.OwnedMemoResponse | undefined;
}

export interface UtxoInputParameter {
  txoRef: LedgerTxoRef;
  assetRecord: ledgerTypes.ClientAssetRecord;
  ownerMemo: LedgerOwnerMemo | undefined;
  amount: BigInt;
  memoData: NetworkTypes.OwnedMemoResponse | undefined;
  sid: number;
}

export interface UtxoInputsInfo {
  inputParametersList: UtxoInputParameter[];
  inputAmount: BigInt;
}

/**
 * Prior to using SDK we have to initialize its environment configuration
 */
const sdkEnv = {
  hostUrl: 'http://127.0.0.1',
  cachePath: './cache',
};

NetworkEnvironment.init(sdkEnv);

export const mergeUtxoList = (arr1: AddUtxoItem[], arr2: AddUtxoItem[]) => {
  const res = [];

  while (arr1.length && arr2.length) {
    const assetItem1 = arr1[0];
    const assetItem2 = arr2[0];
    const amount1 = BigInt(assetItem1.body.amount);
    const amount2 = BigInt(assetItem2.body.amount);

    if (amount1 < amount2) {
      res.push(arr1.splice(0, 1)[0]);
      continue;
    }
    res.push(arr2.splice(0, 1)[0]);
  }

  return res.concat(arr1, arr2);
};

export const mergeSortUtxoList = (arr: AddUtxoItem[]): AddUtxoItem[] => {
  if (arr.length < 2) return arr;
  const middleIdx = Math.floor(arr.length / 2);

  let left = arr.splice(0, middleIdx);
  let right = arr.splice(0);

  return mergeUtxoList(mergeSortUtxoList(left), mergeSortUtxoList(right));
};

export const filterUtxoByCode = (code: string, utxoDataList: AddUtxoItem[]): AddUtxoItem[] => {
  return utxoDataList.filter(assetItem => assetItem?.body?.asset_type === code);
};

// is called only from getUtxoItem
export const decryptUtxoItem = async (
  sid: number,
  walletInfo: WalletKeypar,
  utxoData: NetworkTypes.UtxoResponse,
  memoData?: NetworkTypes.OwnedMemoResponse,
): Promise<AddUtxoItem> => {
  const ledger = await getLedger();

  let assetRecord;

  try {
    assetRecord = ledger.ClientAssetRecord.from_json(utxoData.utxo);
  } catch (error) {
    const err: Error = error as Error;
    throw new Error(`Can not get client asset record. Details: "${err.message}"`);
  }

  let ownerMemo;

  try {
    ownerMemo = memoData ? ledger.OwnerMemo.from_json(memoData) : undefined;
  } catch (error) {
    const err: Error = error as Error;
    throw new Error(`Can not decode owner memo. Details: "${err.message}"`);
  }

  let decryptAssetData;

  // console.log('client asset record', assetRecord);
  // console.log('walletInfo', walletInfo);
  // console.log('typeof walletInfo keypair', typeof walletInfo.keypair);
  try {
    decryptAssetData = await ledger.open_client_asset_record(
      assetRecord,
      ownerMemo?.clone(),
      walletInfo.keypair,
    );
  } catch (error) {
    console.log('client asset record error!', error);
    const err: Error = error as Error;
    throw new Error(`Can not open client asset record to decode. 1 Details: "${err.message}"`);
  }

  let decryptedAsetType;

  try {
    decryptedAsetType = ledger.asset_type_from_jsvalue(decryptAssetData.asset_type);
  } catch (error) {
    const err: Error = error as Error;
    throw new Error(`Can not decrypt asset type. Details: "${err.message}"`);
  }

  decryptAssetData.asset_type = decryptedAsetType;

  decryptAssetData.amount = BigInt(decryptAssetData.amount);

  const item = {
    address: walletInfo.address,
    sid,
    body: decryptAssetData || {},
    utxo: { ...utxoData.utxo },
    ownerMemo: ownerMemo?.clone(),
    memoData,
  };

  return item;
};

// is called only by addUtxo
export const getUtxoItem = async (sid: number, walletInfo: WalletKeypar): Promise<AddUtxoItem> => {
  // if (cachedItem) {
  //   return cachedItem;
  // }

  // console.log(`Fetching sid "${sid}"`);

  const utxoDataResult = await Network.getUtxo(sid);

  const { response: utxoData, error: utxoError } = utxoDataResult;

  if (utxoError || !utxoData) {
    throw new Error(`Could not fetch utxo data for sid "${sid}", Error - ${utxoError?.message}`);
  }

  const memoDataResult = await Network.getOwnerMemo(sid);

  // console.log('🚀 ~ file: utxoHelper.ts ~ line 1 ~ sid processing 1', sid);

  const { response: memoData, error: memoError } = memoDataResult;

  if (memoError) {
    throw new Error(`Could not fetch memo data for sid "${sid}", Error - ${memoError.message}`);
  }

  // console.log('🚀 ~ file: utxoHelper.ts ~ line 2 ~ sid processing 2', sid);

  // console.log('🚀 ~ file: utxoHelper.ts ~ line 155 ~ sid processing', sid);

  const item = await decryptUtxoItem(sid, walletInfo, utxoData, memoData);
  // console.log('🚀 ~ file: utxoHelper.ts ~ line 155 ~ sid processed', sid);
  // console.log('🚀 ~ file: utxoHelper.ts ~ line 178 ~ item', item);

  return item;
};

// creates a list of items with descrypted utxo information
export const addUtxo = async (walletInfo: WalletKeypar, addSids: number[]): Promise<AddUtxoItem[]> => {
  const utxoDataList = [];
  // const cacheDataToSave: CacheItem = {};
  // let utxoDataCache;

  // const cacheEntryName = `${CACHE_ENTRIES.UTXO_DATA}_${walletInfo.address}`;

  // let fullPathToCacheEntry = `${Sdk.environment.cachePath}/${cacheEntryName}.json`;

  // try {
  // if (window && window?.document) {
  // fullPathToCacheEntry = cacheEntryName;
  // }
  // } catch (_) {
  // console.log('window instance is not found. running is sdk mode. skipping');
  // }

  // try {
  //   utxoDataCache = await Cache.read(fullPathToCacheEntry, Sdk.environment.cacheProvider);
  // } catch (error) {
  //   const err: Error = error as Error;
  //   throw new Error(`Error reading the cache, "${err.message}"`);
  // }

  for (let i = 0; i < addSids.length; i++) {
    const sid = addSids[i];

    try {
      // const item = await getUtxoItem(sid, walletInfo, utxoDataCache?.[`sid_${sid}`]);
      const item = await getUtxoItem(sid, walletInfo);
      utxoDataList.push(item);

      // cacheDataToSave[`sid_${item.sid}`] = item;
    } catch (error) {
      console.log('add error', error);
      const err: Error = error as Error;
      console.log(`Could not process addUtxo for sid ${sid}, Details: "${err.message}"`);
      continue;
    }
  }

  // try {
  //   await Cache.write(fullPathToCacheEntry, cacheDataToSave, Sdk.environment.cacheProvider);
  // } catch (error) {
  //   const err: Error = error as Error;
  //   console.log(`Could not write cache for utxoData, "${err.message}"`);
  // }

  return utxoDataList;
};

export const getSendUtxoForAmount = (
  code: string,
  amount: BigInt,
  utxoDataList: AddUtxoItem[],
): UtxoOutputItem[] => {
  const result = [];

  const filteredUtxoList = filterUtxoByCode(code, utxoDataList);

  console.log('🚀 ~ file: utxoHelper.ts ~ line 307 ~ amount', amount);
  for (const assetItem of filteredUtxoList) {
    const _amount = BigInt(assetItem.body.amount);
    console.log('🚀 ~ file: utxoHelper.ts ~ line 307 ~ _amount', _amount);

    if (_amount === amount) {
      result.push({
        amount: _amount,
        originAmount: _amount,
        sid: assetItem.sid,
        utxo: { ...assetItem.utxo },
        ownerMemo: assetItem.ownerMemo,
        memoData: assetItem.memoData,
      });
      break;
    }
  }

  return result;
};

export const getSendUtxo = (code: string, amount: BigInt, utxoDataList: AddUtxoItem[]): UtxoOutputItem[] => {
  const result = [];

  const filteredUtxoList = filterUtxoByCode(code, utxoDataList);
  const sortedUtxoList = mergeSortUtxoList(filteredUtxoList);

  let sum = BigInt(0);

  for (const assetItem of sortedUtxoList) {
    const _amount = BigInt(assetItem.body.amount);

    sum = sum + _amount;
    const credit = BigInt(Number(sum) - Number(amount));
    const remainedDebt = _amount - credit;
    const amountToUse = credit > 0 ? remainedDebt : _amount;

    result.push({
      amount: amountToUse,
      originAmount: _amount,
      sid: assetItem.sid,
      utxo: { ...assetItem.utxo },
      ownerMemo: assetItem.ownerMemo,
      memoData: assetItem.memoData,
    });

    if (credit >= 0) {
      break;
    }
  }

  return result;
};

// creates a list of inputs, which would be used by transaction builder in a fee service
// used in fee.buildTransferOperation , fee.getFeeInputs
export const addUtxoInputs = async (utxoSids: UtxoOutputItem[]): Promise<UtxoInputsInfo> => {
  const ledger = await getLedger();

  let inputAmount = BigInt(0);

  const inputParametersList = [];

  for (let i = 0; i < utxoSids.length; i += 1) {
    const item = utxoSids[i];

    inputAmount = BigInt(Number(inputAmount) + Number(item.originAmount));

    let assetRecord;

    try {
      assetRecord = ledger.ClientAssetRecord.from_json(item.utxo);
    } catch (error) {
      const err: Error = error as Error;
      throw new Error(`Can not get client asset record. Details: "${err.message}"`);
    }

    let txoRef;

    try {
      txoRef = ledger.TxoRef.absolute(BigInt(item.sid));
    } catch (error) {
      const err: Error = error as Error;
      throw new Error(`Can not convert given sid id to a BigInt, "${item.sid}", Details - "${err.message}"`);
    }

    const inputParameters: UtxoInputParameter = {
      txoRef,
      assetRecord,
      ownerMemo: item?.ownerMemo,
      amount: item.amount,
      memoData: item.memoData,
      sid: item.sid,
    };

    inputParametersList.push(inputParameters);
  }

  const res = { inputParametersList, inputAmount };

  return res;
};

export const getUtxoWithAmount = async (
  walletInfo: WalletKeypar,
  utxoNumbers: BigInt,
  assetCode: string,
): Promise<UtxoOutputItem> => {
  const { response: sids } = await Network.getOwnedSids(walletInfo.publickey);
  if (!sids) {
    console.log('ERROR no sids available');
    throw new Error(
      `could not get an utxo with an amount of ${utxoNumbers} for asset code ${assetCode}. No sids available`,
    );
  }

  const utxoDataList = await addUtxo(walletInfo, sids);

  const sendUtxoList = getSendUtxoForAmount(assetCode, utxoNumbers, utxoDataList);
  const [utxoInput] = sendUtxoList;

  if (!utxoInput) {
    throw new Error(`could not get an utxo with an amount of ${utxoNumbers} for asset code ${assetCode}`);
  }

  return utxoInput;
};
