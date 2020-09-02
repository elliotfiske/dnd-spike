/**
 * Rectangle class.  Origin at (x, y), with specified width and height.
 *  bounceTime lets us animate bounciness on intersection.
 */
function Rect(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.x2 = function() { return this.x + this.width };
    this.y2 = function() { return this.y + this.height };
    this.center = function() { return {x: this.x + this.width / 2, y: this.y + this.height / 2}};
    this.height = height;
    this.width = width;
    this.bounceTime = 0;
}

/**
 * Circle class defines those funky circles that emanate out from
 *  where an intersection happens.
 */
function Circle(x, y, radius, alpha) {
    this.x = x;
    this.y = y;
    this.radius = 40;
    this.alpha = 0.4;
}

/**
 * rectIntersection takes in two rectangle objects and determines whether they
 *  intersect.
 *
 * If they intersect, this function returns the rectangle that represents the area
 *  they intersect. Otherwise, it returns null.
 */
function rectIntersection(rectA, rectB) {
    var intersectTop    = Math.max(rectA.y,    rectB.y);
    var intersectRight  = Math.min(rectA.x2(), rectB.x2());
    var intersectBottom = Math.min(rectA.y2(), rectB.y2());
    var intersectLeft   = Math.max(rectA.x,    rectB.x);

    var intersectWidth  = intersectRight - intersectLeft;
    var intersectHeight = intersectBottom - intersectTop;

    if (intersectWidth > 0 && intersectHeight > 0) {
        return new Rect(intersectLeft, intersectTop, intersectWidth, intersectHeight);
    }
    return null;
}

/**
 * rectContainsPoint returns true if the specified rectangle contains the point,
 *  false otherwise.
 */
function rectContainsPoint(rect, point) {
    if (point.x > rect.x && point.x < rect.x2() &&
        point.y > rect.y && point.y < rect.y2() ) {
        return true;
    }
    return false;
}

function circleContainsPoint(circle, point) {
    const x2 = Math.pow(point.x - circle.x, 2);
    const y2 = Math.pow(point.y - circle.y, 2);
    return Math.sqrt(x2 + y2) < circle.radius;
}

// Set up the canvas
var canvas = $("#rect-canvas").get(0);
var canvasWidth = $("#rect-canvas").css("width");
var canvasHeight = $("#rect-canvas").css("height");
var context = canvas.getContext("2d");
canvas.onselectstart = function() { return false; } // Fix weird cursor problems

// Set up mouse listeners
canvas.addEventListener("mousedown", mouseDownListener, false);
canvas.addEventListener("mousemove", mouseMoveListener, false);
canvas.addEventListener("touchmove", mouseMoveListener, false);
canvas.addEventListener("mouseup",   mouseUpListener, false);
canvas.addEventListener("mouseout",  mouseUpListener, false);

// Which rectangle is the user dragging (if any?)
var draggingRect = null;
var draggingCircle = false;
var draggingTarget = null;
var wasIntersecting = false;

var rect1 = new Rect(10, 10, 50, 50);
var rect2 = new Rect(60, 100, 160, 220);

var snapRect1 = new Rect(0, 0, 300, 200);
var snapRect2 = new Rect(700, 300, 300, 200);
var snapRect3 = new Rect(0, 300, 300, 200);
var snapRect4 = new Rect(700, 0, 300, 200);
var snapRects = [snapRect1, snapRect2, snapRect3, snapRect4];

var circle = new Circle(snapRect1.center().x, snapRect1.center().y, 50, 1.0);

var pluckEnabled = true;

var home = snapRect1;
var originalHome = home;    ///< The FIRST home the user dragged off of, this mouse click
                            ///< Cleared when the user leaves the originalHome

var hovering = false;
var hoverExpansion = 0;

var dropped = false;

/** Draw the specified rect on screen with specified color. */
function drawRect(rect, color) {
    context.fillStyle = color;
    context.fillRect(rect.x, rect.y, rect.width, rect.height);
}

function drawCircle(circle, color, expansion, shadow) {
    context.save();
    context.beginPath();

    if (shadow) {
        const alpha = 0.3; + expansion / 8.0;
        context.shadowColor = "rgba(0, 0, 0, " + alpha + ")";
        context.shadowBlur = 5;
        context.shadowOffsetY = 10 + expansion * 5;
    } else {
        context.filter = 'blur(2px)';
    }

    context.arc(circle.x, circle.y, 
                circle.radius + expansion, 0, 2*Math.PI, false);
    context.fillStyle = color;
    context.fill();
    context.restore();
}

/** 
 * Rectangles bounce when you click on em.  Iterate that animation here.
 */
function iterateBounciness(rect) {
   var bounceFactor = (Math.sin(rect.bounceTime) + 1) * rect.bounceTime * 0.15;
   if (rect.bounceTime > 0) {
       rect.bounceTime--;
   }

   var bouncedRect = new Rect(0, 0, 0, 0);
   bouncedRect.x = rect.x - bounceFactor;
   bouncedRect.y = rect.y - bounceFactor;
   bouncedRect.width  = rect.width  + bounceFactor * 2;
   bouncedRect.height = rect.height + bounceFactor * 2;
   return bouncedRect;
}

/**
 * Main animation loop!  Check for intersection, update rectangle
 *  objects, and draw to screen.
 */
function update() {
    requestAnimFrame(update);

    if (draggingCircle && draggingTarget != null) {
        circle.x += (draggingTarget.x - circle.x) / 2;
        circle.y += (draggingTarget.y - circle.y) / 2;
    } else {
        circle.x += (home.center().x - circle.x) / 2;
        circle.y += (home.center().y - circle.y) / 2;
    }

    context.clearRect(0 , 0 , canvas.width, canvas.height);

    const MAX_CIRCLE_EXPAND = 3.0;

    if (draggingCircle) {
        snapRects.forEach(rect => {
            const homeCirc = new Circle(rect.center().x, rect.center().y + 10, circle.radius, 0.5);
            drawCircle(homeCirc, 'rgba(255, 255, 255, 0.4)', MAX_CIRCLE_EXPAND - 1.5, false);
        });
    }

    if (!dropped && hovering || draggingCircle) {
        var hoverExpansionTarget = MAX_CIRCLE_EXPAND
    } else {
        var hoverExpansionTarget = 0.0
    }

    hoverExpansion += (hoverExpansionTarget - hoverExpansion) / 2;

    drawCircle(circle, "rgba(255, 170, 170, 1.0)", hoverExpansion, true);

    snapRects.forEach(rect => {
        // drawRect(rect, 'rgba(255, 255, 255, 0.1)');
    })
}

/**
 * Returns a handy point object in the local coordinate
 *  space of the canvas
 */
function getCanvasCoords(evt) {
    var canvasRect = canvas.getBoundingClientRect();
    var mx = evt.x - canvasRect.left;
    var my = evt.y - canvasRect.top;

    return {x: Math.floor(mx), y: Math.floor(my)};
}

/**
 * Handle user clicking mouse.  If the user just clicked
 *  a rectangle, set it as the rectangle we're dragging.
 */
function mouseDownListener(evt) {
    var mousePoint = getCanvasCoords(evt);

    if (circleContainsPoint(circle, mousePoint)) {
        draggingCircle = true;
    }

    originalHome = home;

    mouseMoveListener(evt);
}

/**
 * Handle user moving mouse.  Set target drag point to
 *  make rectangle center move towards mouse.
 */
function mouseMoveListener(evt) {
    var mousePoint = getCanvasCoords(evt);

    hovering = circleContainsPoint(circle, mousePoint);

    if (dropped && !hovering) { 
        dropped = false;
    }

    if (draggingCircle) {
        draggingTarget = mousePoint;
    } else {
        return;
    }

    if (originalHome && pluckEnabled) {
        const pluckiness = 2.0
        const x = (originalHome.center().x + mousePoint.x) / 2;
        const y = (originalHome.center().y + mousePoint.y) / 2;
        draggingTarget = { x: x, y: y };

        if (!rectContainsPoint(originalHome, mousePoint)) {
            originalHome = null;
        }

        return;
    }

    snapRects.forEach(rect => {
        if (rectContainsPoint(rect, mousePoint)) {
            draggingTarget = {
                x: rect.x + rect.width / 2,
                y: rect.y + rect.height / 2
            };
            home = rect;
            originalHome = null;
        }
    })
}

/**
 * Handle user releasing mouse.  Set target drag point and
 *  drag rectangle to null.
 */
function mouseUpListener(evt) {
    draggingCircle = false;
    draggingTarget = home;
    dropped = true;
}

update();
