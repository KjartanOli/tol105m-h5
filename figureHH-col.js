'use strict';
import { get_shader, init_shaders } from './shaders.js';

const [vertex_shader, fragment_shader] = [
	'shaders/figureHH/vertex-shader.glsl',
	'shaders/figureHH/fragment-shader.glsl'
].map(get_shader);


let canvas;
let gl;
let program;

let movement = false;
let spinX = 0;
let spinY = 0;
let origX;
let origY;

let zDist = -25.0;

let projectionMatrix;
let modelViewMatrix;

let instanceMatrix;

let modelViewMatrixLoc;

const vertices = [
	vec4(-0.5, -0.5, 0.5, 1.0),
	vec4(-0.5, 0.5, 0.5, 1.0),
	vec4(0.5,  0.5,  0.5, 1.0),
	vec4(0.5, -0.5,  0.5, 1.0),
	vec4(-0.5, -0.5, -0.5, 1.0),
	vec4(-0.5, 0.5, -0.5, 1.0),
	vec4(0.5,  0.5, -0.5, 1.0),
	vec4(0.5, -0.5, -0.5, 1.0)
];

var vertexColors = [
	[ 0.0, 0.0, 0.0, 1.0 ], // black
	[ 1.0, 0.0, 0.0, 1.0 ], // red
	[ 1.0, 1.0, 0.0, 1.0 ], // yellow
	[ 0.0, 1.0, 0.0, 1.0 ], // green
	[ 0.0, 0.0, 1.0, 1.0 ], // blue
	[ 1.0, 0.0, 1.0, 1.0 ], // magenta
	[ 0.0, 1.0, 1.0, 1.0 ], // cyan
	[ 1.0, 1.0, 1.0, 1.0 ] // white
];


const torsoId = 0;
const headId = 1;
const head1Id = 1;
const head2Id = 10;
const leftUpperArmId = 2;
const leftLowerArmId = 3;
const rightUpperArmId = 4;
const rightLowerArmId = 5;
const leftUpperLegId = 6;
const leftLowerLegId = 7;
const rightUpperLegId = 8;
const rightLowerLegId = 9;

let currBodyPart = 0;

const torsoHeight = 5.0;
const torsoWidth = 1.0;
const upperArmHeight = 3.0;
const lowerArmHeight = 2.0;
const upperArmWidth = 0.5;
const lowerArmWidth = 0.5;
const upperLegWidth = 0.5;
const lowerLegWidth = 0.5;
const lowerLegHeight = 2.0;
const upperLegHeight = 3.0;
const headHeight = 1.5;
const headWidth = 1.0;

const numNodes = 10;
const numAngles = 11;
let angle = 0;

const theta = [40, -10, 150, 80, 150, 90, 10, -55, -10, -30, 0];

const numVertices = 24;

const stack = [];

const figure = [];

for(let i = 0; i < numNodes; i++)
	figure[i] = createNode(null, null, null, null);

let vBuffer;
let modelViewLoc;

const pointsArray = [];
const colorsArray = [];

//-------------------------------------------

function scale4(a, b, c) {
	let result = mat4();
	result[0][0] = a;
	result[1][1] = b;
	result[2][2] = c;
	return result;
}

//--------------------------------------------


function createNode(transform, render, sibling, child){
	var node = {
		transform: transform,
		render: render,
		sibling: sibling,
		child: child,
	}
	return node;
}


function initNodes(Id) {
	let m = mat4();

	switch(Id) {

	case torsoId:
		m = rotateY(theta[torsoId]);
		figure[torsoId] = createNode(m, torso, null, headId);
		break;

	case headId:
	case head1Id:
	case head2Id:
		m = translate(0.0, torsoHeight+0.5*headHeight, 0.0);
		m = mult(m, rotateX(theta[head1Id]))
		m = mult(m, rotateY(theta[head2Id]));
		m = mult(m, translate(0.0, -0.5*headHeight, 0.0));
		figure[headId] = createNode(m, head, leftUpperArmId, null);
		break;

	case leftUpperArmId:
		m = translate(-(torsoWidth+upperArmWidth), 0.9*torsoHeight, 0.0);
		m = mult(m, rotateX(theta[leftUpperArmId]));
		figure[leftUpperArmId] = createNode(m, leftUpperArm, rightUpperArmId, leftLowerArmId);
		break;

	case rightUpperArmId:
		m = translate(torsoWidth+upperArmWidth, 0.9*torsoHeight, 0.0);
		m = mult(m, rotateX(theta[rightUpperArmId]));
		figure[rightUpperArmId] = createNode(m, rightUpperArm, leftUpperLegId, rightLowerArmId);
		break;

	case leftUpperLegId:
		m = translate(-(torsoWidth+upperLegWidth), 0.1*upperLegHeight, 0.0);
		m = mult(m , rotateX(theta[leftUpperLegId]+180));
		figure[leftUpperLegId] = createNode(m, leftUpperLeg, rightUpperLegId, leftLowerLegId);
		break;

	case rightUpperLegId:
		m = translate(torsoWidth+upperLegWidth, 0.1*upperLegHeight, 0.0);
		m = mult(m, rotateX(theta[rightUpperLegId]+180));
		figure[rightUpperLegId] = createNode(m, rightUpperLeg, null, rightLowerLegId);
		break;

	case leftLowerArmId:
		m = translate(0.0, upperArmHeight, 0.0);
		m = mult(m, rotateX(theta[leftLowerArmId]));
		figure[leftLowerArmId] = createNode(m, leftLowerArm, null, null);
		break;

	case rightLowerArmId:
		m = translate(0.0, upperArmHeight, 0.0);
		m = mult(m, rotateX(theta[rightLowerArmId]));
		figure[rightLowerArmId] = createNode(m, rightLowerArm, null, null);
		break;

	case leftLowerLegId:
		m = translate(0.0, upperLegHeight, 0.0);
		m = mult(m, rotateX(theta[leftLowerLegId]));
		figure[leftLowerLegId] = createNode(m, leftLowerLeg, null, null);
		break;

	case rightLowerLegId:
		m = translate(0.0, upperLegHeight, 0.0);
		m = mult(m, rotateX(theta[rightLowerLegId]));
		figure[rightLowerLegId] = createNode(m, rightLowerLeg, null, null);
		break;
	}
}

function traverse(Id) {
	if(Id == null)
		return;
	stack.push(modelViewMatrix);
	modelViewMatrix = mult(modelViewMatrix, figure[Id].transform);
	figure[Id].render();

	if(figure[Id].child != null)
		traverse(figure[Id].child);

	modelViewMatrix = stack.pop();

	if(figure[Id].sibling != null)
		traverse(figure[Id].sibling);
}

function torso() {
	instanceMatrix = mult(
		modelViewMatrix,
		translate(0.0, 0.5 * torsoHeight, 0.0)
	);
	instanceMatrix = mult(
		instanceMatrix,
		scale4(torsoWidth, torsoHeight, torsoWidth)
	);
	gl.uniformMatrix4fv(
		modelViewMatrixLoc,
		false,
		flatten(instanceMatrix)
	);

	for(let i = 0; i < 6; i++)
		gl.drawArrays(gl.TRIANGLE_FAN, 4*i, 4);
}

function head() {
	instanceMatrix = mult(
		modelViewMatrix,
		translate(0.0, 0.5 * headHeight, 0.0)
	);
	instanceMatrix = mult(
		instanceMatrix,
		scale4(headWidth, headHeight, headWidth)
	);
	gl.uniformMatrix4fv(
		modelViewMatrixLoc,
		false,
		flatten(instanceMatrix)
	);
	for(let i = 0; i < 6; i++)
		gl.drawArrays(gl.TRIANGLE_FAN, 4*i, 4);
}

function leftUpperArm() {
	instanceMatrix = mult(
		modelViewMatrix,
		translate(0.0, 0.5 * upperArmHeight, 0.0)
	);
	instanceMatrix = mult(
		instanceMatrix,
		scale4(upperArmWidth, upperArmHeight, upperArmWidth)
	);
	gl.uniformMatrix4fv(
		modelViewMatrixLoc,
		false,
		flatten(instanceMatrix)
	);
	for(let i = 0; i < 6; i++)
		gl.drawArrays(gl.TRIANGLE_FAN, 4*i, 4);
}

function leftLowerArm() {
	instanceMatrix = mult(modelViewMatrix, translate(0.0, 0.5 * lowerArmHeight, 0.0));
	instanceMatrix = mult(instanceMatrix, scale4(lowerArmWidth, lowerArmHeight, lowerArmWidth));
	gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
	for (let i = 0; i < 6; ++i) gl.drawArrays(gl.TRIANGLE_FAN, 4*i, 4);
}

function rightUpperArm() {
	instanceMatrix = mult(modelViewMatrix, translate(0.0, 0.5 * upperArmHeight, 0.0));
	instanceMatrix = mult(instanceMatrix, scale4(upperArmWidth, upperArmHeight, upperArmWidth));
	gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
	for (let i = 0; i < 6; ++i) gl.drawArrays(gl.TRIANGLE_FAN, 4*i, 4);
}

function rightLowerArm() {
	instanceMatrix = mult(modelViewMatrix, translate(0.0, 0.5 * lowerArmHeight, 0.0));
	instanceMatrix = mult(instanceMatrix, scale4(lowerArmWidth, lowerArmHeight, lowerArmWidth));
	gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
	for (let i = 0; i < 6; ++i) gl.drawArrays(gl.TRIANGLE_FAN, 4*i, 4);
}

function	leftUpperLeg() {
	instanceMatrix = mult(modelViewMatrix, translate(0.0, 0.5 * upperLegHeight, 0.0));
	instanceMatrix = mult(instanceMatrix, scale4(upperLegWidth, upperLegHeight, upperLegWidth));
	gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
	for (let i = 0; i < 6; ++i) gl.drawArrays(gl.TRIANGLE_FAN, 4*i, 4);
}

function leftLowerLeg() {
	instanceMatrix = mult(modelViewMatrix, translate(0.0, 0.5 * lowerLegHeight, 0.0));
	instanceMatrix = mult(instanceMatrix, scale4(lowerLegWidth, lowerLegHeight, lowerLegWidth));
	gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
	for (let i = 0; i < 6; ++i) gl.drawArrays(gl.TRIANGLE_FAN, 4*i, 4);
}

function rightUpperLeg() {
	instanceMatrix = mult(
		modelViewMatrix,
		translate(0.0, 0.5 * upperLegHeight, 0.0)
	);
	instanceMatrix = mult(
		instanceMatrix,
		scale4(upperLegWidth, upperLegHeight, upperLegWidth)
	);
	gl.uniformMatrix4fv(
		modelViewMatrixLoc,
		false,
		flatten(instanceMatrix)
	);
	for (let i = 0; i < 6; ++i)
		gl.drawArrays(gl.TRIANGLE_FAN, 4*i, 4);
}

function rightLowerLeg() {

	instanceMatrix = mult(
		modelViewMatrix,
		translate(0.0, 0.5 * lowerLegHeight, 0.0)
	);
	instanceMatrix = mult(
		instanceMatrix,
		scale4(lowerLegWidth, lowerLegHeight, lowerLegWidth)
	)
	gl.uniformMatrix4fv(
		modelViewMatrixLoc,
		false,
		flatten(instanceMatrix)
	);
	for (let i = 0; i < 6; ++i)
		gl.drawArrays(gl.TRIANGLE_FAN, 4*i, 4);
}

function quad(a, b, c, d) {
	pointsArray.push(vertices[a]);
	pointsArray.push(vertices[b]);
	pointsArray.push(vertices[c]);
	pointsArray.push(vertices[d]);

	colorsArray.push(vertexColors[a]);
	colorsArray.push(vertexColors[a]);
	colorsArray.push(vertexColors[a]);
	colorsArray.push(vertexColors[a]);
}

function cube() {
	quad(1, 0, 3, 2);
	quad(2, 3, 7, 6);
	quad(3, 0, 4, 7);
	quad(6, 5, 1, 2);
	quad(4, 5, 6, 7);
	quad(5, 4, 0, 1);
}


export async function init() {
	canvas = document.getElementById("gl-canvas");

	gl = WebGLUtils.setupWebGL(canvas);
	if (!gl) { alert("WebGL isn't available"); }

	gl.viewport(0, 0, canvas.width, canvas.height);
	gl.clearColor(1.0, 1.0, 1.0, 1.0);

	gl.enable(gl.DEPTH_TEST);
	gl.enable(gl.CULL_FACE);
	gl.cullFace(gl.BACK);

	//
	//	Load shaders and initialize attribute buffers
	//
	program = await init_shaders(gl, await vertex_shader, await fragment_shader);

	gl.useProgram(program);

	instanceMatrix = mat4();

	projectionMatrix = perspective(50.0, 1.0, 0.01, 100.0);
	modelViewMatrix = mat4();

	gl.uniformMatrix4fv(gl.getUniformLocation(program, "modelViewMatrix"), false, flatten(modelViewMatrix));
	gl.uniformMatrix4fv(gl.getUniformLocation(program, "projectionMatrix"), false, flatten(projectionMatrix));

	modelViewMatrixLoc = gl.getUniformLocation(program, "modelViewMatrix")

	cube();

	let cBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, flatten(colorsArray), gl.STATIC_DRAW);

	let vColor = gl.getAttribLocation(program, "vColor");
	gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(vColor);

	vBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);

	let vPosition = gl.getAttribLocation(program, "vPosition");
	gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(vPosition);

	for(let i = 0; i < numNodes; i++) initNodes(i);

	//event listeners for mouse
	canvas.addEventListener("mousedown", function(e){
		movement = true;
		origX = e.clientX;
		origY = e.clientY;
		e.preventDefault(); // Disable drag and drop
	});

	canvas.addEventListener("mouseup", function(e){
		movement = false;
	});

	canvas.addEventListener("mousemove", function(e){
		if(movement) {
			spinY = (spinY + (e.clientX - origX)) % 360;
			spinX = (spinX + (origY - e.clientY)) % 360;
			origX = e.clientX;
			origY = e.clientY;
		}
	});

	// Event listener for mousewheel
	window.addEventListener("mousewheel", function(e){
		if(e.wheelDelta > 0.0) {
			zDist += 0.5;
		} else {
			zDist -= 0.5;
		}
	} );

	render();
}


let render = function() {
	gl.clear(gl.COLOR_BUFFER_BIT);

	// staðsetja áhorfanda og meðhöndla músarhreyfingu
	var mv = lookAt(
		vec3(0.0, 0.0, zDist),
		vec3(0.0, 0.0, 0.0),
		vec3(0.0, 1.0, 0.0)
	);
	mv = mult(mv, rotateX(spinX));
	mv = mult(mv, rotateY(spinY));

	const left_leg = theta[leftUpperLegId];
	const left_arm = theta[leftUpperArmId];
	const right_leg = theta[rightUpperLegId];
	const right_arm = theta[rightUpperArmId];

	const time = Date.now();
	const angle = Math.sin(time / 1000) * 50;
	theta[leftUpperLegId] = left_leg + angle;
	theta[leftUpperArmId] = left_arm - angle;

	theta[rightUpperLegId] = right_leg - angle;
	theta[rightUpperArmId] = right_arm + angle;

	initNodes(leftUpperLegId);
	initNodes(leftUpperArmId);
	initNodes(rightUpperLegId);
	initNodes(rightUpperArmId);

	theta[leftUpperLegId] = left_leg;
	theta[leftUpperArmId] = left_arm;
	theta[rightUpperLegId] = right_leg;
	theta[rightUpperArmId] = right_arm;

	modelViewMatrix = mv;
	traverse(torsoId);
	requestAnimFrame(render);
}
