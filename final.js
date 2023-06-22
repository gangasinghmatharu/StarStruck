/*
 StarStruck: An Algorithmic Constellation
 build you Constellation and traverse through the stars!
*/

var viewportWidth  = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
var viewportHeight = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);

var width       = Math.max(400, viewportWidth);
var height      = Math.max(400, viewportHeight);
var nodeCount   = 0;
var linkCount   = 0;

var strength    = -400;
var distance    = 100;

var svg         = null;
var simulation  = null;
var nodesView   = null;
var linksView   = null;

var sourceNodeId  = 'node-1';
var selectedNode  = null;
var selectedLink  = null;

var hoveredElement      = null;
var hoveredElementClass = null;

var newLine       = null;
var maxNodeLimit  = 10;

var adjacency = {};
var nodesData = [];
var linksData = [];

var currGuideScreenId = 0;
var selectedAlgorithm = 1 // breadthFirstSearch
var currAlgorithm     = selectedAlgorithm;

var boundary = { x1: 40, y1: 40, x2: width - 40, y2: height - 40 };

var tutorialScreensMap = {
  1 : {
    heading     : "Add Star with a Click",
    subHeading  : "Max Star Count is " + maxNodeLimit,
    canvasView  : [addTutorialStar],
  },
  2 : {
    heading     : "Add Link with a Drag",
    subHeading  : "Links are bidirectional",
    canvasView  : [addTutorialLink],
  },
  3 : {
    heading     : "Erase with a Double Click",
    subHeading  : "og Star is immortal",
    canvasView  : [eraseTutorial],
  },
  4 : {
    heading     : "Switch Algo from Gear",
    subHeading  : "you are all set",
    canvasView  : [switchAlgorithmTutorial],
  },
}

var algorithmToMethodMap = {
  0 : {
    algorithm   : "Rewind",
    method      : [rewindPlay],
    img         : "./icons/rewind.svg"
  },
  1 : {
    algorithm   : "DFS",
    method      : [depthFirstSearch],
    img         : "./icons/play.svg"
  },
  2 : {
    algorithm   : "BFS",
    method      : [breadthFirstSearch],
    img         : "./icons/play.svg"
  },
}

var toolboxControlClick = {
  guide : {
    id      : "guide",
    method  : [guideClick],
    enabled : true,
  },
  reset : {
    id      : "reset",
    method  : [resetClick],
    enabled : true,
  },
  algo : {
    id      : "algo",
    method  : [algoClick],
    enabled : true,
  },
  play : {
    id      : "play",
    method  : [playClick],
    enabled : true,
  },
  prev : {
    id      : "prev",
    method  : [prevClick],
    enabled : true,
  },
  next : {
    id      : "next",
    method  : [nextClick],
    enabled : true,
  },
}

function init(){
  guide(true);
  initiateData();
  initiateSVG();
  initiateFDG(); // FDG: Force Directed Graph
  updateView();
  bindMouseEvents();
  bindControlButtonEvents();
  animatePlaygroundShow();
  togglePlayAndRewind();
}

function initiateSVG(){
  svg = d3.select("#canvas")
  newLine = svg.select("#activeLink");
}

function initiateFDG(){

  simulation = d3.forceSimulation(nodesData)
     .force("charge", d3.forceManyBody().strength(strength))
     .force("link", d3.forceLink(linksData).id(d => d.id).distance(distance))
     .force("x", d3.forceX(width / 2))
     .force("y", d3.forceY(height / 2))
     .alphaDecay(0.005)
     .on("tick", tickHandler);
}

function updateView(){
  updateLinkView();
  updateNodeView();
  updateSimulation();
  updateAdjacency();
}

function updateNodeView(){
  var t = svg.select("#nodes-group")
     .selectAll(".node")
     .data(nodesData)

  t.enter()
     .append(function(d){
        nodeCount += 1;
        var clonedNode = d3.select("#nodeTemplate").node().cloneNode(true);
        var uniqueId = "node-" + nodeCount;

        clonedNode.setAttribute("id", uniqueId)

        if(uniqueId == sourceNodeId){
          updateTargetClass(clonedNode, 'node', true)
        }
        return clonedNode;
    })
    .classed("node", true)
}

function updateLinkView(){
  var t = svg.select('#links-group')
     .selectAll(".link")
     .data(linksData)

    t.enter()
     .append(function(d){
        linkCount += 1;
        var clonedLink = d3.select("#linkTemplate").node().cloneNode(true);
        var uniqueId = "link-" + linkCount;

        clonedLink.setAttribute("id", uniqueId)

        var clonedSelection = d3.select(clonedLink).selectAll("*")
        clonedSelection.classed(d.source.id + '-' + d.target.id, true);
        clonedSelection.classed(d.target.id + '-' + d.source.id, true);

        return clonedLink;
    })
    .classed("link", true)
}

function updateSimulation(){
    nodesView = svg.selectAll(".node");
    linksView = svg.selectAll(".link");

    simulation.nodes(nodesData);
    simulation.force("link").links(linksData);
    simulation.alpha(1).restart();
}

function tickHandler(){
  nodesView.each(function(d, i){
    var roi = d3.select('#' + d.id);
    // Update node position
      d.x += d.vx;
      d.y += d.vy;

      // Update node velocity based on boundary conditions
      if (d.x < boundary.x1) {
        d.x = boundary.x1;
        d.vx = Math.abs(d.vx);
      }
      if (d.x > boundary.x2) {
        d.x = boundary.x2;
        d.vx = -Math.abs(d.vx);
      }
      if (d.y < boundary.y1) {
        d.y = boundary.y1;
        d.vy = Math.abs(d.vy);
      }
      if (d.y > boundary.y2) {
        d.y = boundary.y2;
        d.vy = -Math.abs(d.vy);
      }

    var xx = d.x - 40;
    var yy = d.y - 40;

    roi.selectAll('line')
       .attr('x1', d.x)
       .attr('y1', d.y)
       .attr('x2', d.x)
       .attr('y2', d.y);

    roi.selectAll('circle')
      .attr('cx', d.x)
      .attr('cy', d.y);

    roi.selectAll('path')
      .attr('transform', 'translate(' + xx + ',' + yy + ')');

    if (selectedNode && selectedNode.id == d.id){
      newLine.attr("x1", d.x);
      newLine.attr("y1", d.y);
    }
  })

  linksView.each(function(d, i){
    d3.select('#' + d.id)
      .selectAll('line')
      .attr('x1', d.source.x)
      .attr('y1', d.source.y)
      .attr('x2', d.target.x)
      .attr('y2', d.target.y)
  })
}

function bindMouseEvents(){
  svg.on("mousemove", mousemove)
     .on("mouseup"  , mouseup)
     .on("mousedown", mousedown)
     .on("dblclick" , doubleclick)
}

function mousemove(event){
  var target        = event.target;
  var targetParent  = target.parentElement;
  var parentClass   = targetParent.getAttribute('class');

  if (parentClass == 'node' || parentClass == 'link'){
    if(hoveredElement == null){
      hoveredElement = targetParent;
      hoveredElementClass = parentClass
      addHoverEffect(targetParent, parentClass);
    }
  }
  else if (hoveredElement){
    removeHoverEffect(hoveredElement, hoveredElementClass);
    hoveredElement = null;
    hoveredElementClass = null;
  }

  if(!selectedNode){
    return
  }

  roi = d3.select(selectedNode).select('circle')
  xx = roi.attr("cx")
  yy = roi.attr("cy")

  newLine.attr("x1", xx)
  newLine.attr("y1", yy)
  newLine.attr("x2", event.x - 0)
  newLine.attr("y2", event.y - 0)

}

function mouseup(event){

  if(!selectedNode){
    return
  }

  var target        = event.target;
  var targetParent  = target.parentElement;
  var parentClass   = targetParent.getAttribute('class');

  if(selectedNode && parentClass == 'node' && targetParent != selectedNode){
    //add link
    let source = selectedNode.getAttribute('id');
    let target = targetParent.getAttribute('id');
    let linkId = 'link-' + (linkCount + 1);

    if (isEdgeUnique(source, target)){
      linksData.push({
        source  : source,
        target  : target,
        id      : linkId
      })
    }
    else{
      console.log("link Already exists")
    }
  }
  else if(selectedNode && targetParent != selectedNode){
    if (addNewDisconnectedNode(event)){
      linksData.push({
        source  : selectedNode.getAttribute('id'),
        target  : 'node-' + (nodeCount),
        id      : 'link-' + (linkCount + 1)
      })
    }
  }

  selectedNode = null;
  selectedLink = null;

  newLine.attr("x1", -10)
  newLine.attr("y1", -10)
  newLine.attr("x2", -10)
  newLine.attr("y2", -10)

  updateView();
}

function mousedown(event){
  var target        = event.target;
  var targetParent  = target.parentElement;
  var parentClass   = targetParent.getAttribute('class');

  switch (parentClass) {
    case "node":
      selectedNode = targetParent;
      newLine.attr("x1", event.x);
      newLine.attr("y1", event.y);
      newLine.attr("x2", event.x);
      newLine.attr("y2", event.y);
      break;
    case "link":
      selectedLink = targetParent;
      break;
    default:
      addNewDisconnectedNode(event);
      break;
  }
}

function addNewDisconnectedNode(event){
  var numNodesInView = d3.select("#nodes-group").selectAll('.node')._groups[0].length;
  if (numNodesInView == maxNodeLimit){
    console.log("node limit exceeded")
    return false;
  }
  nodesData.push({
    id  : "node-" + (nodeCount + 1),
    x   : event.x - 0,
    y   : event.y - 0
  })
  updateView();
  return true;
}


function doubleclick(event){
  var target        = event.target;
  var targetParent  = target.parentElement;
  var parentClass   = targetParent.getAttribute('class');
  switch(parentClass){
    case 'node':
      removeNode(targetParent);
      break;
    case 'link':
      removeLink(targetParent);
      break;
  }
}

function removeNode(targetElement){
  var targetId   = targetElement.getAttribute('id');
  if(targetId == sourceNodeId){
    console.log("cannot remove source")
    return
  }
  var newNodesData = [];
  var newLinksData = [];

  nodesData.forEach((node, i) => {
    if(node.id != targetId){
      newNodesData.push(node);
    }
    else{
      targetElement.remove()
    }
  });

  linksData.forEach((link, i) => {
    if(link.source.id != targetId && link.target.id != targetId){
      newLinksData.push(link);
    }
    else{
      t = d3.select('#' + link.id)
      t.remove()
    }
  });

  nodesData = newNodesData;
  linksData = newLinksData;
  updateView();
}

function removeLink(targetElement){
  var targetId   = targetElement.getAttribute('id');
  var newLinksData = [];
  linksData.forEach((link, i) => {
    if(link.id != targetId){
      newLinksData.push(link);
    }
    else{
      targetElement.remove();
    }
  });

  linksData = newLinksData;
  updateView();
}

function addHoverEffect(targetElement, parentClass){
  updateTargetClass(targetElement, parentClass, true)
}

function removeHoverEffect(targetElement, parentClass){
  updateTargetClass(targetElement, parentClass, false)
}

function updateTargetClass(targetElement, parentClass, isActive){
  if(parentClass == 'node'){
    var selection = d3.select(targetElement);
    var selectionId = selection.attr("id");

    if (selectionId == sourceNodeId && !isActive){
      return;
    }

    if (isActive) {selection.style("transform", "scale(0.65)");}
    else {selection.style("transform", "scale(0.5)");}

    selection.select("#outerCircle").classed("outerCircleActive", isActive);
    selection.select("#blankCircle").classed("blankCircleActive", isActive);
    selection.select("#innerCircle").classed("innerCircleActive", isActive);
    selection.select("#star").classed("starActive", isActive);

    selection.select("#outerCircle").attr("fill", isActive ? "url(#gradient)": "white");
    selection.select("#innerCircle").attr("fill", isActive ? "url(#gradient)": "white");
  }
  else if (parentClass == 'link'){
    var selection = d3.select(targetElement);
    selection.selectAll("line").classed("activeLink", isActive);
  }
}

function initiateData(){
  nodesData = [
    { id: 'node-1' , x: width/2, y: height/2},
    { id: 'node-2' , x: width/2, y: height/2},
    { id: 'node-3' , x: width/2, y: height/2},
    { id: 'node-4' , x: width/2, y: height/2}
  ];

  linksData = [
    { source: 'node-1', target: 'node-2', id: 'link-1'},
    { source: 'node-1', target: 'node-3', id: 'link-2'},
    { source: 'node-2', target: 'node-3', id: 'link-3'},
  ];
}

function updateAdjacency(){
  adjacency = {};
  linksData.forEach((link, i) => {

    addEdgeInAdjacency(link.source.id, link.target.id, link.id);
    addEdgeInAdjacency(link.target.id, link.source.id, link.id);

  });
}

function addEdgeInAdjacency(u, v, link){
  if (!(u in adjacency)){
    adjacency[u] = new Set();
  }
  adjacency[u].add([v, link]);
}

function bindControlButtonEvents(){
  for (var controlHandle in toolboxControlClick){
    var control = toolboxControlClick[controlHandle];
    var contolTarget = document.getElementById(control.id);
    contolTarget.addEventListener("click", control.method[0]);
  }
}

function disableControlButtonEvent(controlHandle){
  toolboxControlClick[controlHandle].enabled = false;

  var controlId = toolboxControlClick[controlHandle].id;
  d3.select('#' + controlId)
    .classed("toolDisable", true)
}

function enableControlButtonEvent(controlHandle){
  toolboxControlClick[controlHandle].enabled = true;

  var controlId = toolboxControlClick[controlHandle].id;
  d3.select('#' + controlId)
    .classed("toolDisable", false)  ;
}

function prevClick(){
  if(!toolboxControlClick.prev.enabled){
    return;
  }
  var screens = d3.select(".screens");
  currGuideScreenId -= 1;
  renderScreen(screens, currGuideScreenId);
}

function nextClick(){
  if(!toolboxControlClick.next.enabled){
    return;
  }
  var screens = d3.select(".screens");
  currGuideScreenId += 1;
  renderScreen(screens, currGuideScreenId);
}

async function guideClick(){
  if(!toolboxControlClick.guide.enabled){
    return;
  }
  let greetWelcome = 0;
  await animatePlaygroundHide();
  guide(true);
}

async function resetClick(){
  if(!toolboxControlClick.reset.enabled){
    return;
  }
  nodeCount = 0;
  linkCount = 0;
  await animatePlaygroundHide();
  clearCanvas();
  initiateData();
  updateView();
  animatePlaygroundShow();
}

function algoClick(){
  if(!toolboxControlClick.algo.enabled){
    return;
  }
  if(currAlgorithm == 0){
    return;
  }
  selectedAlgorithm = selectedAlgorithm == 1? 2:1;
  currAlgorithm = selectedAlgorithm;

  togglePlayAndRewind();
  animateAlgorithmNameDisplay();
}

function clearCanvas(){

  var canvas = d3.select("#canvas");
  canvas.select("#links-group").remove();
  canvas.select("#nodes-group").remove();

  canvas.append("g")
  .attr("id", "links-group");

  canvas.append("g")
  .attr("id", "nodes-group");

}

async function playClick(){
  if(!toolboxControlClick.play.enabled){
    return;
  }

  disableMouseEvents();

  fadeHeading(true);
  disableControlButtonEvent("guide");
  disableControlButtonEvent("reset");
  disableControlButtonEvent("play");
  disableControlButtonEvent("algo");

  await algorithmToMethodMap[currAlgorithm].method[0]();

  if(currAlgorithm == 0){
      bindMouseEvents();
      fadeHeading(false);
      enableControlButtonEvent("guide");
      enableControlButtonEvent("reset");
      enableControlButtonEvent("algo");

      currAlgorithm = selectedAlgorithm;
  }
  else{
    currAlgorithm = 0;
  }
  togglePlayAndRewind();
  enableControlButtonEvent("play");
}

function disableMouseEvents(){
  svg.on("mousemove", null)
     .on("mouseup"  , null)
     .on("mousedown", null)
     .on("dblclick" , null);
}

function disableControlTools(){
  d3.selectAll('.tool')
  .style('opacity', 0.2)
  .style('cursor', 'not-allowed')
}

function enableControlTools(){
  d3.selectAll('.tool')
  .style('opacity', 0.5)
  .style('cursor', 'pointer');
}

function togglePlayAndRewind(){
  let play = document.getElementById("play");
  let playSpan = d3.select("#play").select('span');
  let playImg = d3.select("#play").select('.toolImg');

  let currAlgoName = algorithmToMethodMap[currAlgorithm].algorithm;
  let currAlgoImg = algorithmToMethodMap[currAlgorithm].img;

  playSpan.text(currAlgoName);
  playImg.attr("src", currAlgoImg);
}

function rewindPlay(){

  d3.select("#nodes-group")
  .selectAll(".node")
  .each(function(node){
    let nodeSelection = d3.select('#' + node.id).node();
    updateTargetClass(nodeSelection, 'node', false)
  })

  d3.select("#links-group")
  .selectAll(".link")
  .each(function(link){
    let linkSelection = d3.select('#' + link.id).select("#actualLink");
    linkSelection.classed("actualLinkActive", false);
  })
  simulation.alpha(1).restart();
}

async function depthFirstSearch(){
  simulation.stop();
  stack = [];
  stack.push([sourceNodeId, -1, -1]);
  visited = new Set();

  while(stack.length){
    curr = stack.pop();
    currNodeId = curr[0];
    parentNodeId = curr[1];
    linkId = curr[2];

    if (visited.has(currNodeId)) {
      continue;
    }
    else {
      visited.add(currNodeId);
    }

    if(parentNodeId != -1){
      currNodeSelection = d3.select('#' + currNodeId).node();

      animateLink(currNodeId, parentNodeId, linkId);
      await delay(500);

      addHoverEffect(currNodeSelection, 'node');

      await delay(700);
    }

    var adjacencyArray = Array.from(adjacency[currNodeId] || new Set());
    for (let i = 0; i < adjacencyArray.length; i++) {
      var neiNodeId = adjacencyArray[i][0];
      var linkId = adjacencyArray[i][1];

      if (visited.has(neiNodeId)){
        continue;
      }
      else{
        stack.push([neiNodeId, currNodeId, linkId]);
      }
    }
  }

  newLine.attr("x1", -10)
  newLine.attr("y1", -10)
  newLine.attr("x2", -10)
  newLine.attr("y2", -10)

  simulation.alpha(0.5).restart();
}

async function breadthFirstSearch(){
  simulation.stop();
  queue = [];
  queue.push([sourceNodeId, -1, -1]);
  visited = new Set();

  while(queue.length){
    curr = queue.shift();
    currNodeId = curr[0];
    parentNodeId = curr[1];
    linkId = curr[2];

    if (visited.has(currNodeId)) {
      continue;
    }
    else {
      visited.add(currNodeId);
    }

    if(parentNodeId != -1){
      currNodeSelection = d3.select('#' + currNodeId).node();

      animateLink(currNodeId, parentNodeId, linkId);
      await delay(600);
      addHoverEffect(currNodeSelection, 'node');
      await delay(700);
    }

    var adjacencyArray = Array.from(adjacency[currNodeId] || new Set());
    for (let i = 0; i < adjacencyArray.length; i++) {
      var neiNodeId = adjacencyArray[i][0];
      var linkId = adjacencyArray[i][1];

      if (visited.has(neiNodeId)){
        continue;
      }
      else{
        queue.push([neiNodeId, currNodeId, linkId]);
      }
    }
  }

  newLine.attr("x1", -10)
  newLine.attr("y1", -10)
  newLine.attr("x2", -10)
  newLine.attr("y2", -10)
  simulation.alpha(0.5).restart();
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function animateLink(currNodeId, parentNodeId, linkId){

  var curr  = d3.select('#' + currNodeId).select('circle');
  var parent   = d3.select('#' + parentNodeId).select('circle');

  var parentCx = parent.attr('cx');
  var parentCy = parent.attr('cy');

  var currCx = curr.attr('cx');
  var currCy = curr.attr('cy');

  var p = d3.select('#activeLink');

  p.attr('x1', parentCx);
  p.attr('y1', parentCy);
  p.attr('x2', parentCx);
  p.attr('y2', parentCy);

  await new Promise((resolve) => {
    p.transition()
    .delay(200) // Transition duration in milliseconds
    .attr("x2", currCx)
    .attr("y2", currCy)
    .on("end", resolve)
  });

  d3.select('#' + linkId).select("#actualLink").classed("actualLinkActive", true);

  await new Promise((resolve) => {
    p.transition()
    .delay(100) // Transition duration in milliseconds
    .attr("x1", currCx)
    .attr("y1", currCy)
    .on("end", resolve)
  });

  p.attr('x1', currCx);
  p.attr('y1', currCy);
  p.attr('x2', currCx);
  p.attr('y2', currCy);

}


async function guide(greetWelcome){
  d3.select('.guide').style('display', 'block');
  var welcome = d3.select(".welcome");
  if (greetWelcome){
    welcome.style('display','flex');
    await delay(2000*greetWelcome);
  }

  welcome.style('display','none');

  tutorialScreens();
}


function tutorialScreens(){
  currGuideScreenId = 1;
  var screens = d3.select(".screens");
  screens.style("display", 'block');

  var prevButton = screens.select("#prev");
  var nextButton = screens.select("#next");


  renderScreen(screens, currGuideScreenId);
}

async function renderScreen(screens, screenId){
  if (screenId < 1){
    currGuideScreenId = 1;
    return;
  }

  if(screenId != 1){
    await new Promise((resolve) => {
      screens
        .style("opacity", 1)
        .transition()
        .duration(300)
        .style("opacity", 0)
        .on("end", resolve);
    });
  }

  if(screenId > Object.keys(tutorialScreensMap).length){
    clearguideCanvas(screenId);
    d3.select('.guide').style('display', 'none');
    d3.select('.screens').style("display", 'none');
    await animatePlaygroundShow();
    return;
  }

  var currentScreen = tutorialScreensMap[screenId];
  currentScreen.canvasView[0](screenId);

  var prevButton = screens.select("#prev");
  var nextButton = screens.select("#next");
  if(currGuideScreenId == 1){
    prevButton.style('opacity', 0.1);
    prevButton.style('cursor', "not-allowed");
  }
  else{
    prevButton.style('opacity', 0.4);
    prevButton.style('cursor', "pointer");
  }

  screens.select('.guideHeading').text(currentScreen.heading);
  screens.select('.guideSubHeading').text(currentScreen.subHeading);

  await new Promise((resolve) => {
    screens
      .style("opacity", 0)
      .transition()
      .duration(300)
      .style("opacity", 1)
      .on("end", resolve);
  });

}


async function addTutorialStar(screenId){

  clearguideCanvas(screenId);
  var guideCanvas = d3.select("#guideCanvas" + screenId);

  await addGuideStar(guideCanvas, 200, 100, true, 'og-star');
  await addcursor(guideCanvas, 150 , 150, screenId);

  await moveCursorTo(guideCanvas, 50, 110);
  await clickCursor(guideCanvas);
  await addGuideStar(guideCanvas, 50, 120, false, 'g-node-1');

  await moveCursorTo(guideCanvas, 350, 110);
  await clickCursor(guideCanvas);
  await addGuideStar(guideCanvas, 350, 120, false, 'g-node-2');

  await moveCursorTo(guideCanvas, 150, 150);
}

async function addTutorialLink(screenId){

  clearguideCanvas(screenId);
  var guideCanvas = d3.select("#guideCanvas" + screenId);

  await addGuideStar(guideCanvas, 200, 100, true, 'og-star');
  await addcursor(guideCanvas, 150 , 150, screenId);

  await addGuideStar(guideCanvas, 50, 120, false, 'g-node-1');
  await addGuideStar(guideCanvas, 350, 120, false, 'g-node-2');

  await moveCursorTo(guideCanvas, 350, 120);
  await addGuideLink(guideCanvas, 350, 120, 200, 100, true, 'g-link-1');
  await dragCursor(guideCanvas, 200, 100);

  await addGuideLink(guideCanvas, 200, 100, 50, 120, true, 'g-link-2');
  await dragCursor(guideCanvas, 50, 120);

  await moveCursorTo(guideCanvas, 150, 150);

}

async function eraseTutorial(screenId){

  clearguideCanvas(screenId);
  var guideCanvas = d3.select("#guideCanvas" + screenId);

  await addGuideStar(guideCanvas, 200, 100, true, 'og-star');
  await addcursor(guideCanvas, 150 , 150, screenId);

  await addGuideStar(guideCanvas, 50, 120, false, 'g-node-1');
  await addGuideStar(guideCanvas, 350, 120, false, 'g-node-2');

  await addGuideLink(guideCanvas, 350, 120, 200, 100, false, 'g-link-1');
  await addGuideLink(guideCanvas, 200, 100, 50, 120, false, 'g-link-2');

  await moveCursorTo(guideCanvas, 275, 110 - 5);
  await removeGuideLink(guideCanvas, 'g-link-1');

  await moveCursorTo(guideCanvas, 350, 120 - 5);
  await removeGuideNode(guideCanvas, 'g-node-2');

  await moveCursorTo(guideCanvas, 125, 110 - 5);
  await removeGuideLink(guideCanvas, 'g-link-2');

  await moveCursorTo(guideCanvas, 50, 120 - 5);
  await removeGuideNode(guideCanvas, 'g-node-1');

  await moveCursorTo(guideCanvas, 200, 100 - 5);
  await doubleClickCursor(guideCanvas);
  addtextInGuidedCanvas(guideCanvas, 200, 80, "og Star!");

  await moveCursorTo(guideCanvas, 150, 150);
}

async function switchAlgorithmTutorial(screenId){
  clearguideCanvas(screenId);
  var guideCanvas = d3.select("#guideCanvas" + screenId);

  await addcursor(guideCanvas, 150 , 150, screenId);

  var size = 30;

  guideCanvas
  .append("image")
  .attr("xlink:href", "./icons/algo.svg")
  .attr("x", 200 - size/2)
  .attr("y", 90 - size/2)
  .classed("toolImg", true)
  .style("opacity", 0.5)

  guideCanvas
  .append("text")
  .text("Algo")
  .attr("x", 200)
  .attr("y", 130)
  .attr("text-anchor", "middle")
  .attr("fill", "white")
  .style("opacity", 0.5)
  .classed("toolSpan", true)

  await moveCursorTo(guideCanvas, 200, 80);
  await clickCursor(guideCanvas);
  addtextInGuidedCanvas(guideCanvas, 200, 80, "DFS!");
  await moveCursorTo(guideCanvas, 150, 150);

  await delay(200);

  await moveCursorTo(guideCanvas, 200, 80);
  await clickCursor(guideCanvas);
  addtextInGuidedCanvas(guideCanvas, 200, 80, "BFS!");
  await moveCursorTo(guideCanvas, 150, 150);

}

function clearguideCanvas(screenId){
  d3.select(".guideCanvas").remove();

  var screens = d3.select(".screens");
  var screenChilds = Array.from(screens.node().childNodes);

  var guidedSvg = screens
    .insert('svg', ".guideHeading")
    .classed('guideCanvas', true)
    .attr("id", "guideCanvas" + screenId);

}

function addGuideStar(canvas, cx, cy, isActive, nodeId){
  return new Promise((resolve)=>{
    canvas.append(function(d){
      var clonedNode = d3.select("#nodeTemplate").node().cloneNode(true);
      var selection = d3.select(clonedNode)

      selection.selectAll('circle')
        .attr('cx', cx)
        .attr('cy', cy);

      var xx = cx - 40;
      var yy = cy - 40;

      if (isActive){
        selection.style("transform", "scale(0.65)")
      }

      selection.attr("id", nodeId);

      selection.selectAll('path')
        .attr('transform', 'translate(' + xx + ',' + yy + ')');

      selection.select("#outerCircle").classed("outerCircleActive", isActive);
      selection.select("#blankCircle").classed("blankCircleActive", isActive);
      selection.select("#innerCircle").classed("innerCircleActive", isActive);
      selection.select("#star").classed("starActive", isActive);
      return clonedNode;
    });

    canvas
      .select("#cursor")
      .raise();

    return resolve();
  })
}

function addcursor(canvas, curX, curY){
  return new Promise((resolve)=>{
    canvas.append("image")
      .attr("x", curX)
      .attr("y", curY)
      .attr("width", 30)
      .attr("height", 30)
      .attr("xlink:href", "./icons/arrow.svg")
      .attr("id", "cursor")
      .style("transform-origin", "center")
      .style("transform-box", "fill-box")
    resolve();
  })
}

function moveCursorTo(canvas, curX, curY){
  return new Promise((resolve) => {
    canvas
      .select("#cursor")
      .raise()
      .transition()
      .duration(1000)
      .attr("x", curX - 8)
      .attr("y", curY + 8)
      .on("end", resolve);
  });
}


async function clickCursor(canvas){
  return new Promise((resolve) => {
    canvas
      .select("#cursor")
      .transition()
      .duration(200)
      .style("transform", "scale(0.8)")
      .transition()
      .duration(200)
      .style("transform", "scale(1)")
      .on("end", resolve);
  });
}

async function doubleClickCursor(canvas){
  return new Promise((resolve) => {
    canvas
      .select("#cursor")
      .transition()
      .duration(100)
      .style("transform", "scale(0.8)")
      .transition()
      .duration(200)
      .style("transform", "scale(1)")
      .transition()
      .duration(100)
      .style("transform", "scale(0.8)")
      .transition()
      .duration(200)
      .style("transform", "scale(1)")
      .on("end", resolve);
  });
}

async function dragCursor(canvas, curX, curY, animate){
  return new Promise((resolve) => {
    canvas
      .select("#cursor")
      .transition()
      .duration(200)
      .style("transform", "scale(0.8)")
      .transition()
      .duration(1000)
      .attr("x", curX)
      .attr("y", curY)
      .transition()
      .duration(200)
      .style("transform", "scale(1)")
      .on("end", resolve);
  });
}

function addGuideLink(canvas, fromX, fromY, toX, toY, animate, linkId){
  return new Promise((resolve)=>{
    var newLink = canvas.append(function(d){
      var clonedLink = d3.select("#linkTemplate").node().cloneNode(true);
      var selection = d3.select(clonedLink);
      selection.attr("id", linkId);
      selection.select("#actualLink").attr("opacity", 0.1);
      return clonedLink;
    });

    newLink.selectAll("line")
    .attr("x1", fromX)
    .attr("y1", fromY)
    .attr("x2", fromX)
    .attr("y2", fromY)
    .transition()
    .duration(1450*animate)
    .attr("x2", toX)
    .attr("y2", toY)

    newLine.lower(3);
    return resolve();
  })
}

async function removeGuideLink(canvas, linkId){
  var selection = canvas.select('#' + linkId)
  selection.selectAll('*')
  .style('opacity', 0.2)

  await doubleClickCursor(canvas);
  selection.remove();
}

async function removeGuideNode(canvas, nodeId){
  var selection = canvas.select('#' + nodeId)

  await doubleClickCursor(canvas);
  selection.remove();
}

function addtextInGuidedCanvas(canvas, x, y, text){
  return new Promise((resolve) => {
    canvas
      .append('text')
      .text(text)
      .attr("x", x)
      .attr("y", y)
      .attr("fill", 'white')
      .style("opacity", 0)
      .style("letter-spacing", "1.5px")
      .attr("text-anchor", 'middle')
      .transition()
      .duration(500)
      .attr("y", y - 20)
      .style("opacity", 0.2)
      .transition()
      .duration(1500)
      .style("opacity", 0)
      .on("end", resolve);
  });
}

function animatePlaygroundShow(){
  return new Promise((resolve) => {
    var playground = d3.select(".playground");

    playground
      .style("opacity", 0)
      .transition()
      .duration(500)
      .style("opacity", 1);

    playground
      .select("#heading")
      .style("letter-spacing", "1px")
      .transition()
      .duration(1500)
      .style("letter-spacing", "4px");

    playground
      .select(".toolbox")
      .style("width", "98%")
      .transition()
      .duration(1500)
      .style("width", "100%")
      .on("end", ()=>{
        animateAlgorithmNameDisplay();
        return resolve();
      });

  });
}

function animatePlaygroundHide(){
  return new Promise((resolve) => {
    var playground = d3.select(".playground");

    playground
      .style("opacity", 1)
      .transition()
      .duration(300)
      .style("opacity", 0)
      .on("end", ()=>{
        return resolve();
      });
  });
}

function isEdgeUnique(source, target){
  if (!(source in adjacency) || !(target in adjacency)){
    return true;
  }

  let adjS = Array.from(adjacency[source] || new Set());
  let adjT = Array.from(adjacency[target] || new Set());

  for(var neiNode of adjS){
    if(neiNode[0] == target){
      return false;
    }
  }

  for(var neiNode of adjT){
    if(neiNode[0] == source){
      return false;
    }
  }

  return true;
}

async function animateAlgorithmNameDisplay(){
  if (currAlgorithm == 0){
    return;
  }

  var algoNameBubble  = d3.select("#algoNameBubble");
  var algoSelection   = d3.select("#algoName");

  var algoInAction    = algorithmToMethodMap[selectedAlgorithm].algorithm;

  algoNameBubble
    .style("top", "-10px")
    .text(algoInAction + "!")
    .transition()
    .duration(500)
    .style("opacity", 1)
    .style("top", "-40px")
    .transition()
    .duration(1500)
    .style("opacity", 0)
}

function fadeHeading(isActive){
  d3.select("#heading")
  .classed("fadedHeading", isActive)
}

init()
