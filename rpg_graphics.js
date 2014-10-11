///////////////////////////////////// Helper display functions ///////////////////////////////////////////

function DisplayLoop(timestamp) {
  requestAnimationFrame(DisplayLoop);
  CoreState.Display();
}

LoadGameDataOps.images = function(temp) {
  for (var img in temp.images) {
    var tempImage = new Image(); // Load into an image
	tempImage.src = "data:image/jpeg;base64,"+temp.images[img];
	gameImages[img] = tempImage;
	gameTextures[img] = gl.createTexture(); // Load into a WebGL texture
    gl.bindTexture(gl.TEXTURE_2D, gameTextures[img]);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, gameImages[img]);
  }
}

function DrawColorRect(input) { // Draw a colored rectangle with arbitrary dimensions.  Assume 32X32 buffer
    mvPushMatrix();
    var r = input.r;
	if (!r) {r=0;}
	var g = input.g;
	if (!g) {g=0;}
	var b = input.b;
	if (!b) {b=0;}
    gl.useProgram(shaders.colorProgram);
	mat4.translate(mvMatrix, [input.x, input.y, 0.0]);
	mat4.scale(mvMatrix,[input.w/32.0,input.h/32.0,1]);
    gl.uniform4f(color2, r,g,b, 1);
	gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);
    setMatrixUniformsColors();
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
	gl.useProgram(shaderProgram);
	mvPopMatrix();
}

function DrawImage(input) { // Assume the vertex buffer is bound.  Like DrawImage32, but stretch it.
    mvPushMatrix();
	mat4.translate(mvMatrix, [input.x-16*input.size+16, input.y-16*input.size+16, 0.0]);
	mat4.scale(mvMatrix, [input.size, input.size, 0.0]);
    gl.bindTexture(gl.TEXTURE_2D, gameTextures[input.image]);
	gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);
	if (input.prog == "ColorMatrix") {
	  colorMatrix = mat4.create(input.mat);
	  setMatrixUniformsColorMatrix();
	}
    else {setMatrixUniforms();}
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
	mvPopMatrix();
}

function DrawImage32(input) { // Assume the 32 X 32 vertex buffer is bound
    mvPushMatrix();
	mat4.translate(mvMatrix, [input.x, input.y, 0.0]);
    gl.bindTexture(gl.TEXTURE_2D, gameTextures[input.image]);
	gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);
    if (input.prog == "ColorMatrix") {
	  colorMatrix = mat4.create(input.mat);
	  setMatrixUniformsColorMatrix();
	}
    else {setMatrixUniforms();}
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
	mvPopMatrix();
}

////////////////////////////////////////// WebGL stuff //////////////////////////////////////////////////

// Initialize graphics
function setMatrixUniforms() {
  gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
  gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}
// Initialize graphics for color program
function setMatrixUniformsColors() {
  gl.uniformMatrix4fv(shaders.colorProgram.pMatrixUniform, false, pMatrix);
  gl.uniformMatrix4fv(shaders.colorProgram.mvMatrixUniform, false, mvMatrix);
}

// Initialize graphics for color matrix program
function setMatrixUniformsColorMatrix() {
  gl.uniformMatrix4fv(shaders.colorMatrixProgram.pMatrixUniform, false, pMatrix);
  gl.uniformMatrix4fv(shaders.colorMatrixProgram.mvMatrixUniform, false, mvMatrix);
  gl.uniformMatrix4fv(shaders.colorMatrixProgram.colorMatrixUniform, false, colorMatrix);
}

function getShader(gl, str, type) {
    var shader;
    if (type == "x-shader/x-fragment") {
        shader = gl.createShader(gl.FRAGMENT_SHADER);
    } else if (type == "x-shader/x-vertex") {
        shader = gl.createShader(gl.VERTEX_SHADER);
    } else {
        return null;
    }

    gl.shaderSource(shader, str);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert(gl.getShaderInfoLog(shader));
        return null;
    }
    return shader;
}

var shaderProgram;
var colorLocation; var color2;
var texCoordLocation;
var rectBuffer;
var shaders = {};
function initShaders() {
    // Create the shaders
    var frag_str = "precision mediump float;uniform vec4 u_color;uniform sampler2D u_image;varying vec2 v_texCoord;" +
	"void main(void) {gl_FragColor = texture2D(u_image, v_texCoord);}";
	var color_mat_str = "precision mediump float;uniform vec4 u_color;uniform sampler2D u_image;varying vec2 v_texCoord;" +
	"uniform mat4 uColorMatrix;" +
	"void main(void) {gl_FragColor = uColorMatrix * texture2D(u_image, v_texCoord);}"; // This one is for the color matrix
	var color_str = "precision mediump float;uniform vec4 u_color;" +
	"void main(void) {gl_FragColor = u_color;}";
	var ver_str = "attribute vec2 aVertexPosition;uniform vec2 u_resolution;uniform mat4 uMVMatrix;" +
	      "attribute vec2 a_texCoord;varying vec2 v_texCoord;" +
	      "void main(void) {" +
		  "vec4 res4 = vec4(u_resolution,1,1);" +
	      "gl_Position = (uMVMatrix * vec4(aVertexPosition, 0.0,1.0))/res4 * vec4(2,-2,1,1) + vec4(-1,1,0,0);" +
		  "v_texCoord = a_texCoord;}";
    var fragmentShader = getShader(gl, frag_str, "x-shader/x-fragment");
    var vertexShader = getShader(gl, ver_str, "x-shader/x-vertex");
	var colorShader = getShader(gl, color_str, "x-shader/x-fragment");
	var vertexShader2 = getShader(gl, ver_str, "x-shader/x-vertex");
	var colorMatrixShader = getShader(gl, color_mat_str, "x-shader/x-fragment");
	var vertexShader3 = getShader(gl, ver_str, "x-shader/x-vertex");
    // Create the programs
    shaderProgram = gl.createProgram(); // The most common shader, for no-frills image drawing
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);
	shaders.colorProgram = gl.createProgram();	// This program is for untextured drawing
	gl.attachShader(shaders.colorProgram, vertexShader2);
    gl.attachShader(shaders.colorProgram, colorShader);
	gl.linkProgram(shaders.colorProgram);
	shaders.colorMatrixProgram = gl.createProgram(); // This is for drawing with a color matrix
    gl.attachShader(shaders.colorMatrixProgram, vertexShader3);
    gl.attachShader(shaders.colorMatrixProgram, colorMatrixShader);
    gl.linkProgram(shaders.colorMatrixProgram);
    // Sanity check
    if (!gl.getProgramParameter(shaders.colorProgram, gl.LINK_STATUS)) {
        alert("Could not initialise shaders");
    }
    // Set variables for shaderProgram
	gl.useProgram(shaderProgram);
    shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
    gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);
    shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
    shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
	var resolutionLocation = gl.getUniformLocation(shaderProgram, "u_resolution");
	var gl_canv = document.getElementById("glCanvas");
    gl.uniform2f(resolutionLocation, gl_canv.width, gl_canv.height);
	colorLocation = gl.getUniformLocation(shaderProgram, "u_color");
	gl.uniform4f(colorLocation, 0,0,0, 1); // The default rendering color is black
	// Create buffers
	var texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        0.0,  0.0,
        1.0,  0.0,
        0.0,  1.0,
        1.0,  1.0]), gl.STATIC_DRAW);
	rectBuffer = gl.createBuffer();
	texCoordLocation = gl.getAttribLocation(shaderProgram, "a_texCoord");
    gl.enableVertexAttribArray(texCoordLocation);
    gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);
	
    gl.bindBuffer(gl.ARRAY_BUFFER, rectBuffer);
    var vertices = [
         0,0,  0.0,
         32,0,  0.0,
         0,32,  0.0,
         32,32,  0.0
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);	
	// Set variables for the other shaders
	gl.useProgram(shaders.colorProgram);
    shaders.colorProgram.vertexPositionAttribute = gl.getAttribLocation(shaders.colorProgram, "aVertexPosition");
    gl.enableVertexAttribArray(shaders.colorProgram.vertexPositionAttribute);
    shaders.colorProgram.pMatrixUniform = gl.getUniformLocation(shaders.colorProgram, "uPMatrix");
    shaders.colorProgram.mvMatrixUniform = gl.getUniformLocation(shaders.colorProgram, "uMVMatrix");
	var res2 = gl.getUniformLocation(shaders.colorProgram, "u_resolution");
	var gl_canv = document.getElementById("glCanvas");
    gl.uniform2f(res2, gl_canv.width, gl_canv.height);
	color2 = gl.getUniformLocation(shaders.colorProgram, "u_color");
	gl.uniform4f(color2, 0,0,0, 1); // The default rendering color is black
	// Color matrix
	gl.useProgram(shaders.colorMatrixProgram);
	shaders.colorMatrixProgram.vertexPositionAttribute = gl.getAttribLocation(shaders.colorMatrixProgram, "aVertexPosition");
    gl.enableVertexAttribArray(shaders.colorMatrixProgram.vertexPositionAttribute);
    shaders.colorMatrixProgram.pMatrixUniform = gl.getUniformLocation(shaders.colorMatrixProgram, "uPMatrix");
    shaders.colorMatrixProgram.mvMatrixUniform = gl.getUniformLocation(shaders.colorMatrixProgram, "uMVMatrix");
	var resolutionLocation = gl.getUniformLocation(shaders.colorMatrixProgram, "u_resolution");
	var gl_canv = document.getElementById("glCanvas");
    gl.uniform2f(resolutionLocation, gl_canv.width, gl_canv.height);
	shaders.colorMatrixProgram.colorMatrixUniform = gl.getUniformLocation(shaders.colorMatrixProgram, "uColorMatrix");
	
	gl.useProgram(shaderProgram);
}

var mvMatrix = mat4.create();
var pMatrix = mat4.create();
var colorMatrix = mat4.create();
var mvMatrixStack = [];
function mvPushMatrix() {
  var copy = mat4.create();
  mat4.set(mvMatrix, copy);
  mvMatrixStack.push(copy);
}
function mvPopMatrix() {
  if (mvMatrixStack.length == 0) {
    throw "Invalid popMatrix!";
  }
  mvMatrix = mvMatrixStack.pop();
}

var gl;
function initGL() {
  try {
    var gl_canv = document.getElementById("glCanvas");
    gl = gl_canv.getContext("webgl") || canv.getContext("experimental-webgl");
    gl.viewportWidth = gl_canv.width;
    gl.viewportHeight = gl_canv.height;
  } catch(e) {
  }
  if (!gl) {
    console.log("Could not initialise WebGL, sorry :-( ");
  }
}
initGL();
initShaders();

gl.clearColor(0.0, 0.0, 0.0, 1.0);