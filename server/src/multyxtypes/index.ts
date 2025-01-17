import { Value } from "../types";
import { MultyxList } from "./list";
import { MultyxObject } from "./object";
import { MultyxValue } from "./value";

type MultyxType<T> = T extends any[] ? MultyxList
    : T extends object ? MultyxObject
    : MultyxValue;
    
export {
    MultyxList,
    MultyxObject,
    MultyxValue,
    MultyxType
};