import { ledgerTypes } from '@findora-network/findora-sdk-v2-core';
import { WalletKeypar } from '@findora-network/findora-sdk-v2-keypair';
import { NetworkTypes } from '@findora-network/findora-sdk-v2-network';
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
export declare const filterUtxoByCode: (code: string, utxoDataList: AddUtxoItem[]) => AddUtxoItem[];
export declare const decryptUtxoItem: (sid: number, walletInfo: WalletKeypar, utxoData: NetworkTypes.UtxoResponse, memoData?: NetworkTypes.OwnedMemoResponse) => Promise<AddUtxoItem>;
export declare const getUtxoItem: (sid: number, walletInfo: WalletKeypar) => Promise<AddUtxoItem>;
export declare const addUtxo: (walletInfo: WalletKeypar, addSids: number[]) => Promise<AddUtxoItem[]>;
export declare const getSendUtxoForAmount: (code: string, amount: BigInt, utxoDataList: AddUtxoItem[]) => UtxoOutputItem[];
export declare const getSendUtxo: (code: string, amount: BigInt, utxoDataList: AddUtxoItem[]) => UtxoOutputItem[];
export declare const addUtxoInputs: (utxoSids: UtxoOutputItem[]) => Promise<UtxoInputsInfo>;
export declare const getUtxoWithAmount: (walletInfo: WalletKeypar, utxoNumbers: BigInt, assetCode: string) => Promise<UtxoOutputItem>;
export {};
