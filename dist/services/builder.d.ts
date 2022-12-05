import { ledgerTypes } from '@findora-network/findora-sdk-v2-core';
import { WalletKeypar } from '@findora-network/findora-sdk-v2-keypair';
import * as fee from './fee';
import { UtxoInputsInfo } from './utxoHelper';
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
export declare const getEmptyTransferBuilder: () => Promise<ledgerTypes.TransferOperationBuilder>;
export declare const getTransferOperation: (walletInfo: WalletKeypar, utxoInputs: UtxoInputsInfo, recieversInfo: ReciverInfo[], assetCode: string, transferOp: ledgerTypes.TransferOperationBuilder) => Promise<ledgerTypes.TransferOperationBuilder>;
export declare const getPayloadForFeeInputs: (walletInfo: WalletKeypar, utxoInputs: UtxoInputsInfo) => Promise<FeeInputPayloadType[]>;
export declare const buildTransferOperationWithFee: (walletInfo: WalletKeypar, assetBlindRules?: {
    isAmountBlind?: boolean;
    isTypeBlind?: boolean;
}) => Promise<ledgerTypes.TransferOperationBuilder>;
export declare const getFeeInputs: (walletInfo: WalletKeypar, excludeSids: number[], isBarToAbar: boolean) => Promise<ledgerTypes.FeeInputs>;
export declare const buildTransferOperation: (walletInfo: WalletKeypar, recieversInfo: ReciverInfo[], assetCode: string) => Promise<ledgerTypes.TransferOperationBuilder>;
export interface ReciverInfoV2 {
    [key: string]: ReciverInfo[];
}
export declare const buildTransferOperationV2: (walletInfo: WalletKeypar, recieversInfo: ReciverInfoV2) => Promise<ledgerTypes.TransferOperationBuilder>;
export {};
