import MultyxClientList from "./list";
import MultyxClientObject from "./object";
import MultyxClientValue from "./value";

type MultyxClientItem<T = any> = T extends any[] ? MultyxClientList
    : T extends object ? MultyxClientObject
    : MultyxClientValue;

function IsMultyxClientItem(item: any): item is MultyxClientItem {
    return item instanceof MultyxClientList || item instanceof MultyxClientObject || item instanceof MultyxClientValue;
}

export {
    MultyxClientList,
    MultyxClientObject,
    MultyxClientValue,
    MultyxClientItem,
    IsMultyxClientItem,
};