"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUtxoWithAmount = exports.addUtxoInputs = exports.getSendUtxo = exports.getSendUtxoForAmount = exports.addUtxo = exports.getUtxoItem = exports.decryptUtxoItem = exports.filterUtxoByCode = void 0;
// import * as Network from '../api/network';
var findora_sdk_v2_core_1 = require("@findora-network/findora-sdk-v2-core");
var findora_sdk_v2_network_1 = require("@findora-network/findora-sdk-v2-network");
/**
 * Prior to using SDK we have to initialize its environment configuration
 */
var sdkEnv = {
    hostUrl: 'http://127.0.0.1',
    cachePath: './cache',
};
findora_sdk_v2_network_1.NetworkEnvironment.init(sdkEnv);
var mergeUtxoList = function (arr1, arr2) {
    var res = [];
    while (arr1.length && arr2.length) {
        var assetItem1 = arr1[0];
        var assetItem2 = arr2[0];
        var amount1 = BigInt(assetItem1.body.amount);
        var amount2 = BigInt(assetItem2.body.amount);
        if (amount1 < amount2) {
            res.push(arr1.splice(0, 1)[0]);
            continue;
        }
        res.push(arr2.splice(0, 1)[0]);
    }
    return res.concat(arr1, arr2);
};
var mergeSortUtxoList = function (arr) {
    if (arr.length < 2)
        return arr;
    var middleIdx = Math.floor(arr.length / 2);
    var left = arr.splice(0, middleIdx);
    var right = arr.splice(0);
    return mergeUtxoList(mergeSortUtxoList(left), mergeSortUtxoList(right));
};
var filterUtxoByCode = function (code, utxoDataList) {
    return utxoDataList.filter(function (assetItem) { var _a; return ((_a = assetItem === null || assetItem === void 0 ? void 0 : assetItem.body) === null || _a === void 0 ? void 0 : _a.asset_type) === code; });
};
exports.filterUtxoByCode = filterUtxoByCode;
// is called only from getUtxoItem
var decryptUtxoItem = function (sid, walletInfo, utxoData, memoData) { return __awaiter(void 0, void 0, void 0, function () {
    var ledger, assetRecord, err, ownerMemo, err, decryptAssetData, error_1, err, decryptedAsetType, err, item;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, (0, findora_sdk_v2_core_1.getLedger)()];
            case 1:
                ledger = _a.sent();
                try {
                    assetRecord = ledger.ClientAssetRecord.from_json(utxoData.utxo);
                }
                catch (error) {
                    err = error;
                    throw new Error("Can not get client asset record. Details: \"".concat(err.message, "\""));
                }
                try {
                    ownerMemo = memoData ? ledger.OwnerMemo.from_json(memoData) : undefined;
                }
                catch (error) {
                    err = error;
                    throw new Error("Can not decode owner memo. Details: \"".concat(err.message, "\""));
                }
                console.log('client asset record', assetRecord);
                console.log('walletInfo', walletInfo);
                console.log('typeof walletInfo keypair', typeof walletInfo.keypair);
                _a.label = 2;
            case 2:
                _a.trys.push([2, 4, , 5]);
                return [4 /*yield*/, ledger.open_client_asset_record(assetRecord, ownerMemo === null || ownerMemo === void 0 ? void 0 : ownerMemo.clone(), walletInfo.keypair)];
            case 3:
                decryptAssetData = _a.sent();
                return [3 /*break*/, 5];
            case 4:
                error_1 = _a.sent();
                console.log('client asset record error!');
                err = error_1;
                throw new Error("Can not open client asset record to decode. 1 Details: \"".concat(err.message, "\""));
            case 5:
                try {
                    decryptedAsetType = ledger.asset_type_from_jsvalue(decryptAssetData.asset_type);
                }
                catch (error) {
                    err = error;
                    throw new Error("Can not decrypt asset type. Details: \"".concat(err.message, "\""));
                }
                decryptAssetData.asset_type = decryptedAsetType;
                decryptAssetData.amount = BigInt(decryptAssetData.amount);
                item = {
                    address: walletInfo.address,
                    sid: sid,
                    body: decryptAssetData || {},
                    utxo: __assign({}, utxoData.utxo),
                    ownerMemo: ownerMemo === null || ownerMemo === void 0 ? void 0 : ownerMemo.clone(),
                    memoData: memoData,
                };
                return [2 /*return*/, item];
        }
    });
}); };
exports.decryptUtxoItem = decryptUtxoItem;
// is called only by addUtxo
var getUtxoItem = function (sid, walletInfo) { return __awaiter(void 0, void 0, void 0, function () {
    var utxoDataResult, utxoData, utxoError, memoDataResult, memoData, memoError, item;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                // if (cachedItem) {
                //   return cachedItem;
                // }
                console.log("Fetching sid \"".concat(sid, "\""));
                return [4 /*yield*/, findora_sdk_v2_network_1.Network.getUtxo(sid)];
            case 1:
                utxoDataResult = _a.sent();
                utxoData = utxoDataResult.response, utxoError = utxoDataResult.error;
                if (utxoError || !utxoData) {
                    throw new Error("Could not fetch utxo data for sid \"".concat(sid, "\", Error - ").concat(utxoError === null || utxoError === void 0 ? void 0 : utxoError.message));
                }
                return [4 /*yield*/, findora_sdk_v2_network_1.Network.getOwnerMemo(sid)];
            case 2:
                memoDataResult = _a.sent();
                memoData = memoDataResult.response, memoError = memoDataResult.error;
                if (memoError) {
                    throw new Error("Could not fetch memo data for sid \"".concat(sid, "\", Error - ").concat(memoError.message));
                }
                return [4 /*yield*/, (0, exports.decryptUtxoItem)(sid, walletInfo, utxoData, memoData)];
            case 3:
                item = _a.sent();
                // console.log('???? ~ file: utxoHelper.ts ~ line 155 ~ sid processed', sid);
                // console.log('???? ~ file: utxoHelper.ts ~ line 178 ~ item', item);
                return [2 /*return*/, item];
        }
    });
}); };
exports.getUtxoItem = getUtxoItem;
// creates a list of items with descrypted utxo information
var addUtxo = function (walletInfo, addSids) { return __awaiter(void 0, void 0, void 0, function () {
    var utxoDataList, i, sid, item, error_2, err;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                utxoDataList = [];
                i = 0;
                _a.label = 1;
            case 1:
                if (!(i < addSids.length)) return [3 /*break*/, 6];
                sid = addSids[i];
                _a.label = 2;
            case 2:
                _a.trys.push([2, 4, , 5]);
                return [4 /*yield*/, (0, exports.getUtxoItem)(sid, walletInfo)];
            case 3:
                item = _a.sent();
                utxoDataList.push(item);
                return [3 /*break*/, 5];
            case 4:
                error_2 = _a.sent();
                console.log('add error', error_2);
                err = error_2;
                console.log("Could not process addUtxo for sid ".concat(sid, ", Details: \"").concat(err.message, "\""));
                return [3 /*break*/, 5];
            case 5:
                i++;
                return [3 /*break*/, 1];
            case 6: 
            // try {
            //   await Cache.write(fullPathToCacheEntry, cacheDataToSave, Sdk.environment.cacheProvider);
            // } catch (error) {
            //   const err: Error = error as Error;
            //   console.log(`Could not write cache for utxoData, "${err.message}"`);
            // }
            return [2 /*return*/, utxoDataList];
        }
    });
}); };
exports.addUtxo = addUtxo;
var getSendUtxoForAmount = function (code, amount, utxoDataList) {
    var result = [];
    var filteredUtxoList = (0, exports.filterUtxoByCode)(code, utxoDataList);
    console.log('???? ~ file: utxoHelper.ts ~ line 307 ~ amount', amount);
    for (var _i = 0, filteredUtxoList_1 = filteredUtxoList; _i < filteredUtxoList_1.length; _i++) {
        var assetItem = filteredUtxoList_1[_i];
        var _amount = BigInt(assetItem.body.amount);
        console.log('???? ~ file: utxoHelper.ts ~ line 307 ~ _amount', _amount);
        if (_amount === amount) {
            result.push({
                amount: _amount,
                originAmount: _amount,
                sid: assetItem.sid,
                utxo: __assign({}, assetItem.utxo),
                ownerMemo: assetItem.ownerMemo,
                memoData: assetItem.memoData,
            });
            break;
        }
    }
    return result;
};
exports.getSendUtxoForAmount = getSendUtxoForAmount;
var getSendUtxo = function (code, amount, utxoDataList) {
    var result = [];
    var filteredUtxoList = (0, exports.filterUtxoByCode)(code, utxoDataList);
    var sortedUtxoList = mergeSortUtxoList(filteredUtxoList);
    var sum = BigInt(0);
    for (var _i = 0, sortedUtxoList_1 = sortedUtxoList; _i < sortedUtxoList_1.length; _i++) {
        var assetItem = sortedUtxoList_1[_i];
        var _amount = BigInt(assetItem.body.amount);
        sum = sum + _amount;
        var credit = BigInt(Number(sum) - Number(amount));
        var remainedDebt = _amount - credit;
        var amountToUse = credit > 0 ? remainedDebt : _amount;
        result.push({
            amount: amountToUse,
            originAmount: _amount,
            sid: assetItem.sid,
            utxo: __assign({}, assetItem.utxo),
            ownerMemo: assetItem.ownerMemo,
            memoData: assetItem.memoData,
        });
        if (credit >= 0) {
            break;
        }
    }
    return result;
};
exports.getSendUtxo = getSendUtxo;
// creates a list of inputs, which would be used by transaction builder in a fee service
// used in fee.buildTransferOperation , fee.getFeeInputs
var addUtxoInputs = function (utxoSids) { return __awaiter(void 0, void 0, void 0, function () {
    var ledger, inputAmount, inputParametersList, i, item, assetRecord, err, txoRef, err, inputParameters, res;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, (0, findora_sdk_v2_core_1.getLedger)()];
            case 1:
                ledger = _a.sent();
                inputAmount = BigInt(0);
                inputParametersList = [];
                for (i = 0; i < utxoSids.length; i += 1) {
                    item = utxoSids[i];
                    inputAmount = BigInt(Number(inputAmount) + Number(item.originAmount));
                    assetRecord = void 0;
                    try {
                        assetRecord = ledger.ClientAssetRecord.from_json(item.utxo);
                    }
                    catch (error) {
                        err = error;
                        throw new Error("Can not get client asset record. Details: \"".concat(err.message, "\""));
                    }
                    txoRef = void 0;
                    try {
                        txoRef = ledger.TxoRef.absolute(BigInt(item.sid));
                    }
                    catch (error) {
                        err = error;
                        throw new Error("Can not convert given sid id to a BigInt, \"".concat(item.sid, "\", Details - \"").concat(err.message, "\""));
                    }
                    inputParameters = {
                        txoRef: txoRef,
                        assetRecord: assetRecord,
                        ownerMemo: item === null || item === void 0 ? void 0 : item.ownerMemo,
                        amount: item.amount,
                        memoData: item.memoData,
                        sid: item.sid,
                    };
                    inputParametersList.push(inputParameters);
                }
                res = { inputParametersList: inputParametersList, inputAmount: inputAmount };
                return [2 /*return*/, res];
        }
    });
}); };
exports.addUtxoInputs = addUtxoInputs;
var getUtxoWithAmount = function (walletInfo, utxoNumbers, assetCode) { return __awaiter(void 0, void 0, void 0, function () {
    var sids, utxoDataList, sendUtxoList, utxoInput;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, findora_sdk_v2_network_1.Network.getOwnedSids(walletInfo.publickey)];
            case 1:
                sids = (_a.sent()).response;
                if (!sids) {
                    console.log('ERROR no sids available');
                    throw new Error("could not get an utxo with an amount of ".concat(utxoNumbers, " for asset code ").concat(assetCode, ". No sids available"));
                }
                return [4 /*yield*/, (0, exports.addUtxo)(walletInfo, sids)];
            case 2:
                utxoDataList = _a.sent();
                sendUtxoList = (0, exports.getSendUtxoForAmount)(assetCode, utxoNumbers, utxoDataList);
                utxoInput = sendUtxoList[0];
                if (!utxoInput) {
                    throw new Error("could not get an utxo with an amount of ".concat(utxoNumbers, " for asset code ").concat(assetCode));
                }
                return [2 /*return*/, utxoInput];
        }
    });
}); };
exports.getUtxoWithAmount = getUtxoWithAmount;
//# sourceMappingURL=utxoHelper.js.map