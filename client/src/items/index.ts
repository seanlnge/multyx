import MultyxClientList from "./list";
import MultyxClientObject from "./object";
import MultyxClientValue from "./value";

type MultyxClientItem<T = any> = T extends any[] ? MultyxClientList
    : T extends object ? MultyxClientObject
    : MultyxClientValue;

function IsMultyxClientItem(value: any): value is MultyxClientItem {
    return value instanceof MultyxClientList || value instanceof MultyxClientObject || value instanceof MultyxClientValue;
}

export {
    MultyxClientList,
    MultyxClientObject,
    MultyxClientValue,
    MultyxClientItem,
    IsMultyxClientItem,
};