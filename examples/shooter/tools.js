class ListTools {
    static ForAll(multyxList, callback) {
        for(let i = 0; i < multyxList.length; i++) {
            callback(multyxList.get(i), i);
        }
        multyxList.addEditCallback((index, value) => {
            if(value) callback(value, index);
        });
    }
}