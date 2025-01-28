const multyx = new Multyx();
const canvas = document.querySelector("#canvas");

rs.setCanvas("#canvas");
multyx.controller.mapMouseToCanvas(canvas);

// Changing Inv space
function inv(n){
    multyx.self.inventorySlot = n;
    for(let i=0; i<5; i++){
        document.getElementById("slot" + i).style.left = "2vw";
    }
    document.getElementById("slot" + n).style.left = "0vw";
}

let green;
let orange;
multyx.on(Multyx.Start, () => {
    green = multyx.teams.game.green;
    orange = multyx.teams.game.orange;
    
    green.bullets.forAll(bullet => {
        bullet.x.Lerp();
        bullet.y.Lerp();
    });
    orange.bullets.forAll(bullet => {
        bullet.x.Lerp();
        bullet.y.Lerp();
    });
});

multyx.forAll(client => {
    client.x.Lerp();
    client.y.Lerp();
});

multyx.loop(() => {
    rs.newTag("moving");
    rs.camera.x = multyx.self.x || 0;
    rs.camera.y = multyx.self.y + 6 || 0;
    document.getElementById("health").innerText = 'Health: ' + Math.floor(multyx.self.health);
    document.getElementById("coins").innerText = 'Coins: ' + multyx.self.coins;

    for(let i=0; i<multyx.teams.game.messages.length; i++) {
        const msg = multyx.teams.game.messages[i];
        document.querySelector("#msg" + i).innerText = msg;
    }

    for(const uuid of [...orange.players, ...green.players]) {
        const player = multyx.clients[uuid];
        if(player.x > rs.camera.x + 50 || player.x < rs.camera.x - 50) continue;
        
        rs.newObject.rect(player.x, player.y, 2, 2, 0, player.team == "orange" ? "#ff5500" : "#29f057", "moving");
        rs.newUI.text(uuid, ...Object.values(rs.spaceToPixels(player.x, player.y + 3)), 48, "Arial", "#000000", "moving");
        
        // Healthbar
        rs.newObject.rect(player.x, player.y + 1.5, 2, 0.3, 0, "#ff6666", "moving");
        rs.newObject.rect(player.x - (100-player.health)/100, player.y + 1.5, player.health/50, 0.3, 0, "#47ff4e", "moving");
    }
    
    for(const bullet of [...orange.bullets, ...green.bullets]){
        if(!bullet) continue;

        if(bullet.x > rs.camera.x + 50
        || bullet.x < rs.camera.x - 50
        || bullet.y > rs.camera.y + 50
        || bullet.y < rs.camera.y - 50) continue;

        if(bullet.type == 0) {
            rs.newObject.rect(bullet.x, bullet.y, 0.4, 0.25, toDeg(bullet.angle), "#f0d99c", "moving");
        } 
        
        else if(bullet.type == 1) {
            rs.newObject.circle(bullet.x, bullet.y, 0.4, 0.4, toDeg(bullet.angle), "#220022", "moving");
        }
        
        else if(bullet.type == 2) {
            rs.newObject.rect(bullet.x, bullet.y, 0.7, 0.3, toDeg(bullet.angle), "#ffffff", "moving");
        }
        
        // Draw Pie on Top of Pie Sheet
        else if(bullet.type == 3) {
            rs.newObject.rect(bullet.x, bullet.y, 0.2, 0.5, toDeg(bullet.angle), "#555555", "moving");
            let pieX = Math.cos(bullet.angle) * bullet.angle * 0.2;
            let pieY = Math.sin(bullet.angle) * bullet.angle * 0.2;
            rs.newObject.rect(bullet.x + pieX, bullet.y + pieY, 0.3, 0.7, toDeg(bullet.angle), "#ffee8a", "moving");
        
        }
        
        // Draw Pumpkin and 2 Eyes
        else if(bullet.type == 4) {
            // Find Correct X and Y Based On Angle
            let cosAngle = Math.cos(bullet.angle) * bullet.angle;
            let sinAngle = Math.sin(bullet.angle) * bullet.angle;
            let lx = 0.2 * cosAngle + 0.1 * sinAngle;
            let ly = 0.2 * sinAngle + 0.1 * cosAngle;
            let rx = -0.2 * cosAngle + 0.1 * sinAngle;
            let ry = -0.2 * sinAngle + 0.1 * cosAngle;

            rs.newObject.rect(bullet.x, bullet.y, 0.9, 0.9, toDeg(bullet.angle), "#ff7900", "moving");
            rs.newObject.rect(bullet.x + lx, bullet.y + ly, 0.2, 0.2, toDeg(bullet.angle), "#000000", "moving");
            rs.newObject.rect(bullet.x + rx, bullet.y + ry, 0.2, 0.2, toDeg(bullet.angle), "#000000", "moving");
        }
    }

    
    // Draw Team Health Bars
    let o = rs.spaceToPixels(-rs.camera.w/4 + rs.camera.x , 37 * rs.camera.h/80 + rs.camera.y);
    let g = rs.spaceToPixels(rs.camera.w/4 + rs.camera.x , 37 * rs.camera.h/80 + rs.camera.y);
    
    let ol = rs.camera.w / 3 * (orange.health)/5000;
    let gl = rs.camera.w / 3 * (green.health)/5000;
    let ox = -rs.camera.w/4;
    let gx = rs.camera.w/4;
    
    // Red Bar
    rs.newObject.rect(ox+rs.camera.x, 9 * rs.camera.h/20 + rs.camera.y, rs.camera.w/3, 0.8, 0, "#ff6666", "moving");
    rs.newObject.rect(gx+rs.camera.x, 9 * rs.camera.h/20 + rs.camera.y, rs.camera.w/3, 0.8, 0, "#ff6666", "moving");

    // Colored Bar
    rs.newObject.rect(ox-(rs.camera.w/6 - ol/2) + rs.camera.x, 9 * rs.camera.h/20 + rs.camera.y, ol, 0.8, 0, "#ff5500", "moving");
    rs.newObject.rect(gx-(rs.camera.w/6- gl/2) + rs.camera.x, 9 * rs.camera.h/20 + rs.camera.y, gl, 0.8, 0, "#47ff4e", "moving");
    
    // Text for Health
    rs.newUI.text(orange.health, o.x, o.y, 24, "Arial", "#000000", "moving");
    rs.newUI.text(green.health, g.x, g.y, 24, "Arial", "#000000", "moving");

    // Render and Remove Objects
    rs.render();

    rs.destroy.tag("moving");
});