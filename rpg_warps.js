// Module for warps on the map

// Warp from one map point to another
function Warp(input) {this.x = input.x; this.y = input.y; this.destmap = input.destmap; this.destx = input.destx; this.desty = input.desty; this.ig = input.ig; this.img = input.img}
Warp.prototype.Enter = function() {SetLocation({map:this.destmap, x:this.destx, y:this.desty})}
MapObjectClasses.Warp = Warp;

Warp.prototype.Display = function() {if (this.img) {DrawImage32({x:304+32*this.x,y:224+32*this.y,image:img});}}