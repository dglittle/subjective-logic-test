var w = 400;
var h = w;

function dist(x1, y1, x2, y2){
	return Math.sqrt((x1-x2)*(x1-x2) + (y1-y2)*(y1-y2));
}

function toOpinion(point){
	var x = point.getX();
	var y = point.getY();

	// Obtain trilinear coordinates
	var normX = x / w;
	var normY = (h - y) / w;

	var alpha = 2 * normY / Math.sqrt(3);
	var beta = normX - normY / Math.sqrt(3);

	var a = Math.abs(alpha);
	var b = Math.abs(beta);
	var c = Math.abs(1 - alpha - beta);

	var sum = a + b + c;
	var mult = 1 / sum;
	a *= mult;
	b *= mult;
	c *= mult;

	return {
		b: b,
		d: c,
		u: a,
		a: 0.5
	}
}

function fromOpinion(opinion, point){
	// triangle height
	var th = Math.sqrt(3)/2*h;

	var y = h * (1 - opinion.u * Math.sqrt(3)/2);
	var x = w * (opinion.b + opinion.u / 2);

	point.setX(x);
	point.setY(y);
}

function subjDivMulAdd(SX, SY, SZ) {
    var S = {}

    var SX_E = (SX.b + SX.a * SX.u)
    var SY_E = (SY.b + SY.a * SY.u)
    var SZ_E = (SZ.b + SZ.a * SZ.u)
    var E = SX_E * SY_E / (SX_E * SY_E + (1 - SX_E) * SZ_E)

    S.d = (SX.d + (1 - SX.a) * SX.u) * SZ.b / (
        (SX.b + SX.a * SX.u) * (1 - SY.d) +
        (SX.d + (1 - SX.a) * SX.u) * SZ.b)

    S.a = SX.a * SY.a / (SX.a * SY.a + (1 - SX.a) * SZ.a)

    S.b = (E + S.d * S.a - S.a) / (1 - S.a)

    S.u = 1 - S.b - S.d

    return S
}

function subjDivMulAdd2(SX, SY, SZ) {
    var S = {}

    var SX_E = (SX.b + SX.a * SX.u)
    var SY_E = (SY.b + SY.a * SY.u)
    var SZ_E = (SZ.b + SZ.a * SZ.u)
    var E = SX_E * SY_E / (SX_E * SY_E + (1 - SX_E) * SZ_E)

    S.d = SX.d * SZ.b / (
        (SX.b + SX.a * SX.u) * (1 - SY.d) +
        (SX.d + (1 - SX.a) * SX.u) * (1 - SZ.d))

    S.a = SX.a * SY.a / (SX.a * SY.a + (1 - SX.a) * SZ.a)

    S.b = (E + S.d * S.a - S.a) / (1 - S.a)

    S.u = 1 - S.b - S.d

    return S
}


function fusion_jpm(a, b){
	var s = {}

	var div = a.u + b.u - a.u*b.u;

	if (div != 0){
		s.b = (a.b*b.u + b.b*a.u) / div;
		s.d = (a.d*b.u + b.d*a.u) / div;
		s.u = a.u*b.u / div;
		s.a = (a.a*b.u + b.a*a.u - (a.a+b.a)*a.u*b.u) / div;
	} else {
		var lim = b.u / a.u;
		s.b = (lim*a.b + b.b) / (lim+1);
		s.d = (lim*a.d + b.d) / (lim+1);
		s.u = 0;
		s.a = (lim*a.a + b.a) / (lim+1);
	}
	return s;
}


function fusion(a, b, c){
	var algo = $("#options input[name=algo]:checked").val();
	if (algo == "subjDivMulAdd"){
		return subjDivMulAdd(a, b, c);	
	} else if (algo == "subjDivMulAdd2"){
		return subjDivMulAdd2(a, b, c);
	} else {
		return fusion_jpm(a, fusion_jpm(b, c));
	}
}

function updateOpinion(id, opinion){
	for (x in opinion){
		$('#' + id + '_' + x).text(opinion[x].toFixed(4));	
	}
}

function predict(points){
	var a = toOpinion(points.original[0]);
	var b = toOpinion(points.original[1]);
	var c = toOpinion(points.original[2]);

	var s = fusion(a, b, c);

	updateOpinion('s', s);
	fromOpinion(s, points.result);

	points.layer.draw();

	$('#est').text((s.b + s.a*s.u).toFixed(4));
}

function onDragEnd(point, id, points){
	var opinion = toOpinion(point);
	updateOpinion(id, opinion);
	predict(points);
}

$(function(){

	var stage = new Kinetic.Stage({
        container: 'container',
        width: w,
        height: h
    });

    var areaLayer = new Kinetic.Layer();

    var area = new Kinetic.Polygon({
    	points: [0, h, w, h, w/2, h - Math.sqrt(3)/2*h],
    	stroke: 'black',
    	strokeWidth: 2
    })

    areaLayer.add(area);

    var pointLayer = new Kinetic.Layer();

    var pointA = new Kinetic.Circle({
		x: w - 5,
		y: h - 5,
		radius: 10,
		fill: 'green',
		stroke: 'black',
		strokeWidth: 1,
		draggable: true
	});

	var pointB = new Kinetic.Circle({
		x: 5,
		y: h - 5,
		radius: 10,
		fill: 'red',
		stroke: 'black',
		strokeWidth: 1,
		draggable: true
	});

	var pointC = new Kinetic.Circle({
		x: w/2,
		y: h - Math.sqrt(3)/2*h,
		radius: 10,
		fill: 'blue',
		stroke: 'black',
		strokeWidth: 1,
		draggable: true
	});

	var pointS = new Kinetic.Circle({
		x: w/2,
		y: h*3/4,
		radius: 10,
		fill: 'gray',
		stroke: 'black',
		strokeWidth: 1
	});

	var points = {
		original: [pointA, pointB, pointC],
		result: pointS,
		layer: pointLayer
	}


	fromOpinion({b:0.9, d: 0.05, u: 0.05, a: 0.5}, pointA);
	fromOpinion({b:0.05, d: 0.9, u: 0.05, a: 0.5}, pointB);
	fromOpinion({b:0.05, d: 0.05, u: 0.9, a: 0.5}, pointC);

	var throttledDrag = $.throttle(100, true, onDragEnd);

	pointA.on('dragmove', function(){
		throttledDrag(this, 'a', points);
	});

	pointB.on('dragmove', function(){
		throttledDrag(this, 'b', points);
	});

	pointC.on('dragmove', function(){
		throttledDrag(this, 'c', points);
	});

	pointA.on('dragend', function(){
		onDragEnd(this, 'a', points);
	});

	pointB.on('dragend', function(){
		onDragEnd(this, 'b', points);
	});
	
	pointC.on('dragend', function(){
		onDragEnd(this, 'c', points);
	});
	
	pointLayer.add(pointA);
	pointLayer.add(pointB);
	pointLayer.add(pointC);
	pointLayer.add(pointS);

	
	stage.add(areaLayer);
	stage.add(pointLayer);
})