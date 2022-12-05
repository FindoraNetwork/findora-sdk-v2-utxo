import { getLedger, feeService, ledgerTypes } from '@findora-network/findora-sdk-v2-core';
import { WalletKeypar } from '@findora-network/findora-sdk-v2-keypair';
import { Network, NetworkEnvironment } from '@findora-network/findora-sdk-v2-network';
import * as fee from './fee';
import { addUtxo, addUtxoInputs, getSendUtxo, UtxoInputParameter, UtxoInputsInfo } from './utxoHelper';

const sdkEnv = {
  hostUrl: 'http://127.0.0.1',
  cachePath: './cache',
};

NetworkEnvironment.init(sdkEnv);

interface FeeInputPayloadType {
  txoRef: ledgerTypes.TxoRef;
  assetRecord: ledgerTypes.ClientAssetRecord;
  ownerMemo: ledgerTypes.OwnerMemo | undefined;
  keypair: ledgerTypes.XfrKeyPair;
  amount: BigInt;
}

export interface ReciverInfo {
  utxoNumbers: BigInt;
  toPublickey: ledgerTypes.XfrPublicKey;
  assetBlindRules?: fee.AssetBlindRules;
}
export const getEmptyTransferBuilder = async (): Promise<ledgerTypes.TransferOperationBuilder> => {
  const ledger = await getLedger();

  return ledger.TransferOperationBuilder.new();
};

// check and update references in the sdk and wallet
// export const getAssetTracingPolicies = async (asset: FindoraWallet.IAsset) => {
//   const ledger = await getLedger();
//
//   const tracingPolicies = ledger.AssetType.from_json({ properties: asset }).get_tracing_policies();
//
//   return tracingPolicies;
// };

export const getTransferOperation = async (
  walletInfo: WalletKeypar,
  utxoInputs: UtxoInputsInfo,
  recieversInfo: ReciverInfo[],
  assetCode: string,
  transferOp: ledgerTypes.TransferOperationBuilder,
): Promise<ledgerTypes.TransferOperationBuilder> => {
  // let transferOp = await getEmptyTransferBuilder();
  const ledger = await getLedger();

  const asset = await fee.getAssetDetails(assetCode);

  const isTraceable = asset.assetRules.tracing_policies?.length > 0;

  let tracingPolicies: ledgerTypes.TracingPolicies;

  if (isTraceable) {
    try {
      tracingPolicies = await fee.getAssetTracingPolicies(asset);
      console.log('tracingPolicies:', tracingPolicies);
    } catch (e) {
      console.log(e);
    }
  }

  let isBlindIsAmount = recieversInfo.some(item => item.assetBlindRules?.isAmountBlind === true);
  let isBlindIsType = recieversInfo.some(item => item.assetBlindRules?.isTypeBlind === true);

  let utxoNumbers = BigInt(0);

  const { inputParametersList, inputAmount } = utxoInputs;

  const inputPromise = inputParametersList.map(async (inputParameters: UtxoInputParameter) => {
    const { txoRef, assetRecord, amount, sid } = inputParameters;

    const memoDataResult = await Network.getOwnerMemo(sid);

    const { response: myMemoData, error: memoError } = memoDataResult;

    if (memoError) {
      throw new Error(`Could not fetch memo data for sid "${sid}", Error - ${memoError.message}`);
    }

    utxoNumbers = utxoNumbers + BigInt(amount.toString());
    const ownerMemo = myMemoData ? ledger.OwnerMemo.from_json(myMemoData) : null;

    if (isTraceable) {
      transferOp = transferOp.add_input_with_tracing(
        txoRef,
        assetRecord,
        ownerMemo?.clone(),
        tracingPolicies,
        walletInfo.keypair,
        BigInt(amount.toString()),
      );
    } else {
      transferOp = transferOp.add_input_no_tracing(
        txoRef,
        assetRecord,
        ownerMemo?.clone(),
        walletInfo.keypair,
        BigInt(amount.toString()),
      );
    }
  });

  await Promise.all(inputPromise);

  recieversInfo.forEach(reciverInfo => {
    const { utxoNumbers, toPublickey, assetBlindRules = {} } = reciverInfo;
    const blindIsAmount = assetBlindRules?.isAmountBlind;
    const blindIsType = assetBlindRules?.isTypeBlind;

    if (isTraceable) {
      transferOp = transferOp.add_output_with_tracing(
        BigInt(utxoNumbers.toString()),
        toPublickey,
        tracingPolicies,
        assetCode,
        !!blindIsAmount,
        !!blindIsType,
      );
    } else {
      transferOp = transferOp.add_output_no_tracing(
        BigInt(utxoNumbers.toString()),
        toPublickey,
        assetCode,
        !!blindIsAmount,
        !!blindIsType,
      );
    }
  });

  if (inputAmount > utxoNumbers) {
    const numberToSubmit = BigInt(Number(inputAmount) - Number(utxoNumbers));

    if (isTraceable) {
      tracingPolicies = await fee.getAssetTracingPolicies(asset);

      transferOp = transferOp.add_output_with_tracing(
        numberToSubmit,
        ledger.get_pk_from_keypair(walletInfo.keypair),
        tracingPolicies,
        assetCode,
        isBlindIsAmount,
        isBlindIsType,
      );
    } else {
      transferOp = transferOp.add_output_no_tracing(
        numberToSubmit,
        ledger.get_pk_from_keypair(walletInfo.keypair),
        assetCode,
        isBlindIsAmount,
        isBlindIsType,
      );
    }
  }

  return transferOp;
};

export const getPayloadForFeeInputs = async (
  walletInfo: WalletKeypar,
  utxoInputs: UtxoInputsInfo,
): Promise<FeeInputPayloadType[]> => {
  const ledger = await getLedger();

  const feeInputsPayload: FeeInputPayloadType[] = [];

  const { inputParametersList } = utxoInputs;

  const inputPromise = inputParametersList.map(async (inputParameters: UtxoInputParameter) => {
    const { txoRef, assetRecord, amount, sid } = inputParameters;

    const memoDataResult = await Network.getOwnerMemo(sid);

    const { response: myMemoData, error: memoError } = memoDataResult;

    if (memoError) {
      throw new Error(`Could not fetch memo data for sid "${sid}", Error - ${memoError.message}`);
    }

    const ownerMemo = myMemoData ? ledger.OwnerMemo.from_json(myMemoData) : null;

    feeInputsPayload.push({
      txoRef,
      assetRecord,
      ownerMemo: ownerMemo?.clone(),
      keypair: walletInfo.keypair,
      amount,
    });
  });

  await Promise.all(inputPromise);

  return feeInputsPayload;
};

// creates an istance of a TransferOperationBuilder with a minimal FRA fee
export const buildTransferOperationWithFee = async (
  walletInfo: WalletKeypar,
  assetBlindRules?: { isAmountBlind?: boolean; isTypeBlind?: boolean },
): Promise<ledgerTypes.TransferOperationBuilder> => {
  console.log('c1');
  const minimalFee = await feeService.getMinimalFee();
  console.log('c2');
  const fraAssetCode = await feeService.getFraAssetCode();
  console.log('c3');
  const toPublickey = await feeService.getFraPublicKey();

  const recieversInfo = [
    {
      utxoNumbers: minimalFee,
      toPublickey,
      assetBlindRules,
    },
  ];

  console.log('c5');
  const trasferOperation = await buildTransferOperation(walletInfo, recieversInfo, fraAssetCode);

  console.log('c6');
  return trasferOperation;
};

// used in triple masking
export const getFeeInputs = async (
  walletInfo: WalletKeypar,
  excludeSids: number[],
  isBarToAbar: boolean,
): Promise<ledgerTypes.FeeInputs> => {
  const ledger = await getLedger();

  const sidsResult = await Network.getOwnedSids(walletInfo.publickey);

  const { response: sids } = sidsResult;

  if (!sids) {
    throw new Error('No sids were fetched');
  }

  const filteredSids = sids.filter(sid => !excludeSids.includes(sid));
  // const filteredSids = sids.filter(sid => sid !== excludeSid);

  const minimalFee = isBarToAbar
    ? await feeService.getBarToAbarMinimalFee()
    : await feeService.getMinimalFee();

  console.log('🚀 ~ file: fee.ts ~ line 263 ~ abar minimalFee', minimalFee);

  const fraAssetCode = await feeService.getFraAssetCode();

  const utxoDataList = await addUtxo(walletInfo, filteredSids);
  const sendUtxoList = getSendUtxo(fraAssetCode, minimalFee, utxoDataList);
  const utxoInputsInfo = await addUtxoInputs(sendUtxoList);

  const feeInputsPayload = await getPayloadForFeeInputs(walletInfo, utxoInputsInfo);

  let feeInputs = ledger.FeeInputs.new();

  feeInputsPayload.forEach(payloadItem => {
    const { amount, txoRef, assetRecord, ownerMemo, keypair } = payloadItem;
    feeInputs = feeInputs.append2(BigInt(amount.toString()), txoRef, assetRecord, ownerMemo, keypair);
  });

  return feeInputs;
};

// creates an istance of a TransferOperationBuilder to transfer tokens based on recieversInfo
export const buildTransferOperation = async (
  walletInfo: WalletKeypar,
  recieversInfo: ReciverInfo[],
  assetCode: string,
): Promise<ledgerTypes.TransferOperationBuilder> => {
  console.log('d1');
  console.log('n env', NetworkEnvironment);
  const sidsResult = await Network.getOwnedSids(walletInfo.publickey);
  console.log('d2');

  const { response: sids } = sidsResult;

  if (!sids) {
    throw new Error('No sids were fetched');
  }

  const totalUtxoNumbers = recieversInfo.reduce((acc, receiver) => {
    return BigInt(Number(receiver.utxoNumbers) + Number(acc));
  }, BigInt(0));

  const utxoDataList = await addUtxo(walletInfo, sids);
  const sendUtxoList = getSendUtxo(assetCode, totalUtxoNumbers, utxoDataList);
  const utxoInputsInfo = await addUtxoInputs(sendUtxoList);

  let transferOperationBuilder = await getEmptyTransferBuilder();
  transferOperationBuilder = await getTransferOperation(
    walletInfo,
    utxoInputsInfo,
    recieversInfo,
    assetCode,
    transferOperationBuilder,
  );

  return transferOperationBuilder;
};

export interface ReciverInfoV2 {
  [key: string]: ReciverInfo[];
}

// creates an istance of a TransferOperationBuilder to transfer tokens based on recieversInfo
export const buildTransferOperationV2 = async (
  walletInfo: WalletKeypar,
  recieversInfo: ReciverInfoV2,
): Promise<ledgerTypes.TransferOperationBuilder> => {
  const sidsResult = await Network.getOwnedSids(walletInfo.publickey);

  const { response: sids } = sidsResult;

  if (!sids) {
    throw new Error('No sids were fetched');
  }

  let transferOperationBuilder = await getEmptyTransferBuilder();

  for (const assetCodeType of Object.keys(recieversInfo)) {
    const assetCodeItem = recieversInfo[assetCodeType];

    const totalUtxoNumbers = assetCodeItem.reduce((acc, receiver) => {
      return BigInt(Number(receiver.utxoNumbers) + Number(acc));
    }, BigInt(0));

    const utxoDataList = await addUtxo(walletInfo, sids);
    const sendUtxoList = getSendUtxo(assetCodeType, totalUtxoNumbers, utxoDataList);
    const utxoInputsInfo = await addUtxoInputs(sendUtxoList);

    transferOperationBuilder = await getTransferOperation(
      walletInfo,
      utxoInputsInfo,
      assetCodeItem,
      assetCodeType,
      transferOperationBuilder,
    );
  }

  return transferOperationBuilder;
};
