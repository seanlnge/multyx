const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

Multyx.on(Multyx.Start, () => Multyx.self.messages.push('first'));
Multyx.on(Multyx.Update, () => console.log(Multyx.self.messages));