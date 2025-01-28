rs.newTag("static");

// Orange House
rs.newObject.rect(-270.2, -3.1, 0.4, 8, 0, "#000000", "static");
rs.newObject.rect(-279.8, -3.1, 0.4, 8, 0, "#000000", "static");
rs.newObject.triangle(-275, 2, 12, 3, 0, "#000000", "static");
rs.newObject.rect(-271.75, -1, 6, 0.3, -60, "#000000", "static");
rs.newObject.rect(-273.75, -1, 6, 0.3, 60, "#000000", "static");
rs.newObject.rect(-272.75, -4.5, 6, 0.3, -60, "#000000", "static");
rs.newObject.rect(-274.1, -5.2, 4.5, 0.3, -60, "#000000", "static");
rs.newObject.triangle(-292, 10, 14, 4, 0, "#000000", "static");
rs.newObject.rect(-286.2, 0.5, 0.4, 15, 0, "#000000", "static");
rs.newObject.rect(-287.75, 6.5, 6, 0.3, -60, "#000000", "static");
rs.newObject.rect(-289.75, 6.5, 6, 0.3, 60, "#000000", "static");
rs.newObject.rect(-288.75, 3, 6, 0.3, -60, "#000000", "static");
rs.newObject.rect(-287.75, -0.3, 6, 0.3, 60, "#000000", "static");
rs.newObject.rect(-290.25, 0.7, 6, 0.3, 60, "#000000", "static");
rs.newObject.rect(-290.25, -2.5, 22.7, 0.3, -20, "#000000", "static");
rs.newObject.rect(-277.55, -4.2, 5.2, 0.3, 20, "#000000", "static");
rs.newObject.rect(-288.75, -5, 6, 0.3, -60, "#000000", "static");
rs.newObject.rect(-292.75, -4, 7, 0.3, -60, "#000000", "static");
rs.newObject.rect(-292, -4, 5, 0.3, 20, "#000000", "static");
rs.newObject.rect(-293.5, 3.2, 5, 0.3, 20, "#000000", "static");


// Green House
rs.newObject.rect(270.2, -3.1, 0.4, 8, 0, "#000000", "static");
rs.newObject.rect(279.8, -3.1, 0.4, 8, 0, "#000000", "static");
rs.newObject.triangle(275, 2, 12, 3, 0, "#000000", "static");
rs.newObject.rect(271.75, -1, 6, 0.3, 60, "#000000", "static");
rs.newObject.rect(273.75, -1, 6, 0.3, -60, "#000000", "static");
rs.newObject.rect(272.75, -4.5, 6, 0.3, 60, "#000000", "static");
rs.newObject.rect(274.1, -5.2, 4.5, 0.3, 60, "#000000", "static");
rs.newObject.triangle(292, 10, 14, 4, -0, "#000000", "static");
rs.newObject.rect(286.2, 0.5, 0.4, 15, -0, "#000000", "static");
rs.newObject.rect(287.75, 6.5, 6, 0.3, 60, "#000000", "static");
rs.newObject.rect(289.75, 6.5, 6, 0.3, -60, "#000000", "static");
rs.newObject.rect(288.75, 3, 6, 0.3, 60, "#000000", "static");
rs.newObject.rect(287.75, -0.3, 6, 0.3, -60, "#000000", "static");
rs.newObject.rect(290.25, 0.7, 6, 0.3, -60, "#000000", "static");
rs.newObject.rect(290.25, -2.5, 22.7, 0.3, 20, "#000000", "static");
rs.newObject.rect(277.55, -4.2, 5.2, 0.3, -20, "#000000", "static");
rs.newObject.rect(288.75, -5, 6, 0.3, 60, "#000000", "static");
rs.newObject.rect(292.75, -4, 7, 0.3, 60, "#000000", "static");
rs.newObject.rect(292, -4, 5, 0.3, -20, "#000000", "static");
rs.newObject.rect(293.5, 3.2, 5, 0.3, -20, "#000000", "static");

// Grass
for(let i=-230; i<230; i+=Math.random()*15 + 15){
    rs.newObject.rect(i, -6.8, 0.15, 0.4, -10, "#000000", "static");
    rs.newObject.rect(i+Math.random()/2+0.8, -6.8, 0.15, 0.4, 0, "#000000", "static");
    rs.newObject.rect(i+Math.random()/2+1.6, -6.8, 0.15, 0.4, 10, "#000000", "static");
}


// Orange Ground
rs.newObject.rect(-150, -20, 300, 26, 0, "#875008", "static");
rs.newObject.rect(-150, -7.1, 300, 0.2, 0, "#000000", "static");


// Green Ground
rs.newObject.rect(150, -20, 300, 26, 0, "#299e05", "static");
rs.newObject.rect(150, -7.1, 300, 0.2, 0, "#000000", "static");

// Dirt
for(let i=-290; i<0; i += 3){
    rs.newObject.rect(i, Math.random()*5-12.5, 0.5, 0.5, Math.random()*180, "#593e11", "static");
}
// Dirt
for(let i=0; i<290; i += 3){
    rs.newObject.rect(i, Math.random()*5-12.5, 0.5, 0.5, Math.random()*180, "#047d00", "static");
}