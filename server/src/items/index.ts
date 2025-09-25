import MultyxList from "./list";
import MultyxObject from "./object";
import MultyxValue from "./value";

function IsMultyxItem(data: any): data is MultyxItem {
    if(data instanceof MultyxList) return true;
    if(data instanceof MultyxObject) return true;
    if(data instanceof MultyxValue) return true;
    //if(data instanceof MultyxUndefined) return true;
    return false;
}

// Recursive type transformation that converts regular types into MultyxItem equivalents
type MultyxItem<T = any> = T extends any[] 
    ? MultyxList<T[number]> & MultyxItem<T[number]>[]
    : T extends object 
        ? MultyxObject<T> & { [K in keyof T]: MultyxItem<T[K]> }
        : MultyxValue<T>;

// Helper type to get the proper MultyxItem type for object properties  
type MultyxObjectData<T extends object> = {
    [K in keyof T]: MultyxItem<T[K]>
} & { [key: string]: MultyxItem<any> };

export {
    IsMultyxItem,
    MultyxList,
    MultyxObject,
    MultyxValue,
    MultyxItem,
    MultyxObjectData
};