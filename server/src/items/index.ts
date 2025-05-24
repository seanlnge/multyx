import MultyxList from "./list";
import MultyxObject from "./object";
import MultyxValue from "./value";
import MultyxUndefined from './undefined';

function IsMultyxItem(data: any): data is MultyxItem {
    if(data instanceof MultyxList) return true;
    if(data instanceof MultyxObject) return true;
    if(data instanceof MultyxValue) return true;
    if(data instanceof MultyxUndefined) return true;
    return false;
}

type MultyxItem<T = any> = T extends any[] ? MultyxList
    : T extends object ? MultyxObject
    : MultyxValue;

export {
    IsMultyxItem,
    MultyxList,
    MultyxObject,
    MultyxValue,
    MultyxItem,
    MultyxUndefined
};