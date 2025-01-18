import MultyxList from "./list";
import MultyxObject from "./object";
import MultyxValue from "./value";

type MultyxItem<T = any> = T extends any[] ? MultyxList
    : T extends object ? MultyxObject
    : MultyxValue;

export {
    MultyxList,
    MultyxObject,
    MultyxValue,
    MultyxItem,
};