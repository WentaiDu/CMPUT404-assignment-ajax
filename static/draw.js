// Copyright 2020 Colin Choi
// 
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
// 
//     http://www.apache.org/licenses/LICENSE-2.0
// 
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

var canvas = document.getElementById('c');
var host = window.location.host;
var context = canvas.getContext("2d");
var W = canvas.width  = window.innerWidth-20;
var H = canvas.height = window.innerHeight-160;
var brushColor = 'violet'
var canvasColor = "#000";

function sendJSONXMLHTTPRequest(url, objects, callback = function (data) {}) {
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
        if (xhr.readyState==4) {
            try {
                if (xhr.status==200) {
                    //XXX: parse some JSON from the request!
                    response = JSON.parse(this.responseText)
                    //XXX: Pass the data to the callback!
                    callback(response);
                }
            } 
            catch(e) {
                alert('Error: ' + e.name);
            }
        }
    };
    //XXX: POST to a URL
    xhr.open("POST", url);
    //XXX: set the mimetype and the accept headers!
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.setRequestHeader("Accept", "application/json");

    xhr.send(JSON.stringify(objects));
}


world = {};

//XXX: TODO Make this prettier!
function drawCircle(context,entity) {
    with(context) {
        beginPath();              
        lineWidth = 10;
        var x = entity["x"];
        var y = entity["y"];
        //moveTo(x,y);
        fillStyle = entity["colour"];
        strokeStyle = fillStyle;
        arc(x, y, (entity["radius"])?entity["radius"]:50, 0, 2.0 * Math.PI, false);  
        stroke();                                
    }
}

function prepEntity(entity) {
    if (!entity["colour"]) {
        entity["colour"] = "#FF0000";
    }
    if (!entity["radius"]) {
        entity["radius"] = 50;
    }
    return entity;
}

function clearFrame() {
    with(context) {
	moveTo(0,0);
	fillStyle = canvasColor;
	fillRect(0,0,W,H);
    }

}

// Callback function for AJAX
function updateWorld(data){
    world=data;
    drawNextFrame();
}

// For the clear canvas button I added
function clearWorld(){
    sendJSONXMLHTTPRequest("/clear", {}, updateWorld);
}

// This actually draws the frame
function renderFrame() {
    clearFrame();
    for (var key in world) {
        var entity = world[key];
        drawCircle(context,prepEntity(entity));
    }
}

var drawNext = true;

// Signals that there's something to be drawn
function drawNextFrame() {
    drawNext = true;
}

// This optionally draws the frame, call this if you're not sure if you should update
// the canvas
function drawFrame() {
    if (drawNext) {
        renderFrame();
        drawNext = false;
    }
}

// This is unpleasent, canvas clicks are not handled well
// So use this code, it works well on multitouch devices as well.

function getPosition(e) {
	if ( e.targetTouches && e.targetTouches.length > 0) {
		var touch = e.targetTouches[0];
		var x = touch.pageX  - canvas.offsetLeft;
		var y = touch.pageY  - canvas.offsetTop;
		return [x,y];
	} else {
		var rect = e.target.getBoundingClientRect();
		var x = e.offsetX || e.pageX - rect.left - window.scrollX;
		var y = e.offsetY || e.pageY - rect.top  - window.scrollY;
		var x = e.pageX  - canvas.offsetLeft;
		var y = e.pageY  - canvas.offsetTop;
		return [x,y];
	}
}


function addEntity(entity, data) {
    world[entity] = data;
    // leave it to update() to call drawNextFrame()
    //drawNextFrame(); // (but should we?)

    //XXX: Send a XHTML Request that updates the entity you just  modified!
    sendJSONXMLHTTPRequest("/entity/"+entity, data);
}

// set counter to start at a random number
// if all clients start at 0, they'll end up overwriting each other
var counter = Math.floor(Math.random() * 2000);
function addEntityWithoutName(data) {
    //var name = "X"+Math.floor((Math.random()*100)+1);
    var name = "X"+(counter++)%3000;
    addEntity(name,data);
}

// canvas + mouse/touch is complicated body
// I give you this because well the mouse/touch stuff is a total
// pain to get right. This has some out of context bug too.
mouse = (function() {
    // Now this isn't the most popular way of doing OO in 
    // Javascript, but it relies on lexical scope and I like it
    // This isn't 301 so I'm not totally bound to OO :)
    var self;    
    self = {
        clicked: 0,
        // these are listener lists append to them
        mousemovers: [],
        mousedraggers: [],
        mousedowners: [],
        mouseuppers: [],
        callListeners: function(listeners,x,y,clicked,e) {
            for (i in listeners) {
                listeners[i](x,y,clicked,e);
            }
        },
        wasClicked: function(e) {
            var pos = getPosition(e);
            var x = pos[0];
            var y = pos[1];
            if (x >= 0 && x <= W && y >= 0 && y <= H) {
                return 1;
            } else {
                return 0;
            }
        },
        mousedown: function(e) {
            e.preventDefault();
            if (self.wasClicked(e)) {
                var pos = getPosition(e);
                var x = pos[0];
                var y = pos[1];
	        self.clicked = 1;
                self.callListeners(self.mousedowners,x,y,self.clicked,e);
                //addEntityWithoutName({'x':x,'y':y,'colour':'red'});
            }
        },
        mouseup: function(e) {
            e.preventDefault();
            //alert(getPosition(e));
            if (self.wasClicked(e)) {
                var pos = getPosition(e);
                var x = pos[0];
                var y = pos[1];
	        //self.poppin(x,y);
	        self.clicked = 0;
                self.selected = -1;
                self.callListeners(self.mouseuppers,x,y,self.clicked,e);
                //addEntityWithoutName({'x':x,'y':y,'colour':'blue'});
            }
        },
        touchstart: function(e) {
            self.lasttouch = e;                                         
            return self.mousedown(e);
        },
	touchend: function(e) {
            var touch = (self.lasttouch)?self.lasttouch:e;
            return self.mouseup(touch);
	},
	mousemove: function(e) {
            e.preventDefault();
            if (self.wasClicked(e)) {
                var pos = getPosition(e);
                var x = pos[0];
                var y = pos[1];
	        if (self.clicked != 0) {
	            //self.squeakin(x,y);
                    self.callListeners(self.mousedraggers,x,y,self.clicked,e);
	        }
                self.callListeners(self.mousemovers,x,y,self.clicked,e);
            }            
	},
	touchmove: function(e) {
            self.lasttouch = e;                                         
            return self.mousemove(e);
	},
	// Install the mouse listeners
	mouseinstall: function() {
            canvas.addEventListener("mousedown",  self.mousedown, false);
            canvas.addEventListener("mousemove",  self.mousemove, false);
            canvas.addEventListener("mouseup",    self.mouseup, false);
            canvas.addEventListener("mouseout",   self.mouseout, false);
            canvas.addEventListener("touchstart", self.touchstart, false);
            canvas.addEventListener("touchmove",  self.touchmove, false);
            canvas.addEventListener("touchend",   self.touchend, false);
	}
    };
    // Force install!
    self.mouseinstall();
    return self;
})();

// Add the application specific mouse listeners!
//XXX: TODO Make these prettier!
mouse.mousedowners.push(function(x,y,clicked,e) {
    addEntityWithoutName({'x':x,'y':y,'colour':brushColor,
                          'radius':8});
});

mouse.mouseuppers.push(function(x,y,clicked,e) {
    addEntityWithoutName({'x':x,'y':y,'colour':brushColor,
                          'radius':8});
});

mouse.mousedraggers.push(function(x,y,clicked,e) {
    addEntityWithoutName({'x':x,'y':y,'colour':brushColor,
                          'radius':5});
});


function update() {
    //XXX: TODO Get the world from the webservice using a XMLHTTPRequest
    sendJSONXMLHTTPRequest("/world", {}, updateWorld );
    drawFrame();
}

// 30 frames per second
setInterval( update, 1000/30.0);