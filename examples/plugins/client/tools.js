class ListTools {
    static ForAll(multyxList, callback) {
        for(let i = 0; i < multyxList.length; i++) {
            callback(multyxList.get(i), i);
        }
        multyxList.addEditCallback((index, value, oldValue) => {
            if(oldValue === undefined) callback(value, index);
        });
    }
}