/*

WARNING:

This is an extremely fragile folder.

This file and system of lazy-loading MultyxItems is necessary to
circumvent circular dependencies.

MultyxObject needs to be able to determine which MultyxItem to create for
each child property that the object its mirroring. This requires the imports
for all MultyxItems, however, any MultyxItems that extend from MultyxObject,
such as MultyxList, create circular dependencies by extending a class that
is importing themselves.

This file was created to circumvent this issue by lazy-loading the MultyxItem
that MultyxObject creates.


For any future development of this folder, ensure that dependencies do not
link to the index.ts file, but to the specific file containing the default
export of that MultyxItem. The index.ts file is strictly meant for external
access of MultyxItems from outside this folder. Similarly, no class within
this folder should access anything but the type of classes outside of this
folder.

Any future MultyxItems that may be created should extend upwards from the
base item MultyxObject, and lower-level nodes should never import any
higher-level nodes, except for in this file, where they may be lazy-loaded.

MultyxValue is also a fragile class, and any changes or extension classes of
this MultyxItem should not import many dependencies at all.

*/

export default function MultyxItemRouter(data: any) {
    return Array.isArray(data) ? require('./list').default
        : typeof data == 'object' ? require('./object').default
        : require('./value').default;
}