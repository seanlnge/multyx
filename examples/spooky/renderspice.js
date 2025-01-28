const toRad = function(theta){ return theta/180*Math.PI };
const toDeg = function(theta){ return theta*180/Math.PI };
const clamp = function(min, max, value){ return Math.max(Math.min(max, value), min) };

function rs(){
    let canvas;
    let ctx;
    let FrameTime = Date.now();
    let CurrObjectID = 0;

    rs.frame = 0;
    rs.totalTime = 0;
    rs.deltaTime = 0;
    rs.timeSpeed = 1;
    rs.ambientLighting = [0, "white"];
    rs.epsilon = 0.01;

    rs.spaceToPixels = function(x, y){
        let sx = (x - rs.camera.x + rs.camera.w/2) / rs.camera.w * canvas.width;
        let sy = (y - rs.camera.y - rs.camera.h/2) / rs.camera.h * -canvas.height;
        return { x: sx, y: sy };
    }

    // Keyboard Events
    rs.key = [];
    rs.mouse = { screen: {}, movement: {}, space: {}, down: false };
    
    
    // Starting Settings
    rs.camera = {
        x: 0, y: 0, w: 50, h: 25, background: "white", rotation: 0
    }
    rs.objects = {
        none: { x: 0, y: 0, objects: [] }
    };
    rs.ui = [];

    // Setting Main Canvas
    rs.setCanvas = function(canvasId){
        canvas = document.querySelector(canvasId)
        ctx = canvas.getContext("2d");

        canvas.width = window.innerWidth * 2;
        canvas.height = window.innerHeight * 2;

        ctx.translate(canvas.width/2, canvas.height/2);
        ctx.scale(1, -1);

        ctx.clearRect(-canvas.width/2, -canvas.height/2, canvas.width, canvas.height);
        rs.render();
    }

    // Creating a New Tag
    rs.newTag = function(name){
        rs.objects[name] = {
            x: 0,
            y: 0,
            velocity: { x:0, y:0 },
            gravity: 0,
            ceil: "none",
            ground: "none",
            objects: []
        };
        return rs.objects[name];
    }

    // Creating a New UI Object
    rs.newUI = new function(){
        this.text = function(text, x, y, size, font, color, tag){
            if(!tag) tag = "none";

            rs.objects[tag].objects.push({
                id: CurrObjectID, shape: "ui", type: "text", text, x, y, size, font, color, velocity: { x:0, y:0 }, gravity: 0
            });
            CurrObjectID++;
            return rs.ui[rs.ui.length-1];
        }
    }
    
    // Duplicating an Object
    rs.duplicate = new function(){
        this.tag = function(tag, newName, x, y){
            objects[newName] = objects[tag];
            objects[newName].x = x;
            objects[newName].y = y;
            return objects[newName];
        }
        this.object = function(object, x, y, tag){
            if(!tag) tag = "none";
            objects[tag].objects.push(object);
            objects[tag].objects[objects[tag].objects-1].id = CurrObjectID;
            objects[tag].objects[objects[tag].objects-1].x = x;
            objects[tag].objects[objects[tag].objects-1].y = y;
            CurrObjectID++;
            return objects[tag].objects[objects[tag].objects-1];
        }
    }

    // Destroying an Object
    rs.destroy = new function(){
        this.tag = function(tag){
            delete rs.objects[tag];
        }
        this.object = function(object, tag){
            if(!tag) tag = "none";
            let objectIndex = rs.objects[tag].findIndex(a => a.id === object.id);
            rs.objects[tag].splice(objectIndex);
        }
    }

    // Creating an Object
    rs.newObject = new function(){
        this.rect = function(x, y, w, h, rot, color, tag){
            if(!tag) tag = "none";
            rs.objects[tag].objects.push({
                id: CurrObjectID,
                shape: "rectangle",
                x, y, w, h, rot, color, tag,
                gravity: 0,
                ground: "none",
                ceil: "none",
                space: {
                x: x + rs.objects[tag].x,
                y: y + rs.objects[tag].y,
                },
                velocity: { x: 0, y: 0 },
            });
            CurrObjectID++;

            return rs.objects[tag].objects[rs.objects[tag].objects.length-1];
        }
        this.triangle = function(x, y, w, h, rot, color, tag){
            if(!tag) tag = "none";
            rs.objects[tag].objects.push({
                id: CurrObjectID,
                shape: "triangle",
                x, y, w, h, rot, color, tag,
                gravity: 0,
                ground: "none",
                ceil: "none",
                space: {
                    x: x + rs.objects[tag].x,
                    y: y + rs.objects[tag].y,
                },
                velocity: {x: 0, y: 0},
            });
            CurrObjectID++;
            return rs.objects[tag].objects[rs.objects[tag].objects.length-1];
        }
        this.circle = function(x, y, dw, dh, rot, color, tag){
            if(!tag) tag = "none";
            rs.objects[tag].objects.push({
                id: CurrObjectID,
                shape: "ellipse",
                x, y, dw, dh, rot, color, tag,
                ground: "none",
                ceil: "none",
                gravity: 0,
                space: {
                    x: x + rs.objects[tag].x,
                    y: y + rs.objects[tag].y,
                },
                velocity: {x: 0, y: 0},
            });
            CurrObjectID++;
            return rs.objects[tag].objects[rs.objects[tag].objects.length-1];
        }
    }

    // Rendering the Screen
    rs.render = function(){
        rs.frame++;

        // Change Time and Delta Time
        rs.deltaTime = (Date.now() - FrameTime)/1000*rs.timeSpeed;
        FrameTime = Date.now();
        rs.totalTime += rs.deltaTime;

        // Clear Screen and Draw Background
        ctx.clearRect(-canvas.width/2, -canvas.height/2, canvas.width, canvas.height);
        ctx.fillStyle = rs.camera.background;
        ctx.fillRect(-canvas.width/2, -canvas.height/2, canvas.width, canvas.height);
        
        // Change Mouse Position Space
        let spaceX = rs.mouse.screen.x / window.innerWidth * rs.camera.w - rs.camera.w/2 + rs.camera.x;
        let spaceY = -rs.mouse.screen.y / window.innerHeight * rs.camera.h + rs.camera.h/2 + rs.camera.y;
        rs.mouse.space = { x: spaceX, y: spaceY };


        // Render All Objects
        let all = Object.keys(rs.objects);

        for(let h=0; h<all.length; h++){
        
            this.tag = rs.objects[all[h]];
            if(this.tag.velocity){

                this.tag.x += this.tag.velocity.x * rs.deltaTime;
                this.tag.y += this.tag.velocity.y * rs.deltaTime;

                this.tag.velocity.y += rs.deltaTime * this.tag.gravity;
            }

            // Ground and Ceiling Collisions
            if(this.tag.ground !== "none" && this.tag.y < this.tag.ground){
                this.tag.velocity.y = 0;
                this.tag.y = this.tag.ground;
            }
            if(this.tag.ceil !== "none" && this.tag.y > this.tag.ceil){
                this.tag.velocity.y = 0;
                this.tag.y = this.tag.ceil;
            }
            
            for(let i=0; i<rs.objects[all[h]].objects.length; i++){
                
                this.object = this.tag.objects[i];

                if(this.object.shape !== "ui"){
                    // Gravity
                    this.object.velocity.y += rs.deltaTime * this.object.gravity;

                    // Rotation is Less than 360
                    this.object.rot %= 360;

                    this.x = this.object.x - rs.camera.x + this.tag.x;
                    this.y = this.object.y - rs.camera.y + this.tag.y;
                    this.w = this.object.w;
                    this.h = this.object.h;

                    // Move Object based on Velocity
                    this.object.x += this.object.velocity.x * rs.deltaTime;
                    this.object.y += this.object.velocity.y * rs.deltaTime;
                    this.object.space.x = this.object.x + this.tag.x;
                    this.object.space.y = this.object.y + this.tag.y;
                    

                    // Ground and Ceiling Collisions
                    if(this.object.ground !== "none" && this.object.y < this.object.ground){
                        this.object.velocity.y = 0;
                        this.object.y = this.object.ground;
                    }
                    if(this.object.ceil !== "none" && this.object.y > this.object.ceil){
                        this.object.velocity.y = 0;
                        this.object.y = this.object.ceil;
                    }
                }

                const toX = function(x){ return Math.floor(x/rs.camera.w*canvas.width) }
                const toY = function(y){ return Math.floor(y/rs.camera.h*canvas.height) }

                if(this.object.shape === "rectangle"){
                    ctx.translate(toX(this.x).toFixed(4), toY(this.y).toFixed(4));
                    if(this.object.rot != 0) ctx.rotate(toRad(this.object.rot).toFixed(4));

                    ctx.fillStyle = this.object.color;
                    ctx.fillRect(-toX(this.w/2).toFixed(4), -toY(this.h/2).toFixed(4), toX(this.w).toFixed(4), toY(this.h).toFixed(4));

                    if(this.object.rot != 0){
                        ctx.rotate(-toRad(this.object.rot).toFixed(4));
                    }
                    ctx.translate(-toX(this.x).toFixed(4), -toY(this.y).toFixed(4));
                }
                if(this.object.shape === "triangle"){
                    this.p1 = {x:this.x, y:this.y+this.h/2}
                    this.p2 = {x:this.x+this.w/2, y:this.y-this.h/2}
                    this.p3 = {x:this.x-this.w/2, y:this.y-this.h/2}

                    ctx.translate(toX(this.x).toFixed(4), toY(this.y).toFixed(4));
                    if(this.object.rot != 0){
                        ctx.rotate(toRad(this.object.rot).toFixed(4));
                    }
                    ctx.strokeStyle = this.object.color;
                    ctx.fillStyle = this.object.color;
                    ctx.lineWidth = 0;

                    ctx.beginPath();
                    ctx.moveTo(toX(0).toFixed(4), toY(this.h/2).toFixed(4));
                    ctx.lineTo(toX(this.w/2).toFixed(4), toY(-this.h/2).toFixed(4));
                    ctx.lineTo(toX(-this.w/2).toFixed(4), toY(-this.h/2).toFixed(4));
                    ctx.closePath();
                    ctx.stroke();
                    ctx.fill();

                    if(this.object.rot != 0){
                        ctx.rotate(-toRad(this.object.rot).toFixed(4));
                    }
                    ctx.translate(-toX(this.x).toFixed(4), -toY(this.y).toFixed(4));
                }
                if(this.object.shape === "ellipse"){
                    ctx.translate(toX(this.x).toFixed(4), toY(this.y).toFixed(4));
                    if(this.object.rot != 0){
                        ctx.rotate(toRad(this.object.rot).toFixed(4));
                    }

                    ctx.strokeStyle = this.object.color;
                    ctx.fillStyle = this.object.color;
                    ctx.lineWidth = 3;

                    ctx.beginPath();
                    ctx.ellipse(toX(0).toFixed(4), toY(0).toFixed(4), toX(this.object.dw/2).toFixed(4), toY(this.object.dh/2).toFixed(4), 0, 0, Math.PI*2);
                    ctx.stroke();
                    ctx.fill();
                    ctx.closePath();

                    if(this.object.rot != 0){
                        ctx.rotate(-toRad(this.object.rot).toFixed(4));
                    }
                    ctx.translate(-toX(this.x).toFixed(4), -toY(this.y).toFixed(4));
                }
                if(this.object.shape === "ui"){
                    ctx.save();
                    ctx.setTransform(1, 0, 0, 1, 0, 0);
                    if(this.object.type === "text"){
                        ctx.font = this.object.size + "px " + this.object.font;
                        ctx.fillStyle = this.object.color;
                        ctx.textAlign = "center";
                        ctx.fillText(this.object.text, this.object.x, this.object.y+this.object.size);
                    }
                    ctx.translate(canvas.width/2, canvas.height/2);
                    ctx.scale(1, -1);
                }
            }
        }
    }
}
rs();

document.addEventListener("keydown", (e) => {
    rs.key[e.key] = true;
    rs.key[e.keyCode] = true;
});
document.addEventListener("keyup", (e) => {
    if(rs.key[e.key]) delete rs.key[e.key];
    if(rs.key[e.keyCode]) delete rs.key[e.keyCode];
});

// Mouse Events
document.addEventListener("mousedown", (e) => {
    rs.mouse.down = true;
});
document.addEventListener("mousemove", (e) => {
    rs.mouse.screen = { x: e.pageX, y: e.pageY }
    rs.mouse.movement = { x: e.movementX, y: e.movementY }
    let spaceX = rs.mouse.screen.x / window.innerWidth * rs.camera.w - rs.camera.w/2 + rs.camera.x;
    let spaceY = -rs.mouse.screen.y / window.innerHeight * rs.camera.h + rs.camera.h/2 + rs.camera.y;
    rs.mouse.space = { x: spaceX, y: spaceY };
});
document.addEventListener("mouseup", (e) => {
    rs.mouse.down = false;
});