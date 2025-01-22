import MultyxClientList from "./list";
import MultyxClientObject from "./object";
import MultyxClientValue from "./value";

type MultyxClientItem<T = any> = T extends any[] ? MultyxClientList
    : T extends object ? MultyxClientObject
    : MultyxClientValue;

export {
    MultyxClientList,
    MultyxClientObject,
    MultyxClientValue,
    MultyxClientItem,
};