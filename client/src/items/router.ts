export default function MultyxClientItemRouter(data: any) {
    return Array.isArray(data) ? require('./list').default
        : typeof data == 'object' ? require('./object').default
        : require('./value').default;
}